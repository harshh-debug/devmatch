"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { IntentModal } from "@/app/components/shared/IntentModal";
import { useToken } from "@/hooks/useToken";
import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  Compatibility,
  CollaborationRole,
  DsaGoal,
  ExploreCandidate,
  IntentState,
  IntentType,
  LevelSource,
  NiceToHaveMatch,
  OpenSourceContributionType,
  ResolvedMatchMode,
} from "@/lib/types";

interface Candidate {
  userId: string;
  username?: string;
  displayName?: string;
  avatarUrl: string | null;
  college: string | null;
  cfRating: number | null;
  lcRating?: number | null;
  skillTags?: string[];
  technicalFitScore: number;
  experienceProximity: number;
  experienceSource: ExploreCandidate["experienceSource"];
  similarityScore: number;
  compatibility: Compatibility;
  levelSource: LevelSource;
  matchedSkills: string[];
  matchedLanguages: string[];
  matchedFrameworks: string[];
  matchedDomains: string[];
  matchedRoles: CollaborationRole[];
  matchedGoals: DsaGoal[];
  matchedContributionTypes: OpenSourceContributionType[];
  matchedRepositoryTopics: string[];
  resolvedMatchMode: ResolvedMatchMode;
  niceToHave: NiceToHaveMatch;
  reasonCodes: string[];
}

interface CandidateResponse {
  candidates: Candidate[];
  totalAvailable: number;
}

interface ExploreResponse {
  candidates: ExploreCandidate[];
  totalAvailable: number;
}

const PAGE_LIMIT = 20;

function mergeByUserId<T extends { userId: string }>(current: T[], incoming: T[]) {
  const users = new Map(current.map((candidate) => [candidate.userId, candidate]));
  for (const candidate of incoming) users.set(candidate.userId, candidate);
  return [...users.values()];
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

const EXPLORE_EXPERIENCE_SOURCE_LABELS: Record<ExploreCandidate["experienceSource"], string> = {
  CODEFORCES: "Based on Codeforces ratings",
  LEETCODE: "Based on LeetCode global ranks",
  GITHUB: "Based on GitHub activity",
  UNKNOWN: "No comparable experience signal",
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
    <div className="group relative rounded-[1.35rem] border border-white/12 bg-surface p-5 shadow-sm transition duration-500 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-black/20 sm:p-6">
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
              <span className="text-muted font-normal"> · Technical fit {Math.round(candidate.technicalFitScore * 100)}% (skills and intent requirements)</span>
            </p>
            {candidate.resolvedMatchMode !== "DIRECT" && (
              <p className="mt-1 text-[11px] text-muted">
                {candidate.resolvedMatchMode === "SIMILAR" ? "Similar intent-specific experience" : "Fills required complementary capabilities"}
              </p>
            )}
            {[...candidate.matchedRoles, ...candidate.matchedGoals, ...candidate.matchedContributionTypes].length > 0 && (
              <p className="mt-1 text-[10px] text-muted">
                {[...candidate.matchedRoles, ...candidate.matchedGoals, ...candidate.matchedContributionTypes].join(" · ").replaceAll("_", " ")}
              </p>
            )}
            <div className="mt-2 space-y-1 text-[10px] text-muted">
              <p>Experience match <span className="font-mono text-ink">{Math.round(candidate.experienceProximity * 100)}%</span> · {EXPLORE_EXPERIENCE_SOURCE_LABELS[candidate.experienceSource]}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              {candidate.cfRating !== null && (
                <p className="text-[10px] text-muted">CF <span className="font-mono text-ink">{candidate.cfRating}</span></p>
              )}
              {candidate.lcRating !== null && candidate.lcRating !== undefined && (
                <p className="text-[10px] text-muted">LC rank <span className="font-mono text-ink">{candidate.lcRating}</span></p>
              )}
              </div>
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
        <button
          onClick={() => onAction(candidate.userId, "REJECTED")}
          disabled={actionPending}
          className="flex-1 rounded-xl border border-white/15 py-2.5 text-[12px] font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-50"
        >
          Skip
        </button>
        <button
          onClick={() => onAction(candidate.userId, "ACCEPTED")}
          disabled={actionPending}
          className="flex-1 rounded-xl bg-primary py-2.5 text-[12px] font-semibold text-bg transition hover:bg-primary-hover disabled:opacity-50"
        >
          Connect
        </button>
      </div>
    </div>
  );
}

