"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import type { IntentState, IntentType } from "@/lib/types";
import { IntentModal } from "@/app/components/shared/IntentModal";

const INTENTS: { id: IntentType; label: string }[] = [
  { id: "DSA", label: "DSA practice" },
  { id: "HACKATHON", label: "Hackathons" },
  { id: "PROJECT", label: "Projects" },
  { id: "OPENSOURCE", label: "Open source" },
];

export function IntentSettings() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<{ intent: IntentType; mode: "edit" | "offer-only"; desired?: IntentType[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: state } = useQuery({
    queryKey: ["users", "me", "intents"],
    queryFn: () => apiFetch<IntentState>("/users/me/intents", { token }),
    enabled: !!token,
  });

  const mutation = useMutation({
    mutationFn: (intentTypes: IntentType[]) =>
      apiFetch<IntentState>("/users/me/open-to", {
        token,
        method: "PUT",
        body: { intentTypes },
      }),
    onSuccess: (nextState) => {
      setError(null);
      queryClient.setQueryData(["users", "me", "intents"], nextState);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["similar"] });
    },
    onError: (failure) => setError(failure instanceof ApiError ? failure.message : "Could not update inbound intents."),
  });

  function toggle(intent: IntentType, checked: boolean) {
    if (!state) return;
    const desired = checked
      ? [...new Set([...state.openToIntents, intent])]
      : state.openToIntents.filter((value) => value !== intent);
    if (checked && !state.configurations[intent]?.completeness.offerComplete) {
      setEditing({ intent, mode: "offer-only", desired });
      return;
    }
    mutation.mutate(desired);
  }

  return (
    <section className="bg-bg border border-border rounded-xl p-5">
      {editing && (
        <IntentModal
          initialIntent={editing.intent}
          mode={editing.mode}
          onClose={() => setEditing(null)}
          onSaved={(nextState) => {
            if (editing.desired && nextState.configurations[editing.intent]?.completeness.offerComplete) {
              mutation.mutate(editing.desired);
            }
          }}
        />
      )}
      <h2 className="text-[13px] font-medium text-ink">Matching intents</h2>
      <p className="mt-1 text-[11px] text-muted">Each intent retains its own offer and partner preferences.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {INTENTS.map((intent) => {
          const configuration = state?.configurations[intent.id];
          const active = state?.searchIntentType === intent.id;
          const open = state?.openToIntents.includes(intent.id) ?? false;
          return (
            <article key={intent.id} className="rounded-xl border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[13px] font-medium text-ink">{intent.label}</h3>
                  <p className="mt-1 text-[11px] text-muted">
                    Offer: {configuration?.completeness.offerComplete ? "configured" : configuration ? "needs update" : "not configured"}
                    {" · "}
                    Search: {configuration?.completeness.searchComplete ? "configured" : configuration ? "draft" : "not configured"}
                  </p>
                </div>
                {active && <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] text-primary">active</span>}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <label className="flex items-center gap-2 text-[11px] text-ink">
                  <input type="checkbox" checked={open || active} disabled={active || mutation.isPending} onChange={(event) => toggle(intent.id, event.target.checked)} />
                  Open to inbound
                </label>
                <button onClick={() => setEditing({ intent: intent.id, mode: "edit" })} className="text-[11px] font-medium text-primary">Edit</button>
              </div>
            </article>
          );
        })}
      </div>
      {error && <p className="mt-3 text-[11px] text-red-500">{error}</p>}
    </section>
  );
}
