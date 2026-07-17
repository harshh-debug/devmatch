export interface VectorProfile {
    skillTags?: string[] | null;
    lcRating?: number | null;
    cfRating?: number | null;
}

export type IntentType = 'DSA' | 'HACKATHON' | 'PROJECT' | 'OPENSOURCE';
export type ConnectionContext = IntentType | 'GENERAL';
export const CONNECTION_CONTEXTS = ['DSA', 'HACKATHON', 'PROJECT', 'OPENSOURCE', 'GENERAL'] as const;
export type Compatibility = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN';
export type LevelSource = 'CODEFORCES' | 'LEETCODE' | 'MIXED_CP' | 'GITHUB' | 'UNKNOWN';
export const INTENT_TYPES = ['DSA', 'HACKATHON', 'PROJECT', 'OPENSOURCE'] as const;
export const COLLABORATION_MODES = ['SIMILAR', 'COMPLEMENTARY', 'EITHER'] as const;
export const RESOLVED_MATCH_MODES = ['SIMILAR', 'COMPLEMENTARY', 'DIRECT'] as const;
export const COLLABORATION_ROLES = [
    'FRONTEND',
    'BACKEND',
    'FULL_STACK',
    'MOBILE',
    'ML_AI',
    'DATA',
    'DEVOPS_CLOUD',
    'BLOCKCHAIN',
    'UI_UX',
    'TESTING_QA',
    'PRODUCT',
] as const;
export const DSA_GOALS = ['INTERVIEW_PREP', 'COMPETITIVE_PROGRAMMING'] as const;
export const DSA_PROVIDER_PREFERENCES = ['CODEFORCES', 'LEETCODE', 'EITHER'] as const;
export const OPEN_SOURCE_CONTRIBUTION_TYPES = [
    'CODE',
    'DOCUMENTATION',
    'TESTING',
    'DEVOPS_CI',
    'DESIGN',
    'ISSUE_TRIAGE',
    'PROJECT_MAINTENANCE',
] as const;
export const CAPABILITY_EVIDENCE_SOURCES = ['SELF_REPORTED', 'VERIFIED'] as const;

export type CollaborationMode = (typeof COLLABORATION_MODES)[number];
export type ResolvedMatchMode = (typeof RESOLVED_MATCH_MODES)[number];
export type CollaborationRole = (typeof COLLABORATION_ROLES)[number];
export type DsaGoal = (typeof DSA_GOALS)[number];
export type DsaProviderPreference = (typeof DSA_PROVIDER_PREFERENCES)[number];
export type OpenSourceContributionType = (typeof OPEN_SOURCE_CONTRIBUTION_TYPES)[number];
export type CapabilityEvidenceSource = (typeof CAPABILITY_EVIDENCE_SOURCES)[number];

export interface ConfigurationCompleteness {
    offerComplete: boolean;
    searchComplete: boolean;
    offerIssues: string[];
    searchIssues: string[];
}

export interface VerifiedCapabilities {
    languages: string[];
    frameworks: string[];
    domains: string[];
    repositoryTopics: string[];
}

export interface CapabilityEvidence {
    category: 'ROLE' | 'LANGUAGE' | 'FRAMEWORK' | 'DOMAIN' | 'TOPIC';
    value: string;
    source: CapabilityEvidenceSource;
}

export interface IntentConfigurationMetadata {
    availableVerifiedCapabilities: VerifiedCapabilities;
    offerEvidence: CapabilityEvidence[];
}

export interface DsaOfferProfile {
    languages: string[];
    goals: DsaGoal[];
}

export interface DsaSearchPreferences {
    requiredLanguages: string[];
    requiredGoals: DsaGoal[];
    niceToHaveLanguages: string[];
    niceToHaveGoals: DsaGoal[];
    providerPreference: DsaProviderPreference;
    codeforcesRatingMin?: number;
    codeforcesRatingMax?: number;
    leetcodeGlobalRankBest?: number;
    leetcodeGlobalRankWorst?: number;
}

export interface BuildOfferProfile {
    roles: CollaborationRole[];
    languages: string[];
    frameworks: string[];
    domains: string[];
}

