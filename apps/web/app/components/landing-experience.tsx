"use client";

import Link from "next/link";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Check, GitBranch, Menu, MessageSquare, MoveRight, Sparkles, UsersRound, X } from "lucide-react";
import { useRef, useState } from "react";

gsap.registerPlugin(ScrollTrigger);

const intentions = [
  {
    name: "DSA practice",
    eyebrow: "Work through hard problems together",
    copy: "Find someone at your level for interview prep, contest drills, and the consistency that solo practice rarely gives you.",
    facts: ["LeetCode and Codeforces signals", "Comparable rating preferences", "Shared DSA goals"],
  },
  {
    name: "Hackathons",
    eyebrow: "Build a team with complementary range",
    copy: "Match with a frontend, backend, ML, data, or product collaborator who fills the gaps in your weekend build.",
    facts: ["Complementary roles", "Languages and frameworks", "Current availability"],
  },
  {
    name: "Projects and open source",
    eyebrow: "Find people who want to keep building",
    copy: "Use repository topics, contribution interests, and technical preferences to find a partner beyond one event.",
    facts: ["GitHub topics and skill tags", "Contribution preferences", "Longer-term collaboration"],
  },
];

const marqueeWords = ["DSA partners", "Hackathon teams", "Open-source collaborators", "Project co-builders", "Competitive programmers"];

