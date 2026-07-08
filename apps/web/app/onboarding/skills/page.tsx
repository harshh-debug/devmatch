"use client";

import { useState } from "react";
import Link from "next/link";

const SKILLS_POOL = [
  "TypeScript", "JavaScript", "React", "Next.js", "Vue", "Angular",
  "Node.js", "Python", "Rust", "Go", "Java", "C++", "C#", "Ruby", "PHP", "Swift", "Kotlin",
  "Postgres", "MongoDB", "Redis", "Docker", "Kubernetes", "AWS", "GCP", "Azure",
  "TensorFlow", "PyTorch", "Tailwind", "GraphQL", "gRPC",
  "Django", "Flask", "Spring Boot", "Express", "NestJS", "Prisma",
  "Figma", "Svelte", "Solidity", "WebAssembly",
];

export default function OnboardingSkillsPage() {
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchSkill, setSearchSkill] = useState("");
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");

  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSearchSkill("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const filteredSkills = SKILLS_POOL.filter(
    (s) => s.toLowerCase().includes(searchSkill.toLowerCase()) && !selectedSkills.includes(s)
  );

  const canProceed = selectedSkills.length >= 1;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Skills &amp; integrations
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Add your technical skills and connect your coding profiles.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {/* Skills selector */}
        <div>
          <label className="block text-[13px] font-medium text-ink mb-2">
            Skills <span className="text-danger">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5 mb-3 min-h-[32px]">
            {selectedSkills.map((s) => (
              <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-full bg-primary/10 text-primary border border-primary/20">
                {s}
                <button type="button" onClick={() => removeSkill(s)} className="hover:text-primary-hover" aria-label={`Remove ${s}`}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
            {selectedSkills.length === 0 && (
              <span className="text-[12px] text-muted/60 px-1">Select at least one skill</span>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchSkill}
              onChange={(e) => { setSearchSkill(e.target.value); setShowSkillDropdown(true); }}
              onFocus={() => setShowSkillDropdown(true)}
              onBlur={() => setTimeout(() => setShowSkillDropdown(false), 200)}
              placeholder="Search skills..."
              className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
            />
            {showSkillDropdown && filteredSkills.length > 0 && (
              <div className="absolute z-dropdown left-0 right-0 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredSkills.map((s) => (
                  <button key={s} type="button" onClick={() => addSkill(s)}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors duration-fast">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="mt-1.5 text-[11px] text-muted">{selectedSkills.length} skills selected</p>
        </div>

        {/* Integrations */}
        <div className="pt-2">
          <label className="block text-[13px] font-medium text-ink mb-3">Connect your profiles</label>
          <p className="text-[12px] text-muted mb-4">
            DevMatch uses your coding profiles to verify skills and compute compatibility scores.
          </p>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-ink shrink-0" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">GitHub</p>
                <input type="text" value={githubHandle} onChange={(e) => setGithubHandle(e.target.value)}
                  placeholder="your-github-handle"
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] bg-surface border border-border rounded-md text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-warning shrink-0" aria-hidden="true">
                <path d="M16.102 16.977a.891.891 0 0 1-.637-.256l-5.207-5.208a.894.894 0 0 1 0-1.27l5.207-5.207a.891.891 0 0 1 1.27 0l.001.001 1.808 1.808a.891.891 0 0 1 0 1.27l-3.94 3.94 3.94 3.94a.891.891 0 0 1 0 1.27l-1.808 1.808a.891.891 0 0 1-.637.256z" />
                <path d="M9.255 19.963H4.226a.891.891 0 0 1-.891-.891V4.926a.891.891 0 0 1 .891-.891h5.029" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">LeetCode</p>
                <input type="text" value={leetcodeHandle} onChange={(e) => setLeetcodeHandle(e.target.value)}
                  placeholder="your-leetcode-handle"
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] bg-surface border border-border rounded-md text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring" />
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-info shrink-0" aria-hidden="true">
                <rect x="1" y="14" width="4" height="7" rx="1" /><rect x="7" y="10" width="4" height="11" rx="1" /><rect x="13" y="4" width="4" height="17" rx="1" /><rect x="19" y="6" width="4" height="15" rx="1" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">Codeforces</p>
                <input type="text" value={codeforcesHandle} onChange={(e) => setCodeforcesHandle(e.target.value)}
                  placeholder="your-cf-handle"
                  className="w-full mt-1 px-2.5 py-1.5 text-[12px] bg-surface border border-border rounded-md text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring" />
              </div>
            </div>
          </div>
          {(githubHandle || leetcodeHandle || codeforcesHandle) && (
            <button type="button"
              className="mt-4 w-full py-2.5 text-[13px] font-medium rounded-lg border border-border text-ink hover:bg-surface transition-colors duration-fast flex items-center justify-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              Sync Profiles Now
            </button>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/onboarding/profile" className="text-[13px] text-muted hover:text-ink transition-colors">Back</Link>
          <Link
            href={canProceed ? "/onboarding/intent" : "#"}
            className={`px-6 py-2.5 text-[13px] font-medium rounded-lg transition-colors duration-fast ${
              canProceed ? "bg-primary text-white hover:bg-primary-hover" : "bg-border text-muted cursor-not-allowed"
            }`}
            onClick={(e) => !canProceed && e.preventDefault()}
          >
            Continue
          </Link>
        </div>
      </form>
    </div>
  );
}