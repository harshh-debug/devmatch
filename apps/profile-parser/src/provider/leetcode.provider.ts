import axios from "axios";
import { UnrecoverableError } from "@devmatch/bullmq";

const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";

export const leetcodeProvider = {
    async fetchProfileData(username: string) {
        const query = `
            query getProfileData($username: String!) {
                userContestRanking(username: $username) {
                    rating
                    attendedContestsCount
                    globalRanking
                }
                matchedUser(username: $username) {
                    submitStatsGlobal {
                        acSubmissionNum {
                            difficulty
                            count
                        }
                    }
                }
            }
        `;

        try {
            const response = await axios.post(LEETCODE_API_ENDPOINT, {
                query,
                variables: { username }
            }, {
                timeout: 10000, 
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    // Spoof a real browser to bypass Cloudflare
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });
            const rankingData = response.data?.data?.userContestRanking;
            const userData = response.data?.data?.matchedUser;

            if (!userData && !rankingData) {
                throw new UnrecoverableError(`[LeetCode] User "${username}" not found`);
            }

            const submissions = userData?.submitStatsGlobal?.acSubmissionNum ?? [];
            const easy = submissions.find((s: any) => s.difficulty === 'Easy')?.count ?? 0;
            const medium = submissions.find((s: any) => s.difficulty === 'Medium')?.count ?? 0;
            const hard = submissions.find((s: any) => s.difficulty === 'Hard')?.count ?? 0;

            return {
                lcRating: Math.round(rankingData?.rating ?? 0),
                lcContestsAttended: rankingData?.attendedContestsCount ?? 0,
                lcGlobalRanking: rankingData?.globalRanking ?? null,
                lcEasySolved: easy,
                lcMediumSolved: medium,
                lcHardSolved: hard,
                lcTotalSolved: easy + medium + hard,
            };
        } catch (error: any) {
            if (error.name === 'UnrecoverableError') {
                throw error;
            }
            throw new Error(`[LeetCode Provider] Failed to fetch data: ${error.message}`);
        }
    }
};