export interface BuildSearchPreferences {
    collaborationMode: CollaborationMode;
    requiredRoles: CollaborationRole[];
    requiredLanguages: string[];
    requiredFrameworks: string[];
    requiredDomains: string[];
    niceToHaveRoles: CollaborationRole[];
    niceToHaveLanguages: string[];
    niceToHaveFrameworks: string[];
    niceToHaveDomains: string[];
}

export interface OpenSourceOfferProfile {
    languages: string[];
    frameworks: string[];
    domains: string[];
    repositoryTopics: string[];
    contributionTypes: OpenSourceContributionType[];
}

export interface OpenSourceSearchPreferences {
    requiredLanguages: string[];
    requiredFrameworks: string[];
    requiredDomains: string[];
    requiredRepositoryTopics: string[];
    requiredContributionTypes: OpenSourceContributionType[];
    niceToHaveLanguages: string[];
    niceToHaveFrameworks: string[];
    niceToHaveDomains: string[];
    niceToHaveRepositoryTopics: string[];
    niceToHaveContributionTypes: OpenSourceContributionType[];
}

export interface DsaIntentConfigurationInput {
    intentType: 'DSA';
    offer: DsaOfferProfile;
    search: DsaSearchPreferences;
}

export interface ProjectIntentConfigurationInput {
    intentType: 'PROJECT';
    offer: BuildOfferProfile;
    search: BuildSearchPreferences;
}

export interface HackathonIntentConfigurationInput {
    intentType: 'HACKATHON';
    offer: BuildOfferProfile;
    search: BuildSearchPreferences;
}

export interface OpenSourceIntentConfigurationInput {
    intentType: 'OPENSOURCE';
    offer: OpenSourceOfferProfile;
    search: OpenSourceSearchPreferences;
}

export type IntentConfigurationInput =
    | DsaIntentConfigurationInput
    | ProjectIntentConfigurationInput
    | HackathonIntentConfigurationInput
    | OpenSourceIntentConfigurationInput;

type ConfigurationResult<T extends IntentConfigurationInput> = T & {
    completeness: ConfigurationCompleteness;
    metadata: IntentConfigurationMetadata;
    updatedAt: string;
};

export type DsaIntentConfiguration = ConfigurationResult<DsaIntentConfigurationInput>;
export type ProjectIntentConfiguration = ConfigurationResult<ProjectIntentConfigurationInput>;
export type HackathonIntentConfiguration = ConfigurationResult<HackathonIntentConfigurationInput>;
export type OpenSourceIntentConfiguration = ConfigurationResult<OpenSourceIntentConfigurationInput>;
export type IntentConfiguration =
    | DsaIntentConfiguration
    | ProjectIntentConfiguration
    | HackathonIntentConfiguration
    | OpenSourceIntentConfiguration;

export interface IntentState {
    searchIntent: IntentConfiguration | null;
    searchIntentType: IntentType | null;
    configurations: Partial<Record<IntentType, IntentConfiguration>>;
    openToIntents: IntentType[];
    effectiveOpenToIntents: IntentType[];
    revision: number;
}

export interface NiceToHaveMatch {
    matchedGroupCount: number;
    totalGroupCount: number;
    matchedValueCount: number;
}

export interface CandidateExplanation {
    technicalFitScore: number;
    similarityScore: number;
    compatibility: Compatibility;
    levelBand: 'NEAR' | 'MID' | 'FAR' | 'UNKNOWN';
    levelSource: LevelSource;
    resolvedMatchMode: ResolvedMatchMode;
    matchedSkills: string[];
    matchedLanguages: string[];
    matchedFrameworks: string[];
    matchedDomains: string[];
    matchedRoles: CollaborationRole[];
    matchedGoals: DsaGoal[];
    matchedContributionTypes: OpenSourceContributionType[];
    matchedRepositoryTopics: string[];
    niceToHave: NiceToHaveMatch;
    capabilityEvidence: CapabilityEvidence[];
    reasonCodes: string[];
}

export interface MatchPreferencesUpdatedV1 {
    eventId: string;
    schemaVersion: 1;
    eventType: 'MATCH_PREFERENCES_UPDATED';
    userId: string;
    revision: number;
    occurredAt: string;
}

