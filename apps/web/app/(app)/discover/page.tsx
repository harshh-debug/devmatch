"use client";
import React from "react";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import { IntentModal } from "@/app/components/shared/IntentModal";
import { SystemActionCard } from "@/app/components/shared/SystemActionCard";
import type { UserProfile } from "@/lib/types";

const INTENTS = [
  { id: "All", label: "All" },
  { id: "HACKATHON", label: "Hackathon" },
  { id: "DSA", label: "DSA Partner" },
  { id: "PROJECT", label: "Project" },
  { id: "OPENSOURCE", label: "Open Source" },
];

function CandidateCard({ candidate, profile, index, actionMutation }: { candidate: any; profile: any; index: number; actionMutation: any }) {
  const token = useToken();
  const { data: userResp } = useQuery({
    queryKey: ["users", "public", candidate.userId],
    queryFn: () => apiFetch<any>(`/users/public/${candidate.userId}`, { token }),
    enabled: !!token && !!candidate.userId,
  });

  const injectGithub = index === 0 && profile && !profile.githubHandle;
  const injectLeetcode = index === 3 && profile && !profile.leetcodeHandle;
  const injectCollege = index === 6 && profile && !profile.college;
  
  const user = userResp || {};
  const userProfile = user.profile || {};

  return (
    <React.Fragment>
      {injectGithub && (
        <SystemActionCard 
          message="Connect GitHub to unlock algorithmic matching." 
          actionText="Connect" 
          onAction={() => window.location.href = "/profile"} 
        />
      )}
      {injectLeetcode && (
        <SystemActionCard 
          message="Add your LeetCode handle to see competitive programmers at your level." 
          actionText="Connect" 
          onAction={() => window.location.href = "/profile"} 
        />
      )}
      {injectCollege && (
        <SystemActionCard 
          message="Add your college to connect with students locally." 
          actionText="Add" 
          onAction={() => window.location.href = "/profile"} 
        />
      )}
      <div
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
            {user.avatarUrl ? "IMG" : (user.displayName?.charAt(0) || "U")}
          </div>

          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">
                {user.displayName || "Unknown User"}
              </h3>
              <span className="text-[11px] text-muted">
                {user.college || "No college specified"}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {candidate.activeIntents?.[0] || "All"}
              </span>
            </div>

            <p className="text-[12px] text-muted mt-0.5">
              {user.bio || "Developer"}
            </p>

            {/* Skills */}
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {(userProfile.skillTags || []).map((s: string) => (
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
                  {candidate.similarityScore ? Math.round(candidate.similarityScore * 100) : 0}
                  <span className="text-[10px] text-muted">%</span>
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">LEETCODE</p>
                <p className="font-mono text-[14px] text-ink tabular-nums">
                  {userProfile.leetcodeHandle ? "Linked" : "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">CODEFORCES</p>
                <p className="font-mono text-[14px] text-ink tabular-nums">
                  {candidate.cfRating || userProfile.cfRating || "N/A"}
                </p>
              </div>
              <div>
                <p className="text-[10px] text-muted">AVAILABLE</p>
                <p className="text-[12px] text-ink">{candidate.availability || "Flexible"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
          <button
            onClick={() => actionMutation.mutate({ targetId: candidate.userId, action: "REJECTED" })}
            disabled={actionMutation.isPending}
            className="flex-1 py-2 text-[12px] font-medium rounded-lg border border-border text-muted hover:text-ink hover:bg-surface transition-colors duration-fast disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={() => actionMutation.mutate({ targetId: candidate.userId, action: "ACCEPTED" })}
            disabled={actionMutation.isPending}
            className="flex-1 py-2 text-[12px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-50"
          >
            Accept
          </button>
        </div>
      </div>
    </React.Fragment>
  );
}

export default function DiscoverPage() {
  const token = useToken();
  const [activeIntent, setActiveIntent] = useState("All");

  const { data: userResp } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch<any>("/users/me", { token }),
    enabled: !!token,
  });
  const profile = userResp || null;

  // Fetch candidates
  const { data: candidatesResp } = useQuery({
    queryKey: ["candidates", activeIntent],
    queryFn: () => {
      const qs = activeIntent === "All" ? "?limit=20" : `?intentType=${activeIntent}&limit=20`;
      return apiFetch<any>(`/match/candidates${qs}`, { token });
    },
    enabled: !!token,
  });

  const queryClient = useQueryClient();
  const actionMutation = useMutation({
    mutationFn: (data: { targetId: string; action: "ACCEPTED" | "REJECTED" }) =>
      apiFetch("/match/action", {
        method: "POST",
        body: JSON.stringify(data),
        token,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const candidates = candidatesResp?.candidates || candidatesResp?.data || candidatesResp || [];

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
            Discover
          </h1>
          <p className="text-[14px] text-muted mt-1">
            Find developers who share your interests.
          </p>
        </div>
        <div className="flex gap-2">
          {INTENTS.map((intent) => (
            <button
              key={intent.id}
              onClick={() => setActiveIntent(intent.id)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors duration-fast ${
                activeIntent === intent.id
                  ? "bg-primary text-white"
                  : "bg-surface text-muted hover:text-ink hover:bg-border"
              }`}
            >
              {intent.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {candidates.length === 0 ? (
          <div className="text-center py-12 bg-bg border border-border rounded-xl">
            <h3 className="text-ink font-medium">No more candidates</h3>
            <p className="text-muted text-[13px] mt-1">Check back later for more profiles.</p>
          </div>
        ) : (
          candidates.map((candidate: any, index: number) => (
            <CandidateCard
              key={candidate.userId || index}
              candidate={candidate}
              profile={profile}
              index={index}
              actionMutation={actionMutation}
            />
          ))
        )}
      </div>
    </div>
  );
}