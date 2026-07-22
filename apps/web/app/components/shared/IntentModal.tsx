"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { IntentConfiguration, IntentConfigurationInput, IntentState, IntentType } from "@devmatch/shared";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import { DsaIntentForm } from "@/app/components/intents/DsaIntentForm";
import { BuildIntentForm } from "@/app/components/intents/BuildIntentForm";
import { OpenSourceIntentForm } from "@/app/components/intents/OpenSourceIntentForm";

const INTENTS: { id: IntentType; label: string; desc: string }[] = [
  { id: "DSA", label: "DSA Partner", desc: "Practice interviews or competitive programming." },
  { id: "HACKATHON", label: "Hackathon", desc: "Find teammates with similar or complementary strengths." },
  { id: "PROJECT", label: "Project", desc: "Build with collaborators who match what the project needs." },
  { id: "OPENSOURCE", label: "Open Source", desc: "Use GitHub-verified ecosystems and contribution types." },
];

function emptyConfiguration(intentType: IntentType): IntentConfigurationInput {
  if (intentType === "DSA") {
    return {
      intentType,
      offer: { languages: [], goals: [] },
      search: {
        requiredLanguages: [],
        requiredGoals: [],
        niceToHaveLanguages: [],
        niceToHaveGoals: [],
        providerPreference: "EITHER",
      },
    };
  }
  if (intentType === "PROJECT" || intentType === "HACKATHON") {
    return {
      intentType,
      offer: { roles: [], languages: [], frameworks: [], domains: [] },
      search: {
        collaborationMode: "EITHER",
        requiredRoles: [],
        requiredLanguages: [],
        requiredFrameworks: [],
        requiredDomains: [],
        niceToHaveRoles: [],
        niceToHaveLanguages: [],
        niceToHaveFrameworks: [],
        niceToHaveDomains: [],
      },
    };
  }
  return {
    intentType,
    offer: { languages: [], frameworks: [], domains: [], repositoryTopics: [], contributionTypes: [] },
    search: {
      requiredLanguages: [],
      requiredFrameworks: [],
      requiredDomains: [],
      requiredRepositoryTopics: [],
      requiredContributionTypes: [],
      niceToHaveLanguages: [],
      niceToHaveFrameworks: [],
      niceToHaveDomains: [],
      niceToHaveRepositoryTopics: [],
      niceToHaveContributionTypes: [],
    },
  };
}

function toInput(configuration: IntentConfiguration): IntentConfigurationInput {
  return {
    intentType: configuration.intentType,
    offer: configuration.offer,
    search: configuration.search,
  } as IntentConfigurationInput;
}

export function IntentModal({
  onClose,
  initialIntent,
  mode = "activate",
  onSaved,
}: {
  onClose: () => void;
  initialIntent?: IntentType;
  mode?: "activate" | "edit" | "offer-only";
  onSaved?: (state: IntentState) => void;
}) {
  const token = useToken();
  const queryClient = useQueryClient();
  const [selectedIntent, setSelectedIntent] = useState<IntentType | null>(initialIntent ?? null);
  const [configuration, setConfiguration] = useState<IntentConfigurationInput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: state } = useQuery({
    queryKey: ["users", "me", "intents"],
    queryFn: () => apiFetch<IntentState>("/users/me/intents", { token }),
    enabled: !!token,
  });

  useEffect(() => {
    if (!selectedIntent || !state) return;
    setConfiguration(
      state.configurations[selectedIntent]
        ? toInput(state.configurations[selectedIntent]!)
        : emptyConfiguration(selectedIntent),
    );
  }, [selectedIntent, state]);

  const verified = useMemo(() => {
    const existing = selectedIntent ? state?.configurations[selectedIntent] : undefined;
    return existing?.metadata.availableVerifiedCapabilities ??
      Object.values(state?.configurations ?? {})[0]?.metadata.availableVerifiedCapabilities ?? {
        languages: [],
        frameworks: [],
        domains: [],
        repositoryTopics: [],
      };
  }, [selectedIntent, state]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedIntent || !configuration) throw new Error("Choose an intent.");
      if (mode === "activate") {
        return apiFetch<IntentState>("/users/me/search-intent", {
          token,
          method: "PUT",
          body: { intentType: selectedIntent, configuration },
        });
      }
      return apiFetch<IntentState>(`/users/me/intent-configurations/${selectedIntent}`, {
        token,
        method: "PUT",
        body: configuration,
      });
    },
    onSuccess: (nextState) => {
      queryClient.setQueryData(["users", "me", "intents"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      onSaved?.(nextState);
      onClose();
    },
    onError: (failure) => {
      setError(failure instanceof ApiError ? failure.message : "Could not save this configuration.");
    },
  });

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="intent-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="max-h-[calc(100dvh-2rem)] w-full max-w-3xl overflow-y-auto rounded-2xl border border-[#262626] bg-[#0A0A0A] shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 id="intent-title" className="text-2xl font-semibold text-white tracking-tight">
                {mode === "activate" ? "Configure your current search" : "Edit intent configuration"}
              </h2>
              <p className="text-[#A1A1AA] text-sm mt-1">Offer details control inbound eligibility. Search preferences only apply when this intent is active.</p>
            </div>
            <button onClick={onClose} className="text-muted hover:text-white" aria-label="Close">✕</button>
          </div>

          {!selectedIntent ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {INTENTS.map((intent) => (
                <button key={intent.id} onClick={() => setSelectedIntent(intent.id)} className="p-5 text-left bg-[#171717] hover:bg-[#262626] border border-[#262626] rounded-xl">
                  <div className="text-white font-medium mb-2">{intent.label}</div>
                  <div className="text-[#A1A1AA] text-xs">{intent.desc}</div>
                </button>
              ))}
            </div>
          ) : configuration ? (
            <div className="mt-7">
              <button onClick={() => setSelectedIntent(null)} className="mb-5 text-[12px] text-muted hover:text-white">← Choose another intent</button>
              {configuration.intentType === "DSA" && <DsaIntentForm value={configuration} onChange={setConfiguration} />}
              {(configuration.intentType === "PROJECT" || configuration.intentType === "HACKATHON") && <BuildIntentForm value={configuration} onChange={setConfiguration} />}
              {configuration.intentType === "OPENSOURCE" && (
                <OpenSourceIntentForm
                  value={configuration}
                  verified={verified}
                  githubUsable={!state?.configurations.OPENSOURCE?.completeness.offerIssues.includes("offer.githubData")}
                  onChange={setConfiguration}
                />
              )}
              {error && <p className="mt-5 text-[12px] text-red-400">{error}</p>}
              <div className="mt-7 flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
                <button onClick={onClose} className="rounded-lg px-4 py-2 text-[12px] text-muted sm:w-auto">Cancel</button>
                <button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full rounded-lg bg-primary px-5 py-2 text-[12px] font-medium text-white disabled:opacity-50 sm:w-auto">
                  {mutation.isPending ? "Saving…" : mode === "activate" ? "Save and activate" : "Save configuration"}
                </button>
              </div>
            </div>
          ) : (
            <p className="mt-8 text-muted">Loading saved configuration…</p>
          )}
        </div>
      </div>
    </div>
  );
}