export const SKILL_VECTOR_VERSION = 1;

export const SKILL_LANGUAGES = ['typescript','javascript','python','java','cpp','go','rust','kotlin'] as const;
export const SKILL_FRAMEWORKS = ['react','node','django','spring','flutter','nextjs'] as const;
export const SKILL_DOMAINS = ['dsa','web','ml','mobile','devops','blockchain'] as const;
const LANGUAGES = SKILL_LANGUAGES;
const FRAMEWORKS = SKILL_FRAMEWORKS;
const DOMAINS = SKILL_DOMAINS;
export const SKILL_VECTOR_DIMENSIONS = LANGUAGES.length + FRAMEWORKS.length + DOMAINS.length + 2;
export const SKILL_VECTOR_FEATURE_DIMENSIONS = LANGUAGES.length + FRAMEWORKS.length + DOMAINS.length;
export const SKILL_LANGUAGE_INDICES = LANGUAGES.map((_, index) => index);
export const SKILL_TECHNICAL_INDICES = Array.from(
    { length: SKILL_VECTOR_FEATURE_DIMENSIONS },
    (_, index) => index,
);

/** Maps UI labels and provider-specific spellings to the matching taxonomy. */
const SKILL_ALIASES: Record<string, string> = {
    ts: 'typescript',
    js: 'javascript',
    'node.js': 'node',
    nodejs: 'node',
    express: 'node',
    reactjs: 'react',
    'react.js': 'react',
    'next.js': 'nextjs',
    'c++': 'cpp',
    'machine learning': 'ml',
    'machine-learning': 'ml',
    'artificial intelligence': 'ml',
    ai: 'ml',
    algorithms: 'dsa',
    algorithm: 'dsa',
    'data structures': 'dsa',
    'web development': 'web',
    'web3': 'blockchain',
    aws: 'devops',
    docker: 'devops',
    kubernetes: 'devops',
};

export function normalizeSkillTags(rawTags: readonly string[] | null | undefined): string[] {
    const normalized = new Set<string>();
    for (const rawTag of rawTags ?? []) {
        const tag = rawTag.trim().toLowerCase();
        if (!tag) continue;
        normalized.add(SKILL_ALIASES[tag] ?? tag);
    }
    return [...normalized];
}

export function normalizePreferredLanguages(rawTags: readonly string[] | null | undefined): string[] {
    const languages = new Set<string>(LANGUAGES);
    return normalizeSkillTags(rawTags).filter((tag) => languages.has(tag));
}

export function normalizePreferredDomains(rawTags: readonly string[] | null | undefined): string[] {
    const domains = new Set<string>(DOMAINS);
    return normalizeSkillTags(rawTags).filter((tag) => domains.has(tag));
}

export const normalizeLanguages = normalizePreferredLanguages;

export function normalizeFrameworks(rawTags: readonly string[] | null | undefined): string[] {
    const frameworks = new Set<string>(FRAMEWORKS);
    return normalizeSkillTags(rawTags).filter((tag) => frameworks.has(tag));
}

export const normalizeDomains = normalizePreferredDomains;

export function normalizeRepositoryTopics(rawTopics: readonly string[] | null | undefined): string[] {
    const normalized = new Set<string>();
    for (const rawTopic of rawTopics ?? []) {
        const topic = rawTopic.trim().toLowerCase();
        if (topic) normalized.add(topic);
    }
    return [...normalized];
}

export function classifyCanonicalSkills(rawTags: readonly string[] | null | undefined) {
    const tags = normalizeSkillTags(rawTags);
    const languageSet = new Set<string>(LANGUAGES);
    const frameworkSet = new Set<string>(FRAMEWORKS);
    const domainSet = new Set<string>(DOMAINS);
    return {
        all: tags.filter((tag) => languageSet.has(tag) || frameworkSet.has(tag) || domainSet.has(tag)),
        languages: tags.filter((tag) => languageSet.has(tag)),
        frameworks: tags.filter((tag) => frameworkSet.has(tag)),
        domains: tags.filter((tag) => domainSet.has(tag)),
    };
}

