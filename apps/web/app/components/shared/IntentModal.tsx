"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import type { IntentState, IntentType } from "@/lib/types";

const INTENTS: { id: IntentType; label: string; desc: string }[] = [
  { id: "DSA", label: "DSA Partner", desc: "Find someone to practice LeetCode and algorithms with." },
  { id: "HACKATHON", label: "Hackathon", desc: "Find teammates for an upcoming hackathon." },
  { id: "PROJECT", label: "Project", desc: "Build a side project with compatible collaborators." },
  { id: "OPENSOURCE", label: "Open Source", desc: "Contribute to open source with GitHub-backed matches." },
];

export function IntentModal({ onClose }: { onClose: () => void }) {
  const token = useToken();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<IntentType | null>(null);

  const mutation = useMutation({
    mutationFn: (intentType: IntentType) =>
      apiFetch<IntentState>("/users/me/search-intent", {
        token,
        method: "PUT",
        body: {
          intentType,
          preferredLanguages: [],
          preferredDomains: [],
        },
      }),
    onSuccess: (state) => {
      queryClient.setQueryData(["users", "me", "intents"], state);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["similar"] });
      onClose();
    },
    onSettled: () => setLoading(null),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">What are you looking for now?</h2>
          <p className="text-[#A1A1AA] text-sm mb-8">
            This changes your current search without overwriting what you are open to receiving.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {INTENTS.map((intent) => (
              <button
                key={intent.id}
                onClick={() => {
                  setLoading(intent.id);
                  mutation.mutate(intent.id);
                }}
                disabled={mutation.isPending}
                className="group relative p-6 text-left bg-[#171717] hover:bg-[#262626] border border-[#262626] hover:border-[#3F3F46] rounded-xl transition-all disabled:opacity-50"
              >
                <div className="text-white font-medium mb-2">{intent.label}</div>
                <div className="text-[#A1A1AA] text-xs leading-relaxed">{intent.desc}</div>
                {loading === intent.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#171717]/60 rounded-xl">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>
          <div className="flex justify-center">
            <button onClick={onClose} disabled={mutation.isPending} className="text-[#A1A1AA] hover:text-white text-sm font-medium">
              Skip for now &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
