"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

export default function RequestsPage() {
  const token = useToken();
  const queryClient = useQueryClient();

  const { data: requests = [] } = useQuery({
    queryKey: ["match", "requests"],
    queryFn: () => apiFetch<any[]>("/match/requests", { token }),
    enabled: !!token,
  });

  const actionMutation = useMutation({
    mutationFn: ({ targetId, action }: { targetId: string; action: "ACCEPTED" | "REJECTED" }) =>
      apiFetch("/match/action", {
        token,
        method: "POST",
        body: { targetId, action },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", "requests"] });
    },
  });

  const handleAction = (id: string, action: "ACCEPTED" | "REJECTED") => {
    actionMutation.mutate({ targetId: id, action });
  };


  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Requests
        </h1>
        <p className="text-[13px] text-muted mt-0.5">
          Developers who liked your profile
        </p>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface border border-border flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
            </svg>
          </div>
          <h2 className="font-display font-semibold text-[18px] text-ink tracking-tight mb-2">
            No pending requests
          </h2>
          <p className="text-[13px] text-muted max-w-sm mx-auto leading-relaxed">
            Expand your profile visibility to attract co-builders. Sync your
            GitHub and LeetCode to improve your match score.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-bg border border-border rounded-xl p-4 sm:p-5"
            >
              <div className="flex items-start gap-3.5">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                  style={{
                    backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                    color: "var(--color-ink)",
                  }}
                  aria-hidden="true"
                >
                  {req.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">
                      {req.name}
                    </h3>
                    <span className="text-[11px] text-muted">{req.college}</span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {req.intent}
                    </span>
                    <span className="text-[11px] text-muted ml-auto">
                      {req.received}
                    </span>
                  </div>

                  <p className="text-[12px] text-muted mt-0.5">{req.role}</p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {req.skills.map((s) => (
                      <span
                        key={s}
                        className={`px-2 py-0.5 text-[10px] rounded-full border ${
                          req.mutualSkills.includes(s)
                            ? "border-primary/30 text-primary bg-primary/5"
                            : "border-border text-muted"
                        }`}
                      >
                        {s}
                        {req.mutualSkills.includes(s) && " ★"}
                      </span>
                    ))}
                  </div>

                  {/* LeetCode */}
                  <div className="mt-2.5 flex items-center gap-2">
                    <span className="text-[10px] text-muted">LC</span>
                    <span className="font-mono text-[13px] text-ink tabular-nums">
                      {req.leetcode}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => handleAction(req.id, "REJECTED")}
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-lg border border-border text-muted hover:text-danger hover:border-danger/30 transition-colors duration-fast disabled:opacity-50"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleAction(req.id, "ACCEPTED")}
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}