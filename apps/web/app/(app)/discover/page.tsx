"use client";
import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import { IntentModal } from "@/app/components/shared/IntentModal";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Candidate {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl: string | null;
  college: string | null;
  cfRating: number | null;
  profileScore: number;
  skillTags?: string[];
  similarityScore: number;
  lcRating?: number | null;
}

// ── Loading Phrases ───────────────────────────────────────────────────────────
const LOADING_PHRASES = [
  "> Realigning vector indices...",
  "> Calculating cosine similarities...",
  "> Querying candidate sub-graphs...",
  "> Filtering by active tech stacks...",
  "> Parsing algorithmic capability bounds...",
  "> Ranking by skill vector distance...",
];

function DiscoverLoader({ intent }: { intent: string }) {
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setPhraseIdx((i) => (i + 1) % LOADING_PHRASES.length);
        setVisible(true);
      }, 150);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const phrase = LOADING_PHRASES[phraseIdx]!.replace("...", ` for ${intent}...`);

  return (
    <div
      className="w-full rounded-xl border p-8 flex flex-col items-start gap-3"
      style={{ background: "#000000", borderColor: "#1a1a1a", boxShadow: "0 0 0 1px #1a1a1a" }}
    >
      <p
        className="font-mono text-[13px] transition-opacity duration-150"
        style={{ color: "#A3A3A3", opacity: visible ? 1 : 0 }}
      >
        {phrase}
        <span className="animate-pulse ml-0.5">█</span>
      </p>
    </div>
  );
}

// ── Candidate Card ────────────────────────────────────────────────────────────
function CandidateCard({
  candidate,
  activeIntent,
  onAction,
  actionPending,
}: {
  candidate: Candidate;
  activeIntent: string | null;
  onAction: (targetId: string, action: "ACCEPTED" | "REJECTED") => void;
  actionPending: boolean;
}) {
  return (
    <div className="group relative bg-bg border border-border rounded-xl p-4 sm:p-5 hover:border-ink/20 transition-colors duration-normal">
      <Link href={`/u/${candidate.userId}`} className="flex items-start gap-3.5 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
        {/* Avatar */}
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 select-none"
          style={{
            backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
            color: "var(--color-ink)",
          }}
          aria-hidden="true"
        >
          {candidate.avatarUrl ? (
            <img
              src={candidate.avatarUrl}
              alt={candidate.displayName ?? "Developer"}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            candidate.displayName?.charAt(0) || "U"
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">
              {candidate.displayName ?? candidate.username ?? "Developer"}
            </h3>
            {candidate.college && (
              <span className="text-[11px] text-muted">{candidate.college}</span>
            )}
            {activeIntent && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                {activeIntent}
              </span>
            )}
          </div>

          {/* Skills */}
          {(candidate.skillTags?.length ?? 0) > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {candidate.skillTags!.slice(0, 5).map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted"
                >
                  {s}
                </span>
              ))}
            </div>
          )}

          {/* Metrics */}
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border">
            <div>
              <p className="text-[10px] text-muted">COMPATIBILITY</p>
              <p className="font-mono font-semibold text-[16px] text-ink tabular-nums">
                {Math.round(candidate.similarityScore * 100)}
                <span className="text-[10px] text-muted">%</span>
              </p>
            </div>
            {candidate.cfRating && (
              <div>
                <p className="text-[10px] text-muted">CF RATING</p>
                <p className="font-mono text-[14px] text-ink tabular-nums">{candidate.cfRating}</p>
              </div>
            )}
            {candidate.lcRating && (
              <div>
                <p className="text-[10px] text-muted">LC RANK</p>
                <p className="font-mono text-[14px] text-ink tabular-nums">{candidate.lcRating}</p>
              </div>
            )}
            <div>
              <p className="text-[10px] text-muted">PROFILE</p>
              <p className="font-mono text-[14px] text-ink tabular-nums">{candidate.profileScore}</p>
            </div>
          </div>
        </div>
      </Link>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <button
          onClick={() => onAction(candidate.userId, "REJECTED")}
          disabled={actionPending}
          className="flex-1 py-2 text-[12px] font-medium rounded-lg border border-border text-muted hover:text-ink hover:bg-surface transition-colors duration-fast disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={() => onAction(candidate.userId, "ACCEPTED")}
          disabled={actionPending}
          className="flex-1 py-2 text-[12px] font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors duration-fast disabled:opacity-50"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

