"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

const INTENTS = ["All", "Hackathon", "DSA Partner", "Project", "Open Source"];

export default function DiscoverPage() {
  const token = useToken();
  const queryClient = useQueryClient();
  const [activeIntent, setActiveIntent] = useState("All");
  const [filterOpen, setFilterOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["match", "candidates", activeIntent],
    queryFn: () =>
      apiFetch<{ candidates: any[]; relaxed: boolean; similar?: any[] }>(
        `/match/candidates?intentType=${
          activeIntent === "All" ? "DSA" : activeIntent
        }&limit=20`,
        { token }
      ),
    enabled: !!token,
  });

  const actionMutation = useMutation({
    mutationFn: ({ targetId, action }: { targetId: string; action: "ACCEPTED" | "REJECTED" }) =>
      apiFetch("/match/action", {
        token,
        method: "POST",
        body: { targetId, action, intentType: activeIntent === "All" ? "DSA" : activeIntent },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["match", "candidates"] });
    },
  });

  const filtered = data?.candidates || [];
  const relaxed = data?.relaxed || false;


  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
            Discover
          </h1>
          <p className="text-[13px] text-muted mt-0.5">
            Find developers who match your intent
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Intent pill */}
          <div className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface border border-border">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span className="text-[12px] font-medium text-ink">
              {activeIntent === "All" ? "Hackathon" : activeIntent}
            </span>
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`p-2 rounded-lg border transition-colors duration-fast ${
              filterOpen
                ? "border-primary text-primary bg-primary/5"
                : "border-border text-muted hover:text-ink hover:border-ink/30"
            }`}
            aria-label="Toggle filters"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="8" y1="12" x2="20" y2="12" />
              <line x1="12" y1="18" x2="20" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Intent tabs - mobile scrollable */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-6 scrollbar-none">
        {INTENTS.map((intent) => (
          <button
            key={intent}
            onClick={() => {
              setActiveIntent(intent);
            }}
            className={`shrink-0 px-3.5 py-1.5 text-[12px] font-medium rounded-full transition-colors duration-fast ${
              activeIntent === intent
                ? "bg-primary text-bg"
                : "bg-surface border border-border text-muted hover:text-ink hover:border-ink/30"
            }`}
          >
            {intent}
          </button>
        ))}
      </div>

      {/* Relaxed banner */}
      {relaxed && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-info-bg border border-info/20 text-[13px] text-info">
          We widened your search criteria to surface more candidates.
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter drawer */}
        {filterOpen && (
          <div className="w-full sm:w-56 shrink-0 space-y-5 p-4 sm:p-0">
            <div className="sm:sticky sm:top-6 space-y-5">
              {/* Rating range */}
              <div>
                <p className="text-[11px] text-muted tracking-wide mb-3">
                  RATING RANGE
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="text-[12px] text-ink block mb-1">
                      Min LeetCode
                    </label>
                    <input
                      type="range"
                      min="1200"
                      max="2500"
                      defaultValue="1200"
                      className="w-full accent-primary"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] text-ink block mb-1">
                      Max LeetCode
                    </label>
                    <input
                      type="range"
                      min="1200"
                      max="2500"
                      defaultValue="2500"
                      className="w-full accent-primary"
                    />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div>
                <p className="text-[11px] text-muted tracking-wide mb-3">
                  AVAILABILITY
                </p>
                <div className="space-y-1.5">
                  {["Any", "This weekend", "Weekends", "Evenings", "Flexible"].map(
                    (a) => (
                      <label
                        key={a}
                        className="flex items-center gap-2.5 text-[13px] text-ink cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          defaultChecked={a === "Any"}
                          className="accent-primary w-3.5 h-3.5 rounded"
                        />
                        {a}
                      </label>
                    )
                  )}
                </div>
              </div>

              {/* Colleges */}
              <div>
                <p className="text-[11px] text-muted tracking-wide mb-3">
                  COLLEGES
                </p>
                <input
                  type="text"
                  placeholder="Search colleges..."
                  className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring"
                />
              </div>
            </div>
          </div>
        )}

        {/* Candidate feed */}
        <div className="flex-1 space-y-3">
          {filtered.map((candidate, index) => (
            <div
              key={candidate.id}
              className="group relative bg-bg border border-border rounded-xl p-4 sm:p-5 hover:border-ink/20 transition-colors duration-normal"
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
                  {candidate.avatar}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">
                      {candidate.name}
                    </h3>
                    <span className="text-[11px] text-muted">
                      {candidate.college}
                    </span>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {candidate.intent}
                    </span>
                  </div>

                  <p className="text-[12px] text-muted mt-0.5">
                    {candidate.role}
                  </p>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {candidate.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-[10px] text-muted">COMPATIBILITY</p>
                      <p className="font-mono font-semibold text-[16px] text-ink tabular-nums">
                        {candidate.similarity}
                        <span className="text-[10px] text-muted">%</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">LEETCODE</p>
                      <p className="font-mono text-[14px] text-ink tabular-nums">
                        {candidate.leetcode}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">CODEFORCES</p>
                      <p className="font-mono text-[14px] text-ink tabular-nums">
                        {candidate.codeforces}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted">AVAILABLE</p>
                      <p className="text-[12px] text-ink">{candidate.availability}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <button
                  onClick={() => actionMutation.mutate({ targetId: candidate.id, action: "REJECTED" })}
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2 text-[12px] font-medium rounded-lg border border-border text-muted hover:text-ink hover:bg-surface transition-colors duration-fast disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  onClick={() => actionMutation.mutate({ targetId: candidate.id, action: "ACCEPTED" })}
                  disabled={actionMutation.isPending}
                  className="flex-1 py-2 text-[12px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-50"
                >
                  Accept
                </button>
              </div>
            </div>
          ))}

          {/* Similar profiles rail */}
          <div className="mt-8">
            <h2 className="font-display font-semibold text-[16px] text-ink tracking-tight mb-3">
              Similar profiles
            </h2>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
              {(data?.similar || []).slice(0, 4).map((c: any) => (
                <div
                  key={`similar-${c.id}`}
                  className="shrink-0 w-48 border border-border rounded-xl p-3.5 bg-surface hover:border-ink/20 transition-colors duration-normal"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-[9px] font-semibold"
                      style={{
                        backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                        color: "var(--color-ink)",
                      }}
                      aria-hidden="true"
                    >
                      {c.avatar}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-medium text-ink truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-muted">{c.college}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {c.skills.slice(0, 3).map((s) => (
                      <span
                        key={s}
                        className="px-1.5 py-0.5 text-[9px] rounded-full border border-border text-muted"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <p className="font-mono text-[13px] text-ink tabular-nums mt-2">
                    {c.similarity}%
                    <span className="text-[10px] text-muted font-normal">
                      {" "}match
                    </span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}