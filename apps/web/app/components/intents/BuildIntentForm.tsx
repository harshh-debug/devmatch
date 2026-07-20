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
        <p className="text-[11px] text-muted">Domains are the primary filter. Roles, languages, and frameworks broaden results; matching more of your selections ranks a developer higher.</p>
        <PreferenceMultiSelect legend="Matching domains" values={SKILL_DOMAINS} selected={value.search.requiredDomains} onChange={(requiredDomains) => updateSearch({ requiredDomains })} />
        <PreferenceMultiSelect legend="Matching languages" values={SKILL_LANGUAGES} selected={value.search.requiredLanguages} onChange={(requiredLanguages) => updateSearch({ requiredLanguages })} />
        <PreferenceMultiSelect legend="Matching frameworks" values={SKILL_FRAMEWORKS} selected={value.search.requiredFrameworks} onChange={(requiredFrameworks) => updateSearch({ requiredFrameworks })} />
        <PreferenceMultiSelect legend="Matching roles" values={COLLABORATION_ROLES} selected={value.search.requiredRoles} onChange={(requiredRoles) => updateSearch({ requiredRoles })} />
      </section>
    </div>
  );
}
