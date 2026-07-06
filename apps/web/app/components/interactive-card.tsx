"use client";

import { useState, useEffect, useCallback } from "react";

interface DevProfile {
  name: string;
  role: string;
  leetcode: number;
  repos: number;
  langs: { name: string; pct: number }[];
  tags: string[];
  bio: string;
}

const PROFILES: DevProfile[] = [
  {
    name: "Sarah Chen",
    role: "Full-Stack Engineer",
    leetcode: 1850,
    repos: 47,
    langs: [
      { name: "TypeScript", pct: 45 },
      { name: "Python", pct: 30 },
      { name: "Rust", pct: 25 },
    ],
    tags: ["React", "Node.js", "Postgres"],
    bio: "Building production systems. Looking for a backend partner for the weekend hackathon.",
  },
  {
    name: "Marcus Johnson",
    role: "ML Engineer",
    leetcode: 2100,
    repos: 23,
    langs: [
      { name: "Python", pct: 60 },
      { name: "C++", pct: 25 },
      { name: "Rust", pct: 15 },
    ],
    tags: ["TensorFlow", "PyTorch", "K8s"],
    bio: "Competitive programmer. Need a web dev to round out our ICPC team.",
  },
  {
    name: "Priya Patel",
    role: "Frontend Specialist",
    leetcode: 1650,
    repos: 56,
    langs: [
      { name: "TypeScript", pct: 55 },
      { name: "CSS", pct: 30 },
      { name: "Go", pct: 15 },
    ],
    tags: ["React", "Tailwind", "Next.js"],
    bio: "Design systems by day, open-source by night. Seeking a backend collaborator.",
  },
  {
    name: "Alex Kim",
    role: "Backend / Infra",
    leetcode: 1750,
    repos: 31,
    langs: [
      { name: "Go", pct: 40 },
      { name: "TypeScript", pct: 35 },
      { name: "Rust", pct: 25 },
    ],
    tags: ["AWS", "Docker", "gRPC"],
    bio: "Infra engineer. Looking for a frontend co-founder for a devtools startup.",
  },
];

export default function InteractiveCard() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const next = useCallback(() => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent((i) => (i + 1) % PROFILES.length);
      setAnimating(false);
    }, 380);
  }, [animating]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const profile = PROFILES[current]!;

  return (
    <div className="relative w-full max-w-[380px] mx-auto" role="region" aria-label="Developer profile preview">
      {/* Card */}
      <div
        className={`relative bg-bg border border-border rounded-2xl p-6 cursor-pointer select-none
          transition-all duration-[380ms] ease-out
          ${animating ? "opacity-0 translate-x-8 rotate-[3deg]" : "opacity-100 translate-x-0 rotate-0"}`}
        onClick={next}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            next();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`${profile.name}, ${profile.role}. Press to see the next profile.`}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                color: "var(--color-ink)",
              }}
              aria-hidden="true"
            >
              {profile.name.split(" ").map((n) => n[0]).join("")}
            </div>
            <div>
              <p className="font-display font-semibold text-[15px] text-ink leading-tight tracking-tight">
                {profile.name}
              </p>
              <p className="text-[12px] text-muted mt-0.5">{profile.role}</p>
            </div>
          </div>
          {/* Verified rating */}
          <div className="text-right">
            <p className="font-mono font-semibold text-[15px] text-ink leading-none tabular-nums">
              {profile.leetcode}
            </p>
            <p className="text-[10px] text-muted mt-1 tracking-wide">LC RATING</p>
          </div>
        </div>

        {/* Bio */}
        <p className="text-[13px] text-muted leading-relaxed mb-5">{profile.bio}</p>

        {/* Languages — monochrome bars */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] text-muted tracking-wide">LANGUAGES</p>
            <p className="text-[10px] text-muted tabular-nums">{profile.repos} repos</p>
          </div>
          {/* Stacked bar */}
          <div className="flex h-1.5 rounded-full overflow-hidden mb-2.5" aria-hidden="true">
            {profile.langs.map((lang, i) => (
              <div
                key={lang.name}
                className="h-full transition-all duration-500"
                style={{
                  width: `${lang.pct}%`,
                  backgroundColor: `color-mix(in oklch, var(--color-ink) ${85 - i * 30}%, transparent)`,
                }}
              />
            ))}
          </div>
          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {profile.langs.map((lang, i) => (
              <div key={lang.name} className="flex items-center gap-1.5">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: `color-mix(in oklch, var(--color-ink) ${85 - i * 30}%, transparent)` }}
                  aria-hidden="true"
                />
                <span className="text-[11px] text-muted">{lang.name}</span>
                <span className="text-[11px] text-muted/70 tabular-nums">{lang.pct}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5">
          {profile.tags.map((tag) => (
            <span
              key={tag}
              className="px-2.5 py-1 text-[11px] rounded-full border border-border text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-4 px-1">
        <span className="text-[11px] text-muted tabular-nums">
          {String(current + 1).padStart(2, "0")} / {String(PROFILES.length).padStart(2, "0")}
        </span>

        {/* Dots */}
        <div className="flex gap-1.5" aria-hidden="true">
          {PROFILES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                if (!animating && i !== current) {
                  setAnimating(true);
                  setTimeout(() => {
                    setCurrent(i);
                    setAnimating(false);
                  }, 200);
                }
              }}
              className={`block rounded-full transition-all duration-300 ${
                i === current ? "w-5 h-1.5 bg-ink" : "w-1.5 h-1.5 bg-border hover:bg-muted"
              }`}
              aria-label={`Go to profile ${i + 1}`}
            />
          ))}
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            next();
          }}
          className="text-[11px] font-medium text-ink hover:text-primary transition-colors duration-fast flex items-center gap-1"
          aria-label="Next profile"
        >
          Next
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}