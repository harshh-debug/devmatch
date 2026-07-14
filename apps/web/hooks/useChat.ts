/**
 * useChat — Socket.io chat hook for DevMatch.
 *
 * Implements the full API contract from .gemini/API.md §5:
 *  - Connects to ws://localhost:3004 with JWT auth
 *  - Joins/leaves rooms, sends messages with clientMessageId
 *  - Receives chat:message:new, chat:message:ack, chat:error
 *  - Handles chat:typing:update and chat:read:update
 *  - Handles presence:status for online indicators
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { io, type Socket } from "socket.io-client";

const CHAT_URL =
  process.env.NEXT_PUBLIC_CHAT_URL ?? "ws://localhost:3005";

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "CODE_SNIPPET" | "LINK";
  createdAt: string;
  /** Local-only: pending ack from server */
  pending?: boolean;
  /** Local clientMessageId before ack */
  clientMessageId?: string;
  status?: "sent" | "delivered" | "read";
}

const EMPTY_MESSAGES: ChatMessage[] = [];

interface UseChatOptions {
  roomId: string;
  token: string | undefined;
  peerUserId?: string;
  /** Messages loaded from REST API (initial page). */
  initialMessages?: ChatMessage[];
  /** Called when a new mutual match notification arrives (optional). */
  onMatch?: (matchId: string) => void;
}

interface UseChatReturn {
  messages: ChatMessage[];
  peerOnline: boolean;
  peerTyping: boolean;
  sendMessage: (content: string, type?: "TEXT" | "CODE_SNIPPET" | "LINK") => void;
  sendTyping: (isTyping: boolean) => void;
  markRead: () => void;
  connected: boolean;
  error: string | null;
}

let socketInstance: Socket | null = null;
let socketToken: string | null = null;

/** Returns a shared socket, creating one if the token changed or socket is gone. */
function getSocket(token: string): Socket {
  if (!socketInstance || !socketInstance.connected || socketToken !== token) {
    socketInstance?.disconnect();
    socketInstance = io(CHAT_URL, {
      auth: { token },
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketToken = token;
  }
  return socketInstance;
}

export function useChat({
  roomId,
  token,
  peerUserId,
  initialMessages = EMPTY_MESSAGES,
}: UseChatOptions): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [peerOnline, setPeerOnline] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync initial messages when REST data loads.
  useEffect(() => {
    // A new room must never render messages carried over from the previous room.
    setMessages(initialMessages);
  }, [roomId, initialMessages]);

  useEffect(() => {
    if (!token || !roomId) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // ── Connection events ──────────────────────────────────────────
    const onConnect = () => {
      setConnected(true);
      setError(null);
      // Join this room on (re)connect.
      socket.emit("chat:room:join", { roomId }, (ack: { success: boolean; error?: string }) => {
        if (!ack.success) {
          setError(ack.error ?? "Could not join room.");
        }
      });
    };

    const onDisconnect = () => setConnected(false);

    const onConnectError = (err: Error) => {
      setConnected(false);
      setError(`Connection error: ${err.message}`);
    };

    // ── Message events ─────────────────────────────────────────────
    const onNewMessage = (msg: ChatMessage) => {
      if (msg.roomId !== roomId) return;
      setMessages((prev) => {
        // Avoid duplicates (e.g. if optimistic message already exists).
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    };

    const onMessageAck = (ack: { clientMessageId: string; serverId: string; status: "sent" }) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.clientMessageId === ack.clientMessageId
            ? { ...m, id: ack.serverId, clientMessageId: undefined, pending: false, status: ack.status }
            : m
        )
      );
    };

    const onChatError = (err: { code: string; clientMessageId?: string }) => {
      setError(`Chat error: ${err.code}`);
      if (err.clientMessageId) {
        // Mark the optimistic message as failed.
        setMessages((prev) =>
          prev.map((m) =>
            m.clientMessageId === err.clientMessageId ? { ...m, pending: false, status: undefined } : m
          )
        );
      }
    };

    // ── Typing ────────────────────────────────────────────────────
    const onTypingUpdate = (data: { roomId: string; isTyping: boolean }) => {
      if (data.roomId !== roomId) return;
      setPeerTyping(data.isTyping);
      if (data.isTyping) {
        // Auto-clear after 6s (server expires after 5s).
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => setPeerTyping(false), 6000);
      }
    };

    // ── Read receipts ─────────────────────────────────────────────
    const onReadUpdate = (data: { roomId: string; readerId: string; readAt: string }) => {
      if (data.roomId !== roomId) return;
      setMessages((prev) =>
        prev.map((m) => (!m.pending ? { ...m, status: "read" } : m))
      );
    };

    // ── Presence ──────────────────────────────────────────────────
    const onPresence = (data: { userId: string; online: boolean }) => {
      if (data.userId === peerUserId) {
        setPeerOnline(data.online);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("chat:message:new", onNewMessage);
    socket.on("chat:message:ack", onMessageAck);
    socket.on("chat:error", onChatError);
    socket.on("chat:typing:update", onTypingUpdate);
    socket.on("chat:read:update", onReadUpdate);
    socket.on("presence:status", onPresence);

    if (socket.connected) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("chat:message:new", onNewMessage);
      socket.off("chat:message:ack", onMessageAck);
      socket.off("chat:error", onChatError);
      socket.off("chat:typing:update", onTypingUpdate);
      socket.off("chat:read:update", onReadUpdate);
      socket.off("presence:status", onPresence);
      socket.emit("chat:room:leave", { roomId });
    };
  }, [roomId, token, peerUserId]);

  const sendMessage = useCallback(
    (content: string, type: "TEXT" | "CODE_SNIPPET" | "LINK" = "TEXT") => {
      const socket = socketRef.current;
      if (!socket?.connected || !content.trim()) return;

      const clientMessageId = crypto.randomUUID();

      // Optimistic update.
      const optimistic: ChatMessage = {
        id: clientMessageId,
        clientMessageId,
        roomId,
        senderId: "__me__",
        content,
        type,
        createdAt: new Date().toISOString(),
        pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);

      socket.emit("chat:message", { roomId, content, type, clientMessageId });
    },
    [roomId]
  );

  const sendTyping = useCallback(
    (isTyping: boolean) => {
      socketRef.current?.emit("chat:typing", { roomId, isTyping });
    },
    [roomId]
  );

  const markRead = useCallback(() => {
    socketRef.current?.emit("chat:read", { roomId });
  }, [roomId]);

  return { messages, peerOnline, peerTyping, sendMessage, sendTyping, markRead, connected, error };
}
