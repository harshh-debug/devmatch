import axios from "axios";

export const leetcodeProvider = {
    async fetchProfileData(handle: string) {
        try {
            const query = `
                query getContestRankingData($username: String!) {
                    userContestRanking(username: $username) {
                        rating
                    }
                }
            `;

            const response = await axios.post(
                "https://leetcode.com/graphql",
                { query, variables: { username: handle } },
                { headers: { "Content-Type": "application/json" } }
            );

            // If the user exists but hasn't done contests, userContestRanking is null
            const rankingData = response.data?.data?.userContestRanking;

            if (!rankingData) {
                console.warn(`[LeetCode] No contest rating found for ${handle}. Defaulting to 0.`);
                return { lcRating: 0 };
            }

            return { lcRating: Math.round(rankingData.rating) };
        } catch (error: any) {
            // Throwing the error ensures BullMQ marks the job as failed and retries it later
            throw new Error(`[LeetCode Provider] Failed to fetch data for ${handle}: ${error.message}`);
        }
    }
};