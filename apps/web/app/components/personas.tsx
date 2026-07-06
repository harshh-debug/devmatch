const INTENTS = [
  {
    key: "Hackathon",
    tag: "48-hour sprint",
    goal: "Find a complementary stack under deadline pressure.",
    fields: [
      { label: "Looking for", value: "Complementary stack" },
      { label: "Stack match", value: "React ↔ Node / ML ↔ Web" },
      { label: "Availability", value: "This weekend" },
      { label: "Time zone", value: "±3h overlap" },
    ],
  },
  {
    key: "Competitive",
    tag: "ICPC / Codeforces",
    goal: "Find a teammate at your rating band, same division.",
    fields: [
      { label: "Looking for", value: "ICPC teammate" },
      { label: "Rating band", value: "1800 – 2100" },
      { label: "Division", value: "Same region" },
      { label: "Focus", value: "Algorithms / DP / graph" },
    ],
  },
  {
    key: "Open Source",
    tag: "Build in public",
    goal: "Find a co-maintainer or a repo worth your time.",
    fields: [
      { label: "Looking for", value: "Co-maintainer" },
      { label: "Languages", value: "Go, Rust, TypeScript" },
      { label: "Style", value: "PR-first, reviewed" },
      { label: "Commitment", value: "Long-term" },
    ],
  },
];

export default function Personas() {
  return (
    <section id="intents" className="py-24 sm:py-32 border-t border-border">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Section intro */}
        <div className="max-w-2xl mb-16 sm:mb-20">
          <h2 className="font-display font-semibold text-ink text-[clamp(1.75rem,3.5vw,2.5rem)] leading-[1.05] tracking-[-0.02em] text-balance">
            One intent at a time.
          </h2>
          <p className="mt-4 text-[15px] text-muted leading-relaxed max-w-[55ch]">
            You declare what you want right now. DevMatch filters the world
            down to the developers who fit that exact goal.
          </p>
        </div>

        {/* Intent cards — real selection UI, data-dense */}
        <div className="grid md:grid-cols-3 gap-4 sm:gap-5">
          {INTENTS.map((intent) => (
            <div
              key={intent.key}
              className="border border-border rounded-2xl p-6 bg-bg flex flex-col hover:border-ink/20 transition-colors duration-normal"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-5">
                <h3 className="font-display font-semibold text-[20px] text-ink tracking-tight">
                  {intent.key}
                </h3>
                <span className="text-[10px] font-medium px-2.5 py-1 rounded-full border border-border text-muted">
                  {intent.tag}
                </span>
              </div>

              <p className="text-[13px] text-muted leading-relaxed mb-5 min-h-[3.5em]">
                {intent.goal}
              </p>

              {/* Field list — real config UI */}
              <dl className="space-y-3 pt-4 border-t border-border mt-auto">
                {intent.fields.map((f) => (
                  <div key={f.label} className="flex items-baseline justify-between gap-3">
                    <dt className="text-[11px] text-muted tracking-wide shrink-0">{f.label.toUpperCase()}</dt>
                    <dd className="text-[12px] text-ink text-right font-medium">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}