"use client";

import {
  DSA_GOALS,
  DSA_PROVIDER_PREFERENCES,
  SKILL_LANGUAGES,
  type DsaIntentConfigurationInput,
} from "@devmatch/shared";
import { PreferenceMultiSelect } from "./PreferenceMultiSelect";

export function DsaIntentForm({
  value,
  onChange,
}: {
  value: DsaIntentConfigurationInput;
  onChange: (value: DsaIntentConfigurationInput) => void;
}) {
  const updateSearch = (search: Partial<DsaIntentConfigurationInput["search"]>) =>
    onChange({ ...value, search: { ...value.search, ...search } });
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">What I can contribute</h3>
        <PreferenceMultiSelect legend="DSA languages" values={SKILL_LANGUAGES} selected={value.offer.languages} onChange={(languages) => onChange({ ...value, offer: { ...value.offer, languages } })} />
        <PreferenceMultiSelect legend="Goals" values={DSA_GOALS} selected={value.offer.goals} onChange={(goals) => onChange({ ...value, offer: { ...value.offer, goals } })} />
      </section>
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-white">What I need from a partner</h3>
        <PreferenceMultiSelect legend="Required languages" values={SKILL_LANGUAGES} selected={value.search.requiredLanguages} onChange={(requiredLanguages) => updateSearch({ requiredLanguages })} />
        <PreferenceMultiSelect legend="Required goals" values={DSA_GOALS} selected={value.search.requiredGoals} onChange={(requiredGoals) => updateSearch({ requiredGoals })} />
        <PreferenceMultiSelect legend="Nice-to-have languages" values={SKILL_LANGUAGES} selected={value.search.niceToHaveLanguages} onChange={(niceToHaveLanguages) => updateSearch({ niceToHaveLanguages })} />
        <PreferenceMultiSelect legend="Nice-to-have goals" values={DSA_GOALS} selected={value.search.niceToHaveGoals} onChange={(niceToHaveGoals) => updateSearch({ niceToHaveGoals })} />
        <label className="block text-[12px] text-muted">
          Rating provider
          <select value={value.search.providerPreference} onChange={(event) => updateSearch({ providerPreference: event.target.value as DsaIntentConfigurationInput["search"]["providerPreference"] })} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-ink">
            {DSA_PROVIDER_PREFERENCES.map((provider) => <option key={provider}>{provider}</option>)}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {(value.search.providerPreference === "CODEFORCES" || value.search.providerPreference === "EITHER") && (
            <>
              <NumberField label="CF minimum" value={value.search.codeforcesRatingMin} onChange={(codeforcesRatingMin) => updateSearch({ codeforcesRatingMin })} />
              <NumberField label="CF maximum" value={value.search.codeforcesRatingMax} onChange={(codeforcesRatingMax) => updateSearch({ codeforcesRatingMax })} />
            </>
          )}
          {(value.search.providerPreference === "LEETCODE" || value.search.providerPreference === "EITHER") && (
            <>
              <NumberField label="LC best rank" value={value.search.leetcodeGlobalRankBest} onChange={(leetcodeGlobalRankBest) => updateSearch({ leetcodeGlobalRankBest })} />
              <NumberField label="LC worst rank" value={value.search.leetcodeGlobalRankWorst} onChange={(leetcodeGlobalRankWorst) => updateSearch({ leetcodeGlobalRankWorst })} />
            </>
          )}
        </div>
        <p className="text-[11px] text-muted">LeetCode global rank: lower is better.</p>
      </section>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value?: number; onChange: (value?: number) => void }) {
  return (
    <label className="text-[11px] text-muted">
      {label}
      <input type="number" value={value ?? ""} onChange={(event) => onChange(event.target.value ? Number(event.target.value) : undefined)} className="mt-1 w-full rounded-lg border border-border bg-bg px-3 py-2 text-ink" />
    </label>
  );
}
