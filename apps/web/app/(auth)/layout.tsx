export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* Simple header with logo */}
      <header className="flex items-center justify-between px-5 sm:px-8 h-16">
        <a
          href="/"
          className="flex items-center gap-2 font-display font-semibold text-[15px] text-ink tracking-tight"
        >
          <span
            className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold"
            style={{
              backgroundColor: "var(--color-primary)",
              color: "var(--color-bg)",
            }}
            aria-hidden="true"
          >
            D
          </span>
          DevMatch
        </a>
      </header>
      {children}
    </div>
  );
}