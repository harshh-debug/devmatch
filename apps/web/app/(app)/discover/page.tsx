"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { IntentModal } from "@/app/components/shared/IntentModal";
import { useToken } from "@/hooks/useToken";
import { apiFetch } from "@/lib/apiClient";
import type {
  Compatibility,
  IntentState,
  IntentType,
  LevelSource,
  MatchTier,
} from "@/lib/types";

interface Candidate {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl: string | null;
  college: string | null;
  cfRating: number | null;
  lcRating?: number | null;
  profileScore: number;
  skillTags?: string[];
  similarityScore: number;
  compatibility: Compatibility;
  levelSource: LevelSource;
  matchedSkills: string[];
  matchedLanguages: string[];
  matchedDomains: string[];
  matchTier: MatchTier;
}

interface CandidateResponse {
  candidates: Candidate[];
  relaxed: boolean;
  relaxedStartIndex?: number;
  totalAvailable: number;
}

const INTENT_LABELS: Record<IntentType, string> = {
  DSA: "DSA Partner",
  HACKATHON: "Hackathon",
  PROJECT: "Project",
  OPENSOURCE: "Open Source",
};

const COMPATIBILITY_LABELS: Record<Compatibility, string> = {
  HIGH: "High compatibility",
  MEDIUM: "Medium compatibility",
  LOW: "Low compatibility",
  UNKNOWN: "Level data unavailable",
};

function DiscoverLoader({ intent }: { intent: string }) {
  return (
    <div className="w-full rounded-xl border border-border bg-black p-8">
      <p className="font-mono text-[13px] text-[#A3A3A3]">
        {`> Ranking deterministic ${intent} matches...`}
        <span className="animate-pulse ml-0.5">█</span>
      </p>
    </div>
  );
}

