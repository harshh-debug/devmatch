"use client";

import { useState } from "react";
import Link from "next/link";

const COLLEGES = [
  "MIT", "Stanford", "UC Berkeley", "CMU", "Georgia Tech",
  "UT Austin", "UIUC", "Caltech", "Harvard", "Princeton",
  "University of Michigan", "Cornell", "UCLA", "University of Washington", "Purdue",
];

const AVAILABILITY = [
  { value: "ACTIVE", label: "Active", desc: "Ready to start immediately" },
  { value: "OPEN", label: "Open", desc: "Exploring options, not urgent" },
  { value: "BUSY", label: "Busy", desc: "Not looking right now" },
];

export default function OnboardingProfilePage() {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [availability, setAvailability] = useState("");

  const filteredColleges = COLLEGES.filter((c) =>
    c.toLowerCase().includes(college.toLowerCase())
  );

  const canProceed = displayName.trim().length > 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Set up your profile
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Let developers know who you are and what you&apos;re working on.
        </p>
      </div>

      <form onSubmit={(e) => e.preventDefault()} className="space-y-5">
        {/* Display Name */}
        <div>
          <label htmlFor="displayName" className="block text-[13px] font-medium text-ink mb-1.5">
            Display name <span className="text-danger">*</span>
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your full name"
            required
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
          />
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="block text-[13px] font-medium text-ink mb-1.5">
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell developers about yourself — your experience, interests, and what you're looking for..."
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast resize-none"
          />
          <p className="mt-1 text-[11px] text-muted">{bio.length}/500</p>
        </div>

        {/* College */}
        <div className="relative">
          <label htmlFor="college" className="block text-[13px] font-medium text-ink mb-1.5">
            College
          </label>
          <input
            id="college"
            type="text"
            value={college}
            onChange={(e) => { setCollege(e.target.value); setShowCollegeDropdown(true); }}
            onFocus={() => setShowCollegeDropdown(true)}
            placeholder="Search your college..."
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
          />
          {showCollegeDropdown && filteredColleges.length > 0 && (
            <div className="absolute z-dropdown left-0 right-0 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
              {filteredColleges.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCollege(c); setShowCollegeDropdown(false); }}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors duration-fast"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {showCollegeDropdown && college && filteredColleges.length === 0 && (
            <div className="absolute z-dropdown left-0 right-0 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden">
              <p className="px-3.5 py-2.5 text-[13px] text-muted">No colleges found</p>
            </div>
          )}
        </div>

        {/* Availability */}
        <div>
          <label className="block text-[13px] font-medium text-ink mb-2.5">Availability</label>
          <div className="space-y-2">
            {AVAILABILITY.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAvailability(a.value)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-colors duration-fast ${
                  availability === a.value ? "border-primary bg-primary/5" : "border-border hover:border-ink/20"
                }`}
              >
                <div>
                  <p className={`text-[13px] font-medium ${availability === a.value ? "text-primary" : "text-ink"}`}>
                    {a.label}
                  </p>
                  <p className="text-[11px] text-muted mt-0.5">{a.desc}</p>
                </div>
                {availability === a.value && (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Link href="/" className="text-[13px] text-muted hover:text-ink transition-colors">Back to home</Link>
          <Link
            href={canProceed ? "/onboarding/skills" : "#"}
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