export function projectSkillVector(vector: readonly number[], indices: readonly number[]): number[] {
    return indices.map((index) => vector[index] ?? 0);
}

export interface ConfigurationCompletenessContext {
    githubUsable?: boolean;
    verifiedCapabilities?: Partial<VerifiedCapabilities>;
}

function hasAny(values: readonly unknown[]): boolean {
    return values.length > 0;
}

function isSubset(selected: readonly string[], available: readonly string[]): boolean {
    const availableSet = new Set(available);
    return selected.every((value) => availableSet.has(value));
}

export function evaluateConfigurationCompleteness(
    configuration: IntentConfigurationInput,
    context: ConfigurationCompletenessContext = {},
): ConfigurationCompleteness {
    const offerIssues: string[] = [];
    const searchIssues: string[] = [];

    if (configuration.intentType === 'DSA') {
        if (!hasAny(configuration.offer.languages)) offerIssues.push('offer.languages');
        if (!hasAny(configuration.offer.goals)) offerIssues.push('offer.goals');
        if (!hasAny(configuration.search.requiredLanguages)) searchIssues.push('search.requiredLanguages');
        if (!hasAny(configuration.search.requiredGoals)) searchIssues.push('search.requiredGoals');
        if (!configuration.search.providerPreference) searchIssues.push('search.providerPreference');
        if (
            configuration.search.codeforcesRatingMin !== undefined &&
            configuration.search.codeforcesRatingMax !== undefined &&
            configuration.search.codeforcesRatingMin > configuration.search.codeforcesRatingMax
        ) {
            searchIssues.push('search.codeforcesRatingRange');
        }
        if (
            configuration.search.leetcodeGlobalRankBest !== undefined &&
            configuration.search.leetcodeGlobalRankWorst !== undefined &&
            configuration.search.leetcodeGlobalRankBest > configuration.search.leetcodeGlobalRankWorst
        ) {
            searchIssues.push('search.leetcodeGlobalRankRange');
        }
    } else if (configuration.intentType === 'PROJECT' || configuration.intentType === 'HACKATHON') {
        if (!hasAny(configuration.offer.roles)) offerIssues.push('offer.roles');
        if (
            !hasAny(configuration.offer.languages) &&
            !hasAny(configuration.offer.frameworks) &&
            !hasAny(configuration.offer.domains)
        ) {
            offerIssues.push('offer.technicalCapabilities');
        }
        if (!configuration.search.collaborationMode) searchIssues.push('search.collaborationMode');
        if (
            !hasAny(configuration.search.requiredRoles) &&
            !hasAny(configuration.search.requiredLanguages) &&
            !hasAny(configuration.search.requiredFrameworks) &&
            !hasAny(configuration.search.requiredDomains)
        ) {
            searchIssues.push('search.requiredCapabilities');
        }
    } else {
        const verified: VerifiedCapabilities = {
            languages: context.verifiedCapabilities?.languages ?? [],
            frameworks: context.verifiedCapabilities?.frameworks ?? [],
            domains: context.verifiedCapabilities?.domains ?? [],
            repositoryTopics: context.verifiedCapabilities?.repositoryTopics ?? [],
        };
        const selectedTechnicalCount =
            configuration.offer.languages.length +
            configuration.offer.frameworks.length +
            configuration.offer.domains.length +
            configuration.offer.repositoryTopics.length;

        if (!context.githubUsable) offerIssues.push('offer.githubData');
        if (
            !configuration.offer.contributionTypes.length &&
            selectedTechnicalCount === 0
        ) {
            offerIssues.push('offer.capabilities');
        }
        if (
            !isSubset(configuration.offer.languages, verified.languages) ||
            !isSubset(configuration.offer.frameworks, verified.frameworks) ||
            !isSubset(configuration.offer.domains, verified.domains) ||
            !isSubset(configuration.offer.repositoryTopics, verified.repositoryTopics)
        ) {
            offerIssues.push('offer.unverifiedCapabilities');
        }
        if (
            !configuration.search.requiredLanguages.length &&
            !configuration.search.requiredFrameworks.length &&
            !configuration.search.requiredDomains.length &&
            !configuration.search.requiredRepositoryTopics.length &&
            !configuration.search.requiredContributionTypes.length
        ) {
            searchIssues.push('search.requiredCapabilities');
        }
    }

    return {
        offerComplete: offerIssues.length === 0,
        searchComplete: searchIssues.length === 0,
        offerIssues,
        searchIssues,
    };
}

