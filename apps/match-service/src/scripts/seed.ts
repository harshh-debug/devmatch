import prismaClient, { Availability, IntentType } from "db/client"; // Adjust import if needed



async function main() {
    console.log("🧹 Clearing old test data...");
    await prismaClient.matchAction.deleteMany();
    await prismaClient.match.deleteMany();
    await prismaClient.matchIntent.deleteMany();
    await prismaClient.profile.deleteMany();
    await prismaClient.user.deleteMany();

    console.log("🌱 Seeding Test Personas...");

    // Skill Vector Legend: [React/Next, Node/Express, AWS/Cloud, Python, C++]
    const protagonistVector = [0.9, 0.8, 0.7, 0.1, 0.4]; 
    const perfectVector = [0.8, 0.9, 0.6, 0.2, 0.5]; // Highly similar
    const mismatchedVector = [0.1, 0.1, 0.1, 0.9, 0.9]; // Completely different

    // 1. The Protagonist (You)
    const protagonist = await prismaClient.user.create({
        data: {
            email: "protagonist@kiet.edu",
            username: "harsh_j",
            displayName: "Harsh",
            college: "KIET Group of Institutions",
            availability: Availability.ACTIVE,
            profile: {
                create: { skillVector: protagonistVector, profileScore: 85, cfRating: 1500 }
            },
            intents: {
                create: [{ intentType: IntentType.DSA }, { intentType: IntentType.PROJECT }]
            }
        }
    });

    // 2. The Perfect Match (High similarity, correct intent, correct rating bracket)
    await prismaClient.user.create({
        data: {
            email: "perfect@test.com", username: "perfect_match", displayName: "Aman (Perfect)",
            availability: Availability.ACTIVE,
            profile: { create: { skillVector: perfectVector, profileScore: 90, cfRating: 1550 } },
            intents: { create: [{ intentType: IntentType.DSA }] }
        }
    });

    // 3. The Out-of-League (High similarity, correct intent, but rating is WAY too high)
    await prismaClient.user.create({
        data: {
            email: "out_of_league@test.com", username: "out_of_league", displayName: "Rahul (Pro)",
            availability: Availability.ACTIVE,
            profile: { create: { skillVector: perfectVector, profileScore: 95, cfRating: 2200 } },
            intents: { create: [{ intentType: IntentType.DSA }] }
        }
    });

    // 4. The Ghost (Vector is all zeros, score is 15 - MUST NOT APPEAR IN REDIS)
    await prismaClient.user.create({
        data: {
            email: "ghost@test.com", username: "ghost_dev", displayName: "Ghost User",
            availability: Availability.ACTIVE,
            profile: { create: { skillVector: [0, 0, 0, 0, 0], profileScore: 15, cfRating: 1400 } },
            intents: { create: [{ intentType: IntentType.DSA }] }
        }
    });

    // 5. The Busy Bee (Perfect match, but availability is BUSY)
    await prismaClient.user.create({
        data: {
            email: "busy@test.com", username: "busy_bee", displayName: "Busy User",
            availability: Availability.BUSY, // MUST BE FILTERED OUT
            profile: { create: { skillVector: perfectVector, profileScore: 80, cfRating: 1450 } },
            intents: { create: [{ intentType: IntentType.DSA }] }
        }
    });

    // 6. The Wrong Room (Perfect match, but wants Hackathons, not DSA)
    await prismaClient.user.create({
        data: {
            email: "wrong@test.com", username: "wrong_room", displayName: "Hackathon User",
            availability: Availability.ACTIVE,
            profile: { create: { skillVector: perfectVector, profileScore: 85, cfRating: 1500 } },
            intents: { create: [{ intentType: IntentType.HACKATHON }] } // WRONG INTENT
        }
    });

    console.log("✅ Seeding complete!");
    console.log(`🔑 PROTAGONIST ID: ${protagonist.id}`);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
}).finally(async () => {
    await prismaClient.$disconnect();
});