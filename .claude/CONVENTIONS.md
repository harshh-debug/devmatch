# Coding Conventions: DevMatch

> **Target Audience:** AI Coding Agents (Claude Code) and Human Developers.  
> **Purpose:** This document establishes the strict coding standards, syntax rules, and architectural patterns used across the entire DevMatch monorepo. You **MUST** adhere to these rules to maintain consistency, type safety, and predictability.

---

# 1. Runtime & Language Environment

## Runtime

- **Runtime:** **Bun**
- **Do NOT** use Node.js, `npm`, or `yarn`.
- All package management and script execution must use Bun commands.

Examples:

```bash
bun add
bun install
bun run dev
bun run build
```

---

## Language

- **TypeScript (Strict Mode)** everywhere.
- JavaScript files are not allowed unless absolutely necessary.

### No `any` Types

The use of `any` is strictly prohibited.

Use:

- `unknown`
- Type narrowing
- Zod validation
- Type guards

Only use `any` when interacting with an untyped legacy third-party library.

---

# 2. Monorepo & Shared Packages

When working inside a microservice or frontend application, always import shared logic from the workspace packages instead of duplicating code.

## Database Client (CRITICAL RULE)

The database package is currently named **`db`** and exports the Prisma client via `./client`.

Always import it exactly like this:

```ts
import { prismaClient } from "db/client";
```

❌ **Never use:**

```ts
import { prismaClient } from "@devmatch/db";
```

---

## Kafka

Import all shared Kafka utilities from:

```ts
@devmatch/kafka
```

---

## Shared Types

Import cross-service interfaces and Zod schemas from:

```ts
@devmatch/types
```

---

# 3. Standardized API Response Shapes

Every REST endpoint across every microservice must return one of the following standardized response envelopes.

Do **not** invent custom response wrappers.

## Success Response

```ts
{
  success: true,
  data: { ... } // Object, array, or null
}
```

---

## Authentication Success Response

```ts
{
  success: true,
  data: {
    token: "jwt_string_here",
    user: {
      id,
      email,
      username,
      displayName,
      avatarUrl
    }
  }
}
```

---

## Error Response

```ts
{
  success: false,
  message: "Human readable error description",
  code?: "OPTIONAL_ERROR_CODE"
}
```

---

# 4. Module Exports (Named vs Default)

## Backend Services

Backend code must use **Named Exports ONLY**.

This applies to:

- Services
- Controllers
- Handlers
- Middlewares
- Utilities
- Helpers

### ✅ Correct

```ts
export const RoomService = { ... };

export function extractUser() {
  ...
}
```

### ❌ Incorrect

```ts
export default RoomService;
```

---

## Frontend (Next.js)

Default exports are **only** allowed where Next.js explicitly requires them.

Examples:

- `page.tsx`
- `layout.tsx`
- `route.ts`

All reusable components, hooks, utilities, and libraries must use **Named Exports**.

---

# 5. Data Access & Validation

## Database Access

- Prisma exclusively.
- Never write raw SQL using `pg` or other database drivers.
- All database operations must use the shared Prisma client.

```ts
import { prismaClient } from "db/client";
```

---

## Data Validation

Use **Zod exclusively**.

Every external input must be validated before use.

This includes:

- REST request bodies
- Query parameters
- Route parameters
- Socket.io event payloads
- Environment variables

Preferred methods:

```ts
schema.parse(...)
```

or

```ts
schema.safeParse(...)
```

Do **not** rely on manual runtime checks such as:

```ts
if (typeof value === "string") {
  ...
}
```

for validating complex objects.

---

# 6. Error Handling

## Controllers / Route Handlers

- Wrap controller logic in `try/catch`.
- Forward errors to the global Express error handler.
- If no global handler exists, return the standardized error response.

Example:

```ts
try {
  ...
} catch (error) {
  next(error);
}
```

---

## Services

Services should:

- Throw descriptive `Error` objects.
- Throw custom `AppError` objects where appropriate.
- Never format HTTP responses directly.

---

## Fail Fast

Environment variables must be validated during application startup.

Example:

```ts
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is missing");
}
```

Never wait until the first request to discover missing configuration.

---

# 7. Asynchronous Programming

Use **`async/await` exclusively**.

Preferred:

```ts
const user = await prismaClient.user.findUnique(...);
```

Avoid:

```ts
prismaClient.user
  .findUnique(...)
  .then(...)
  .catch(...);
```

Use `.then()` / `.catch()` only when required by a third-party API that cannot be cleanly wrapped with `async/await`.

---

## Floating Promises

Never leave promises unresolved.

Every asynchronous operation must be either:

Awaited:

```ts
await syncGithubProfile();
```

or explicitly handled:

```ts
void syncGithubProfile().catch(logger.error);
```

to prevent unhandled promise rejections.