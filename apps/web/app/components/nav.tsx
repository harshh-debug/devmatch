"use client";

import { useState, useEffect } from "react";

const NAV_ITEMS = [
  { label: "How it works", href: "#flow" },
  { label: "Intents", href: "#intents" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 48);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-sticky transition-all duration-normal backdrop-blur-xl border-b ${
        scrolled ? "bg-bg/95 border-border" : "bg-bg/80 border-transparent"
      }`}
    >
      <nav className="mx-auto max-w-[1200px] px-5 sm:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2 font-display font-semibold text-[15px] text-ink tracking-tight">
          <span
            className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "var(--color-bg)" }}
            aria-hidden="true"
          >
            D
          </span>
          DevMatch
        </a>

        {/* Desktop nav */}
        <ul className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                className="text-[13px] text-muted hover:text-ink transition-colors duration-fast px-3 py-2"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-2">
          <a
            href="/login"
            className="text-[13px] text-muted hover:text-ink transition-colors duration-fast px-3 py-2"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="text-[13px] font-medium text-bg bg-primary rounded-full px-4 py-2 hover:bg-primary-hover transition-colors duration-fast focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          >
            Get started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 -mr-2 text-ink"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          <span className="block w-5 h-0.5 bg-current mb-1 transition-all duration-fast" />
          <span className="block w-5 h-0.5 bg-current mb-1 transition-all duration-fast" />
          <span className="block w-5 h-0.5 bg-current transition-all duration-fast" />
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-bg px-5 py-4 space-y-1">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="block text-sm text-muted hover:text-ink py-2.5"
              onClick={() => setMobileOpen(false)}
            >
              {item.label}
            </a>
          ))}
          <hr className="border-border my-2" />
          <a
            href="/signup"
            className="block text-center text-sm font-medium text-bg bg-primary rounded-full px-4 py-2.5 mt-2 hover:bg-primary-hover transition-colors"
            onClick={() => setMobileOpen(false)}
          >
            Get started
          </a>
        </div>
      )}
    </header>
  );
}