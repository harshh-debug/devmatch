# Product

## Register

brand

## Users

The landing page serves three distinct developer personas, each with a different collaboration goal:

- **The Hackathon Builder:** Developers seeking complementary skills under tight deadlines. They care about immediate availability and specific framework expertise (frontend seeking backend, ML engineer seeking web dev).
- **The Competitive Programmer:** High-ranking algorithmic problem solvers looking for teammates for ACM-ICPC, Codeforces, or LeetCode sprint partnerships. They focus heavily on contest ratings and mathematical aptitude.
- **The Open-Source / Project Collaborator:** Students or self-taught builders eager to contribute to meaningful repositories, build production-ready systems, or collaborate on portfolio-grade projects.

All three are united by one frustration: existing platforms (LinkedIn, generic networking sites) are noisy, filled with unverifiable claims, and lack intent-based matching. They come to DevMatch because it's a precision tool, not a social network.

## Product Purpose

DevMatch is an intent-driven, real-time discovery and networking platform that matches developers using verifiable data (GitHub repositories, LeetCode ratings), multi-dimensional technical compatibility, and granular collaboration goals. Unlike generic networking sites, DevMatch uses mutual double-blind swipes — conversations only start when both parties explicitly agree on a specific goal.

The landing page must communicate this value proposition instantly: **verifiable data, not buzzwords. Mutual intent, not cold messaging. Developer-first, not recruiter-heavy.**

## Brand Personality

Three words: **Minimal · Technical · Capable**

Inspired by Vercel's restrained, developer-first approach. The landing page feels like a precision instrument — clean, calculated, and honest. Every pixel earns its place. The visual tone is confident without being loud, technical without being intimidating.

- **Voice:** Direct, clear, no jargon. Speaks to developers as peers.
- **Tone on the page:** Confident invitation. The platform is powerful; the page simply shows what it does.
- **Emotional goal:** The reader should feel "this was built by developers who understand what I need."

## Anti-references

**No generic SaaS.** The landing page must avoid the 2023-2026 startup template at all costs:

- No warm cream / sand / beige backgrounds
- No gradient hero buttons with white text
- No floating phone/laptop mockups
- No numbered section markers (01 / 02 / 03) as default scaffolding
- No tiny uppercase tracked eyebrows above every section
- No hero-metric template (big number + small label + gradient accent)
- No side-stripe borders on cards
- No glassmorphism or decorative blurs
- No gradient text

The closest anti-reference: a generic "AI startup" landing page on a warm cream background with a terracotta accent and a hero section that says "Revolutionize Your Workflow." DevMatch is the opposite of that.

## Design Principles

1. **Data as design.** Verifiable metrics — Codeforces ratings, GitHub language breakdowns, LeetCode scores — are the primary visual material, not stock photos or abstract illustrations. Let the data itself be visually compelling.

2. **Precision over polish.** Every element earns its place. Nothing decorative. If it doesn't communicate the value proposition or improve understanding, cut it.

3. **Developer-first.** The interface speaks the language of developers: clear, direct, no fluff. Technical accuracy matters. Show the system's architecture, not metaphorical abstractions.

4. **Intentional motion.** Animation serves understanding, not decoration. Subtle reveals, scroll-driven transitions, micro-interactions on interactive elements. Every animation has a purpose.

5. **Restraint is the risk.** The landing page is minimal by default. The single bold move — the signature element — is where the page commits. Everything else stays quiet and disciplined.

## Accessibility & Inclusion

- Target: **WCAG 2.2 Level AA**
- Body text contrast: ≥4.5:1 against background
- Large text (≥18px or bold ≥14px): ≥3:1
- Placeholder text: 4.5:1 minimum (no muted-gray defaults)
- Keyboard navigation: all interactive elements reachable and operable
- Reduced motion: every animation has a `@media (prefers-reduced-motion: reduce)` fallback
- Focus indicators: visible on all interactive elements
- Screen reader support: semantic HTML, ARIA labels where needed