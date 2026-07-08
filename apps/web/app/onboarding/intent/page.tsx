"use client";

import { useState } from "react";
import Link from "next/link";

const INTENTS = [
  {
    id: "DSA",
    label: "DSA Partner",
    desc: "Practice competitive programming together. Solve problems, share strategies, and improve your rating.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "HACKATHON",
    label: "Hackathon Team",
    desc: "Find teammates for weekend hackathons. Complementary stacks, same time zone, ready to ship.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
      </svg>
    ),
  },
  {
    id: "PROJECT",
    label: "Project Collaborator",
    desc: "Build production-grade projects with a committed partner. Long-term collaboration, shared ownership.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  {
    id: "OPENSOURCE",
    label: "Open Source",
    desc: "Contribute to meaningful projects. Find co-maintainers, discover repos worth your time.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    ),
  },
];

export default function OnboardingIntentPage() {
  const [selectedIntent, setSelectedIntent] = useState<string | null>(null);
  const [ratingMin, setRatingMin] = useState(1200);
  const [ratingMax, setRatingMax] = useState(2000);

  const isDSA = selectedIntent === "DSA";

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          What are you looking for?
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Select your primary collaboration goal. DevMatch will find the best developers for this intent.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {/* Intent cards */}
        <div className="space-y-2.5">
          {INTENTS.map((intent) => {
            const isSelected = selectedIntent === intent.id;
            return (
              <button
                key={intent.id}
                type="button"
                onClick={() => setSelectedIntent(intent.id)}
                className={`w-full flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-fast ${
                  isSelected ? "border-primary bg-primary/5" : "border-border hover:border-ink/20"
                }`}
              >
                <div className={`shrink-0 mt-0.5 ${isSelected ? "text-primary" : "text-muted"}`}>
                  {intent.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className={`text-[14px] font-medium ${isSelected ? "text-primary" : "text-ink"}`}>
                      {intent.label}
                    </p>
                    {isSelected && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" aria-hidden="true">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[12px] text-muted mt-1 leading-relaxed">{intent.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Conditional DSA slider */}
        {isDSA && (
          <div className="p-4 rounded-xl border border-border bg-surface animate-fade-in">
            <p className="text-[13px] font-medium text-ink mb-4">Rating range preferences</p>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-muted">Min rating</label>
                  <span className="font-mono text-[13px] text-ink tabular-nums">{ratingMin}</span>
                </div>
                <input type="range" min="800" max="2500" step="50" value={ratingMin}
                  onChange={(e) => setRatingMin(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[12px] text-muted">Max rating</label>
                  <span className="font-mono text-[13px] text-ink tabular-nums">{ratingMax}</span>
                </div>
                <input type="range" min="800" max="3000" step="50" value={ratingMax}
                  onChange={(e) => setRatingMax(Number(e.target.value))} className="w-full accent-primary" />
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>Newbie</span><span>Expert</span><span>Legendary</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/onboarding/skills" className="text-[13px] text-muted hover:text-ink transition-colors">Back</Link>
          <Link
            href={selectedIntent ? "/discover" : "#"}
            className={`px-6 py-2.5 text-[13px] font-medium rounded-lg transition-colors duration-fast inline-flex items-center gap-2 ${
              selectedIntent ? "bg-primary text-white hover:bg-primary-hover" : "bg-border text-muted cursor-not-allowed"
            }`}
            onClick={(e) => !selectedIntent && e.preventDefault()}
          >
            Start Matching
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </Link>
        </div>
      </form>
    </div>
  );
}