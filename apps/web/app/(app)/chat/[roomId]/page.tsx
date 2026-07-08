"use client";

import { useState, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const MESSAGES = [
  {
    id: "m1",
    sender: "them",
    content: "hey! saw we matched on devmatch — working on anything interesting right now?",
    time: "10:32",
    status: "read",
  },
  {
    id: "m2",
    sender: "me",
    content: "Hey! Yeah, just started on an auth flow for a new project. Need a backend person to pair with on the API layer.",
    time: "10:33",
    status: "read",
  },
  {
    id: "m3",
    sender: "them",
    content: "nice, i've been working on a model service for the past few weeks — python, fastapi, postgres. stacks pretty well with your typescript frontend work",
    time: "10:34",
    status: "read",
  },
  {
    id: "m4",
    sender: "me",
    content: "That sounds perfect. Want to jump on a quick call to scope things out?",
    time: "10:35",
    status: "read",
  },
  {
    id: "m5",
    sender: "them",
    content: "sure, let me finish up this training run and i'll send you a loom. also — here's the service skeleton i've been working on",
    time: "10:36",
    status: "read",
  },
  {
    id: "m6",
    sender: "me",
    content: "const predict = async (x) => await model.infer(x)",
    time: "10:37",
    type: "code",
    language: "TypeScript",
    status: "read",
  },
  {
    id: "m7",
    sender: "them",
    content: "exactly! i'll share the full repo later. for now, how does your auth flow look?",
    time: "10:38",
    status: "read",
  },
  {
    id: "m8",
    sender: "me",
    content: "Got the auth flow scaffolded — using NextAuth with GitHub + credentials provider. JWT strategy with refresh tokens.",
    time: "10:40",
    status: "read",
  },
  {
    id: "m9",
    sender: "them",
    content: "solid choice. i've been using fastapi's built-in oauth, should integrate cleanly",
    time: "10:41",
    status: "read",
  },
  {
    id: "m10",
    sender: "me",
    content: "got the auth flow scaffolded — how's the model service?",
    time: "10:42",
    type: "code",
    language: "Python",
    status: "read",
  },
  {
    id: "m11",
    sender: "them",
    content: "def predict(features: list[float]) -> float:\n    # model inference here\n    return model.predict(features)",
    time: "10:43",
    type: "code",
    language: "Python",
    status: "read",
  },
  {
    id: "m12",
    sender: "me",
    content: "Clean. Let's sync up tonight after the training run finishes.",
    time: "10:44",
    status: "sent",
  },
];

const OTHER_USER = {
  name: "Marcus Johnson",
  online: true,
  avatar: "MJ",
  username: "marcusj",
};

export default function ChatRoomPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  const [input, setInput] = useState("");
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Simulate typing indicator
  useEffect(() => {
    const timer = setTimeout(() => setIsTyping(true), 3000);
    const stop = setTimeout(() => setIsTyping(false), 6000);
    return () => {
      clearTimeout(timer);
      clearTimeout(stop);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] lg:h-screen">
      {/* Chat list sidebar (desktop) */}
      <div className="hidden lg:flex lg:w-72 xl:w-80 border-r border-border flex-col">
        <div className="p-4 border-b border-border">
          <h1 className="font-display font-semibold text-[18px] text-ink tracking-tight">
            Chat
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Link
              key={i}
              href={`/chat/room-${i}`}
              className={`flex items-center gap-3 px-4 py-3.5 hover:bg-surface transition-colors duration-fast border-b border-border/50 ${
                i === 1 ? "bg-surface" : ""
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-ink/10 flex items-center justify-center text-[10px] font-semibold text-ink shrink-0">
                {["MJ", "PP", "AK", "EZ", "JW", "SR"][i - 1]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink truncate">
                  {["Marcus Johnson", "Priya Patel", "Alex Kim", "Emily Zhang", "James Wilson", "Sofia Rodriguez"][i - 1]}
                </p>
                <p className="text-[11px] text-muted truncate">
                  {i === 1 ? "Got the auth flow..." : "Last message..."}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Active conversation */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-border bg-bg">
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
                {OTHER_USER.avatar}
              </div>
              {OTHER_USER.online && (
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-bg" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-ink truncate">
                {OTHER_USER.name}
              </p>
              <p className="text-[11px] text-muted flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                online
              </p>
            </div>
          </div>
          <Link
            href={`/u/${OTHER_USER.username}`}
            className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors shrink-0"
          >
            View profile
          </Link>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-3">
          {MESSAGES.map((msg) => {
            const isMe = msg.sender === "me";
            return (
              <div
                key={msg.id}
                className={`flex ${isMe ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[85%] sm:max-w-[70%] ${isMe ? "order-1" : "order-1"}`}>
                  {msg.type === "code" ? (
                    <div className="bg-ink rounded-2xl rounded-br-md px-4 py-3 font-mono text-[12px] leading-relaxed overflow-x-auto">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-bg/50 text-[9px] tracking-wide">
                          {msg.language}
                        </span>
                        <span className="text-bg/20">·</span>
                        <button className="text-bg/50 hover:text-bg/80 text-[9px] transition-colors">
                          Copy
                        </button>
                      </div>
                      <pre className="text-bg/90 whitespace-pre-wrap">
                        {msg.content}
                      </pre>
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
                    <span className="text-[9px] text-muted">{msg.time}</span>
                    {isMe && (
                      <span
                        className={`text-[9px] ${
                          msg.status === "read"
                            ? "text-primary"
                            : "text-muted"
                        }`}
                        aria-label={msg.status === "read" ? "Read" : "Sent"}
                      >
                        {msg.status === "read" ? "✓✓" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Typing indicator */}
          {isTyping && (
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
        <div className="border-t border-border p-3 sm:p-4 bg-bg">
          <div className="flex items-end gap-2 max-w-4xl mx-auto">
            <div className="flex-1 relative">
              {isCodeMode && (
                <div className="absolute -top-6 left-0 right-0 flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-primary">CODE</span>
                  <span className="text-[10px] text-muted">·</span>
                  <span className="text-[10px] text-muted">Tab to exit</span>
                </div>
              )}
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isCodeMode ? "Paste a code snippet..." : "Type a message..."}
                rows={isCodeMode ? 4 : 1}
                className="w-full px-3.5 py-2.5 text-[14px] bg-surface border border-border rounded-xl text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast resize-none font-mono"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
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
                className="p-2 rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!input.trim()}
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