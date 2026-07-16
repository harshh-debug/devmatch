"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import type { IntentState, IntentType } from "@/lib/types";

const INTENTS: { id: IntentType; label: string }[] = [
  { id: "DSA", label: "DSA practice" },
  { id: "HACKATHON", label: "Hackathons" },
  { id: "PROJECT", label: "Projects" },
  { id: "OPENSOURCE", label: "Open source" },
];

export function IntentSettings() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<IntentType[]>([]);
  const { data: state } = useQuery({
    queryKey: ["users", "me", "intents"],
    queryFn: () => apiFetch<IntentState>("/users/me/intents", { token }),
    enabled: !!token,
  });

  useEffect(() => {
    if (state) setSelected(state.openToIntents);
  }, [state]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<IntentState>("/users/me/open-to", {
        token,
        method: "PUT",
        body: { intentTypes: selected },
      }),
    onSuccess: (nextState) => {
      queryClient.setQueryData(["users", "me", "intents"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["similar"] });
    },
  });

  return (
    <section className="bg-bg border border-border rounded-xl p-5">
      <h2 className="text-[13px] font-medium text-ink">Matching intents</h2>
      <div className="mt-4">
        <p className="text-[11px] uppercase tracking-wide text-muted">Looking for now</p>
        <p className="text-[13px] text-ink mt-1">
          {state?.searchIntent
            ? INTENTS.find((intent) => intent.id === state.searchIntent?.intentType)?.label
            : "No current search intent"}
        </p>
        <p className="text-[11px] text-muted mt-1">
          Your current search intent is always enabled for inbound matching.
        </p>
      </div>
      <div className="mt-5">
        <p className="text-[11px] uppercase tracking-wide text-muted">Open to being contacted for</p>
        <div className="grid sm:grid-cols-2 gap-2 mt-2">
          {INTENTS.map((intent) => {
            const implicit = state?.searchIntent?.intentType === intent.id;
            const checked = selected.includes(intent.id) || implicit;
            return (
              <label key={intent.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[12px] text-ink">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={implicit}
                  onChange={(event) =>
                    setSelected((current) =>
                      event.target.checked
                        ? [...new Set([...current, intent.id])]
                        : current.filter((value) => value !== intent.id),
                    )
                  }
                />
                <span>{intent.label}</span>
                {implicit && <span className="ml-auto text-[10px] text-muted">current</span>}
              </label>
            );
          })}
        </div>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="mt-3 px-3 py-2 text-[12px] rounded-lg bg-primary text-white disabled:opacity-60"
        >
          {mutation.isPending ? "Saving…" : "Save inbound intents"}
        </button>
      </div>
    </section>
  );
}
