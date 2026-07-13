"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

export default function MatchesPage() {
  const token = useToken();

  const { data: matches = [] } = useQuery({
    queryKey: ["match", "matches"],
    queryFn: () => apiFetch<any[]>("/match/matches", { token }),
    enabled: !!token,
  });

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Matches
        </h1>
        <p className="text-[13px] text-muted mt-0.5">
          Developers you&apos;ve matched with
        </p>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match: any) => {
          const user = match.matchedUser;
          return (
          <div
            key={match.matchId}
            className="bg-bg border border-border rounded-xl p-5 flex flex-col hover:border-ink/20 transition-colors duration-normal"
          >
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                    color: "var(--color-ink)",
                  }}
                  aria-hidden="true"
                >
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (user?.displayName?.charAt(0) || "U")}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight truncate">
                  {user?.displayName || "Unknown"}
                </h3>
                <p className="text-[12px] text-muted truncate">Developer</p>
                <p className="text-[11px] text-muted">@{user?.username || "unknown"}</p>
              </div>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                {match.intentType}
              </span>
            </div>

            {/* Meta */}
            <div className="flex items-center justify-between text-[11px] text-muted mb-4 pt-3 border-t border-border mt-auto">
              <span>Matched {new Date(match.matchedAt).toLocaleDateString()}</span>
              <span className="flex items-center gap-1">
                Score: {match.similarityScore ? Math.round(match.similarityScore * 100) : 0}%
              </span>
            </div>

            {/* CTA */}
            <Link
              href={`/chat/${match.matchId}`}
              className="w-full text-center py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast"
            >
              Open Workspace
            </Link>
          </div>
        )})}
      </div>
    </div>
  );
}
