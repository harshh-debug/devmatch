import axios from "axios";

export const validateLeetCodeHandle = async (username: string): Promise<boolean> => {
    const LEETCODE_API_ENDPOINT = "https://leetcode.com/graphql";
    
    const query = `
        query checkUserExists($username: String!) {
            matchedUser(username: $username) {
                username
            }
        }
    `;

    try {
        const response = await axios.post(LEETCODE_API_ENDPOINT, {
            query,
            variables: { username }
        }, {
            timeout: 5000, 
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
        });

        const userData = response.data?.data?.matchedUser;
        return !!userData; 

    } catch (error) {
        console.error(`[Pre-Check] LeetCode validation failed for ${username}:`, error);
        return false; 
    }
};