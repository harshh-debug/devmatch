// Maps raw GitHub languages/topics to our standard skillTags
const FRAMEWORK_MAP: Record<string, string> = {
    "react": "react", "reactjs": "react", "nextjs": "react",
    "node": "node", "nodejs": "node", "express": "node",
    "python": "python", "django": "python", "flask": "python",
    "typescript": "typescript", "ts": "typescript",
    "aws": "aws", "docker": "docker", "kubernetes": "docker",
    "machine-learning": "ml", "ml": "ml", "artificial-intelligence": "ai",
};

export const skillTagMapper = {
    normalizeTags(rawTags: string[]): string[] {
        const normalized = new Set<string>();

        for (const tag of rawTags) {
            const cleanTag = tag.toLowerCase().trim();
            if (FRAMEWORK_MAP[cleanTag]) {
                normalized.add(FRAMEWORK_MAP[cleanTag]);
            } else {
                // If it's a generic tech word, we can keep it
                normalized.add(cleanTag);
            }
        }

        return Array.from(normalized);
    }
};