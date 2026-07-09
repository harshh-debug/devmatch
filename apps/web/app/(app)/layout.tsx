"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";

const NAV_ITEMS = [
  {
    label: "Discover",
    href: "/discover",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    ),
  },
  {
    label: "Requests",
    href: "/requests",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    ),
    badgeKey: "requests" as const,
  },
  {
    label: "Matches",
    href: "/matches",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Chat",
    href: "/chat",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    badgeKey: "chat" as const,
  },
  {
    label: "Profile",
    href: "/profile",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/settings",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

/** Live unread counts for sidebar / bottom-nav badges. Gracefully 0 when the
 *  relevant service is unreachable or returns no data. */
function useUnreadCounts() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const enabled = !!token;

  const requests = useQuery({
    queryKey: ["match", "requests"],
    queryFn: () => apiFetch<unknown[]>("/match/requests", { token }),
    enabled,
    retry: 0,
    staleTime: 60 * 1000,
  });

  const rooms = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<{ unreadCount?: number }[]>("/chat/rooms", { token }),
    enabled,
    retry: 0,
    staleTime: 60 * 1000,
  });

  const requestsCount = Array.isArray(requests.data) ? requests.data.length : 0;
  const chatUnread = Array.isArray(rooms.data)
    ? rooms.data.reduce((n, r) => n + (r.unreadCount ?? 0), 0)
    : 0;

  return { requests: requestsCount, chat: chatUnread };
}

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const counts = useUnreadCounts();

  const isActive = (href: string) => {
    if (href === "/chat") {
      return pathname === "/chat" || pathname.startsWith("/chat/");
    }
    return pathname === href;
  };

  const badgeFor = (key?: "requests" | "chat") => {
    if (key === "requests") return counts.requests;
    if (key === "chat") return counts.chat;
    return 0;
  };

  return (
    <div className="min-h-screen bg-bg flex">
      {/* Mobile header */}
      <div className="fixed top-0 left-0 right-0 h-14 bg-bg/95 backdrop-blur-xl border-b border-border flex items-center justify-between px-4 z-sticky lg:hidden">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 -ml-2 text-ink"
          aria-label={sidebarOpen ? "Close menu" : "Open menu"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {sidebarOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>
        <a
          href="/discover"
          className="flex items-center gap-2 font-display font-semibold text-[15px] text-ink tracking-tight"
        >
          <span
            className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold"
            style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
            aria-hidden="true"
          >
            D
          </span>
          DevMatch
        </a>
        <div className="w-10" />
      </div>

      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0A0A0A] border-r border-[#262626] flex flex-col transition-transform duration-normal lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-14 flex items-center px-5 border-b border-[#262626]">
          <a
            href="/discover"
            className="flex items-center gap-2 font-display font-semibold text-[15px] text-white tracking-tight"
          >
            <span
              className="w-5 h-5 rounded-[6px] flex items-center justify-center text-[10px] font-bold"
              style={{ backgroundColor: "var(--color-primary)", color: "#fff" }}
              aria-hidden="true"
            >
              D
            </span>
            DevMatch
          </a>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            const badge = badgeFor(item.badgeKey);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors duration-fast ${
                  active
                    ? "text-white bg-white/10"
                    : "text-white/50 hover:text-white hover:bg-white/5"
                }`}
              >
                <span className="shrink-0">{item.icon}</span>
                <span className="flex-1">{item.label}</span>
                {item.badgeKey === "requests" && badge > 0 && (
                  <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-white">
                    {badge}
                  </span>
                )}
                {item.badgeKey === "chat" && badge > 0 && (
                  <span className="w-2 h-2 rounded-full bg-primary" aria-label={`${badge} unread messages`} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="p-3 border-t border-[#262626]">
          <button
            onClick={() => signOut({ redirectTo: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-[13px] font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors duration-fast"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <main className="flex-1 lg:pl-64 pt-14 lg:pt-0 pb-16 lg:pb-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0A0A0A] border-t border-[#262626] flex items-center justify-around px-2 z-sticky lg:hidden">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(item.href);
          const badge = badgeFor(item.badgeKey);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center gap-0.5 min-w-0 px-2 py-1 rounded-lg transition-colors duration-fast ${
                active ? "text-white" : "text-white/40 hover:text-white/70"
              }`}
            >
              <span className="relative">
                {item.icon}
                {item.badgeKey === "requests" && badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[14px] h-[14px] px-0.5 text-[9px] font-bold rounded-full bg-primary text-white">
                    {badge}
                  </span>
                )}
              </span>
              <span className="text-[9px] font-medium truncate max-w-full">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