export default function LandingExperience() {
  const root = useRef<HTMLDivElement>(null);
  const intentSection = useRef<HTMLElement>(null);
  const statement = useRef<HTMLParagraphElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeIntent, setActiveIntent] = useState(0);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.from("[data-hero-reveal]", {
        y: 32,
        opacity: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger: 0.11,
      });

      const words = statement.current?.querySelectorAll("span");
      if (words?.length) {
        gsap.fromTo(
          words,
          { opacity: 0.16 },
          {
            opacity: 1,
            ease: "none",
            stagger: 0.045,
            scrollTrigger: {
              trigger: statement.current,
              start: "top 78%",
              end: "bottom 48%",
              scrub: true,
            },
          },
        );
      }

      const media = gsap.matchMedia();
      media.add("(min-width: 1024px)", () => {
        const panel = intentSection.current?.querySelector("[data-intent-panel]");
        if (!panel || !intentSection.current) return;
        return ScrollTrigger.create({
          trigger: intentSection.current,
          start: "top 12%",
          end: "bottom 83%",
          pin: panel,
          pinSpacing: false,
        });
      });

      return () => media.revert();
    },
    { scope: root },
  );

  return (
    <div ref={root} className="overflow-x-hidden bg-bg">
      <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4 sm:px-6">
        <nav className="mx-auto flex max-w-7xl items-center justify-between rounded-2xl border border-white/15 bg-bg/85 px-4 py-3 backdrop-blur-xl sm:px-5" aria-label="Main navigation">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-[-0.04em]" aria-label="DevMatch home">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-black text-bg">DM</span>
            DevMatch
          </Link>
          <div className="hidden items-center gap-7 text-sm text-muted md:flex">
            <a href="#how-it-works" className="transition hover:text-ink">How it works</a>
            <a href="#intents" className="transition hover:text-ink">Find your purpose</a>
            <a href="#why-devmatch" className="transition hover:text-ink">Why DevMatch</a>
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <Link href="/login" className="text-sm text-muted transition hover:text-ink">Sign in</Link>
            <Link href="/signup" className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-bg transition hover:bg-primary">Create account</Link>
          </div>
          <button type="button" className="grid size-8 place-items-center md:hidden" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </nav>
        {menuOpen && (
          <div className="mx-auto max-w-7xl rounded-b-2xl border-x border-b border-white/15 bg-surface px-5 py-5 md:hidden">
            <div className="grid gap-4 text-sm text-muted">
              <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How it works</a>
              <a href="#intents" onClick={() => setMenuOpen(false)}>Find your purpose</a>
              <a href="#why-devmatch" onClick={() => setMenuOpen(false)}>Why DevMatch</a>
              <Link href="/signup" className="mt-2 rounded-xl bg-primary px-4 py-3 text-center font-semibold text-bg">Create account</Link>
            </div>
          </div>
        )}
      </header>

      <main className="w-full max-w-full overflow-x-hidden">
        <section className="relative isolate min-h-[850px] overflow-hidden px-5 pb-20 pt-44 sm:mx-4 sm:rounded-b-[2rem] sm:px-8 lg:min-h-[900px] lg:pt-48">
          <div className="grid-noise pointer-events-none absolute inset-0 -z-20 opacity-70" />
          <div className="aura-orbit pointer-events-none absolute -right-1/4 top-10 -z-10 size-[900px] rounded-full blur-3xl" />
          <div className="pointer-events-none absolute -bottom-1/3 -left-1/4 -z-10 h-[70%] w-[72%] rounded-full bg-primary/20 blur-[150px]" />
          <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,.65fr)] lg:items-end">
            <div className="pb-8">
              <p data-hero-reveal className="mb-8 font-mono text-xs uppercase tracking-[0.18em] text-primary">Developer collaboration, intentionally matched</p>
              <h1 data-hero-reveal className="max-w-6xl text-balance text-[clamp(3.4rem,7.7vw,7.6rem)] font-medium leading-[0.9] tracking-[-0.085em]">
                Find people<br />
                who build like you.
              </h1>
              <p data-hero-reveal className="mt-9 max-w-xl text-lg leading-relaxed text-muted sm:text-xl">
                DevMatch connects college developers for the work that matters next: DSA practice, hackathons, projects, and open source.
              </p>
              <div data-hero-reveal className="mt-10 flex flex-col gap-3 sm:flex-row">
                <Link href="/signup" className="group inline-flex items-center justify-center gap-3 rounded-xl bg-primary px-6 py-4 font-semibold text-bg transition hover:bg-ink hover:text-primary">
                  Create your profile <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </Link>
                <a href="#how-it-works" className="inline-flex items-center justify-center rounded-xl border border-white/25 px-6 py-4 font-semibold transition hover:border-ink hover:bg-ink hover:text-bg">See the matching flow</a>
              </div>
            </div>

            <div data-hero-reveal className="relative mx-auto w-full max-w-md lg:mb-2">
              <div className="absolute -inset-4 rounded-[2rem] border border-white/10" />
              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/20 bg-surface p-5 shadow-2xl shadow-black/40 sm:p-7">
                <div className="mb-8 flex items-center justify-between border-b border-white/10 pb-4 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
                  <span>Match preview</span><span className="text-primary">Live intent</span>
                </div>
                <div className="flex items-start justify-between gap-5">
                  <div className="flex items-center gap-3"><div className="grid size-12 place-items-center rounded-full bg-accent font-semibold text-bg">AK</div><div><p className="font-semibold">Aarav Khanna</p><p className="mt-1 text-sm text-muted">Backend and systems</p></div></div>
                  <span className="border border-primary/40 px-2 py-1 font-mono text-[10px] text-primary">Complementary</span>
                </div>
                <div className="my-7 h-px bg-white/10" />
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Matching for" value="Hackathon" />
                  <Metric label="Strength" value="Go, APIs, infra" />
                  <Metric label="Looking for" value="Frontend partner" />
                  <Metric label="Profile source" value="GitHub synced" />
                </div>
                <div className="mt-7 flex items-center justify-between border-t border-white/10 pt-5"><span className="text-sm text-muted">Complementary skills. Same goal.</span><button type="button" className="grid size-10 place-items-center bg-ink text-bg transition hover:bg-primary"><MoveRight size={18} /></button></div>
              </div>
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 py-5 sm:mx-4 sm:rounded-2xl" aria-label="Collaboration types">
          <div className="marquee-track flex w-max whitespace-nowrap font-mono text-sm uppercase tracking-[0.14em] text-faint">
            {[...marqueeWords, ...marqueeWords].map((word, index) => <span key={`${word}-${index}`} className="mx-6 flex items-center gap-6"><span className="size-1.5 rounded-full bg-primary" />{word}</span>)}
          </div>
        </section>

        <section id="why-devmatch" className="px-5 py-32 sm:px-8 md:py-48">
          <div className="mx-auto max-w-7xl">
            <p className="max-w-4xl text-balance text-[clamp(2.1rem,4.5vw,4.8rem)] font-medium leading-[0.99] tracking-[-0.065em] text-muted" ref={statement}>
              {"The right collaborator is not just a username. It is shared momentum, complementary ability, and a clear reason to build together.".split(" ").map((word, index) => <span key={`${word}-${index}`} className="mr-[0.24em] inline-block text-ink">{word}</span>)}
            </p>
          </div>
        </section>

        <section id="how-it-works" className="px-5 pb-32 sm:px-8 md:pb-48">
          <div className="mx-auto max-w-7xl">
            <div className="mb-14 flex flex-col justify-between gap-7 border-b border-white/15 pb-8 md:flex-row md:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">The matching flow</p><h2 className="mt-5 max-w-3xl text-balance text-4xl font-medium tracking-[-0.06em] sm:text-6xl">Your work speaks before the first hello.</h2></div><p className="max-w-sm text-muted">A focused path from evidence to intent to a consent-based conversation.</p></div>
            <div className="grid grid-flow-dense gap-3 md:grid-cols-4 md:grid-rows-2">
              <FeatureCard className="md:col-span-2 md:row-span-2" icon={<GitBranch />} title="Bring your developer profile" copy="GitHub, LeetCode, and Codeforces data can give your profile technical context beyond self-reported skills." visual="profile" />
              <FeatureCard className="md:col-span-1" icon={<Sparkles />} title="Set an intent" copy="Choose DSA, hackathon, project, or open-source collaboration." visual="intent" />
              <FeatureCard className="md:col-span-1" icon={<UsersRound />} title="Match by fit" copy="Review candidates against the skills and needs that matter now." visual="match" />
              <FeatureCard className="md:col-span-2" icon={<MessageSquare />} title="Build after mutual consent" copy="A chat opens once both people choose the same collaboration context." visual="chat" />
            </div>
          </div>
        </section>

        <section id="intents" ref={intentSection} className="border-y border-white/10 px-5 py-32 sm:mx-4 sm:rounded-[2rem] sm:px-8 md:py-48">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[.78fr_1.22fr] lg:gap-24">
            <div data-intent-panel className="h-fit lg:pt-3"><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">One clear purpose at a time</p><h2 className="mt-5 text-balance text-5xl font-medium leading-[0.94] tracking-[-0.07em] sm:text-6xl">Find the exact collaboration you need.</h2><p className="mt-7 max-w-md text-lg leading-relaxed text-muted">Your active intent shapes discovery. No endless feed; no pretending every connection is relevant.</p></div>
            <div className="flex flex-col gap-2">
              {intentions.map((item, index) => {
                const isActive = activeIntent === index;
                return <button type="button" key={item.name} onMouseEnter={() => setActiveIntent(index)} onFocus={() => setActiveIntent(index)} onClick={() => setActiveIntent(index)} className={`group flex flex-none flex-col overflow-hidden rounded-[1.25rem] border p-6 text-left transition-all duration-700 ease-out sm:p-8 ${isActive ? "min-h-[340px] border-primary bg-primary text-bg" : "min-h-[118px] border-white/15 bg-surface text-ink hover:border-white/50"}`} aria-pressed={isActive}>
                  <div className="relative z-10 flex w-full flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className={`font-mono text-[11px] uppercase tracking-[0.15em] ${isActive ? "text-bg/60" : "text-muted"}`}>{item.eyebrow}</p><h3 className="mt-3 text-3xl font-medium tracking-[-0.06em] sm:text-4xl">{item.name}</h3></div><ArrowUpRight className={`size-6 shrink-0 transition-transform duration-700 ${isActive ? "rotate-45" : "group-hover:-translate-y-1 group-hover:translate-x-1"}`} /></div>
                  {isActive && <div className="mt-8 grid gap-5 border-t border-bg/20 pt-5 text-sm sm:grid-cols-[1.1fr_.9fr]"><p className="leading-relaxed text-bg/75">{item.copy}</p><ul className="grid content-start gap-1.5 text-bg/75">{item.facts.map((fact) => <li className="flex gap-2" key={fact}><Check size={15} className="mt-0.5 shrink-0" />{fact}</li>)}</ul></div>}
                </button>;
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-32 sm:px-8 md:py-48">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/15 bg-surface p-7 sm:p-12 lg:p-16">
            <div className="grid gap-12 lg:grid-cols-[1fr_.76fr] lg:items-end"><div><p className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Your next collaborator is already building</p><h2 className="mt-6 max-w-3xl text-balance text-[clamp(3rem,6vw,6rem)] font-medium leading-[0.91] tracking-[-0.08em]">Make the introduction count.</h2></div><div><p className="max-w-md text-lg leading-relaxed text-muted">Create a profile, set your intent, and start meeting developers who want to work toward the same thing.</p><Link href="/signup" className="group mt-8 inline-flex w-full items-center justify-between rounded-xl bg-ink px-6 py-5 font-semibold text-bg transition hover:bg-primary"><span>Create your DevMatch account</span><ArrowUpRight size={19} className="transition-transform group-hover:-translate-y-1 group-hover:translate-x-1" /></Link></div></div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-5 py-9 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl border border-white/10 bg-surface/40 p-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 font-semibold text-ink"><span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-black text-bg">DM</span>DevMatch</div><p>For developers who want to build together.</p><div className="flex gap-5"><Link href="/login" className="hover:text-ink">Sign in</Link><Link href="/signup" className="hover:text-ink">Create account</Link></div></div></footer>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div><p className="font-mono text-[10px] uppercase tracking-[0.12em] text-faint">{label}</p><p className="mt-1.5 text-sm leading-snug text-ink">{value}</p></div>;
}

function FeatureCard({ className, icon, title, copy, visual }: { className: string; icon: React.ReactNode; title: string; copy: string; visual: "profile" | "intent" | "match" | "chat" }) {
  return <article className={`group min-h-72 overflow-hidden rounded-[1.25rem] border border-white/15 bg-surface p-6 transition duration-700 hover:border-white/45 sm:p-7 ${className}`}><div className="flex items-start justify-between"><span className="text-primary">{icon}</span><span className="size-2 rounded-full bg-primary opacity-0 transition-opacity duration-500 group-hover:opacity-100" /></div><div className="mt-10"><h3 className="text-xl font-medium tracking-[-0.045em]">{title}</h3><p className="mt-3 max-w-md text-sm leading-relaxed text-muted">{copy}</p></div><FeatureVisual type={visual} /></article>;
}

function FeatureVisual({ type }: { type: "profile" | "intent" | "match" | "chat" }) {
  if (type === "profile") return <div className="mt-9 grid gap-2 border-t border-white/10 pt-5 sm:grid-cols-3"><PlatformSignal platform="GitHub" detail="Repos, languages, topics" icon={<GitHubMark />} /><PlatformSignal platform="LeetCode" detail="Problems and contests" icon={<LeetCodeMark />} /><PlatformSignal platform="Codeforces" detail="Rating and contest history" icon={<CodeforcesMark />} /></div>;
  if (type === "intent") return <div className="mt-8 rounded-lg border border-white/10 bg-bg p-3 font-mono text-[10px] uppercase tracking-[0.11em] text-muted"><div className="flex justify-between border-b border-white/10 pb-2"><span>Active intent</span><span className="text-primary">Hackathon</span></div><div className="mt-2 flex justify-between"><span>Looking for</span><span className="text-ink">Frontend</span></div></div>;
  if (type === "match") return <div className="mt-8 border-l-2 border-primary pl-3 text-xs leading-relaxed text-muted"><p className="text-ink">Shared: TypeScript, systems</p><p className="mt-1">Needs align with your active intent.</p></div>;
  return <div className="mt-8 flex items-center gap-3 border-t border-white/10 pt-4"><span className="grid size-8 place-items-center rounded-full bg-accent text-[10px] text-bg">AK</span><div className="flex-1"><p className="text-xs text-ink">Both accepted this match</p><p className="mt-1 text-[11px] text-muted">A room is ready to start planning.</p></div></div>;
}

function PlatformSignal({ platform, detail, icon }: { platform: string; detail: string; icon: React.ReactNode }) {
  return <div className="min-w-0 rounded-lg border border-white/10 bg-bg p-3 transition duration-700 group-hover:border-primary/60"><div className="flex items-center gap-2 text-ink">{icon}<span className="text-xs font-medium">{platform}</span></div><p className="mt-3 text-[11px] leading-snug text-muted">{detail}</p></div>;
}

function GitHubMark() {
  return <svg viewBox="0 0 24 24" className="size-[18px] fill-current" aria-label="GitHub"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.73c-2.78.61-3.37-1.18-3.37-1.18-.45-1.15-1.11-1.45-1.11-1.45-.91-.62.07-.61.07-.61 1 .07 1.54 1.04 1.54 1.04.9 1.54 2.35 1.1 2.92.84.09-.65.35-1.1.63-1.35-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.99 1.03-2.69-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.03A9.58 9.58 0 0 1 12 6.46a9.7 9.7 0 0 1 2.5.34c1.91-1.3 2.75-1.03 2.75-1.03.55 1.38.2 2.4.1 2.65.64.7 1.03 1.6 1.03 2.69 0 3.84-2.34 4.68-4.57 4.93.36.31.68.9.68 1.82v2.69c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" /></svg>;
}

function LeetCodeMark() {
  return <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-label="LeetCode"><path d="m14.2 3.5-8.3 7.9a3.2 3.2 0 0 0 0 4.6l4.5 4.5a3.2 3.2 0 0 0 4.5 0l2.3-2.3" stroke="#FFA116" strokeWidth="2" strokeLinecap="round" /><path d="m9.5 7.3 6.6 6.6M12 13.8h8" stroke="#FFA116" strokeWidth="2" strokeLinecap="round" /></svg>;
}

function CodeforcesMark() {
  return <svg viewBox="0 0 24 24" className="size-[18px]" aria-label="Codeforces"><rect x="2" y="8" width="5" height="13" rx="1" fill="#B31B1B" /><rect x="9.5" y="3" width="5" height="18" rx="1" fill="#1F8ACB" /><rect x="17" y="10" width="5" height="11" rx="1" fill="#F2C500" /></svg>;
}
