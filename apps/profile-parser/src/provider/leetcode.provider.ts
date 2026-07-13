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
                    profile {
                        ranking
                    }
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
            const request = () => axios.post(LEETCODE_API_ENDPOINT, {
                query,
                variables: { username }
            }, {
                // LeetCode's public GraphQL endpoint can be slow even for a
                // valid profile. A single retry avoids dropping a sync merely
                // because its first response exceeds the old 10-second limit.
                timeout: 30000,
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    // Spoof a real browser to bypass Cloudflare
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                }
            });

            let response;
            try {
                response = await request();
            } catch (error: any) {
                if (error.code !== "ECONNABORTED") throw error;
                response = await request();
            }
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
                // LeetCode displays this profile-wide rank independently from
                // contest ranking. Contest data is null for users who have not
                // entered a contest, while `profile.ranking` remains available.
                lcRating: userData?.profile?.ranking ?? null,
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
