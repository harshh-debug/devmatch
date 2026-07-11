import Link from "next/link";

export default function CTASection() {
  return (
    <section id="cta" className="py-28 sm:py-36 border-t border-border">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8">
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
          <h2 className="font-display font-semibold text-ink leading-[1.03] tracking-[-0.03em] text-balance text-[clamp(2rem,5vw,3.25rem)]">
            Ready to find your match?
          </h2>
          <p className="mt-5 text-[15px] sm:text-base text-muted leading-relaxed max-w-[48ch] text-pretty">
            Join the developers who collaborate on real code, not buzzwords.
            Free for builders. No recruiter noise.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-bg font-medium text-[14px] rounded-full hover:bg-primary-hover transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              Sign up with GitHub
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 border border-border text-ink font-medium text-[14px] rounded-full hover:bg-surface transition-colors duration-fast"
            >
              Sign up with email
            </Link>
          </div>

          <p className="mt-5 text-[12px] text-muted">
            No credit card. No recruiter noise. Free for developers.
          </p>
        </div>
      </div>
    </section>
  );
}