// ── Intent Pill ───────────────────────────────────────────────────────────────
const INTENT_LABELS: Record<string, string> = {
  DSA: "DSA Partner",
  HACKATHON: "Hackathon",
  PROJECT: "Project",
  OPENSOURCE: "Open Source",
};

// ── Main Page ─────────────────────────────────────────────────────────────────
function DiscoverPageInner() {
  const token = useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const tab = (searchParams.get("tab") || "foryou") as "foryou" | "explore";
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [matchNotification, setMatchNotification] = useState<string | null>(null);

  // Fetch current user + active intent
  const { data: meResp } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch<any>("/users/me", { token }),
    enabled: !!token,
  });

  const activeIntent: string | null = meResp?.intentType ?? null;

  // Filters for DSA intent
  const [ratingMin, setRatingMin] = useState<number | undefined>(undefined);
  const [ratingMax, setRatingMax] = useState<number | undefined>(undefined);
  const [showFilters, setShowFilters] = useState(false);

  const { data: intentResp } = useQuery({
    queryKey: ["users", "me", "intent"],
    queryFn: () => apiFetch<{ intent: { ratingMin?: number; ratingMax?: number } | null }>("/users/me/intent", { token }),
    enabled: !!token && tab === "foryou",
  });

  // Seed filters from the active intent, rather than the user profile.
  useEffect(() => {
    setRatingMin(intentResp?.intent?.ratingMin);
    setRatingMax(intentResp?.intent?.ratingMax);
  }, [intentResp?.intent?.ratingMin, intentResp?.intent?.ratingMax]);

  // ── For You tab: intent-driven candidates ─────────────────────────────────
  const {
    data: candidatesResp,
    isFetching: fetchingCandidates,
    isPlaceholderData,
  } = useQuery({
    queryKey: ["candidates", activeIntent, ratingMin, ratingMax],
    queryFn: () => {
      const params = new URLSearchParams({ intentType: activeIntent! });
      if (ratingMin) params.set("ratingMin", String(ratingMin));
      if (ratingMax) params.set("ratingMax", String(ratingMax));
      return apiFetch<any>(`/match/candidates?${params.toString()}`, { token });
    },
    enabled: !!token && !!activeIntent && tab === "foryou",
    placeholderData: keepPreviousData,
  });

  // ── Explore tab: cosine similarity browse ──────────────────────────────────
  const {
    data: similarResp,
    isFetching: fetchingSimilar,
  } = useQuery({
    queryKey: ["similar"],
    queryFn: () => apiFetch<any>("/match/similar", { token }),
    enabled: !!token && tab === "explore",
    placeholderData: keepPreviousData,
  });

  // apiFetch unwraps the gateway's { success, data } envelope.
  const forYouCandidates: Candidate[] = candidatesResp?.candidates ?? [];
  const exploreCandidates: Candidate[] = similarResp?.candidates ?? [];

  const candidates = tab === "foryou" ? forYouCandidates : exploreCandidates;
  const isFetching = tab === "foryou" ? fetchingCandidates : fetchingSimilar;

  // ── Swipe action ──────────────────────────────────────────────────────────
  const actionMutation = useMutation({
    mutationFn: (payload: { targetId: string; action: "ACCEPTED" | "REJECTED" }) =>
      apiFetch<any>("/match/action", {
        method: "POST",
      body: { ...payload, intentType: activeIntent },
        token,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      if (data?.isMutual) {
        setMatchNotification("🎉 It's a match! You can now chat.");
        queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
        queryClient.invalidateQueries({ queryKey: ["match", "matches"] });
        setTimeout(() => setMatchNotification(null), 5000);
      }
    },
  });

  const handleAction = (targetId: string, action: "ACCEPTED" | "REJECTED") => {
    actionMutation.mutate({ targetId, action });
  };

  const saveFilters = useMutation({
    mutationFn: () =>
      apiFetch("/users/me/intent", {
        token,
        method: "POST",
        body: { intentType: activeIntent, ratingMin, ratingMax },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "me", "intent"] });
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
      setShowFilters(false);
    },
  });

  const switchTab = (t: "foryou" | "explore") => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", t);
    router.push(`/discover?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {/* Match notification */}
      {matchNotification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg animate-in slide-in-from-right duration-300">
          {matchNotification}
        </div>
      )}

      {/* Intent Modal */}
      {showIntentModal && (
        <IntentModal
          onClose={() => {
            setShowIntentModal(false);
            queryClient.invalidateQueries({ queryKey: ["users", "me"] });
            queryClient.invalidateQueries({ queryKey: ["candidates"] });
          }}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">Discover</h1>
          <p className="text-[13px] text-muted mt-0.5">Find developers who match your goals.</p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          <button
            onClick={() => switchTab("foryou")}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-fast ${
              tab === "foryou"
                ? "bg-bg text-ink shadow-sm border border-border"
                : "text-muted hover:text-ink"
            }`}
          >
            For You
          </button>
          <button
            onClick={() => switchTab("explore")}
            className={`px-4 py-1.5 rounded-md text-[12px] font-medium transition-colors duration-fast ${
              tab === "explore"
                ? "bg-bg text-ink shadow-sm border border-border"
                : "text-muted hover:text-ink"
            }`}
          >
            Explore
          </button>
        </div>
      </div>

      {/* For You Tab Controls */}
      {tab === "foryou" && (
        <div className="flex items-center gap-2 mb-5">
          {activeIntent ? (
            <>
              <button
                onClick={() => setShowIntentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[12px] font-medium hover:bg-primary/20 transition-colors"
              >
                {INTENT_LABELS[activeIntent] ?? activeIntent}
                <span className="text-primary/70 text-[11px]">×</span>
              </button>
              {activeIntent === "DSA" && (
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-border text-muted rounded-full text-[12px] font-medium hover:text-ink hover:border-ink/30 transition-colors"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
                  </svg>
                  Filters
                </button>
              )}
            </>
          ) : (
            <button
              onClick={() => setShowIntentModal(true)}
            >
              Set an intent to find matches →
            </button>
          )}
        </div>
      )}

      {/* DSA Filter Drawer */}
      {tab === "foryou" && showFilters && activeIntent === "DSA" && (
        <div className="mb-5 p-4 bg-surface border border-border rounded-xl">
          <p className="text-[12px] font-medium text-ink mb-3">Codeforces Rating Range</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="text-[11px] text-muted mb-1 block">Min Rating</label>
              <input
                type="number"
                value={ratingMin ?? ""}
                onChange={(e) => setRatingMin(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 1200"
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring"
              />
            </div>
            <div className="flex-1">
              <label className="text-[11px] text-muted mb-1 block">Max Rating</label>
              <input
                type="number"
                value={ratingMax ?? ""}
                onChange={(e) => setRatingMax(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="e.g. 2000"
                className="w-full px-3 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring"
              />
            </div>
          </div>
          <button
            onClick={() => saveFilters.mutate()}
            disabled={saveFilters.isPending}
            className="mt-3 w-full py-2 bg-primary text-white rounded-lg text-[12px] font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {saveFilters.isPending ? "Applying…" : "Apply Filters"}
          </button>
        </div>
      )}

      {/* Feed */}
      <div className="space-y-4">
        {/* No intent set (For You tab) */}
        {tab === "foryou" && !activeIntent && !isFetching && (
          <div className="text-center py-16 bg-bg border border-border rounded-xl">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface border border-border flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <h3 className="text-ink font-medium mb-1">Set an intent to find matches</h3>
            <p className="text-muted text-[13px] mb-4">Tell us what you're looking for and we'll show you the best algorithmic matches.</p>
            <button
              onClick={() => setShowIntentModal(true)}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium hover:bg-primary/90 transition-colors"
            >
              Choose Intent
            </button>
          </div>
        )}

        {/* Loading state */}
        {isFetching && activeIntent && (
          <DiscoverLoader intent={INTENT_LABELS[activeIntent] ?? activeIntent} />
        )}

        {/* Candidates */}
        {!isFetching && candidates.length > 0 && candidates.map((candidate) => (
          <CandidateCard
            key={candidate.userId}
            candidate={candidate}
            activeIntent={tab === "foryou" ? activeIntent : null}
            onAction={handleAction}
            actionPending={actionMutation.isPending}
          />
        ))}

        {/* Empty state */}
        {!isFetching && candidates.length === 0 && (tab === "explore" || activeIntent) && (
          <div className="text-center py-12 bg-bg border border-border rounded-xl">
            <h3 className="text-ink font-medium">
              {tab === "explore"
                ? "No similar profiles found yet"
                : "No more candidates"}
            </h3>
            <p className="text-muted text-[13px] mt-1">
              {tab === "explore"
                ? "Build out your skill tags to find your peers."
                : "Check back later for more profiles."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="p-8 text-muted text-[13px]">Loading...</div>}>
      <DiscoverPageInner />
    </Suspense>
  );
}
