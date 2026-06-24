import axios from "axios";

export const validateCodeforcesHandle = async (handle: string): Promise<boolean> => {
    try {
        const response = await axios.get(`https://codeforces.com/api/user.info?handles=${handle}`, {
            timeout: 5000 
        });

        return response.data?.status === "OK";

    } catch (error: any) {
        if (error.response && error.response.status === 400) {
            return false;
        }
        
        console.error(`[Pre-Check] Codeforces validation failed for ${handle}:`, error.message);
        return false; 
    }
};