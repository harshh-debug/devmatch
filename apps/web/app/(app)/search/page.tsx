"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

type SearchResult = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string | null;
  college?: string | null;
  skillTags?: string[];
};

export default function SearchPage() {
  const token = useToken();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [connectError, setConnectError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timeout);
  }, [query]);
  const { data: users = [], isFetching } = useQuery({
    queryKey: ["users", "search", search],
    queryFn: () => apiFetch<SearchResult[]>("/users/search", { token, query: { q: search } }),
    enabled: !!token && search.length >= 2,
  });
  const connectMutation = useMutation({
    mutationFn: (targetId: string) => apiFetch<{ isMutual: boolean }>("/match/action", {
      token,
      method: "POST",
      body: { targetId, action: "ACCEPTED", connectionContext: "GENERAL" },
    }),
    onSuccess: (_result, targetId) => {
      setConnectError(null);
      setRequestedIds((current) => new Set(current).add(targetId));
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      void queryClient.invalidateQueries({ queryKey: ["match", "requests"] });
      void queryClient.invalidateQueries({ queryKey: ["match", "matches"] });
      void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
    },
    onError: (error) => setConnectError(error instanceof ApiError ? error.message : "Could not send the request."),
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="rounded-[1.5rem] border border-white/12 bg-surface px-5 py-5 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-ink">Search developers</h1>
      <p className="mt-1 text-[14px] text-muted">Find people by display name or @username.</p>
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Harsh or @harshcode"
        className="mt-5 w-full rounded-xl border border-white/15 bg-bg px-4 py-3.5 text-[14px] text-ink placeholder:text-muted/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
      />
      </div>

      <div className="mt-5 divide-y divide-white/10 overflow-hidden rounded-[1.35rem] border border-white/12 bg-surface">
        {search.length < 2 && <p className="p-5 text-[13px] text-muted">Enter at least two characters.</p>}
        {isFetching && <p className="p-5 text-[13px] text-muted">Searching…</p>}
        {!isFetching && search.length >= 2 && users.length === 0 && (
          <p className="p-5 text-[13px] text-muted">No developers found.</p>
        )}
        {!isFetching && users.map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-4 transition-colors hover:bg-white/[0.035] sm:p-5">
            <Link href={`/u/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center text-xs font-semibold text-ink">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (user.displayName?.[0] ?? user.username[0]?.toUpperCase())}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink truncate">{user.displayName}</p>
              <p className="text-[12px] text-muted truncate">@{user.username}{user.college ? ` · ${user.college}` : ""}</p>
            </div>
            {user.skillTags?.length ? <span className="text-[11px] text-muted">{user.skillTags.slice(0, 2).join(" · ")}</span> : null}
            </Link>
            <button
              onClick={() => connectMutation.mutate(user.id)}
              disabled={connectMutation.isPending || requestedIds.has(user.id)}
              className="shrink-0 rounded-xl border border-primary/35 px-3.5 py-2 text-[11px] font-medium text-primary transition hover:bg-primary hover:text-bg disabled:opacity-50"
            >
              {requestedIds.has(user.id) ? "Request sent" : connectMutation.isPending ? "Sending…" : "Connect"}
            </button>
          </div>
        ))}
      </div>
      {connectError && <p className="mt-3 text-[12px] text-red-500">{connectError}</p>}
    </div>
  );
}
