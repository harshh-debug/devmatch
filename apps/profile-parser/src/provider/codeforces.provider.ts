import axios from "axios";

export const codeforcesProvider = {
    async fetchProfileData(handle: string) {
        try {
            const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`);
            
            if (response.data.status !== "OK") {
                throw new Error(`Codeforces API returned status: ${response.data.status}`);
            }

            // Codeforces returns an array of users (since you can query multiple handles at once)
            const userData = response.data.result[0];

            // If the user hasn't done contests, rating might be undefined
            return { cfRating: userData.rating || 0 };
        } catch (error: any) {
            throw new Error(`[Codeforces Provider] Failed to fetch data for ${handle}: ${error.message}`);
        }
    }
};