"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";

function ChatRoomListItem({ room }: { room: any }) {
  const token = useToken();
  const { data: userResp } = useQuery({
    queryKey: ["users", "public", room.otherUserId],
    queryFn: () => apiFetch<any>(`/users/public/${room.otherUserId}`, { token }),
    enabled: !!token && !!room.otherUserId,
  });

  const user = userResp || {};

  return (
    <Link
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
          {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (user.displayName?.charAt(0) || "U")}
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-medium text-ink truncate">
            {user.displayName || "Unknown User"}
          </p>
          <span className="text-[10px] text-muted shrink-0">
            {room.lastMessage ? new Date(room.lastMessage.createdAt).toLocaleDateString() : ""}
          </span>
        </div>
        <p className="text-[12px] text-muted truncate mt-0.5">
          {room.lastMessage ? room.lastMessage.content : "No messages yet"}
        </p>
      </div>
      {room.unreadCount > 0 && (
        <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-primary text-white shrink-0">
          {room.unreadCount}
        </span>
      )}
    </Link>
  );
}

export default function ChatListPage() {
  const token = useToken();
  const [search, setSearch] = useState("");

  const { data: roomsResp } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<any[]>("/chat/rooms", { token }),
    enabled: !!token,
    refetchInterval: 5000, // Poll for new rooms after a match
  });

  const rooms: any[] = roomsResp ?? [];

  const filtered = rooms.filter((r) =>
    !search || r.otherUserId?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-5rem)] px-3 pb-3 lg:h-screen lg:p-3">
      {/* Chat list sidebar */}
      <div className="flex w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/12 bg-surface lg:w-80 xl:w-96">
        {/* Header */}
        <div className="border-b border-white/10 p-5">
          <h1 className="font-display text-2xl font-semibold tracking-[-0.055em] text-ink">
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
              className="w-full rounded-xl border border-white/15 bg-bg py-2.5 pl-9 pr-3 text-[13px] text-ink placeholder:text-muted/60 transition-colors duration-fast focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
        </div>

        {/* Room list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((room) => (
            <ChatRoomListItem key={room.id} room={room} />
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-12 px-4">
              <p className="text-[13px] text-muted">No conversations found</p>
            </div>
          )}
        </div>
      </div>

      {/* Empty state (desktop) */}
      <div className="ml-3 hidden flex-1 items-center justify-center rounded-[1.5rem] border border-white/10 bg-surface/50 lg:flex">
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
