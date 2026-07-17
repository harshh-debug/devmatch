import {
  prismaClient,
  ActionType,
  Availability,
  CollaborationMode,
  CollaborationRole,
  DsaGoal,
  DsaProviderPreference,
  IntentType,
  MatchStatus,
  OpenSourceContributionType,
} from "../index.ts";
import * as bcrypt from "bcrypt";
import crypto from "crypto";
import {
  buildSkillVector,
  classifyCanonicalSkills,
  normalizeSkillTags,
} from "@devmatch/shared";

const prisma = prismaClient;

const COLLEGES = ["MIT", "Stanford", "Waterloo", "IIT Bombay", "UC Berkeley", "CMU", null];
const SKILLS = [
  "React", "Node.js", "Python", "C++", "Java", "Go", "Rust", "TypeScript", 
  "Machine Learning", "System Design", "Algorithms"
];

async function main() {
  console.log("Cleaning up database...");
  await prisma.message.deleteMany();
  await prisma.chatRoom.deleteMany();
  await prisma.matchAction.deleteMany();
  await prisma.match.deleteMany();
  await prisma.outboxEvent.deleteMany();
  await prisma.openToIntent.deleteMany();
  await prisma.searchIntent.deleteMany();
  await prisma.intentConfiguration.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  console.log("Seeding Database...");

  const hashedPassword = await bcrypt.hash("password123", 12);

  // 1. Create Main Test User
  const mainUser = await prisma.user.create({
    data: {
      email: "test@example.com",
      username: "testuser",
      password: hashedPassword,
      displayName: "Test Developer",
      avatarUrl: "https://github.com/shadcn.png",
      college: "Stanford",
      bio: "Looking for open source contributors and hackathon teammates.",
      availability: Availability.ACTIVE,
      profile: {
        create: {
          githubUsername: "testuser_gh",
          leetcodeHandle: "testuser_lc",
          codeforcesHandle: "testuser_cf",
          lcTotalSolved: 450,
          lcEasySolved: 200,
          lcMediumSolved: 200,
          lcHardSolved: 50,
          topLanguages: ["TypeScript", "Python"],
          skillTags: normalizeSkillTags(["React", "Node.js", "Python", "Algorithms"]),
          githubStars: 120,
          contributionStreak: 45,
          githubTopics: ["react", "node"],
          githubLastSyncedAt: new Date(),
          githubContributions: [
            { days: [{ date: "2026-07-14", count: 4 }, { date: "2026-07-15", count: 2 }] },
          ],
          lcRating: 1850,
          cfRating: 1600,
          skillVector: buildSkillVector({
            skillTags: ["React", "Node.js", "Python", "Algorithms"],
            lcRating: 1850,
            cfRating: 1600,
          }),
          profileScore: 85,
        }
      },
      searchIntent: {
        create: {
          intentType: IntentType.DSA,
        },
      },
      intentConfigurations: {
        create: [
          {
            intentType: IntentType.DSA,
            offeredLanguages: ["cpp", "python"],
            offeredDsaGoals: [DsaGoal.INTERVIEW_PREP, DsaGoal.COMPETITIVE_PROGRAMMING],
            requiredLanguages: ["cpp", "python"],
            requiredDsaGoals: [DsaGoal.INTERVIEW_PREP],
            niceToHaveLanguages: ["rust"],
            dsaProviderPreference: DsaProviderPreference.EITHER,
            codeforcesRatingMin: 1200,
            codeforcesRatingMax: 1900,
            leetcodeGlobalRankBest: 1,
            leetcodeGlobalRankWorst: 100000,
          },
          {
            intentType: IntentType.PROJECT,
            offeredLanguages: ["typescript", "python"],
            offeredFrameworks: ["react", "node"],
            offeredDomains: ["web"],
            offeredRoles: [CollaborationRole.FULL_STACK],
            requiredRoles: [CollaborationRole.ML_AI],
            requiredLanguages: ["python"],
            requiredDomains: ["ml"],
            niceToHaveFrameworks: ["django"],
            collaborationMode: CollaborationMode.COMPLEMENTARY,
          },
          {
            intentType: IntentType.HACKATHON,
            offeredLanguages: ["typescript", "python"],
            offeredFrameworks: ["react", "node"],
            offeredDomains: ["web"],
            offeredRoles: [CollaborationRole.FRONTEND, CollaborationRole.BACKEND],
            requiredRoles: [CollaborationRole.BACKEND, CollaborationRole.ML_AI],
            requiredLanguages: ["python", "typescript"],
            niceToHaveDomains: ["ml"],
            collaborationMode: CollaborationMode.EITHER,
          },
          {
            intentType: IntentType.OPENSOURCE,
            offeredLanguages: ["typescript", "python"],
            offeredFrameworks: ["react", "node"],
            offeredRepositoryTopics: ["react", "node"],
            offeredContributionTypes: [
              OpenSourceContributionType.CODE,
              OpenSourceContributionType.PROJECT_MAINTENANCE,
            ],
            requiredLanguages: ["typescript", "python"],
            requiredContributionTypes: [OpenSourceContributionType.CODE],
            niceToHaveRepositoryTopics: ["react"],
          },
        ],
      },
      openToIntents: {
        create: [
          { intentType: IntentType.HACKATHON },
          { intentType: IntentType.OPENSOURCE },
        ],
      },
    }
  });

  console.log("Created Main User:", mainUser.email);

  // 2. Create Candidate Users
  const candidates = [];
  for (let i = 1; i <= 15; i++) {
    const rawSkillTags = [
      SKILLS[i % SKILLS.length]!,
      SKILLS[(i + 1) % SKILLS.length]!,
      SKILLS[(i + 2) % SKILLS.length]!,
    ];
    const skillTags = normalizeSkillTags(rawSkillTags);
    const canonicalSkills = classifyCanonicalSkills(skillTags);
    const offeredLanguages = canonicalSkills.languages.length > 0 ? canonicalSkills.languages : ["cpp"];
    const offeredFrameworks = canonicalSkills.frameworks;
    const offeredDomains = canonicalSkills.domains;
    const projectLanguages = i === 2 ? ["python"] : offeredLanguages;
    const projectDomains = i === 2 ? ["ml"] : offeredDomains;
    const projectRoles = i === 2
      ? [CollaborationRole.ML_AI]
      : [
          offeredDomains.includes("ml")
            ? CollaborationRole.ML_AI
            : offeredFrameworks.includes("node")
              ? CollaborationRole.BACKEND
              : CollaborationRole.FRONTEND,
        ];
    const lcRating = 20000 + (i * 5000);
    const cfRating = 1000 + (i * 50);
    const activeIntent = i % 2 === 0 ? IntentType.PROJECT : IntentType.DSA;
    const user = await prisma.user.create({
      data: {
        email: `candidate${i}@example.com`,
        username: `candidate${i}`,
        password: hashedPassword,
        displayName: `Candidate Developer ${i}`,
        avatarUrl: `https://i.pravatar.cc/150?u=${i}`,
        college: COLLEGES[i % COLLEGES.length],
        bio: `Hello! I am candidate ${i} ready to build.`,
        availability: i % 3 === 0 ? Availability.BUSY : Availability.ACTIVE,
        profile: {
          create: {
            githubUsername: `candidate${i}_gh`,
            leetcodeHandle: i % 2 === 0 ? `candidate${i}_lc` : null,
            codeforcesHandle: i % 3 === 0 ? `candidate${i}_cf` : null,
            lcTotalSolved: 100 + (i * 20),
            topLanguages: rawSkillTags.slice(0, 2),
            skillTags,
            githubStars: i * 25,
            contributionStreak: i * 3,
            githubTopics: normalizeSkillTags(rawSkillTags.slice(1)),
            githubLastSyncedAt: new Date(),
            githubContributions: [
              { days: [{ date: "2026-07-14", count: i }, { date: "2026-07-15", count: i % 4 }] },
            ],
            lcRating,
            cfRating,
            skillVector: buildSkillVector({ skillTags, lcRating, cfRating }),
            profileScore: 50 + (i * 3),
          }
        },
        searchIntent: {
          create: { intentType: activeIntent },
        },
        intentConfigurations: {
          create: [
            {
              intentType: IntentType.DSA,
              offeredLanguages,
              offeredDsaGoals: [
                i % 2 === 0 ? DsaGoal.INTERVIEW_PREP : DsaGoal.COMPETITIVE_PROGRAMMING,
              ],
              requiredLanguages: offeredLanguages.slice(0, 2),
              requiredDsaGoals: [
                i % 2 === 0 ? DsaGoal.INTERVIEW_PREP : DsaGoal.COMPETITIVE_PROGRAMMING,
              ],
              niceToHaveLanguages: ["cpp"],
              dsaProviderPreference:
                i % 2 === 0
                  ? DsaProviderPreference.LEETCODE
                  : DsaProviderPreference.CODEFORCES,
            },
            {
              intentType: IntentType.PROJECT,
              offeredLanguages: projectLanguages,
              offeredFrameworks,
              offeredDomains: projectDomains,
              offeredRoles: projectRoles,
              requiredRoles: [
                i % 4 === 0 ? CollaborationRole.ML_AI : CollaborationRole.FRONTEND,
              ],
              requiredLanguages: offeredLanguages.slice(0, 2),
              niceToHaveFrameworks: offeredFrameworks,
              collaborationMode:
                i % 4 === 0
                  ? CollaborationMode.COMPLEMENTARY
                  : CollaborationMode.SIMILAR,
            },
            ...(i % 2 === 0
              ? [{
                  intentType: IntentType.OPENSOURCE,
                  offeredLanguages,
                  offeredFrameworks,
                  offeredDomains,
                  offeredRepositoryTopics: normalizeSkillTags(rawSkillTags.slice(1)),
                  offeredContributionTypes: [OpenSourceContributionType.CODE],
                  requiredLanguages: offeredLanguages.slice(0, 1),
                  requiredContributionTypes: [OpenSourceContributionType.CODE],
                }]
              : []),
          ],
        },
        openToIntents: {
          create: [
            { intentType: IntentType.DSA },
            { intentType: IntentType.PROJECT },
            ...(i % 2 === 0 ? [{ intentType: IntentType.OPENSOURCE }] : []),
          ]
        }
      }
    });
    candidates.push(user);
  }

  console.log("Created 15 Candidates");

  // 3. Create Interactions (Matches, Actions, ChatRooms)
  // Mutual Matches (1 to 3)
  for (let i = 0; i < 3; i++) {
    const target = candidates[i]!;
    
    // Actions
    await prisma.matchAction.createMany({
      data: [
        { actorId: mainUser.id, targetId: target.id, action: ActionType.ACCEPTED, intentType: IntentType.DSA, connectionContext: "DSA" },
        { actorId: target.id, targetId: mainUser.id, action: ActionType.ACCEPTED, intentType: IntentType.DSA, connectionContext: "DSA" },
      ]
    });

    const [userAId, userBId] = mainUser.id < target.id ? [mainUser.id, target.id] : [target.id, mainUser.id];
    
    // Match
    const match = await prisma.match.create({
      data: {
        userAId,
        userBId,
        similarityScore: 0.85 + (i * 0.05),
        intentType: IntentType.DSA,
        connectionContext: "DSA",
        status: MatchStatus.MATCHED,
        matchedAt: new Date(),
        initiatedBy: mainUser.id,
        chatRoom: {
          create: {}
        }
      },
      include: { chatRoom: true }
    });

    // Messages
    if (match.chatRoom) {
      await prisma.message.createMany({
        data: [
          { chatRoomId: match.chatRoom.id, senderId: mainUser.id, content: "Hey! Want to practice some DP problems?", clientMessageId: crypto.randomUUID() },
          { chatRoomId: match.chatRoom.id, senderId: target.id, content: "Sure, let's do it!", clientMessageId: crypto.randomUUID() }
        ]
      });
    }
    await prisma.connectionPair.create({ data: { pairKey: `${userAId}:${userBId}`, userAId, userBId, connectionContext: "DSA", status: "MATCHED" } });
  }

  // Pending Requests to Main User (4 to 6)
  for (let i = 3; i < 6; i++) {
    const target = candidates[i]!;
    await prisma.matchAction.create({
      data: { actorId: target.id, targetId: mainUser.id, action: ActionType.ACCEPTED, intentType: IntentType.HACKATHON, connectionContext: "HACKATHON" }
    });
    const [userAId, userBId] = mainUser.id < target.id ? [mainUser.id, target.id] : [target.id, mainUser.id];
    await prisma.connectionPair.create({ data: { pairKey: `${userAId}:${userBId}`, userAId, userBId, connectionContext: "HACKATHON", status: "PENDING" } });
  }

  // Rejected by Main User (7 to 8)
  for (let i = 6; i < 8; i++) {
    const target = candidates[i]!;
    await prisma.matchAction.create({
      data: { actorId: mainUser.id, targetId: target.id, action: ActionType.REJECTED, intentType: IntentType.DSA, connectionContext: "DSA" }
    });
  }

  console.log("Seeding complete! You can log in with test@example.com / password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
