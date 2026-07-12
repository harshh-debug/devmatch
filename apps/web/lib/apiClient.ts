import type { ApiEnvelope } from "./types";

/**
 * Fetch wrapper for the API Gateway.
 *
 * The frontend must manually inject the JWT for backend calls — it does NOT
 * rely on cookies for backend authentication (see .claude/FRONTEND.md §5).
 * Callers therefore pass the access token explicitly:
 *   - Server components: read it from `auth()` and pass `token`.
 *   - Client components: read it from `useSession()` and pass `token`.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(message: string, status: number, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface FetchOptions extends Omit<RequestInit, "body"> {
  token?: string;
  /** JSON-serializable request body. */
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, query?: FetchOptions["query"]) {
  const url = new URL(
    path.startsWith("http") ? path : `${API_BASE_URL}${path}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

/**
 * Low-level fetch against the gateway. Throws `ApiError` on non-2xx responses.
 * Returns the parsed JSON (unwrapped from the `{ success, data }` envelope when
 * the content looks like one).
 */
export async function apiFetch<T = unknown>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const { token, body, query, headers, ...rest } = opts;

  const finalHeaders: any = {
    Accept: "application/json",
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    ...headers,
  };
  if (token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, query), {
      ...rest,
      headers: finalHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      cache: rest.cache ?? "no-store",
    });
  } catch (err) {
    throw new ApiError(
      `Network error reaching ${path}`,
      0,
      "NETWORK_ERROR",
      err,
    );
  }

  const isJson = res.headers
    .get("content-type")
    ?.includes("application/json");

  const payload = isJson ? await res.json().catch(() => undefined) : undefined;

  if (!res.ok) {
    const message =
      (payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : undefined) ?? res.statusText ?? "Request failed";
    const code =
      payload && typeof payload === "object" && "code" in payload
        ? String((payload as { code: unknown }).code)
        : undefined;
    throw new ApiError(message, res.status, code, payload);
  }

  // Unwrap the standard envelope when present.
  if (
    payload &&
    typeof payload === "object" &&
    "success" in payload &&
    "data" in payload
  ) {
    return (payload as ApiEnvelope<T>).data as T;
  }
  return payload as T;
}
