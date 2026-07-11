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
                  <CandidateCard
                    candidate={candidate}
                    profile={profile}
                    index={index}
                    actionMutation={actionMutation}
                  />
                </React.Fragment>
              );
            })}

        </div>
      </div>
    </div>
  );
}