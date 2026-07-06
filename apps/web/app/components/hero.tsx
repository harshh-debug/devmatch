import InteractiveCard from "./interactive-card";

export default function Hero() {
  return (
    <section className="relative pt-32 sm:pt-36 pb-20 sm:pb-24">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        {/* Centered text stack */}
        <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
          {/* Single deliberate kicker — not on every section */}
          <p className="text-[12px] font-medium text-muted mb-6 tracking-[0.02em]">
            <span className="text-primary">●</span> Developer matchmaking, backed by real data
          </p>

          <h1 className="font-display font-semibold text-ink leading-[1.02] tracking-[-0.03em] text-balance text-[clamp(2.5rem,7vw,4.5rem)]">
            Find your match.
            <br />
            In code.
          </h1>

          <p className="mt-6 text-[clamp(1rem,1.4vw,1.125rem)] text-muted leading-relaxed max-w-[52ch] tracking-[0.005em] text-pretty">
            Intent-driven matching backed by real GitHub data, LeetCode ratings,
            and mutual consent. No noise. No recruiters. Just collaborators.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="#cta"
              className="inline-flex items-center justify-center px-6 py-3 bg-primary text-bg font-medium text-[14px] rounded-full hover:bg-primary-hover transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              Join DevMatch
            </a>
            <a
              href="#flow"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-ink font-medium text-[14px] rounded-full hover:bg-surface transition-colors duration-fast"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* Interactive card — the product is the imagery */}
        <div className="mt-16 sm:mt-20">
          <InteractiveCard />
        </div>
      </div>
    </section>
  );
}