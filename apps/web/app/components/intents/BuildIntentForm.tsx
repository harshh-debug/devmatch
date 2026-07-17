"use client";

import {
  COLLABORATION_MODES,
  COLLABORATION_ROLES,
  SKILL_DOMAINS,
  SKILL_FRAMEWORKS,
  SKILL_LANGUAGES,
  type HackathonIntentConfigurationInput,
  type ProjectIntentConfigurationInput,
} from "@devmatch/shared";
import { PreferenceMultiSelect } from "./PreferenceMultiSelect";

type BuildConfiguration = ProjectIntentConfigurationInput | HackathonIntentConfigurationInput;

export function BuildIntentForm({ value, onChange }: { value: BuildConfiguration; onChange: (value: BuildConfiguration) => void }) {
  const updateOffer = (offer: Partial<BuildConfiguration["offer"]>) => onChange({ ...value, offer: { ...value.offer, ...offer } } as BuildConfiguration);
  const updateSearch = (search: Partial<BuildConfiguration["search"]>) => onChange({ ...value, search: { ...value.search, ...search } } as BuildConfiguration);
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">What I can contribute</h3>
        <PreferenceMultiSelect legend="Roles" values={COLLABORATION_ROLES} selected={value.offer.roles} onChange={(roles) => updateOffer({ roles })} />
        <PreferenceMultiSelect legend="Languages" values={SKILL_LANGUAGES} selected={value.offer.languages} onChange={(languages) => updateOffer({ languages })} />
        <PreferenceMultiSelect legend="Frameworks" values={SKILL_FRAMEWORKS} selected={value.offer.frameworks} onChange={(frameworks) => updateOffer({ frameworks })} />
        <PreferenceMultiSelect legend="Domains" values={SKILL_DOMAINS} selected={value.offer.domains} onChange={(domains) => updateOffer({ domains })} />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">What I need from a teammate</h3>
        <label className="block text-[12px] text-muted">Matching mode
          <select value={value.search.collaborationMode} onChange={(event) => updateSearch({ collaborationMode: event.target.value as BuildConfiguration["search"]["collaborationMode"] })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-ink">
            {COLLABORATION_MODES.map((mode) => <option key={mode}>{mode}</option>)}
          </select>
        </label>
        <p className="text-[11px] text-muted">Values within a group use OR; separate required groups use AND.</p>
        <PreferenceMultiSelect legend="Required roles" values={COLLABORATION_ROLES} selected={value.search.requiredRoles} onChange={(requiredRoles) => updateSearch({ requiredRoles })} />
        <PreferenceMultiSelect legend="Required languages" values={SKILL_LANGUAGES} selected={value.search.requiredLanguages} onChange={(requiredLanguages) => updateSearch({ requiredLanguages })} />
        <PreferenceMultiSelect legend="Required frameworks" values={SKILL_FRAMEWORKS} selected={value.search.requiredFrameworks} onChange={(requiredFrameworks) => updateSearch({ requiredFrameworks })} />
        <PreferenceMultiSelect legend="Required domains" values={SKILL_DOMAINS} selected={value.search.requiredDomains} onChange={(requiredDomains) => updateSearch({ requiredDomains })} />
        <PreferenceMultiSelect legend="Nice-to-have roles" values={COLLABORATION_ROLES} selected={value.search.niceToHaveRoles} onChange={(niceToHaveRoles) => updateSearch({ niceToHaveRoles })} />
        <PreferenceMultiSelect legend="Nice-to-have languages" values={SKILL_LANGUAGES} selected={value.search.niceToHaveLanguages} onChange={(niceToHaveLanguages) => updateSearch({ niceToHaveLanguages })} />
        <PreferenceMultiSelect legend="Nice-to-have frameworks" values={SKILL_FRAMEWORKS} selected={value.search.niceToHaveFrameworks} onChange={(niceToHaveFrameworks) => updateSearch({ niceToHaveFrameworks })} />
        <PreferenceMultiSelect legend="Nice-to-have domains" values={SKILL_DOMAINS} selected={value.search.niceToHaveDomains} onChange={(niceToHaveDomains) => updateSearch({ niceToHaveDomains })} />
      </section>
    </div>
  );
}
