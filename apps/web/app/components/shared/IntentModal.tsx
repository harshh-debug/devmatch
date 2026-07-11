"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

const INTENTS = [
  { id: "DSA", label: "DSA Partner", desc: "Find someone to practice LeetCode and algorithms with." },
  { id: "HACKATHON", label: "Hackathon", desc: "Looking for teammates for an upcoming hackathon." },
  { id: "PROJECT", label: "Project", desc: "Want to build a side project and need collaborators." },
  { id: "OPENSOURCE", label: "Open Source", desc: "Looking to contribute to open source together." }
];

export function IntentModal({ onClose }: { onClose: () => void }) {
  const token = useToken();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (intentType: string) =>
      apiFetch("/users/me/intent", {
        token,
        method: "POST",
        body: { intentType },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", "candidates"] });
      onClose();
    },
  });

  const handleSelect = (intentType: string) => {
    setLoading(intentType);
    mutation.mutate(intentType);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl bg-[#0A0A0A] border border-[#262626] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-8">
          <h2 className="text-2xl font-semibold text-white tracking-tight mb-2">What are you looking for?</h2>
          <p className="text-[#A1A1AA] text-sm mb-8">Select your primary intent to help us find the best matches for you right now.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {INTENTS.map((intent) => (
              <button
                key={intent.id}
                onClick={() => handleSelect(intent.id)}
                disabled={mutation.isPending}
                className="group relative p-6 text-left bg-[#171717] hover:bg-[#262626] border border-[#262626] hover:border-[#3F3F46] rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-white font-medium mb-2">{intent.label}</div>
                <div className="text-[#A1A1AA] text-xs leading-relaxed">{intent.desc}</div>
                {loading === intent.id && (
                  <div className="absolute inset-0 flex items-center justify-center bg-[#171717]/50 rounded-xl">
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={onClose}
              disabled={mutation.isPending}
              className="text-[#A1A1AA] hover:text-white text-sm font-medium transition-colors"
            >
              Skip for now &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
