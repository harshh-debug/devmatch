"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import { useChat, type ChatMessage } from "@/hooks/useChat";
import { useSession } from "next-auth/react";

function ChatSidebarItem({ room, active, token }: { room: any; active: boolean; token: string | undefined }) {
  const { data: user } = useQuery({
    queryKey: ["users", "public", room.otherUserId],
    queryFn: () => apiFetch<any>(`/users/public/${room.otherUserId}`, { token }),
    enabled: !!token && !!room.otherUserId,
  });

  const name = user?.displayName ?? user?.username ?? "Loading…";
  return (
    <Link
      href={`/chat/${room.id}`}
      className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-colors duration-fast border-b border-border/50 ${
        active ? "bg-surface" : ""
      }`}
    >
      <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center text-[10px] font-semibold text-ink shrink-0">
        {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (user?.displayName?.[0] ?? user?.username?.[0] ?? "U")}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-ink truncate">{name}</p>
        <p className="text-[11px] text-muted truncate">{room.lastMessage?.content ?? "No messages yet"}</p>
      </div>
    </Link>
  );
}

export default function ChatRoomPage() {
  const token = useToken();
  const { data: session } = useSession();
  const myUserId = session?.user?.id;
  const params = useParams();
  const roomId = params.roomId as string;
  const [input, setInput] = useState("");
  const [isCodeMode, setIsCodeMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── REST: room list (sidebar) ──────────────────────────────────
  const { data: roomsResp } = useQuery({
    queryKey: ["chat", "rooms"],
    queryFn: () => apiFetch<any[]>("/chat/rooms", { token }),
    enabled: !!token,
    refetchInterval: 5000,
  });

  const rooms: any[] = roomsResp ?? [];

  // ── REST: room metadata ────────────────────────────────────────
  const selectedRoom = rooms.find((room) => room.id === roomId);
  const { data: otherUser } = useQuery({
    queryKey: ["users", "public", selectedRoom?.otherUserId],
    queryFn: () => apiFetch<any>(`/users/public/${selectedRoom!.otherUserId}`, { token }),
    enabled: !!token && !!selectedRoom?.otherUserId,
  });

  // ── REST: initial message page (cursor pagination) ─────────────
  const { data: messagesResp } = useQuery({
    queryKey: ["chat", "messages", roomId],
    queryFn: () =>
      apiFetch<{ messages: ChatMessage[]; nextCursor: string | null }>(
        `/chat/rooms/${roomId}/messages?limit=30`,
        { token }
      ),
    enabled: !!token && !!roomId,
  });

  const initialMessages = messagesResp?.messages;

  // ── Socket.io real-time layer ──────────────────────────────────
  const {
    messages,
    peerTyping,
    peerOnline,
    sendMessage,
    sendTyping,
    markRead,
    connected,
    error: socketError,
  } = useChat({
    roomId,
    token,
    peerUserId: selectedRoom?.otherUserId,
    initialMessages,
  });

  const OTHER_USER = otherUser ?? {
    id: "",
    name: "Loading...",
    online: false,
    avatar: "-",
    username: "",
  };

  // Mark messages as read when room opens.
  useEffect(() => {
    if (connected) markRead();
  }, [connected, markRead]);

  // Auto-scroll to latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Send ───────────────────────────────────────────────────────
  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed, isCodeMode ? "CODE_SNIPPET" : "TEXT");
    setInput("");
    // Stop typing indicator.
    sendTyping(false);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
  }, [input, isCodeMode, sendMessage, sendTyping]);

  // ── Typing indicator ───────────────────────────────────────────
  const handleInputChange = (val: string) => {
    setInput(val);
    sendTyping(true);
    if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
    typingDebounceRef.current = setTimeout(() => sendTyping(false), 3000);
  };

  return (
    <div className="flex h-[calc(100vh-5rem)] px-3 pb-3 lg:h-screen lg:p-3">
      {/* Chat list sidebar (desktop) */}
      <div className="hidden overflow-hidden rounded-[1.5rem] border border-white/12 bg-surface lg:flex lg:w-72 lg:flex-col xl:w-80">
        <div className="p-4 border-b border-border">
          <h1 className="font-display font-semibold text-[18px] text-ink tracking-tight">
            Chat
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {rooms.map((room) => (
            <ChatSidebarItem
              key={room.id}
              room={room}
              active={room.id === roomId}
              token={token}
            />
          ))}
        </div>
      </div>

      {/* Active conversation */}
      <div className="ml-0 flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.5rem] border border-white/12 bg-bg lg:ml-3">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-surface px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile back */}
            <Link
              href="/chat"
              className="lg:hidden -ml-1 p-1 text-muted hover:text-ink transition-colors"
              aria-label="Back to chat list"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </Link>
            <div className="relative shrink-0">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-semibold"
                style={{
                  backgroundColor: "color-mix(in oklch, var(--color-ink) 8%, transparent)",
                  color: "var(--color-ink)",
                }}
                aria-hidden="true"
              >
                {OTHER_USER.avatarUrl ? <img src={OTHER_USER.avatarUrl} alt="" className="w-full h-full rounded-full object-cover" /> : (OTHER_USER.displayName?.[0] ?? "U")}
              </div>
              {(peerOnline || OTHER_USER.online) && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-bg" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink truncate">
                {OTHER_USER.displayName ?? OTHER_USER.name ?? "User"}
              </p>
              <p className="text-[11px] text-muted flex items-center gap-1">
                {peerTyping ? (
                  <>
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "120ms" }} />
                      <span className="w-1 h-1 rounded-full bg-primary animate-bounce" style={{ animationDelay: "240ms" }} />
                    </span>
                    <span className="text-primary">typing…</span>
                  </>
                ) : (peerOnline || OTHER_USER.online) ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    online
                  </>
                ) : (
                  "offline"
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!connected && token && (
              <span className="text-[10px] text-muted animate-pulse">Connecting…</span>
            )}
            {OTHER_USER.username && (
              <Link
                href={`/u/${OTHER_USER.id}`}
                className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors shrink-0"
              >
                View profile
              </Link>
            )}
          </div>
        </div>

        {/* Socket error banner */}
        {socketError && (
          <div className="px-4 py-2 bg-danger/10 border-b border-danger/20 text-[12px] text-danger">
            {socketError}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-5">
          {messages.map((msg: ChatMessage) => {
            const isMe = msg.senderId === myUserId || msg.senderId === "__me__";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] ${msg.pending ? "opacity-60" : ""}`}>
                  {msg.type === "CODE_SNIPPET" ? (
                    <div className="bg-ink rounded-2xl rounded-br-md px-4 py-3 font-mono text-[12px] leading-relaxed overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-bg/50 text-[9px] tracking-wide">CODE</span>
                        <span className="text-bg/20">·</span>
                        <button
                          onClick={() => navigator.clipboard.writeText(msg.content)}
                          className="text-bg/50 hover:text-bg/80 text-[9px] transition-colors"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="text-bg/90 whitespace-pre-wrap">{msg.content}</pre>
                    </div>
                  ) : (
                    <div
                      className={`px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        isMe
                          ? "bg-primary text-white rounded-2xl rounded-br-md"
                          : "bg-surface border border-border text-ink rounded-2xl rounded-bl-md"
                      }`}
                    >
                      {msg.content}
                    </div>
                  )}
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      isMe ? "justify-end mr-1" : "ml-1"
                    }`}
                  >
                    <span className="text-[9px] text-muted">
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    {isMe && (
                      <span
                        className={`text-[9px] ${
                          msg.status === "read"
                            ? "text-primary"
                            : "text-muted"
                        }`}
                        aria-label={msg.status === "read" ? "Read" : "Sent"}
                      >
                        {msg.pending ? "○" : msg.status === "read" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator (real, from Socket.io) */}
          {peerTyping && (
            <div className="flex justify-start">
              <div className="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3 inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "120ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-muted animate-bounce" style={{ animationDelay: "240ms" }} />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-white/10 bg-surface p-3 sm:p-4">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              {isCodeMode && (
                <div className="absolute -top-6 left-0 right-0 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-primary">CODE</span>
                  <span className="text-[10px] text-muted">·</span>
                  <span className="text-[10px] text-muted">Shift+Enter for newline</span>
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder={isCodeMode ? "Paste a code snippet..." : "Type a message..."}
                rows={isCodeMode ? 4 : 1}
                className="w-full resize-none rounded-xl border border-white/15 bg-bg px-3.5 py-2.5 font-mono text-[14px] text-ink placeholder:text-muted/60 transition-colors duration-fast focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isCodeMode) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
            </div>
            <div className="flex items-center gap-1.5 pb-0.5">
              <button
                onClick={() => setIsCodeMode(!isCodeMode)}
                className={`p-2 rounded-lg transition-colors duration-fast ${
                  isCodeMode
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-ink hover:bg-surface"
                }`}
                aria-label={isCodeMode ? "Exit code mode" : "Code mode"}
                title="Code snippet"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </button>
              <button
                onClick={handleSend}
                disabled={!input.trim() || !connected}
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