export interface CapabilityGroup {
    required: readonly string[];
    offered: readonly string[];
}

export function requiredGroupsMatch(groups: readonly CapabilityGroup[]): boolean {
    return groups.every(({ required, offered }) => {
        if (required.length === 0) return true;
        const offeredSet = new Set(offered);
        return required.some((value) => offeredSet.has(value));
    });
}

export function countNiceToHaveMatches(groups: readonly CapabilityGroup[]): NiceToHaveMatch {
    let matchedGroupCount = 0;
    let matchedValueCount = 0;
    let totalGroupCount = 0;

    for (const { required: preferred, offered } of groups) {
        if (preferred.length === 0) continue;
        totalGroupCount += 1;
        const offeredSet = new Set(offered);
        const matches = preferred.filter((value) => offeredSet.has(value));
        if (matches.length > 0) matchedGroupCount += 1;
        matchedValueCount += matches.length;
    }

    return { matchedGroupCount, totalGroupCount, matchedValueCount };
}

function verifiedRoles(capabilities: VerifiedCapabilities): Set<CollaborationRole> {
    const frameworks = new Set(capabilities.frameworks);
    const domains = new Set(capabilities.domains);
    const topics = new Set(capabilities.repositoryTopics);
    const roles = new Set<CollaborationRole>();

    const frontend = frameworks.has('react') || frameworks.has('nextjs');
    const backend = frameworks.has('node') || frameworks.has('django') || frameworks.has('spring');
    if (frontend) roles.add('FRONTEND');
    if (backend) roles.add('BACKEND');
    if (frontend && backend) roles.add('FULL_STACK');
    if (frameworks.has('flutter')) roles.add('MOBILE');
    if (domains.has('ml') || topics.has('machine-learning') || topics.has('artificial-intelligence')) {
        roles.add('ML_AI');
    }
    if (domains.has('devops') || topics.has('devops') || topics.has('cloud')) {
        roles.add('DEVOPS_CLOUD');
    }
    if (domains.has('blockchain') || topics.has('blockchain') || topics.has('web3')) {
        roles.add('BLOCKCHAIN');
    }

    return roles;
}

export function deriveRoleEvidence(
    roles: readonly CollaborationRole[],
    capabilities: VerifiedCapabilities,
): CapabilityEvidence[] {
    const verified = verifiedRoles(capabilities);
    return roles.map((role) => ({
        category: 'ROLE',
        value: role,
        source: verified.has(role) ? 'VERIFIED' : 'SELF_REPORTED',
    }));
}

/** Converts a lower-is-better LeetCode global rank into a bounded skill score. */
function normalizeLeetCodeGlobalRank(rank: number | null | undefined): number {
    if (!rank || rank < 1) return 0;
    // Log scaling preserves meaningful differences at strong ranks without
    // allowing a large absolute rank to overpower the skill dimensions.
    return 1 / (1 + Math.log10(rank));
}

export function buildSkillVector(profile: VectorProfile): number[] {
    const tags = normalizeSkillTags(profile.skillTags);

    // 1 for matching tag, 0 for missing
    const langVector = LANGUAGES.map(l => tags.includes(l) ? 1 : 0);
    const frameVector = FRAMEWORKS.map(f => tags.includes(f) ? 1 : 0);
    const domainVector = DOMAINS.map(d => tags.includes(d) ? 1 : 0);

    // Normalize ratings
    // `lcRating` currently stores LeetCode's global rank, where lower is better.
    const lcNorm = normalizeLeetCodeGlobalRank(profile.lcRating);
    const cfNorm = profile.cfRating ? profile.cfRating / 3500 : 0;

    return [...langVector, ...frameVector, ...domainVector, lcNorm, cfNorm];
}
