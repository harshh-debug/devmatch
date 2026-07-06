# Frontend Technical Context: DevMatch

> **Target Audience:** AI Coding Agents (Claude Code) and Frontend Developers.  
> **Purpose:** This document defines the exact technical stack, architecture, folder structure, and state management rules for the Next.js frontend (`apps/web`). Adhere strictly to these patterns. Do not introduce new state management libraries, alternate CSS frameworks, or legacy React patterns.

---

# 1. Core Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 14+ (App Router only) |
| Language | TypeScript (Strict Mode) |
| Styling | Tailwind CSS + shadcn/ui |
| Authentication | Auth.js (NextAuth v5) |
| Server State | TanStack Query v5 (React Query) |
| Client Global State | Zustand |
| Icons | Lucide React |

### Rules

- Use the **App Router** exclusively.
- Do **not** use the Pages Router.
- Do **not** introduce additional state management libraries.
- Do **not** introduce alternate CSS frameworks.

---

# 2. Component Architecture (RSC vs Client)

React Server Components (RSC) are the default rendering model.

Only opt into Client Components when absolutely necessary using:

```tsx
"use client";
```

## Server Components (Default)

Use Server Components for:

- Layouts
- SEO
- Initial data fetching
- `HydrationBoundary`
- Passing data down the tree

Server Components **cannot** use:

- React hooks
- Context
- Browser APIs
- Socket.io

---

## Client Components

Use `"use client"` **only** when you need:

- `onClick`
- `useState`
- `useEffect`
- Browser APIs (`window`, `localStorage`, etc.)
- Socket.io
- Client-side animations

---

## The Leaf Pattern

Push `"use client"` as far down the component tree as possible.

Avoid placing `"use client"` at the top of page layouts unless absolutely unavoidable.

Prefer:

```text
Server Component
    └── Client Component
            └── Interactive UI
```

Pass Server Components as `children` into Client Components whenever possible to avoid unnecessary client-side rendering waterfalls.

---

# 3. Folder Structure (`apps/web/src/`)

```text
src/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Login / Signup routes
│   ├── (dashboard)/      # Feed, Chat, Matches
│   ├── api/auth/         # NextAuth v5 routes
│   └── layout.tsx        # Root layout & providers
│
├── components/
│   ├── ui/               # shadcn/ui primitives (DO NOT MODIFY)
│   ├── shared/           # Shared UI components
│   └── chat/             # Chat-specific components
│
├── lib/
│   ├── apiClient.ts      # Fetch/Axios wrapper
│   └── utils.ts          # cn() utility
│
├── store/                # Zustand stores
├── hooks/                # Custom hooks
└── types/                # Frontend-specific types
```

---

# 4. State Management (The 4-Quadrant Rule)

Never mix **Server State** and **Client State**.

## Server State (TanStack Query)

Use TanStack Query for:

- Match feed
- Candidate profiles
- Chat history
- Notifications
- Any backend data

Use:

- `useQuery`
- `useMutation`

**Never** synchronize TanStack Query data into a Zustand store.

Allow TanStack Query to manage:

- Caching
- Deduplication
- Background refetching
- Cache invalidation

---

## Global Client State (Zustand)

Use Zustand only for UI state that crosses component boundaries.

Examples:

- Mobile sidebar open/closed
- Selected chat room
- Theme preferences
- Modal visibility

Do **not** store backend resources in Zustand.

---

## Local UI State

Use:

- `useState`
- `useReducer`

for:

- Form inputs
- Loading spinners
- Toggle switches
- Dropdown state
- Temporary UI transitions

---

# 5. Authentication (NextAuth v5 / Auth.js)

The frontend manages authentication sessions, but it must explicitly pass the JWT to backend microservices.

## Server-Side Retrieval

Retrieve the authenticated session using:

```ts
import { auth } from "@/auth";

const session = await auth();
```

---

## API Calls to Microservices

Whenever the frontend communicates with the API Gateway, it **must** manually inject the JWT.

Example:

```http
Authorization: Bearer <token>
```

Do **not** rely on cookies for backend authentication.

---

## Client-Side Retrieval

Prefer passing the authenticated session from a Server Component.

Only use:

```ts
useSession()
```

from `next-auth/react` when passing props is impractical.

---

# 6. Socket.io Client Implementation

WebSockets must only be created inside the client-side lifecycle.

## Initialization

Do **not** initialize Socket.io globally.

Always initialize:

- inside `useEffect`
- inside a dedicated Client Provider
- inside a custom hook

Initializing sockets during SSR will cause Next.js to crash.

---

## Authentication

The Chat Service bypasses the API Gateway.

The JWT must therefore be sent during the Socket.io handshake.

Example:

```ts
import { io } from "socket.io-client";

const socket = io(process.env.NEXT_PUBLIC_CHAT_URL!, {
  auth: {
    token: session.accessToken,
  },
  autoConnect: false,
});
```

Enable the connection only after the authenticated session is available.

---

# 7. Styling & UI Components

## shadcn/ui

All base UI primitives are located in:

```text
src/components/ui
```

Treat these components as foundational building blocks.

Avoid modifying them unless absolutely necessary.

---

## Tailwind CSS

Tailwind utility classes are the only supported styling mechanism.

Do **not** use:

- Raw CSS files
- CSS Modules
- Styled Components
- Emotion
- Other CSS-in-JS libraries

---

## Dynamic Class Composition

Always use the shared `cn()` utility when composing class names.

Example:

```tsx
<Button
  className={cn(
    "rounded-md",
    isActive && "bg-primary"
  )}
/>
```

The `cn()` helper combines `clsx` with `tailwind-merge` to eliminate conflicting Tailwind utility classes.