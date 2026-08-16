"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IntentModal } from "@/app/components/shared/IntentModal";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { MatchReadiness } from "@/lib/types";
import { useToken } from "@/hooks/useToken";

const actionCopy = {
  CONNECT_GITHUB: { title: "Connect GitHub", detail: "Import public languages, repositories, and activity for stronger matches.", href: "/api/github/link" },
  CONNECT_LEETCODE: { title: "Add LeetCode", detail: "Add your handle to improve DSA matching.", href: "/settings#leetcodeHandle" },
  CONNECT_CODEFORCES: { title: "Add Codeforces", detail: "Add your handle to improve competitive-programming matching.", href: "/settings#codeforcesHandle" },
  ADD_SKILLS: { title: "Add skills manually", detail: "Choose at least three skills if you do not want to connect an account.", href: "/profile#skills" },
} as const;

function ProfileSyncLoader({ waitingForProfile }: { waitingForProfile: boolean }) {
  return (
    <div className="flex min-h-[65vh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-white/12 bg-surface p-6 shadow-2xl shadow-black/25 sm:p-8" aria-live="polite" aria-busy="true">
        <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary">
          <svg className="size-6 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.2" />
            <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="mt-6 max-w-md font-display text-3xl font-semibold tracking-[-0.05em] text-ink">
          {waitingForProfile ? "Setting up your account" : "Importing your GitHub profile"}
        </h1>
        <p className="mt-2 max-w-md text-[14px] leading-6 text-muted">
          {waitingForProfile
            ? "Confirming your account and preparing your developer profile."
            : "We’re reading your public repositories, languages, and contribution activity. This usually takes a few moments."}
        </p>

        <div className="mt-7 space-y-3 border-t border-white/10 pt-6">
          {waitingForProfile ? (
            <>
              <SyncStep label="Confirming your account" state="active" />
              <SyncStep label="Loading onboarding status" state="pending" />
              <SyncStep label="Preparing your matching setup" state="pending" />
            </>
          ) : (
            <>
              <SyncStep label="GitHub account connected" state="complete" />
              <SyncStep label="Importing technical activity" state="active" />
              <SyncStep label="Building your matching profile" state="pending" />
            </>
          )}
        </div>
        <p className="mt-6 text-[11px] text-muted">Keep this page open. It will continue automatically when the import finishes.</p>
      </div>
    </div>
  );
}

function SyncStep({ label, state }: { label: string; state: "complete" | "active" | "pending" }) {
  return (
    <div className="flex items-center gap-3">
      <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${state === "complete" ? "border-success/30 bg-success/10 text-success" : state === "active" ? "border-primary/30 bg-primary/10 text-primary" : "border-border text-muted"}`}>
        {state === "complete" ? (
          <svg viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg>
        ) : state === "active" ? (
          <span className="size-2 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
        ) : (
          <span className="size-1.5 rounded-full bg-current opacity-40" />
        )}
      </span>
      <span className={`text-[13px] ${state === "pending" ? "text-muted" : "text-ink"}`}>{label}</span>
    </div>
  );
}

export default function OnboardingPage() {
  const token = useToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [intentOpen, setIntentOpen] = useState(false);
  const [syncRetrying, setSyncRetrying] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const readinessQuery = useQuery({
    queryKey: ["users", "me", "match-readiness"],
    queryFn: () => apiFetch<MatchReadiness>("/users/me/match-readiness", { token }),
    enabled: !!token,
    refetchInterval: (query) => {
      if (query.state.data?.githubSyncStatus === "SYNCING") return 1500;
      return query.state.data?.isMatchReady ? false : 5000;
    },
  });
  const readiness = readinessQuery.data;

  async function retryGitHubSync() {
    setSyncError(null);
    setSyncRetrying(true);
    try {
      await apiFetch("/users/me/connect/github", { token, method: "POST" });
      await readinessQuery.refetch();
    } catch (error) {
      setSyncError(error instanceof ApiError ? error.message : "Could not restart the GitHub import.");
    } finally {
      setSyncRetrying(false);
    }
  }

  if (!readiness && readinessQuery.isError) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg rounded-2xl border border-danger/30 bg-surface p-6 sm:p-8">
          <h1 className="font-display text-2xl font-semibold text-ink">We couldn’t prepare your profile</h1>
          <p role="alert" className="mt-2 text-sm text-muted">Check that the services are running, then try again.</p>
          <button type="button" onClick={() => void readinessQuery.refetch()} className="mt-5 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white">Try again</button>
        </div>
      </div>
    );
  }

  if (!readiness) return <ProfileSyncLoader waitingForProfile />;
  if (readiness.githubSyncStatus === "SYNCING") return <ProfileSyncLoader waitingForProfile={false} />;

  if (readiness.isMatchReady) {
    return <div className="mx-auto max-w-2xl p-8"><div className="rounded-2xl border border-white/12 bg-surface p-8 text-center"><h1 className="font-display text-3xl text-ink">You’re match-ready</h1><p className="mt-2 text-sm text-muted">Your profile score is {readiness.profileScore}%.</p><button onClick={() => router.push("/discover")} className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white">Start discovering</button></div></div>;
  }

  return <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
    {intentOpen && <IntentModal onClose={() => setIntentOpen(false)} onSaved={() => { void queryClient.invalidateQueries({ queryKey: ["users", "me", "match-readiness"] }); }} />}
    <div className="rounded-2xl border border-white/12 bg-surface p-6 sm:p-8">
      <p className="text-xs font-medium uppercase tracking-wider text-primary">Set up DevMatch</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-ink">Build a profile people can match with.</h1>
      <p className="mt-2 text-sm text-muted">Profile score <span className="font-mono text-ink">{readiness.profileScore}%</span>. Connect accounts first, or add skills manually.</p>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full bg-primary" style={{ width: `${readiness.profileScore}%` }} /></div>
      {syncError && <p role="alert" className="mt-5 text-xs text-danger">{syncError}</p>}
      <div className="mt-7 space-y-3">
        {readiness.recommendedActions.map((action) => {
          if (action === "COMPLETE_INTENT") {
            return <button key={action} onClick={() => setIntentOpen(true)} className="block w-full rounded-xl border border-primary/30 bg-primary/10 p-4 text-left"><p className="text-sm font-medium text-ink">Choose your collaboration goal</p><p className="mt-1 text-xs text-muted">Tell us what you can offer and what you are looking for.</p></button>;
          }
          if (action === "CONNECT_GITHUB" && readiness.githubSyncStatus !== "NOT_CONNECTED") {
            return <button key={action} type="button" onClick={() => void retryGitHubSync()} disabled={syncRetrying} className="block w-full rounded-xl border border-white/12 p-4 text-left transition hover:border-primary/40 disabled:opacity-60"><p className="text-sm font-medium text-ink">{syncRetrying ? "Restarting GitHub import…" : "Retry GitHub import"}</p><p className="mt-1 text-xs text-muted">Your account is connected, but its public activity has not finished importing.</p></button>;
          }
          const copy = actionCopy[action];
          return <Link key={action} href={copy.href} className="block rounded-xl border border-white/12 p-4 transition hover:border-primary/40"><p className="text-sm font-medium text-ink">{copy.title}</p><p className="mt-1 text-xs text-muted">{copy.detail}</p></Link>;
        })}
      </div>
      <p className="mt-6 text-xs text-muted">{readiness.blockers.join(" ")}</p>
      <Link href="/discover" className="mt-5 inline-block text-xs text-muted underline hover:text-ink">View readiness in Discover</Link>
    </div>
  </div>;
}