function ExploreCard({
  candidate,
  onAction,
  actionPending,
}: {
  candidate: ExploreCandidate;
  onAction: (targetId: string, action: "ACCEPTED" | "REJECTED") => void;
  actionPending: boolean;
}) {
  return (
    <div className="group relative rounded-[1.35rem] border border-white/12 bg-surface p-5 shadow-sm transition duration-500 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl hover:shadow-black/20 sm:p-6">
      <Link href={`/u/${candidate.userId}`} className="flex items-start gap-3.5 rounded-lg">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 bg-ink/10 text-ink overflow-hidden">
          {candidate.avatarUrl ? <Image src={candidate.avatarUrl} alt={candidate.displayName ?? "Developer"} width={40} height={40} unoptimized className="w-full h-full object-cover" /> : candidate.displayName?.charAt(0) || "U"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-[15px] text-ink tracking-tight">{candidate.displayName ?? candidate.username ?? "Developer"}</h3>
            {candidate.college && <span className="text-[11px] text-muted">{candidate.college}</span>}
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">Explore</span>
          </div>
          {candidate.sharedSkills.length > 0 && <div className="flex flex-wrap gap-1.5 mt-2">{candidate.sharedSkills.slice(0, 5).map((skill) => <span key={skill} className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted">{skill}</span>)}</div>}
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[12px] font-medium text-ink">{Math.round(candidate.similarityScore * 100)}% profile similarity <span className="font-normal text-muted">(shared skills and technical profile)</span></p>
            <p className="mt-1 text-[10px] text-muted">{candidate.sharedSkillCount} shared skill{candidate.sharedSkillCount === 1 ? "" : "s"}</p>
            <div className="mt-2 space-y-1 text-[10px] text-muted">
              <p>Experience match <span className="font-mono text-ink">{Math.round(candidate.experienceProximity * 100)}%</span> · {EXPLORE_EXPERIENCE_SOURCE_LABELS[candidate.experienceSource]}</p>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                {candidate.cfRating !== null && <p>CF <span className="font-mono text-ink">{candidate.cfRating}</span></p>}
                {candidate.lcRating !== null && <p>LC rank <span className="font-mono text-ink">{candidate.lcRating}</span></p>}
              </div>
            </div>
          </div>
        </div>
      </Link>
      <div className="mt-5 flex items-center gap-2 border-t border-white/10 pt-4">
        <button onClick={() => onAction(candidate.userId, "REJECTED")} disabled={actionPending} className="flex-1 rounded-xl border border-white/15 py-2.5 text-[12px] font-medium text-muted transition hover:border-white/30 hover:text-ink disabled:opacity-50">Skip</button>
        <button onClick={() => onAction(candidate.userId, "ACCEPTED")} disabled={actionPending} className="flex-1 rounded-xl bg-primary py-2.5 text-[12px] font-semibold text-bg transition hover:bg-primary-hover disabled:opacity-50">Connect</button>
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
  const [matchNotification, setMatchNotification] = useState<string | null>(null);
  const [forYouPage, setForYouPage] = useState(1);
  const [explorePage, setExplorePage] = useState(1);
  const [forYouCandidates, setForYouCandidates] = useState<Candidate[]>([]);
  const [exploreCandidates, setExploreCandidates] = useState<ExploreCandidate[]>([]);
  const previousIntentRevision = useRef<number | undefined>(undefined);

  const { data: intentState } = useQuery({
    queryKey: ["users", "me", "intents"],
    queryFn: () => apiFetch<IntentState>("/users/me/intents", { token }),
    enabled: !!token,
  });
  const searchIntent = intentState?.searchIntent ?? null;
  const activeIntent = searchIntent?.intentType ?? null;

  const candidateQuery = useQuery({
    queryKey: ["candidates", intentState?.revision, forYouPage, PAGE_LIMIT],
    queryFn: () =>
      apiFetch<CandidateResponse>("/match/candidates", {
        token,
        query: { intentRevision: intentState!.revision, page: forYouPage, limit: PAGE_LIMIT },
      }),
    enabled: !!token && !!activeIntent && !!intentState && tab === "foryou",
  });

  const exploreQuery = useQuery({
    queryKey: ["explore", explorePage, PAGE_LIMIT],
    queryFn: () =>
      apiFetch<ExploreResponse>("/match/explore", {
        token,
        query: { page: explorePage, limit: PAGE_LIMIT },
      }),
    enabled: !!token && tab === "explore",
  });

  useEffect(() => {
    if (!candidateQuery.data) return;
    setForYouCandidates((current) => mergeByUserId(forYouPage === 1 ? [] : current, candidateQuery.data.candidates));
  }, [candidateQuery.data, forYouPage]);

  useEffect(() => {
    if (!exploreQuery.data) return;
    setExploreCandidates((current) => mergeByUserId(explorePage === 1 ? [] : current, exploreQuery.data.candidates));
  }, [exploreQuery.data, explorePage]);

  useEffect(() => {
    const revision = intentState?.revision;
    if (revision === undefined) return;

    // Cached candidate data is available immediately when the user returns to
    // Discover. Do not erase that restored list on this component's first
    // mount; only reset pagination after a real intent-preference revision.
    if (
      previousIntentRevision.current !== undefined &&
      previousIntentRevision.current !== revision
    ) {
      setForYouPage(1);
      setForYouCandidates([]);
    }
    previousIntentRevision.current = revision;
  }, [intentState?.revision]);

  const response = tab === "foryou" ? candidateQuery.data : exploreQuery.data;
  const candidates = tab === "foryou" ? forYouCandidates : exploreCandidates;
  const isFetching = tab === "foryou" ? candidateQuery.isFetching : exploreQuery.isFetching;
  const queryError = tab === "foryou" ? candidateQuery.error : exploreQuery.error;

  useEffect(() => {
    if (
      queryError instanceof ApiError &&
      ["INTENT_CONFIGURATION_REQUIRED", "GITHUB_DATA_REQUIRED"].includes(queryError.code ?? "")
    ) {
      setShowIntentModal(true);
    }
  }, [queryError]);

  const actionMutation = useMutation({
    mutationFn: (payload: { targetId: string; action: "ACCEPTED" | "REJECTED"; connectionContext: IntentType | "GENERAL" }) =>
      apiFetch<{ isMutual: boolean }>("/match/action", {
        method: "POST",
        body: payload,
        token,
      }),
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: ["candidates"] });
      void queryClient.invalidateQueries({ queryKey: ["explore"] });
      setForYouPage(1);
      setExplorePage(1);
      setForYouCandidates([]);
      setExploreCandidates([]);
      if (data.isMutual) {
        setMatchNotification("It’s a match! You can now chat.");
        void queryClient.invalidateQueries({ queryKey: ["chat", "rooms"] });
        void queryClient.invalidateQueries({ queryKey: ["match", "matches"] });
        setTimeout(() => setMatchNotification(null), 5000);
      }
    },
  });

  function switchTab(nextTab: "foryou" | "explore") {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", nextTab);
    router.push(`/discover?${params.toString()}`, { scroll: false });
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      {matchNotification && (
        <div className="fixed top-4 right-4 z-50 bg-primary text-white px-4 py-3 rounded-xl text-[13px] font-medium shadow-lg">
          {matchNotification}
        </div>
      )}
      {showIntentModal && <IntentModal initialIntent={activeIntent ?? undefined} onClose={() => setShowIntentModal(false)} />}

      <div className="mb-6 flex flex-col justify-between gap-5 rounded-[1.5rem] border border-white/12 bg-surface px-5 py-5 sm:flex-row sm:items-center sm:px-6">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.06em] text-ink">Discover</h1>
          <p className="mt-1 text-[14px] text-muted">Find developers who match your goals.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/12 bg-bg p-1.5">
          {(["foryou", "explore"] as const).map((value) => (
            <button
              key={value}
              onClick={() => switchTab(value)}
              className={`rounded-lg px-4 py-2 text-[12px] font-medium transition ${
                tab === value ? "border border-white/15 bg-surface-raised text-ink shadow-sm" : "text-muted hover:text-ink"
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
          <span className="text-[11px] text-muted">Edit preferences</span>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {tab === "foryou" && !activeIntent && !isFetching && (
          <div className="col-span-full rounded-[1.5rem] border border-white/12 bg-surface py-16 text-center">
            <h3 className="text-ink font-medium mb-1">Set an intent to find matches</h3>
            <p className="text-muted text-[13px] mb-4">Tell us what you are looking for right now.</p>
            <button onClick={() => setShowIntentModal(true)} className="px-6 py-2.5 bg-primary text-white rounded-lg text-[13px] font-medium">
              Choose intent
            </button>
          </div>
        )}
        {isFetching && (tab === "explore" || activeIntent) && <DiscoverLoader intent={tab === "explore" ? "profile" : INTENT_LABELS[activeIntent!]} />}
        {!isFetching && tab === "foryou" && activeIntent && (candidates as Candidate[]).map((candidate) => (
          <div key={candidate.userId}>
            <CandidateCard
              candidate={candidate}
              activeIntent={activeIntent}
              onAction={(targetId, action) => actionMutation.mutate({ targetId, action, connectionContext: activeIntent })}
              actionPending={actionMutation.isPending}
            />
          </div>
        ))}
        {!isFetching && tab === "explore" && (candidates as ExploreCandidate[]).map((candidate) => <ExploreCard key={candidate.userId} candidate={candidate} onAction={(targetId, action) => actionMutation.mutate({ targetId, action, connectionContext: "GENERAL" })} actionPending={actionMutation.isPending} />)}
        {!isFetching && (tab === "explore" || activeIntent) && candidates.length === 0 && (
          <div className="col-span-full rounded-[1.5rem] border border-white/12 bg-surface py-12 text-center">
            <h3 className="text-ink font-medium">
              {queryError ? "Matching preferences need attention" : tab === "explore" ? "No developers to explore right now" : "No developers satisfy the required preferences"}
            </h3>
            <p className="text-muted text-[13px] mt-1">
              {queryError instanceof Error ? queryError.message : "Edit your required groups or check back later."}
            </p>
            {tab === "foryou" && <button onClick={() => setShowIntentModal(true)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-[12px] font-medium text-white">
              Edit preferences
            </button>}
          </div>
        )}
        {!isFetching && response && candidates.length < response.totalAvailable && (
          <button onClick={() => tab === "foryou" ? setForYouPage((page) => page + 1) : setExplorePage((page) => page + 1)} className="col-span-full w-full rounded-xl border border-white/15 py-3 text-[13px] font-medium text-ink transition hover:border-primary/50 hover:bg-surface">
            Load more
          </button>
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
