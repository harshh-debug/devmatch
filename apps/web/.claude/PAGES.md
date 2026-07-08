# Frontend Pages & User Journey Specification: DevMatch

> **Target Audience:** AI Coding Agents (Claude Code) and Frontend Developers.  
> **Purpose:** This document defines the complete routing architecture, layouts, page specifications, backend mappings, and implementation order for the Next.js frontend (`apps/web`). Follow these specifications exactly. Do **not** introduce additional routes, alternate navigation flows, or different API contracts.

---

# 1. Core User Journey

The application has two immutable user states.

```text
UNAUTHENTICATED
──────────────────────────────

/
├── /login
├── /signup
└── /u/:username


AUTHENTICATED
──────────────────────────────

New User
└── /onboarding/profile
        ↓
   /onboarding/skills
        ↓
   /onboarding/intent
        ↓
   /discover

Existing User

/discover
├── /requests
├── /matches
├── /chat
├── /chat/:roomId
├── /profile
└── /settings
```

Route middleware **must** enforce these boundaries.

---

# 2. Global Navigation Shells

## 2.1 Unauthenticated Layout

### Routes

- `/`
- `/login`
- `/signup`
- `/u/:username`

### Header Layout

**Left**

- DevMatch logo
- Stark white text
- Monospace typography

**Center**

- Features
- Public Directory

**Right**

- Log In button
- Sign Up CTA
- Outline / bordered styling (no filled button)

---

## 2.2 Authenticated Layout (App Shell)

### Routes

- `/discover`
- `/requests`
- `/matches`
- `/chat`
- `/chat/:roomId`
- `/profile`
- `/settings`

---

### Desktop Layout

Fixed sidebar.

Specifications:

- Width: `w-64`
- Background: `bg-[#0A0A0A]`
- Right border:

```css
border-r border-[#262626]
```

---

### Mobile Layout

Bottom navigation bar optimized for touch interactions.

---

### Navigation Items

| Item | Route |
|------|-------|
| Discover | `/discover` |
| Requests | `/requests` |
| Matches | `/matches` |
| Chat | `/chat` |
| Profile | `/profile` |
| Settings | `/settings` |
| Sign Out | `NextAuth signOut()` |

Additional requirements:

- Requests must display an unread badge.
- Chat must display unread message counts.

---

# 3. Detailed Route Specifications

---

# 3.1 Public Pages

## `/` — Landing Page

### Purpose

Convert visitors into registered users.

---

### Hero Section

Layout:

- Left → Value proposition
- Right → Static CSS-rendered developer profile preview

---

### How It Works

Three-step horizontal flow:

```text
Connect Profile
        ↓
Get Matched
        ↓
Collaborate
```

---

### Feature Bento Grid

Highlight:

- GitHub syncing
- LeetCode parsing
- Intent-based matchmaking
- Real-time WebSockets

---

### Backend

No API calls.

Entire page is static.

All CTAs route to:

```text
/signup
```

---

## `/login`

### Form

Fields:

- Email
- Password

---

### OAuth

Full-width GitHub button.

---

### Links

Redirect to:

```text
/signup
```

---

### Backend Contract

Credentials

```http
POST /api/v1/auth/login
```

GitHub OAuth

```http
POST /api/v1/auth/oauth
```

---

## `/signup`

### Form

Fields:

- Email
- Username
- Display Name
- Password

---

### Validation

- Username availability
- Email regex
- Password strength meter

---

### Backend Contract

```http
POST /api/v1/auth/signup
```

Successful signup:

- JWT issued
- Auto-login
- Redirect to onboarding

---

## `/u/:username`

### Layout

Centered professional developer card.

Styling:

- Flat geometry
- Hairline `#262626` borders

---

### Components

- Avatar
- Display Name
- College
- Markdown bio

---

### Metrics Panel

Display:

- Skill tags
- GitHub
- LeetCode
- Codeforces
- Profile completeness
- Language percentage bars

---

### CTA

**Connect**

Behavior:

Unauthenticated

→ Login dialog

Authenticated

→ Redirect to `/discover`

Focus this user's profile card.

---

### Backend Contract

```http
GET /api/v1/users/:username
```

---

# 3.2 Onboarding Wizard

Applies only to newly registered users.

Three-step workflow.

Progress indicator:

```text
Step X of 3
```

---

## `/onboarding/profile`

### Fields

- Display Name
- Bio
- College selector

---

### Availability

Options:

- ACTIVE
- OPEN
- BUSY

---

### Backend Contract

```http
PATCH /api/v1/users/me
```

---

## `/onboarding/skills`

### Skill Selector

Searchable multi-select.

Examples:

- TypeScript
- React
- Rust
- Next.js

---

### Integrations

Inputs:

- GitHub
- LeetCode
- Codeforces

---

### Action

**Sync Profiles Now**

Requirements:

- Async loading
- Skeleton placeholders

---

### Backend Contracts

