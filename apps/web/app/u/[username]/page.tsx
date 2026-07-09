"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/apiClient";
import type { UserProfile } from "@/lib/types";

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
  const username = params.username as string;
  const [showConnectModal, setShowConnectModal] = useState(false);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ["users", "public", username],
    queryFn: () =>
      apiFetch<UserProfile>(`/users/${encodeURIComponent(username)}`, {
        // Public profile endpoint; send token if we have one.
        token: session?.accessToken,
      }),
    retry: 0,
  });

  const languages = profile?.languages
    ? Object.entries(profile.languages).map(([name, percentage]) => ({
        name,
        percentage,
      }))
    : [];

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
    <div className="min-h-screen bg-bg">
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

      <main className="max-w-3xl mx-auto px-5 py-8 sm:py-12">
        {/* Profile card */}
        <div className="border border-border rounded-2xl p-6 sm:p-8">
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
              {initials(profile.displayName)}
            </div>
            <div className="text-center sm:text-left flex-1">
              <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
                {profile.displayName || profile.username}
              </h1>
              <p className="text-[13px] text-muted mt-0.5">{profile.college || "—"}</p>
              <div className="flex items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-[11px] text-muted">@{profile.username}</span>
              </div>
            </div>
            <button
              onClick={handleConnect}
              className="px-5 py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast shrink-0"
            >
              Connect
            </button>
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

          {/* Metrics panel */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            {/* GitHub */}
            <div className="border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-ink" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <span className="text-[13px] font-medium text-ink">GitHub</span>
                <span className="text-[11px] text-muted ml-auto">
                  {profile.githubHandle ? `@${profile.githubHandle}` : "Not connected"}
                </span>
              </div>
              {languages.length > 0 ? (
                <div>
                  <p className="text-[10px] text-muted mb-2">LANGUAGES</p>
                  <div className="flex h-1.5 rounded-full overflow-hidden mb-2" aria-hidden="true">
                    {languages.map((lang, i) => (
                      <div
                        key={lang.name}
                        className="h-full"
                        style={{
                          width: `${lang.percentage}%`,
                          backgroundColor: `color-mix(in oklch, var(--color-ink) ${85 - i * 30}%, transparent)`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    {languages.map((lang) => (
                      <div key={lang.name} className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted">{lang.name}</span>
                        <span className="text-[11px] text-muted/70">{lang.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-muted">No language data synced yet.</p>
              )}
            </div>

            {/* Codeforces / competitive */}
            <div className="border border-border rounded-xl p-4">
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
                  <p className="text-[10px] text-muted">COMPLETENESS</p>
                  <p className="font-mono text-[18px] text-ink tabular-nums">
                    {profile.profileCompleteness != null
                      ? `${profile.profileCompleteness}%`
                      : "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connect modal */}
        {showConnectModal && (
          <div className="fixed inset-0 z-modal flex items-center justify-center px-5">
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowConnectModal(false)} />
            <div className="relative bg-bg border border-border rounded-2xl p-6 max-w-sm w-full shadow-lg">
              <h2 className="font-display font-semibold text-[18px] text-ink tracking-tight mb-2">
                Connect with {profile.displayName || profile.username}
              </h2>
              <p className="text-[13px] text-muted mb-5">
                You&apos;ll be redirected to the discover feed to start matching.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConnectModal(false)}
                  className="flex-1 py-2.5 text-[13px] font-medium rounded-lg border border-border text-muted hover:text-ink transition-colors duration-fast"
                >
                  Cancel
                </button>
                <Link
                  href="/discover"
                  className="flex-1 text-center py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast"
                >
                  Start matching
                </Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
