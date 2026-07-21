import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-bg">
      <div className="pointer-events-none absolute -right-40 top-0 size-[34rem] rounded-full bg-primary/15 blur-[130px]" />
      <div className="pointer-events-none absolute -bottom-56 -left-32 size-[28rem] rounded-full bg-accent/25 blur-[130px]" />
      <header className="relative z-10 flex h-20 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-display text-base font-semibold tracking-[-0.04em] text-ink">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-[10px] font-black text-bg" aria-hidden="true">DM</span>
          DevMatch
        </Link>
        <p className="hidden font-mono text-[11px] uppercase tracking-[0.16em] text-muted sm:block">Developer collaboration</p>
      </header>
      {children}
    </div>
  );
}