function CandidateCard({
  candidate,
  activeIntent,
  onAction,
  actionPending,
}: {
  candidate: Candidate;
  activeIntent: IntentType;
  onAction: (targetId: string, action: "ACCEPTED" | "REJECTED") => void;
  actionPending: boolean;
}) {
  return (
    <div className="group relative bg-bg border border-border rounded-xl p-4 sm:p-5 hover:border-ink/20 transition-colors">
      <Link href={`/u/${candidate.userId}`} className="flex items-start gap-3.5 rounded-lg">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-ink/10 text-ink overflow-hidden">
          {candidate.avatarUrl ? (
            <Image
              src={candidate.avatarUrl}
              alt={candidate.displayName ?? "Developer"}
              width={40}
              height={40}
              unoptimized
              className="w-full h-full object-cover"
            />
          ) : (
            candidate.displayName?.charAt(0) || "U"
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">
              {candidate.displayName ?? candidate.username ?? "Developer"}
            </h3>
            {candidate.college && <span className="text-[11px] text-muted">{candidate.college}</span>}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {INTENT_LABELS[activeIntent]}
            </span>
          </div>
          {(candidate.matchedSkills.length > 0 || (candidate.skillTags?.length ?? 0) > 0) && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(candidate.matchedSkills.length > 0 ? candidate.matchedSkills : candidate.skillTags ?? [])
                .slice(0, 5)
                .map((skill) => (
                  <span key={skill} className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted">
                    {skill}
                  </span>
                ))}
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-border">
            <p className={`text-[12px] font-medium ${candidate.compatibility === "UNKNOWN" ? "text-muted" : "text-ink"}`}>
              {COMPATIBILITY_LABELS[candidate.compatibility]}
              <span className="text-muted font-normal"> · {Math.round(candidate.similarityScore * 100)}% similarity</span>
            </p>
            <div className="flex items-center gap-4 mt-2">
              {candidate.cfRating !== null && (
                <p className="text-[10px] text-muted">CF <span className="font-mono text-ink">{candidate.cfRating}</span></p>
              )}
              {candidate.lcRating && (
                <p className="text-[10px] text-muted">LC rank <span className="font-mono text-ink">{candidate.lcRating}</span></p>
              )}
              <p className="text-[10px] text-muted">Profile <span className="font-mono text-ink">{candidate.profileScore}</span></p>
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
        <button
          onClick={() => onAction(candidate.userId, "REJECTED")}
          disabled={actionPending}
          className="flex-1 py-2 text-[12px] font-medium rounded-lg border border-border text-muted hover:text-ink disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={() => onAction(candidate.userId, "ACCEPTED")}
          disabled={actionPending}
          className="flex-1 py-2 text-[12px] font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

function DiscoverPageInner() {
  const token = useToken();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const tab = (searchParams.get("tab") || "foryou") as "foryou" | "explore";
  const [showIntentModal, setShowIntentModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [ratingMin, setRatingMin] = useState<number | undefined>();
  const [ratingMax, setRatingMax] = useState<number | undefined>();
  const [matchNotification, setMatchNotification] = useState<string | null>(null);

  const { data: intentState } = useQuery({
    queryKey: ["users", "me", "intents"],
    queryFn: () => apiFetch<IntentState>("/users/me/intents", { token }),
    enabled: !!token,
  });
  const searchIntent = intentState?.searchIntent ?? null;
  const activeIntent = searchIntent?.intentType ?? null;

  useEffect(() => {
    setRatingMin(searchIntent?.ratingMin);
    setRatingMax(searchIntent?.ratingMax);
  }, [searchIntent?.ratingMin, searchIntent?.ratingMax]);

  const candidateQuery = useQuery({
    queryKey: ["candidates", intentState?.revision],
    queryFn: () =>
      apiFetch<CandidateResponse>("/match/candidates", {
        token,
        query: { intentRevision: intentState!.revision },
      }),
    enabled: !!token && !!activeIntent && !!intentState && tab === "foryou",
    placeholderData: keepPreviousData,
  });

  const similarQuery = useQuery({
    queryKey: ["similar", intentState?.revision],
    queryFn: () =>
      apiFetch<CandidateResponse>("/match/similar", {
        token,
        query: { intentRevision: intentState!.revision },
      }),
    enabled: !!token && !!activeIntent && !!intentState && tab === "explore",
    placeholderData: keepPreviousData,
  });

  const response = tab === "foryou" ? candidateQuery.data : similarQuery.data;
  const candidates = response?.candidates ?? [];
  const isFetching = tab === "foryou" ? candidateQuery.isFetching : similarQuery.isFetching;
  const relaxedIndex = candidates.findIndex((candidate) => candidate.matchTier === "RELAXED_PREFERENCES");

  const actionMutation = useMutation({
    mutationFn: (payload: { targetId: string; action: "ACCEPTED" | "REJECTED" }) =>
      apiFetch<{ isMutual: boolean }>("/match/action", {
        method: "POST",
        body: { ...payload, intentType: activeIntent },
        token,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["similar"] });
      if (data.isMutual) {
        setMatchNotification("It’s a match! You can now chat.");
        void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
        void queryClient.invalidateQueries({ queryKey: ["match", "matches"] });
        setTimeout(() => setMatchNotification(null), 5000);
      }
    },
  });

  const saveFilters = useMutation({
    mutationFn: () =>
      apiFetch<IntentState>("/users/me/search-intent", {
        token,
        method: "PUT",
        body: {
          intentType: activeIntent,
          ratingMin,
          ratingMax,
          preferredLanguages: searchIntent?.preferredLanguages ?? [],
          preferredDomains: searchIntent?.preferredDomains ?? [],
        },
      }),
    onSuccess: (state) => {
      queryClient.setQueryData(["users", "me", "intents"], state);
      void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["similar"] });
      setShowFilters(false);
    },
  });

  function switchTab(nextTab: "foryou" | "explore") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.push(`/discover?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {matchNotification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg">
          {matchNotification}
        </div>
      )}
      {showIntentModal && <IntentModal onClose={() => setShowIntentModal(false)} />}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">Discover</h1>
          <p className="text-[13px] text-muted mt-0.5">Find developers who match your goals.</p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-lg p-1">
          {(["foryou", "explore"] as const).map((value) => (
            <button
              key={value}
              onClick={() => switchTab(value)}
              className={`px-4 py-1.5 rounded-md text-[12px] font-medium ${
                tab === value ? "bg-bg text-ink shadow-sm border border-border" : "text-muted hover:text-ink"
              }`}
            >
              {value === "foryou" ? "For You" : "Explore"}
            </button>
          ))}
        </div>
      </div>

      {activeIntent && (
        <div className="flex items-center gap-2 mb-5">
          <button onClick={() => setShowIntentModal(true)} className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[12px] font-medium">
            {INTENT_LABELS[activeIntent]}
          </button>
          {activeIntent === "DSA" && tab === "foryou" && (
            <button onClick={() => setShowFilters((visible) => !visible)} className="px-3 py-1.5 border border-border text-muted rounded-full text-[12px] font-medium">
              Filters
            </button>
          )}
        </div>
      )}

      {showFilters && activeIntent === "DSA" && tab === "foryou" && (
        <div className="mb-5 p-4 bg-surface border border-border rounded-xl">
          <p className="text-[12px] font-medium text-ink mb-3">Codeforces rating range</p>
          <div className="flex gap-3">
            <input type="number" value={ratingMin ?? ""} onChange={(event) => setRatingMin(event.target.value ? Number(event.target.value) : undefined)} placeholder="Minimum" className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-bg border border-border rounded-lg" />
            <input type="number" value={ratingMax ?? ""} onChange={(event) => setRatingMax(event.target.value ? Number(event.target.value) : undefined)} placeholder="Maximum" className="flex-1 min-w-0 px-3 py-2 text-[13px] bg-bg border border-border rounded-lg" />
          </div>
          <button onClick={() => saveFilters.mutate()} disabled={saveFilters.isPending} className="mt-3 w-full py-2 bg-primary text-white rounded-lg text-[12px] font-medium disabled:opacity-60">
            {saveFilters.isPending ? "Applying…" : "Apply filters"}
          </button>
        </div>
      )}

      <div className="space-y-4">
        {!activeIntent && !isFetching && (
          <div className="text-center py-16 bg-bg border border-border rounded-xl">
            <h3 className="text-ink font-medium mb-1">Set an intent to find matches</h3>
            <p className="text-muted text-[13px] mb-4">Tell us what you are looking for right now.</p>
            <button onClick={() => setShowIntentModal(true)} className="px-6 py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium">
              Choose intent
            </button>
          </div>
        )}
        {isFetching && activeIntent && <DiscoverLoader intent={INTENT_LABELS[activeIntent]} />}
        {!isFetching && activeIntent && candidates.map((candidate, index) => (
          <div key={candidate.userId} className="space-y-4">
            {tab === "foryou" && relaxedIndex === index && (
              <div className="flex items-center gap-3 py-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted">Matches outside optional preferences</span>
                <div className="h-px flex-1 bg-border" />
              </div>
            )}
            <CandidateCard
              candidate={candidate}
              activeIntent={activeIntent}
              onAction={(targetId, action) => actionMutation.mutate({ targetId, action })}
              actionPending={actionMutation.isPending}
            />
          </div>
        ))}
        {!isFetching && activeIntent && candidates.length === 0 && (
          <div className="text-center py-12 bg-bg border border-border rounded-xl">
            <h3 className="text-ink font-medium">No more eligible candidates</h3>
            <p className="text-muted text-[13px] mt-1">Check back after more developers update their intents.</p>
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
