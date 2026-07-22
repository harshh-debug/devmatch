"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import type { ChatRoom } from "@/lib/types";

export default function MatchesPage() {
  const token = useToken();

  const { data: matches = [] } = useQuery({
    queryKey: ["match", "matches"],
    queryFn: () => apiFetch<any[]>("/match/matches", { token }),
    enabled: !!token,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<ChatRoom[]>("/chat/rooms", { token }),
    enabled: !!token,
  });

  const roomIdByMatchId = new Map(rooms.map((room) => [room.matchId, room.id]));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Header */}
      <div className="mb-8 rounded-[1.5rem] border border-white/12 bg-surface px-5 py-5 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-ink">
          Matches
        </h1>
        <p className="mt-1 text-[14px] text-muted">
          Developers you&apos;ve matched with
        </p>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {matches.map((match: any) => {
          const user = match.matchedUser;
          const roomId = roomIdByMatchId.get(match.matchId);
          return (
          <div
            key={match.matchId}
            className="flex flex-col rounded-[1.35rem] border border-white/12 bg-surface p-5 shadow-sm transition duration-500 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-black/20"
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
                  {user?.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" decoding="async" className="w-full h-full rounded-full object-cover" /> : (user?.displayName?.charAt(0) || "U")}
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
                {match.connectionContext || match.intentType}
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
            {roomId ? (
              <Link
                href={`/chat/${roomId}`}
                className="w-full rounded-xl bg-primary py-3 text-center text-[13px] font-semibold text-bg transition hover:bg-primary-hover"
              >
                Open Workspace
              </Link>
            ) : (
              <span className="w-full rounded-xl bg-bg py-3 text-center text-[13px] font-medium text-muted">
                Workspace preparing…
              </span>
            )}
          </div>
        )})}
      </div>
    </div>
  );
}
