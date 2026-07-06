export default function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto max-w-[1200px] px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        {/* Logo */}
        <div className="flex items-center gap-2 font-display font-semibold text-[14px] text-ink tracking-tight">
          <span
            className="w-4 h-4 rounded-[5px] flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
            aria-hidden="true"
          >
            D
          </span>
          DevMatch
        </div>

        {/* Links */}
        <div className="flex items-center gap-6 text-[12px] text-muted">
          <a href="#" className="hover:text-ink transition-colors duration-fast">GitHub</a>
          <a href="#" className="hover:text-ink transition-colors duration-fast">Twitter</a>
          <a href="#" className="hover:text-ink transition-colors duration-fast">Privacy</a>
          <a href="#" className="hover:text-ink transition-colors duration-fast">Terms</a>
        </div>

        {/* Copyright */}
        <p className="text-[12px] text-muted tabular-nums">
          &copy; {new Date().getFullYear()} DevMatch
        </p>
      </div>
    </footer>
  );
}