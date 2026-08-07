"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { IntentModal } from "@/app/components/shared/IntentModal";
import { apiFetch } from "@/lib/apiClient";
import type { MatchReadiness } from "@/lib/types";
import { useToken } from "@/hooks/useToken";

const actionCopy = {
  CONNECT_GITHUB: { title: "Connect GitHub", detail: "Import public languages, repositories, and activity for stronger matches.", href: "/api/github/link" },
  CONNECT_LEETCODE: { title: "Add LeetCode", detail: "Add your handle to improve DSA matching.", href: "/settings#leetcodeHandle" },
  CONNECT_CODEFORCES: { title: "Add Codeforces", detail: "Add your handle to improve competitive-programming matching.", href: "/settings#codeforcesHandle" },
  ADD_SKILLS: { title: "Add skills manually", detail: "Choose at least three skills if you do not want to connect an account.", href: "/profile#skills" },
} as const;

export default function OnboardingPage() {
  const token = useToken();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [intentOpen, setIntentOpen] = useState(false);
  const { data: readiness, isLoading } = useQuery({
    queryKey: ["users", "me", "match-readiness"],
    queryFn: () => apiFetch<MatchReadiness>("/users/me/match-readiness", { token }),
    enabled: !!token,
    refetchInterval: (query) => query.state.data?.isMatchReady ? false : 5000,
  });

  if (isLoading || !readiness) return <div className="mx-auto max-w-2xl p-8 text-sm text-muted">Preparing your profile…</div>;
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
      <div className="mt-7 space-y-3">
        {readiness.recommendedActions.map((action) => action === "COMPLETE_INTENT" ? <button key={action} onClick={() => setIntentOpen(true)} className="block w-full rounded-xl border border-primary/30 bg-primary/10 p-4 text-left"><p className="text-sm font-medium text-ink">Choose your collaboration goal</p><p className="mt-1 text-xs text-muted">Tell us what you can offer and what you are looking for.</p></button> : <Link key={action} href={actionCopy[action].href} className="block rounded-xl border border-white/12 p-4 transition hover:border-primary/40"><p className="text-sm font-medium text-ink">{actionCopy[action].title}</p><p className="mt-1 text-xs text-muted">{actionCopy[action].detail}</p></Link>)}
      </div>
      <p className="mt-6 text-xs text-muted">{readiness.blockers.join(" ")}</p>
      <Link href="/discover" className="mt-5 inline-block text-xs text-muted underline hover:text-ink">View readiness in Discover</Link>
    </div>
  </div>;
}
