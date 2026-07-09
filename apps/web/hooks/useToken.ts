"use client";

import { useSession } from "next-auth/react";

/**
 * Returns the current user's backend JWT for client-side API calls.
 * Pair with `apiFetch(path, { token })` in TanStack Query hooks.
 */
export function useToken(): string | undefined {
  return useSession().data?.accessToken;
}