```http
PATCH /api/v1/users/me/skills

POST /api/v1/users/me/connect/github

POST /api/v1/users/me/connect/leetcode
```

---

## `/onboarding/intent`

### Collaboration Goals

Multi-select cards.

Options:

- DSA Partner
- Hackathon Team
- Project Collaborator
- Open Source

---

### Conditional UI

Selecting **DSA Partner** reveals:

- Min rating slider
- Max rating slider

---

### CTA

**Start Matching**

Redirect:

```text
/discover
```

---

### Backend Contract

```http
POST /api/v1/users/me/intent
```

---

# 3.3 Authenticated Dashboard

---

## `/discover`

### Header

Contains:

- Active Intent pill
- Change Intent
- Filter Drawer toggle

---

### Candidate Feed

Infinite scrolling.

Powered by TanStack Query.

Each card displays:

- Avatar
- Name
- College
- Skills
- Similarity Score
- Competitive metrics
- Intent badge

---

### Actions

Left

```
Skip
```

Right

```
Accept
```

---

### Progressive Relaxation

When search expands:

```text
We widened your search criteria to surface more candidates.
```

---

### Similar Profiles Rail

Horizontal scrolling cards.

Uses technical similarity only.

Ignores intent filtering.

---

### Filter Drawer

Contains:

- Rating ranges
- Availability
- Colleges
- Other filters

---

### Backend Contracts

```http
GET /api/v1/match/candidates

GET /api/v1/match/similar

POST /api/v1/match/action
```

---

## `/requests`

### Purpose

Displays developers who liked your profile.

---

### Actions

- Accept
- Decline

---

### Empty State

```text
No pending requests.
Expand your profile visibility to attract co-builders.
```

---

### Backend

```http
GET /api/v1/match/requests

POST /api/v1/match/action
```

---

## `/matches`

Three-column dashboard.

Each card displays:

- Avatar
- Metadata
- Intent
- Connection date

Action:

```
Open Workspace
```

Routes to:

```text
/chat/:roomId
```

---

### Backend

```http
GET /api/v1/match/matches
```

---

## `/chat`

## `/chat/:roomId`

### Desktop Layout

Split view.

```text
┌──────────────┬─────────────────────────┐
│ Chat List    │ Active Conversation     │
│              │                         │
└──────────────┴─────────────────────────┘
```

---

### Mobile

Single-pane navigation.

---

### Sidebar

Displays:

- Rooms
- Last message
- Presence
- Unread count

Includes local search.

---

### Active Workspace

Header

- Username
- Presence
- Public profile link

Message List

- Infinite pagination
- Reverse scrolling

Message Status

- Sent
- Delivered
- Read

Typing Indicator

Example:

```text
Aman is writing code...
```

---

### Code Messages

Automatically render code snippets using syntax-highlighted components with Geist Mono.

---

### Input Area

Contains:

- Text input
- Code toggle
- Send button

---

### REST Contracts

```http
GET /api/v1/chat/rooms

GET /api/v1/chat/rooms/:roomId/messages
```

---

### Socket Events

Emit:

```text
chat:message
chat:typing
chat:read
```

Listen:

```text
chat:message:new

chat:message:ack

chat:typing:update

chat:read:update

presence:status
```

---

## `/profile`

Editable version of the public profile.

Features:

- Inline editing
- Skill selector
- GitHub sync
- LeetCode sync
- Profile completeness tracker

Uses standard User Service APIs.

---

## `/settings`

Contains:

- Connected OAuth accounts
- Password updates
- Email preferences
- Notification settings

Minimal layout.

---

# 4. Layered Frontend Build Order

Development must follow this exact sequence.

```text
Stage 1
Auth & Shell
      ↓
Stage 2
Profiles & Onboarding
      ↓
Stage 3
Matching
      ↓
Stage 4
Real-Time Chat
      ↓
Stage 5
Polish
```

---

## Stage 1 — Authentication & App Shell

Estimated: **3–4 days**

Tasks:

- Configure NextAuth
- Setup `src/app/api/auth/[...nextauth]/route.ts`
- Build desktop sidebar
- Build mobile navigation
- Configure route middleware
- Build `/login`
- Build `/signup`

---

## Stage 2 — Profiles & Onboarding

Estimated: **2–3 days**

Tasks:

- Build onboarding wizard
- Implement profile forms
- Connect skills workflow
- Build `/profile`
- Build public profile page `/u/:username`

---

## Stage 3 — Matching

Estimated: **3–4 days**

Tasks:

- Infinite discovery feed
- Filter Drawer
- Requests page
- Matches dashboard

---

## Stage 4 — Real-Time Chat

Estimated: **4–5 days**

Tasks:

- Chat workspace
- Socket singleton (`lib/socket.ts`)
- Presence updates
- Typing indicators
- Code message rendering
- Infinite message loading

---

## Stage 5 — Polish

Tasks:

- Landing page
- Skeleton loaders
- Empty states
- Error pages
- Responsive optimization
- Pixel-perfect mobile experience