"use client";

import { usePathname } from "next/navigation";

const STEPS = [
  { label: "Profile", href: "/onboarding/profile" },
  { label: "Skills", href: "/onboarding/skills" },
  { label: "Intent", href: "/onboarding/intent" },
];

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const currentStep = STEPS.findIndex((s) => s.href === pathname);
  const stepNumber = currentStep + 1;

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Header with logo */}
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
        <span className="text-[12px] text-muted tabular-nums">
          Step {stepNumber} of 3
        </span>
      </header>

      {/* Progress bar */}
      <div className="h-1 bg-border" role="progressbar" aria-valuenow={stepNumber} aria-valuemin={1} aria-valuemax={3}>
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${(stepNumber / 3) * 100}%` }}
        />
      </div>

      {/* Step labels */}
      <div className="flex items-center justify-center gap-0 sm:gap-8 px-5 py-4 border-b border-border">
        {STEPS.map((step, i) => {
          const isActive = i === currentStep;
          const isCompleted = i < currentStep;
          return (
            <div
              key={step.label}
              className={`flex items-center gap-2 ${
                isActive || isCompleted ? "text-ink" : "text-muted/50"
              }`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-medium transition-colors duration-fast ${
                  isCompleted
                    ? "bg-primary text-white"
                    : isActive
                    ? "bg-primary/10 text-primary border border-primary"
                    : "bg-surface border border-border text-muted"
                }`}
              >
                {isCompleted ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span className="text-[12px] font-medium hidden sm:inline">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center px-5 py-8 sm:py-12">
        <div className="w-full max-w-lg">{children}</div>
      </main>
    </div>
  );
}