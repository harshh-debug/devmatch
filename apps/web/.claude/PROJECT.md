# Product Context: DevMatch

**Target Audience:** AI Coding Agents (Claude Code) and Frontend Engineers.
**Purpose:** This document defines the product vision, core user personas, value proposition, and user experience flows of DevMatch. It serves as your behavioral guide when designing layouts, UX copy, navigation patterns, and component states for the frontend web application.

## 1. DevMatch in One Sentence
DevMatch is an intent-driven, real-time discovery and networking platform that matches developers using verifiable data, multi-dimensional technical compatibility, and granular collaboration goals.

---

## 2. Core User Personas
Our platform targets highly driven individuals who find traditional platforms noisy or ineffective for sourcing technical collaborators.

* **The Hackathon Builder:** Developers looking for complementary skills (e.g., a frontend specialist seeking a backend/infra wizard or an ML engineer) under tight timelines. They care about immediate availability and specific framework expertise.
* **The Competitive Programmer:** High-ranking algorithmic problem solvers looking for teammates for ACM-ICPC, Google Kick Start, or general LeetCode/Codeforces sprint partnerships. They focus heavily on contest ratings and mathematical aptitude.
* **The Open-Source/Project Collaborator:** Students or self-taught builders eager to contribute to meaningful repositories, build out production-ready systems, or collaborate on portfolio-grade projects to boost career placement.

---

## 3. What Makes DevMatch Different From LinkedIn?

| Feature | LinkedIn | DevMatch |
| :--- | :--- | :--- |
| **Data Integrity** | Unverified text claims, buzzword stuffing, endorsements based on social clout. | **Verifiable Data Only.** Profile metrics are dynamically fetched from GitHub repositories and LeetCode APIs. |
| **Matching Style** | Asymmetric connection requests, cold messaging, recruiter-heavy feeds. | **Mutual Intent Matching.** Symmetric double-blind right swipes. Conversations can only start if both parties explicitly agree to align on a specific goal. |
| **Focus** | Corporate hierarchy, generic networking, content marketing, and thought-leadership posts. | **Developer-First Ecosystem.** Focuses strictly on code quality, technical stacks, past contributions, and execution capability. |

---

## 4. The 5 Core User Flows (In Strict Order)
Every page, modal, and button you build or modify inside `apps/web` must support one of these structural paths.

### Flow 1: Authentication & Onboarding
* **Entry Points:** Native email credentials or secure GitHub OAuth.
* **UX Guardrail:** Upon registration, users must be immediately guided into profile completion. A user without technical data cannot enter the match discovery loop.

### Flow 2: Profile Initialization
* **Fields Required:** Display name, bio, current academic status or college affiliation, and primary technical focuses.
* **Intent Declaration:** Users declare their immediate intent profile (e.g., "Looking for a Data Structures & Algorithms partner" or "Building a web-app for a hackathon"). Each intent has its own target parameters (e.g., minimum target LeetCode rating).

### Flow 3: External Platform Integration (The Sync)
* **Mechanism:** Users connect their external handles (GitHub, LeetCode).
* **UX State:** The frontend must handle the asynchronous synchronization state gracefully—showing skeletons or loading indicators while backend BullMQ jobs calculate skill vectors, languages, and ratings.

### Flow 4: Match Discovery Loop
* **The Feed:** An intuitive candidate card interface presenting the top mathematically aligned developers based on the selected intent. Cards emphasize real technical output (top repositories, languages used, verified competitive scores).
* **The Actions:** Users can swipe right (Accept) or swipe left (Reject).
* **The Inbox:** A separate, low-friction request tab displaying inbound interest from other developers. If a user accepts an inbound request, a mutual `Match` is triggered.

### Flow 5: Real-Time Chat Workspace
* **Activation:** Occurs automatically upon a mutual match event.
* **Experience:** A dedicated real-time messaging workspace featuring 1:1 text communication, syntax-highlighted code snippet sharing, read receipts ("blue ticks"), peer typing indicators, and live device presence synchronization (Online/Offline status).