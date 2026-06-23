
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { prismaClient } from "db/client";

// 1. Create an explicit reference to the mock so we can clear its history between tests
const mockPublish = mock(async () => { console.log("Mock Kafka Publish Triggered"); });

// 2. Mock Kafka using the reference
mock.module("@devmatch/kafka", () => ({
    publish: mockPublish,
    TOPICS: { PROFILE_UPDATED: "profile.updated" },
    getProducer: mock(async () => ({}))
}));

// 3. MOCK THE PROVIDERS DIRECTLY (Bypasses all Network/Axios/Octokit hoisting issues)
mock.module("../src/provider/github.provider", () => ({
    githubProvider: {
        fetchProfileData: mock(async () => ({
            githubStars: 15,
            topLanguages: ["TypeScript", "JavaScript"],
            inferredTopics: ["react", "nodejs"],
            contributionStreak: 10
        }))
    }
}));

mock.module("../src/provider/leetcode.provider", () => ({
    leetcodeProvider: {
        fetchProfileData: mock(async () => ({ lcRating: 1850 }))
    }
}));

mock.module("../src/provider/codeforces.provider", () => ({
    codeforcesProvider: {
        fetchProfileData: mock(async (handle: string) => {
            if (handle === "invalid-handle") throw new Error("Failed to fetch data");
            return { cfRating: 1500 };
        })
    }
}));

// MUST import the worker AFTER the module mocks are declared
import { processProfileSync } from "../src/queue/worker";

describe("Profile Parser E2E Worker Tests", () => {
    let testUserId: string;

    beforeEach(async () => {
        // Clear the exact call history of our publisher
        mockPublish.mockClear();
        
        const user = await prismaClient.user.create({
            data: { 
                email: `test-${Date.now()}@test.com`, 
                username: `testuser-${Date.now()}`,
                displayName: "Test User" 
            }
        });
        testUserId = user.id;

        await prismaClient.profile.create({
            data: { userId: testUserId, skillTags: ["initial-tag"] }
        });
    });

    it("should successfully process a GitHub sync, update DB, and publish to Kafka", async () => {
        await processProfileSync({
            data: { userId: testUserId, handle: "valid-github", platform: "github" }
        }); 

        const profile = await prismaClient.profile.findUnique({ where: { userId: testUserId } });
        
        expect(profile).toBeDefined();
        expect(profile?.githubStars).toBe(15);
        expect(profile?.skillTags).toContain("initial-tag");
        expect(profile?.skillTags).toContain("react");
        expect(profile?.skillTags).toContain("node"); // from our skillTagMapper!
        
        expect(profile?.skillVector).toBeInstanceOf(Array);
        expect(profile?.skillVector?.length).toBe(22);

        expect(mockPublish).toHaveBeenCalledWith(
            "profile.updated",
            expect.objectContaining({
                userId: testUserId,
                skillVector: expect.any(Array)
            })
        );
    });

    it("should successfully process a Codeforces sync and update the vector rating", async () => {
        await processProfileSync({
            data: { userId: testUserId, handle: "tourist", platform: "codeforces" }
        });

        const profile = await prismaClient.profile.findUnique({ where: { userId: testUserId } });
        
        expect(profile?.cfRating).toBe(1500);
        
        // FIX: Codeforces is at index 21 (Leetcode is 20)
        expect(profile?.skillVector?.[21]).toBeCloseTo(0.428, 2); 
    });

    it("should throw an error and fail the job if an external API fails (404/Rate Limit)", async () => {
        expect(
            processProfileSync({
                data: { userId: testUserId, handle: "invalid-handle", platform: "codeforces" }
            })
        ).rejects.toThrow(/Failed to fetch data/);

        const profile = await prismaClient.profile.findUnique({ where: { userId: testUserId } });
        expect(profile?.cfRating).toBeNull();
        
        // Assert Kafka was NOT called because the process rejected cleanly
        expect(mockPublish).not.toHaveBeenCalled();
    });
});