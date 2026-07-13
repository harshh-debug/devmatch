import { Octokit } from "octokit";

const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

export const githubProvider = {
	async fetchProfileData(username: string) {
		try {
			// 1. Fetch Top 10 Repos by Stars
			const { data: repos } = await octokit.rest.repos.listForUser({
				username,
				sort: "pushed",
				per_page: 10,
			});

			let totalStars = 0;
			const topics: Set<string> = new Set();
			const languageBytes: Record<string, number> = {};

			// 2. Aggregate Stars, Topics, and Languages
			for (const repo of repos) {
				totalStars += repo.stargazers_count || 0;
				repo.topics?.forEach((topic) => topics.add(topic.toLowerCase()));

				if (repo.language) {
					if (repo.language) {
						// Fallback to 0 if repo.size is undefined
						const sizeInBytes = (repo.size || 0) * 1024;

						languageBytes[repo.language.toLowerCase()] =
							(languageBytes[repo.language.toLowerCase()] || 0) + sizeInBytes;
					}
				}
			}

			// Extract top 5 languages by byte size
			const topLanguages = Object.entries(languageBytes)
				.sort(([, a], [, b]) => b - a)
				.slice(0, 5)
				.map(([lang]) => lang);

			// 3. Fetch Contribution Streak via GraphQL
			const contributionCalendar = await this.fetchContributionCalendar(username);

			return {
				githubStars: totalStars,
				topLanguages,
				inferredTopics: Array.from(topics),
				contributionStreak: contributionCalendar.streak,
				githubContributions: contributionCalendar.weeks,
			};
		} catch (error: any) {
			throw new Error(
				`[GitHub Provider] Failed to fetch data: ${error.message}`,
			);
		}
	},

	async fetchContributionCalendar(username: string): Promise<{ streak: number; weeks: { days: { date: string; count: number }[] }[] }> {
		const query = `
            query($username: String!) {
                user(login: $username) {
                    contributionsCollection {
                        contributionCalendar {
                            weeks {
                                contributionDays {
                                    contributionCount
                                    date
                                }
                            }
                        }
                    }
                }
            }
        `;
		try {
			const response: any = await octokit.graphql(query, { username });
			const weeks = response.user.contributionsCollection.contributionCalendar.weeks.map((week: any) => ({
				days: week.contributionDays.map((day: any) => ({ date: day.date, count: day.contributionCount })),
			}));

			let currentStreak = 0;
			const days = weeks.flatMap((week: any) => week.days).reverse();

			// Calculate active streak counting backwards from today
			for (const day of days) {
				if (day.contributionCount > 0) {
					currentStreak++;
				} else {
					// Allow a 1-day grace period (e.g., today might not have commits yet)
					if (currentStreak > 0) break;
				}
			}
			return { streak: currentStreak, weeks };
		} catch {
			return { streak: 0, weeks: [] }; // Graceful fallback if GraphQL fails
		}
	},
};
