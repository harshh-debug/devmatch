"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
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
  const search = query.trim();
  const { data: users = [], isFetching } = useQuery({
    queryKey: ["users", "search", search],
    queryFn: () => apiFetch<SearchResult[]>("/users/search", { token, query: { q: search } }),
    enabled: !!token && search.length >= 2,
  });

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">Search developers</h1>
      <p className="text-[13px] text-muted mt-1">Find people by display name or @username.</p>
      <input
        autoFocus
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Harsh or @harshcode"
        className="mt-5 w-full px-3.5 py-3 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />

      <div className="mt-4 divide-y divide-border border border-border rounded-xl overflow-hidden">
        {search.length < 2 && <p className="p-5 text-[13px] text-muted">Enter at least two characters.</p>}
        {isFetching && <p className="p-5 text-[13px] text-muted">Searching…</p>}
        {!isFetching && search.length >= 2 && users.length === 0 && (
          <p className="p-5 text-[13px] text-muted">No developers found.</p>
        )}
        {!isFetching && users.map((user) => (
          <Link key={user.id} href={`/u/${user.id}`} className="flex items-center gap-3 p-4 hover:bg-surface transition-colors">
            <div className="w-10 h-10 rounded-full bg-ink/10 flex items-center justify-center text-xs font-semibold text-ink">
              {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (user.displayName?.[0] ?? user.username[0]?.toUpperCase())}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink truncate">{user.displayName}</p>
              <p className="text-[12px] text-muted truncate">@{user.username}{user.college ? ` · ${user.college}` : ""}</p>
            </div>
            {user.skillTags?.length ? <span className="text-[11px] text-muted">{user.skillTags.slice(0, 2).join(" · ")}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
