"use client";

import {
  OPEN_SOURCE_CONTRIBUTION_TYPES,
  SKILL_DOMAINS,
  SKILL_FRAMEWORKS,
  SKILL_LANGUAGES,
  type OpenSourceIntentConfigurationInput,
  type VerifiedCapabilities,
} from "@devmatch/shared";
import { PreferenceMultiSelect } from "./PreferenceMultiSelect";

export function OpenSourceIntentForm({
  value,
  verified,
  githubUsable,
  onChange,
}: {
  value: OpenSourceIntentConfigurationInput;
  verified: VerifiedCapabilities;
  githubUsable: boolean;
  onChange: (value: OpenSourceIntentConfigurationInput) => void;
}) {
  const updateOffer = (offer: Partial<OpenSourceIntentConfigurationInput["offer"]>) => onChange({ ...value, offer: { ...value.offer, ...offer } });
  const updateSearch = (search: Partial<OpenSourceIntentConfigurationInput["search"]>) => onChange({ ...value, search: { ...value.search, ...search } });
  return (
    <div className="space-y-6">
      {!githubUsable && <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-[12px] text-amber-300">Connect and sync GitHub before activating Open Source matching. Contribution-type drafts can still be saved.</p>}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">My GitHub-backed offer</h3>
        <PreferenceMultiSelect legend="Verified languages" values={verified.languages} selected={value.offer.languages} onChange={(languages) => updateOffer({ languages })} />
        <PreferenceMultiSelect legend="Verified frameworks" values={verified.frameworks} selected={value.offer.frameworks} onChange={(frameworks) => updateOffer({ frameworks })} />
        <PreferenceMultiSelect legend="Verified domains" values={verified.domains} selected={value.offer.domains} onChange={(domains) => updateOffer({ domains })} />
        <PreferenceMultiSelect legend="Repository topics" values={verified.repositoryTopics} selected={value.offer.repositoryTopics} onChange={(repositoryTopics) => updateOffer({ repositoryTopics })} />
        <PreferenceMultiSelect legend="Contribution types" values={OPEN_SOURCE_CONTRIBUTION_TYPES} selected={value.offer.contributionTypes} onChange={(contributionTypes) => updateOffer({ contributionTypes })} />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">What I need from a contributor</h3>
        <PreferenceMultiSelect legend="Required languages" values={SKILL_LANGUAGES} selected={value.search.requiredLanguages} onChange={(requiredLanguages) => updateSearch({ requiredLanguages })} />
        <PreferenceMultiSelect legend="Required frameworks" values={SKILL_FRAMEWORKS} selected={value.search.requiredFrameworks} onChange={(requiredFrameworks) => updateSearch({ requiredFrameworks })} />
        <PreferenceMultiSelect legend="Required domains" values={SKILL_DOMAINS} selected={value.search.requiredDomains} onChange={(requiredDomains) => updateSearch({ requiredDomains })} />
        <PreferenceMultiSelect legend="Required topics" values={verified.repositoryTopics} selected={value.search.requiredRepositoryTopics} onChange={(requiredRepositoryTopics) => updateSearch({ requiredRepositoryTopics })} />
        <PreferenceMultiSelect legend="Required contribution types" values={OPEN_SOURCE_CONTRIBUTION_TYPES} selected={value.search.requiredContributionTypes} onChange={(requiredContributionTypes) => updateSearch({ requiredContributionTypes })} />
        <PreferenceMultiSelect legend="Nice-to-have languages" values={SKILL_LANGUAGES} selected={value.search.niceToHaveLanguages} onChange={(niceToHaveLanguages) => updateSearch({ niceToHaveLanguages })} />
        <PreferenceMultiSelect legend="Nice-to-have frameworks" values={SKILL_FRAMEWORKS} selected={value.search.niceToHaveFrameworks} onChange={(niceToHaveFrameworks) => updateSearch({ niceToHaveFrameworks })} />
        <PreferenceMultiSelect legend="Nice-to-have domains" values={SKILL_DOMAINS} selected={value.search.niceToHaveDomains} onChange={(niceToHaveDomains) => updateSearch({ niceToHaveDomains })} />
        <PreferenceMultiSelect legend="Nice-to-have topics" values={verified.repositoryTopics} selected={value.search.niceToHaveRepositoryTopics} onChange={(niceToHaveRepositoryTopics) => updateSearch({ niceToHaveRepositoryTopics })} />
        <PreferenceMultiSelect legend="Nice-to-have contribution types" values={OPEN_SOURCE_CONTRIBUTION_TYPES} selected={value.search.niceToHaveContributionTypes} onChange={(niceToHaveContributionTypes) => updateSearch({ niceToHaveContributionTypes })} />
      </section>
    </div>
  );
}
