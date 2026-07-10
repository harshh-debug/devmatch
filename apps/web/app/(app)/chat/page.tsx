"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

export default function ChatListPage() {
  const token = useToken();
  const [search, setSearch] = useState("");

  const { data: rooms = [] } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<any[]>("/chat/rooms", { token }),
    enabled: !!token,
  });


  const filtered = rooms.filter((r) =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Chat list sidebar */}
      <div className="w-full lg:w-80 xl:w-96 border-r border-border flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border">
          <h1 className="font-display font-semibold text-[20px] text-ink tracking-tight">
            Chat
          </h1>
          <div className="relative mt-3">
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search conversations..."
              className="w-full pl-9 pr-3 py-2 text-[13px] bg-surface border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="flex items-center gap-3 px-4 sm:px-5 py-3.5 hover:bg-surface transition-colors duration-fast border-b border-border/50"
            >
              <div className="relative shrink-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-semibold"
                  style={{
                    backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                    color: "var(--color-ink)",
                  }}
                  aria-hidden="true"
                >
                  {room.avatar}
                </div>
                {room.online && (
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-bg" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-medium text-ink truncate">
                    {room.name}
                  </p>
                  <span className="text-[10px] text-muted shrink-0">
                    {room.time}
                  </span>
                </div>
                <p className="text-[12px] text-muted truncate mt-0.5">
                  {room.lastMessage}
                </p>
              </div>
              {room.unread > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-white shrink-0">
                  {room.unread}
                </span>
              )}
            </Link>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-muted">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Empty state (desktop) */}
      <div className="hidden lg:flex flex-1 items-center justify-center bg-surface/30">
        <div className="text-center max-w-xs">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-surface border border-border flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2 className="font-display font-semibold text-[16px] text-ink tracking-tight mb-1">
            Select a conversation
          </h2>
          <p className="text-[13px] text-muted leading-relaxed">
            Choose a chat from the sidebar to start collaborating.
          </p>
        </div>
      </div>
    </div>
  );
}