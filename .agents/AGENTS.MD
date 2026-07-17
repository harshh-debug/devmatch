# DevMatch Agent Guide

## Project overview

DevMatch is a full-stack platform that helps developers find technically relevant collaborators at a comparable experience level.

The application includes frontend, backend, database, caching, background processing, and external-provider integrations. Changes must remain compatible across the complete stack.

## Core engineering rules

* Inspect the existing implementation before modifying it.
* Follow the repository’s current architecture, folder structure, naming conventions, and coding patterns.
* Extend existing modules instead of creating parallel implementations.
* Reuse existing components, services, schemas, utilities, and shared types.
* Avoid unrelated refactors and unnecessary dependencies.
* Keep changes localized and backward compatible wherever practical.
* Do not silently change existing API contracts or user-facing behavior.
* Do not leave dead code, unused imports, duplicate types, or temporary workarounds.

## Frontend-to-backend consistency

When changing a feature, trace and update its complete flow where applicable:

```text
Frontend UI
→ frontend state/query layer
→ API client
→ request validation
→ backend route/controller
→ service/domain logic
→ database/cache/event infrastructure
→ API response
→ frontend state and UI
```

When a contract changes, update every affected consumer together:

* Shared types
* DTOs and validation schemas
* API request and response types
* Frontend API clients
* Backend handlers and services
* Database models and migrations
* Event and queue payloads
* Tests and fixtures

Use the repository’s existing contract source of truth. Do not create duplicate frontend and backend definitions when shared contracts already exist.

## Database changes

* Use the repository’s existing schema and migration workflow.
* Keep migrations reproducible.
* Update generated clients, seeds, fixtures, and dummy data when required.
* Preserve constraints, indexes, foreign keys, and transaction boundaries.
* Do not modify the database manually as a substitute for a migration.
* The current database contains dummy data and has no active production users, but schema changes must still leave the project in a clean and reproducible state.

## Events, caching, and background work

PostgreSQL is the authoritative source of persistent application data unless the existing code explicitly establishes another source of truth.

When modifying event-driven or cached flows:

* Preserve transactional consistency.
* Keep event consumers idempotent.
* Do not treat event payloads as authoritative cached state unless that is already the established architecture.
* Account for duplicated, delayed, missed, and out-of-order events.
* Ensure caches can converge back to the persistent source of truth.
* Preserve existing retry, reconciliation, and failure-handling behavior.

## Matching system constraints

DevMatch matching is deterministic and explainable.

* Do not introduce ML-based or opaque ranking.
* Keep eligibility, compatibility, and similarity as distinct concepts.
* Never fabricate candidates by bypassing mandatory eligibility or technical-relevance requirements.
* Prefer returning fewer results, including no results, over returning invalid recommendations.
* Preserve stable and deterministic ordering.
* Treat missing data explicitly rather than interpreting it as exceptional or zero ability.
* Matching changes must follow the canonical matching specification referenced by the relevant implementation document.

Detailed matching behavior, intent semantics, ranking rules, and provider-specific requirements must live in a dedicated specification or implementation document rather than in this file.

## Authentication and authorization

* Preserve existing authentication and session behavior.
* Apply authorization at the backend boundary, not only in the frontend.
* Never trust user identifiers, roles, ownership, or eligibility supplied by the client.
* Avoid exposing secrets, tokens, private provider data, or internal error details.
* Follow existing middleware and error-response conventions.

## Implementation workflow

Before making changes:

1. Read the relevant implementation or specification document.
2. Inspect the affected code paths in the repository.
3. Trace dependencies across frontend, backend, database, cache, events, and integrations.
4. Identify the canonical source of truth for contracts and state.
5. Check whether any requested work has already been implemented.
6. Note discrepancies between the plan and the current repository.

During implementation:

1. Make changes in dependency order.
2. Keep contracts synchronized across layers.
3. Preserve existing behavior unless a change is explicitly required.
4. Add or update tests alongside the implementation.
5. Validate each major stage before continuing.

## Testing expectations

Changes must include appropriate regression coverage.

Depending on the affected area, verify:

* Unit behavior
* Request validation
* Authentication and authorization
* Service and domain logic
* Database constraints and transactions
* API integration
* Event delivery and idempotency
* Cache invalidation or replacement
* Frontend loading, empty, success, and error states
* End-to-end frontend-to-backend behavior
* Pagination and deterministic ordering
* Existing flows affected by the change
* End to end testing at last

Do not add placeholder tests that only assert that code executes.

## Validation

Use scripts that actually exist in the repository. Inspect the root and workspace `package.json` files before running commands.

At minimum, confirm where applicable:

* Type checking passes
* Linting passes
* Relevant tests pass
* Database migrations apply successfully
* Generated clients and types are current
* Frontend builds successfully
* Backend builds successfully
* The application starts from the repository root with:

```bash
bun dev
```

* The changed flow works end to end
* Existing related flows still work
* Browser and server logs contain no new runtime errors

When instructions conflict, use this precedence:

1. Explicit user instruction
2. Current implementation document
3. Stable domain specification
4. This `AGENTS.md`
5. Existing repository conventions

Do not assume that an implementation document is accurate if it conflicts with the current codebase. Verify the repository and document any discrepancy before proceeding.

## Completion report

After implementation, report:

* Files created or modified
* Functional changes
* Contract and database changes
* Tests and validation performed
* Architectural decisions
* Assumptions
* Remaining risks, edge cases, or TODOs

Do not claim that a command, build, test, migration, or runtime flow passed unless it was actually executed successfully.
