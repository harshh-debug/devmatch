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
                repo.topics?.forEach(topic => topics.add(topic.toLowerCase()));

                if (repo.language) {
                    // Quick approximation without making an extra API call per repo
                    languageBytes[repo.language.toLowerCase()] = 
                        (languageBytes[repo.language.toLowerCase()] || 0) + (repo.size * 1024);
                }
            }

            // Extract top 5 languages by byte size
            const topLanguages = Object.entries(languageBytes)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([lang]) => lang);

            // 3. Fetch Contribution Streak via GraphQL
            const streak = await this.fetchContributionStreak(username);

            return {
                githubStars: totalStars,
                topLanguages,
                inferredTopics: Array.from(topics),
                contributionStreak: streak,
            };
        } catch (error: any) {
            throw new Error(`[GitHub Provider] Failed to fetch data: ${error.message}`);
        }
    },

    async fetchContributionStreak(username: string): Promise<number> {
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
            const weeks = response.user.contributionsCollection.contributionCalendar.weeks;
            
            let currentStreak = 0;
            const days = weeks.flatMap((w: any) => w.contributionDays).reverse();

            // Calculate active streak counting backwards from today
            for (const day of days) {
                if (day.contributionCount > 0) {
                    currentStreak++;
                } else {
                    // Allow a 1-day grace period (e.g., today might not have commits yet)
                    if (currentStreak > 0) break; 
                }
            }
            return currentStreak;
        } catch {
            return 0; // Graceful fallback if GraphQL fails
        }
    }
};