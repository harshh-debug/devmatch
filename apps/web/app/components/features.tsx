import type { ReactNode } from "react";

/* ─── Real product UI moments (content IS the imagery) ─── */

function ProfileMoment() {
  return (
    <div className="bg-bg border border-border rounded-2xl p-5 sm:p-6 w-full max-w-[420px]">
      {/* Sync header */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-muted tracking-wide">YOUR PROFILE</p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-ink" aria-hidden="true" />
          <span className="text-[10px] text-muted">synced 2m ago</span>
        </div>
      </div>

      {/* Identity */}
      <div className="flex items-center gap-3 mb-5">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-semibold"
          style={{ backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)", color: "var(--color-ink)" }}
          aria-hidden="true"
        >
          SC
        </div>
        <div className="flex-1">
          <p className="font-display font-semibold text-[15px] text-ink tracking-tight">Sarah Chen</p>
          <p className="text-[12px] text-muted">Full-Stack Engineer</p>
        </div>
        <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-ink text-bg">VERIFIED</span>
      </div>

      {/* Synced platforms */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <div className="border border-border rounded-lg p-2.5">
          <p className="text-[10px] text-muted mb-1">GITHUB</p>
          <p className="font-mono text-[14px] text-ink tabular-nums">47 repos</p>
          <p className="text-[10px] text-muted">12 contributed</p>
        </div>
        <div className="border border-border rounded-lg p-2.5">
          <p className="text-[10px] text-muted mb-1">LEETCODE</p>
          <p className="font-mono text-[14px] text-ink tabular-nums">1850</p>
          <p className="text-[10px] text-muted">top 8%</p>
        </div>
      </div>

      {/* Skill vector */}
      <div>
        <p className="text-[10px] text-muted mb-2 tracking-wide">SKILL VECTOR</p>
        <div className="space-y-1.5">
          {[
            { name: "TypeScript", v: 92 },
            { name: "React", v: 88 },
            { name: "Node.js", v: 74 },
            { name: "Postgres", v: 61 },
          ].map((s, i) => (
            <div key={s.name} className="flex items-center gap-2.5">
              <span className="text-[11px] text-ink w-16 shrink-0">{s.name}</span>
              <div className="flex-1 h-1 rounded-full bg-border overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${s.v}%`,
                    backgroundColor: i === 0 ? "var(--color-primary)" : "var(--color-ink)",
                    opacity: i === 0 ? 1 : 0.7 - i * 0.12,
                  }}
                />
              </div>
              <span className="text-[10px] text-muted tabular-nums w-7 text-right">{s.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwipeMoment() {
  return (
    <div className="bg-bg border border-border rounded-2xl p-5 sm:p-6 w-full max-w-[420px]">
      <div className="flex items-center justify-between mb-5">
        <p className="text-[11px] text-muted tracking-wide">DISCOVERY · HACKATHON INTENT</p>
        <span className="text-[10px] text-muted tabular-nums">3 of 24</span>
      </div>

      {/* Candidate */}
      <div className="border border-border rounded-xl p-4 mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)", color: "var(--color-ink)" }}
            aria-hidden="true"
          >
            MJ
          </div>
          <div className="flex-1">
            <p className="font-display font-semibold text-[14px] text-ink tracking-tight">Marcus Johnson</p>
            <p className="text-[11px] text-muted">ML Engineer · LC 2100</p>
          </div>
        </div>

        {/* Compatibility */}
        <div className="flex items-center justify-between py-3 border-y border-border mb-3">
          <div>
            <p className="text-[10px] text-muted mb-0.5">COMPATIBILITY</p>
            <p className="font-mono font-semibold text-[20px] text-ink tabular-nums leading-none">
              92<span className="text-[12px] text-muted">%</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted mb-0.5">STACK FIT</p>
            <p className="text-[12px] text-ink">Python ↔ TS</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-muted mb-0.5">AVAILABILITY</p>
            <p className="text-[12px] text-ink">this weekend</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {["TensorFlow", "PyTorch", "K8s"].map((t) => (
            <span key={t} className="px-2 py-0.5 text-[10px] rounded-full border border-border text-muted">{t}</span>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2">
        <button className="text-[12px] font-medium py-2.5 rounded-full border border-border text-muted hover:bg-surface transition-colors">
          Pass
        </button>
        <button className="text-[12px] font-medium py-2.5 rounded-full bg-primary text-bg hover:bg-primary-hover transition-colors">
          Match
        </button>
      </div>
    </div>
  );
}

function ChatMoment() {
  return (
    <div className="bg-bg border border-border rounded-2xl p-5 sm:p-6 w-full max-w-[420px]">
      {/* Chat header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold"
            style={{ backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)", color: "var(--color-ink)" }}
            aria-hidden="true"
          >
            MJ
          </div>
          <div>
            <p className="text-[13px] font-medium text-ink">Marcus Johnson</p>
            <p className="text-[10px] text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" /> online
            </p>
          </div>
        </div>
        <span className="text-[10px] px-2 py-1 rounded-full bg-surface border border-border text-muted">MATCHED</span>
      </div>

      {/* Messages */}
      <div className="space-y-3">
        {/* Incoming */}
        <div className="max-w-[80%]">
          <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-3.5 py-2">
            <p className="text-[12px] text-ink leading-relaxed">got the auth flow scaffolded — how&rsquo;s the model service?</p>
          </div>
          <p className="text-[9px] text-muted mt-1 ml-1">10:42</p>
        </div>

        {/* Outgoing code snippet */}
        <div className="max-w-[85%] ml-auto">
          <div className="bg-ink rounded-2xl rounded-br-md px-3.5 py-2.5 font-mono text-[11px] leading-relaxed">
            <p className="text-bg/60 text-[9px] mb-1.5 tracking-wide">TYPESCRIPT</p>
            <p>
              <span className="text-bg/70">const</span>{" "}
              <span style={{ color: "var(--color-primary)" }}>predict</span>{" "}
              <span className="text-bg/70">= async (x) =&gt;</span>{" "}
              <span className="text-bg">await</span>{" "}
              <span style={{ color: "var(--color-primary)" }}>model</span>
              <span className="text-bg/70">.</span>
              <span style={{ color: "var(--color-primary)" }}>infer</span>
              <span className="text-bg/70">(x)</span>
            </p>
          </div>
          <p className="text-[9px] text-muted mt-1 mr-1 text-right flex items-center justify-end gap-1">
            10:43 <span className="text-primary">✓✓</span>
          </p>
        </div>

        {/* Typing */}
        <div className="max-w-[60%]">
          <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-3.5 py-2.5 inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "120ms" }} />
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "240ms" }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Layout ─── */

interface Moment {
  n: string;
  title: string;
  copy: string;
  detail: string;
  ui: ReactNode;
}

const MOMENTS: Moment[] = [
  {
    n: "01",
    title: "Connect your code.",
    copy: "Sync GitHub and LeetCode. We compute a multi-dimensional skill vector from real repositories, languages, and contest ratings — not self-reported buzzwords.",
    detail: "No more unverifiable claims.",
    ui: <ProfileMoment />,
  },
  {
    n: "02",
    title: "Swipe with intent.",
    copy: "Declare a goal — hackathon, ICPC, open-source. See candidates ranked by mathematical compatibility, filtered by rating band, stack fit, and availability.",
    detail: "Real compatibility, not keywords.",
    ui: <SwipeMoment />,
  },
  {
    n: "03",
    title: "Match. Then build.",
    copy: "Mutual right-swipe unlocks a real-time workspace: syntax-highlighted code sharing, read receipts, typing indicators, and live presence. Built for builders.",
    detail: "Conversations start when both agree.",
    ui: <ChatMoment />,
  },
];

export default function Features() {
  return (
    <section id="flow" className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Section intro — single kicker, not repeated */}
        <div className="max-w-2xl mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-ink text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] tracking-[-0.02em] text-balance">
            Three steps from profile to production.
          </h2>
          <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-[55ch]">
            No cold messages. No recruiter feeds. Just a clean path from your
            code to the right collaborator.
          </p>
        </div>

        {/* Moments — asymmetric alternating flow */}
        <div className="space-y-20 sm:space-y-28">
          {MOMENTS.map((m, i) => (
            <div
              key={m.n}
              className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} gap-10 lg:gap-16 items-center`}
            >
              {/* UI side */}
              <div className="flex-1 w-full flex justify-center">
                {m.ui}
              </div>

              {/* Copy side */}
              <div className="flex-1 w-full max-w-md">
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono text-[13px] text-primary tabular-nums">{m.n}</span>
                  <span className="h-px flex-1 max-w-[40px] bg-border" aria-hidden="true" />
                </div>
                <h3 className="font-display font-semibold text-ink text-[clamp(1.5rem,2.5vw,2rem)] leading-[1.1] tracking-[-0.02em] text-balance">
                  {m.title}
                </h3>
                <p className="mt-4 text-[15px] text-muted leading-relaxed text-pretty">
                  {m.copy}
                </p>
                <p className="mt-4 text-[13px] font-medium text-ink">
                  {m.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}