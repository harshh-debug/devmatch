"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { UserProfile } from "@/lib/types";
import AppShellLayout from "@/app/(app)/layout";
import { GitHubActivity } from "@/app/components/profile/GitHubActivity";

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const username = params.username as string;
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["users", "public", username],
    queryFn: () =>
      apiFetch<UserProfile>(`/users/public/${encodeURIComponent(username)}`, {
        // Public profile endpoint; send token if we have one.
        token: session?.accessToken,
      }),
    retry: 0,
  });

  const { data: rooms = [] } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<{ otherUserId: string }[]>("/chat/rooms", { token: session?.accessToken }),
    enabled: !!session?.accessToken,
  });
  const isConnected = !!profile && rooms.some((room) => room.otherUserId === profile.id);
  const connectMutation = useMutation({
    mutationFn: () => apiFetch<{ isMutual: boolean }>("/match/action", {
      token: session?.accessToken,
      method: "POST",
      body: { targetId: profile!.id, action: "ACCEPTED", connectionContext: "GENERAL" },
    }),
    onSuccess: (result) => {
      setRequestSent(!result.isMutual);
      setShowConnectModal(false);
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      void queryClient.invalidateQueries({ queryKey: ["match", "requests"] });
      if (result.isMutual) {
        void queryClient.invalidateQueries({ queryKey: ["match", "matches"] });
        void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <p className="text-[13px] text-muted">Loading profile…</p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 px-5">
        <p className="text-[15px] text-ink">Profile not found</p>
        <Link href="/" className="text-[13px] text-primary hover:text-primary-hover">
          Back to home
        </Link>
      </div>
    );
  }

  function handleConnect() {
    if (session?.user) {
      setShowConnectModal(true);
    } else {
      router.push("/login");
    }
  }

  return (
    <AppShellLayout><div className="min-h-screen bg-bg">
      {/* Simple header */}
      <header className="flex items-center justify-between px-5 sm:px-8 h-16 border-b border-border">
        <a
          href="/"
          className="flex items-center gap-2 font-display font-semibold text-[15px] text-ink tracking-tight"
        >
          <span
            className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
            aria-hidden="true"
          >
            D
          </span>
          DevMatch
        </a>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-8 sm:py-12">
        {/* Profile card */}
        <div className="rounded-[1.75rem] border border-white/12 bg-surface p-6 shadow-xl shadow-black/15 sm:p-8">
          {/* Avatar + name */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-6 mb-8">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-xl font-semibold shrink-0"
              style={{
                backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                color: "var(--color-ink)",
              }}
              aria-hidden="true"
            >
              {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : initials(profile.displayName)}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="break-words font-display text-3xl font-semibold tracking-[-0.06em] text-ink">
                {profile.displayName || profile.username}
              </h1>
              <p className="text-[13px] text-muted mt-0.5">{profile.college || "—"}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-[11px] text-muted">@{profile.username}</span>
              </div>
            </div>
            {isConnected ? (
              <span className="px-4 py-2 text-[12px] font-medium rounded-lg border border-success/30 bg-success/10 text-success shrink-0">Connected</span>
            ) : requestSent ? (
              <span className="px-4 py-2 text-[12px] font-medium rounded-lg border border-primary/30 bg-primary/10 text-primary shrink-0">Request sent</span>
            ) : (
              <button
                onClick={handleConnect}
                className="shrink-0 rounded-xl bg-primary px-5 py-2.5 text-[13px] font-semibold text-bg transition hover:bg-primary-hover"
              >
                Connect
              </button>
            )}
          </div>

          {/* Bio */}
          {profile.bio && (
            <div className="mb-8">
              <h2 className="text-[11px] text-muted tracking-wide mb-2">ABOUT</h2>
              <div className="text-[14px] text-ink leading-relaxed whitespace-pre-line">
                {profile.bio}
              </div>
            </div>
          )}

          {/* Skills */}
          {profile.skillTags?.length > 0 && (
            <div className="mb-8">
              <h2 className="text-[11px] text-muted tracking-wide mb-3">SKILLS</h2>
              <div className="flex flex-wrap gap-1.5">
                {profile.skillTags.map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1 text-[12px] rounded-full border border-border text-ink bg-surface"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4 mb-8">
            <GitHubActivity profile={profile} />
            <div>
              <h2 className="text-[11px] text-muted tracking-wide mb-1.5">COMPETITIVE PROGRAMMING</h2>
              <p className="text-[12px] text-muted">These public stats help collaborators understand this developer’s DSA background. They are not a profile-completeness score.</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">

            {/* Codeforces / competitive */}
            <div className="rounded-[1.15rem] border border-white/12 bg-bg p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-info" aria-hidden="true">
                  <rect x="1" y="14" width="4" height="7" rx="1" />
                  <rect x="7" y="10" width="4" height="11" rx="1" />
                  <rect x="13" y="4" width="4" height="17" rx="1" />
                  <rect x="19" y="6" width="4" height="15" rx="1" />
                </svg>
                <span className="text-[13px] font-medium text-ink">Codeforces</span>
                <span className="text-[11px] text-muted ml-auto">
                  {profile.cfRating ? `${profile.cfRating}` : "—"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-muted">RATING</p>
                  <p className="font-mono text-[18px] text-ink tabular-nums">
                    {profile.cfRating ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted">HANDLE</p>
                  <p className="font-mono text-[13px] text-ink tabular-nums truncate">
                    {profile.codeforcesHandle ? `@${profile.codeforcesHandle}` : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.15rem] border border-white/12 bg-bg p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[13px] font-medium text-ink">LeetCode</span>
                <span className="font-mono text-[13px] text-ink">#{profile.lcRating ?? "—"}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[10px] text-muted">TOTAL SOLVED</p><p className="font-mono text-[18px] text-ink">{profile.lcTotalSolved ?? "—"}</p></div>
                <div><p className="text-[10px] text-muted">EASY / MED / HARD</p><p className="font-mono text-[13px] text-ink">{[profile.lcEasySolved, profile.lcMediumSolved, profile.lcHardSolved].map((value) => value ?? "—").join(" / ")}</p></div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Connect modal */}
        {showConnectModal && (
          <div className="fixed inset-0 z-modal flex items-center justify-center px-5">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowConnectModal(false)} />
            <div className="relative w-full max-w-sm rounded-[1.5rem] border border-white/15 bg-surface p-6 shadow-2xl shadow-black/40">
              <h2 className="font-display font-semibold text-[18px] text-ink tracking-tight mb-2">
                Connect with {profile.displayName || profile.username}
              </h2>
              <p className="text-[13px] text-muted mb-5">
                Send a general connection request. It is not tied to a search intent.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-lg border border-border text-muted hover:text-ink transition-colors duration-fast"
                >
                  Cancel
                </button>
                <button
                  onClick={() => connectMutation.mutate()}
                  disabled={connectMutation.isPending}
                  className="flex-1 text-center py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-50"
                >
                  {connectMutation.isPending ? "Sending…" : "Send request"}
                </button>
              </div>
              {connectMutation.error && <p className="mt-3 text-[12px] text-red-500">{connectMutation.error instanceof ApiError ? connectMutation.error.message : "Could not send the request."}</p>}
            </div>
          </div>
        )}
      </main>
    </div></AppShellLayout>
  );
}
