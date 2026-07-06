# Frontend API Contract: DevMatch

**Target Audience:** AI Coding Agents (Claude Code) and Frontend Developers.
**Purpose:** This is the single source of truth for all external API endpoints and WebSocket events that the Next.js frontend consumes. Do not invent endpoints, alter payload shapes, or change query parameter names. 

**Base URL Note:** All REST endpoints are routed through the API Gateway (e.g., `http://localhost:8080/api/v1`). WebSockets connect directly to the Chat Service.

---

## 1. Auth (`/api/v1/auth`)
*The frontend uses NextAuth.js. These endpoints back the NextAuth credentials and OAuth providers.*

* **`POST /signup`**
    * **Body:** `{ email, username, password, displayName }`
    * **Response:** `{ success: true, data: { token, user: { id, email, username } } }`
* **`POST /login`**
    * **Body:** `{ email, password }`
    * **Response:** `{ success: true, data: { token, user } }`
* **`POST /oauth`**
    * **Body:** `{ accessToken, provider: "github" }` (Called by NextAuth `signIn` callback)
    * **Response:** `{ success: true, data: { token, user } }`

---

## 2. User & Profile (`/api/v1/users`)
*Requires `Authorization: Bearer <token>` header.*

* **`GET /me`**
    * **Response:** Full user profile including `skillTags`, `cfRating`, and `college`.
* **`PATCH /me`**
    * **Body:** `{ displayName?, bio?, college?, availability? }`
* **`PATCH /me/skills`**
    * **Body:** `{ skillTags: string[], leetcodeHandle?: string, githubHandle?: string }`
* **`POST /me/connect/github`**
    * **Body:** `{ handle: string }`
    * **Action:** Triggers async BullMQ sync for repos and languages.
* **`POST /me/intent`**
    * **Body:** `{ intentType: "DSA"|"HACKATHON"|"PROJECT"|"OPENSOURCE", ratingMin?: number, ratingMax?: number }`

---

## 3. Matching Engine (`/api/v1/match`)
*Requires `Authorization: Bearer <token>` header.*

* **`GET /candidates`**
    * **Query:** `?intentType=DSA&ratingMin=1400&ratingMax=1600&limit=20`
    * **Response:** `{ success: true, data: { candidates: [...], relaxed: boolean } }`
* **`POST /action`**
    * **Body:** `{ targetId: string, action: "ACCEPTED"|"REJECTED", intentType: string }`
    * **Response:** `{ success: true, data: { isMutual: boolean, matchId: string | null } }`
* **`GET /requests`**
    * **Response:** List of pending inbound right-swipes (`ACCEPTED` actions).
* **`GET /matches`**
    * **Response:** List of successful mutual matches (powers the Chat Inbox UI).

---

## 4. Chat REST (`/api/v1/chat`)
*Requires `Authorization: Bearer <token>` header.*

* **`GET /rooms`**
    * **Response:** List of active chat rooms sorted by `lastMessageAt` descending.
* **`GET /rooms/:roomId`**
    * **Response:** Room metadata and `matchedUser` details.
* **`GET /rooms/:roomId/messages`**
    * **Query:** `?cursor=<ISO-8601-Date>&limit=30`
    * **Note:** Uses Keyset/Cursor pagination based on `createdAt`, NOT offset.
    * **Response:** `{ success: true, data: { messages: [...], nextCursor: string | null } }`

---

## 5. Socket.io Real-Time Events
**Connection URL:** `ws://localhost:3004` (Connects directly to Chat Service, bypassing Gateway).
**Auth:** Must pass JWT in handshake: `io("...", { auth: { token: "<JWT>" } })`.

### Client ➔ Server (Emits)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `chat:room:join` | `{ roomId: UUID }` | Subscribes to UI room. Ack callback: `({ success, error? })` |
| `chat:room:leave`| `{ roomId: UUID }` | Unsubscribes from UI room. |
| `chat:message` | `{ roomId, content, type: "TEXT"\|"CODE_SNIPPET"\|"LINK", clientMessageId: UUID }` | Sends message. `clientMessageId` is strictly required for idempotency. |
| `chat:typing` | `{ roomId: UUID, isTyping: boolean }` | Broadcasts typing state. Auto-expires server-side after 5s. |
| `chat:read` | `{ roomId: UUID }` | Marks all older unread messages from the other user as read. |

### Server ➔ Client (Listens)
| Event | Payload | Description |
| :--- | :--- | :--- |
| `chat:message:new` | `{ id, roomId, senderId, content, type, createdAt }` | Incoming message from peer. |
| `chat:message:ack` | `{ clientMessageId, serverId, status: "sent" }` | Confirmation that your message was persisted. Replace local optimistic UI. |
| `chat:error` | `{ code: "VALIDATION_FAILED"\|"FORBIDDEN"\|"RATE_LIMITED"\|"PERSISTENCE_FAILED", clientMessageId? }` | Error envelope. |
| `chat:typing:update`| `{ roomId, userId, isTyping: boolean }` | Peer is typing. |
| `chat:read:update` | `{ roomId, readerId, readAt: ISOString }` | Syncs blue ticks. Emitted to both sender and reader's other tabs. |
| `presence:status` | `{ userId, online: boolean }` | Peer logged in/out. Emitted only for users you share a room with. |