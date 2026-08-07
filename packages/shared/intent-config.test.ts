import { describe, expect, test } from 'bun:test';
import {
    countNiceToHaveMatches,
    deriveRoleEvidence,
    evaluateConfigurationCompleteness,
    normalizeRepositoryTopics,
    requiredGroupsMatch,
    type DsaIntentConfigurationInput,
    type ProjectIntentConfigurationInput,
} from './index';

const completeDsaConfiguration: DsaIntentConfigurationInput = {
    intentType: 'DSA',
    offer: {
        languages: ['cpp'],
        goals: ['COMPETITIVE_PROGRAMMING'],
    },
    search: {
        requiredLanguages: ['cpp'],
        requiredGoals: ['COMPETITIVE_PROGRAMMING'],
        niceToHaveLanguages: [],
        niceToHaveGoals: [],
        providerPreference: 'CODEFORCES',
    },
};

describe('intent configuration helpers', () => {
    test('reports exact DSA completeness issues', () => {
        const completeness = evaluateConfigurationCompleteness({
            ...completeDsaConfiguration,
            offer: { languages: [], goals: [] },
            search: {
                ...completeDsaConfiguration.search,
                requiredLanguages: [],
                requiredGoals: [],
            },
        });

        expect(completeness).toEqual({
            offerComplete: false,
            searchComplete: false,
            offerIssues: ['offer.languages', 'offer.goals'],
            searchIssues: ['search.requiredLanguages', 'search.requiredGoals'],
        });
    });

    test('requires a technical capability for Project offers', () => {
        const configuration: ProjectIntentConfigurationInput = {
            intentType: 'PROJECT',
            offer: {
                roles: ['FRONTEND'],
                languages: [],
                frameworks: [],
                domains: [],
            },
            search: {
                collaborationMode: 'SIMILAR',
                requiredRoles: ['FRONTEND'],
                requiredLanguages: [],
                requiredFrameworks: [],
                requiredDomains: [],
                niceToHaveRoles: [],
                niceToHaveLanguages: [],
                niceToHaveFrameworks: [],
                niceToHaveDomains: [],
            },
        };

        expect(evaluateConfigurationCompleteness(configuration).offerIssues).toEqual([
            'offer.technicalCapabilities',
        ]);
    });

    test('normalizes repository topics', () => {
        expect(normalizeRepositoryTopics([' Machine-Learning ', 'machine-learning', 'NEXT.JS'])).toEqual([
            'machine-learning',
            'next.js',
        ]);
    });

    test('matches any value within each required group and all non-empty groups', () => {
        expect(
            requiredGroupsMatch([
                { required: ['BACKEND', 'ML_AI'], offered: ['ML_AI'] },
                { required: ['python', 'rust'], offered: ['python'] },
                { required: [], offered: [] },
            ]),
        ).toBe(true);
        expect(
            requiredGroupsMatch([
                { required: ['BACKEND', 'ML_AI'], offered: ['ML_AI'] },
                { required: ['python', 'rust'], offered: ['typescript'] },
            ]),
        ).toBe(false);
    });

    test('counts nice-to-have groups and values without filtering', () => {
        expect(
            countNiceToHaveMatches([
                { required: ['python', 'rust'], offered: ['python', 'rust'] },
                { required: ['ml'], offered: ['web'] },
                { required: [], offered: ['react'] },
            ]),
        ).toEqual({
            matchedGroupCount: 1,
            totalGroupCount: 2,
            matchedValueCount: 2,
        });
    });

    test('derives verified and self-reported role evidence deterministically', () => {
        expect(
            deriveRoleEvidence(['FRONTEND', 'PRODUCT'], {
                languages: ['typescript'],
                frameworks: ['react'],
                domains: ['web'],
                repositoryTopics: [],
            }),
        ).toEqual([
            { category: 'ROLE', value: 'FRONTEND', source: 'VERIFIED' },
            { category: 'ROLE', value: 'PRODUCT', source: 'SELF_REPORTED' },
        ]);
    });
});
