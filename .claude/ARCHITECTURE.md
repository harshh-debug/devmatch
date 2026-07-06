# DevMatch Architecture & System Design

> **Context for AI Agent:** This document is the single source of truth for the backend architecture of DevMatch. When building the frontend, you must rely on these constraints. Do not invent new backend services, assume different ports, or hallucinate different authentication flows.

---

# 1. What is DevMatch?

DevMatch is a high-performance, intent-driven matchmaking platform for developers. Unlike generic networking sites, it uses multi-dimensional vector math and progressive relaxation to match users based on specific intents (e.g., Hackathons, Open Source, Competitive Programming) and technical skill compatibility.

Key features include:

- Tinder-style swipe discovery
- Intent-based developer matching
- Multi-dimensional vector similarity scoring
- Progressive relaxation algorithm
- Real-time presence tracking
- WebSocket-based 1:1 chat for successful matches

---

# 2. Monorepo Structure

The project is a strictly typed **Turborepo + Bun** monorepo.

```text
devmatch/
├── apps/
│   ├── web/               # Next.js 14 App Router (Frontend)
│   ├── api-gateway/       # Express API Gateway (Port 3000)
│   ├── auth-service/      # JWT Generation & NextAuth linking (Port 3001)
│   ├── user-service/      # Profile & 3rd party sync (GitHub, LeetCode) (Port 3002)
│   ├── match-service/     # Vector math, discovery engine, swipes (Port 3003)
│   └── chat-service/      # WebSocket Server, messaging, presence (Port 3004)
└── packages/
    ├── db                 # Shared Prisma client & schema
    ├── @devmatch/kafka    # Shared KafkaJS wrappers
    └── @devmatch/types    # Shared TS Interfaces & Zod schemas
```

---

# 3. Infrastructure & Docker Compose

All infrastructure is managed by the root `docker-compose.yml`.

| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Single source of truth for all services |
| Redis | 6379 | Caching, queues, presence, and rate-limiting |
| Kafka | 9092 | Event bus |
| Zookeeper | 2181 | Kafka dependency |

---

# 4. Authentication Flow (CRITICAL)

DevMatch employs a **split-brain authentication architecture**. HTTP requests and WebSocket connections follow different authentication flows.

## REST APIs (HTTP)

The frontend sends requests to the API Gateway.

```text
Frontend
    │
    │ Authorization: Bearer <JWT>
    ▼
API Gateway (Port 3000)
    │
    │ Verify JWT
    │ Remove Authorization header
    │ Inject:
    │ x-user-id: <uuid>
    ▼
Internal Microservices
```

### Rules

- Frontend sends requests to `http://localhost:3000`
- Include:

```http
Authorization: Bearer <token>
```

- API Gateway verifies the JWT.
- Gateway strips the Authorization header.
- Gateway injects:

```text
x-user-id: <uuid>
```

- Backend REST controllers **must only** read:

```ts
req.headers["x-user-id"]
```

---

## WebSockets (Real-time)

WebSockets bypass the API Gateway entirely.

```text
Frontend
      │
      │ JWT inside Socket.io handshake
      ▼
Chat Service (Port 3004)
```

Example:

```ts
io("ws://localhost:3004", {
  auth: {
    token: "<jwt>",
  },
});
```

---

# 5. Core Database Schema (Prisma)

All tables reside in PostgreSQL through the shared `db` package.

## User

Core identity.

Fields:

- id
- email
- username
- availability

---

## Profile

Technical attributes.

Fields:

- userId
- skillTags
- cfRating
- profileScore
- skillVector[]

---

## MatchIntent

Declares what a user wants.

Fields:

- userId
- intentType
- ratingMin
- ratingMax

---

## MatchAction

Stores swipe history.

Fields:

- actorId
- targetId
- action (`ACCEPTED` / `REJECTED`)
- intentType

---

## Match

Immutable record of a mutual right swipe.

Fields:

- userAId
- userBId
- intentType
- similarityScore

Constraint:

```prisma
@@unique([userAId, userBId, intentType])
```

---

## ChatRoom

One chat room per match.

Fields:

- id
- matchId (`@unique`)

---

## Message

Stores chat history.

Fields:

- chatRoomId
- senderId
- content
- type
- clientMessageId
- readAt
- createdAt

Idempotency constraint:

```prisma
@@unique([chatRoomId, senderId, clientMessageId])
```

---

# 6. Event-Driven Architecture (Kafka)

Kafka is the central nervous system of DevMatch.

Services **never** call each other directly via HTTP for state changes.

## `user.updated` & `profile.updated`

**Producers**

- User Service
- Profile Parser

**Consumer**

- Match Service

Purpose:

Refresh the Redis cache of active candidates.

---

## `match.accepted`

**Producer**

- Match Service (only after a mutual `ACCEPTED`)

**Consumer**

- Chat Service

Responsibilities:

- Idempotently create a `ChatRoom`
- Invalidate Redis peer caches

---

## `match.rejected`

**Producer**

- Match Service

**Consumer**

- ML Pipeline / Analytics

Purpose:

Provide negative training data.

---

# 7. Redis Usage Map

Redis is heavily utilized throughout the monorepo.

## User Service

### BullMQ Backend

Used for background synchronization of external platform data such as:

- GitHub
- LeetCode

---

## Match Service (Discovery Engine)

### `match_profiles` (Hash)

Stores an in-memory JSON cache of valid user profiles for fast vector similarity computation.

### `seen:{userId}:{intentType}` (Set)

Stores swipe exclusion lists.

---

## Chat Service (Real-time Layer)

### `presence:{userId}` (Set)

Tracks active socket IDs for multi-device presence.

Evaluated atomically using Lua scripts.

### `peers:{userId}` (Key)

60-second cache of matched peers used for scoped presence broadcasting.

### `rate_limit:{roomId}:{userId}` (Sorted Set)

Sliding-window rate limiter.

- 20 messages
- 60-second window
- Implemented using Lua

---

# 8. BullMQ Background Jobs

BullMQ is intentionally restricted.

It is **not** used in:

- Match Service
- Chat Service

These services have strict latency requirements.

BullMQ is only used inside the **User Service**.

## `github-sync-queue`

Responsibilities:

- Fetch repositories
- Compute GitHub statistics

---

## `leetcode-sync-queue`

Responsibilities:

- Scrape contest data
- Scrape ratings
- Update competitive programming statistics