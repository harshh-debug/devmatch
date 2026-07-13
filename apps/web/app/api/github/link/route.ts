import { auth } from "@/auth";
import { apiFetch } from "@/lib/apiClient";
import { NextRequest, NextResponse } from "next/server";

const STATE_COOKIE = "devmatch_github_link_state";

function profileRedirect(request: NextRequest, status: "linked" | "error") {
  return NextResponse.redirect(new URL(`/profile?github=${status}`, request.url));
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.accessToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const code = request.nextUrl.searchParams.get("code");
  if (!code) {
    const clientId = process.env.AUTH_GITHUB_ID;
    if (!clientId) return profileRedirect(request, "error");

    const state = crypto.randomUUID();
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", new URL("/api/github/link", request.url).toString());
    authorizeUrl.searchParams.set("scope", "read:user user:email repo");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/api/github/link",
    });
    return response;
  }

  const state = request.nextUrl.searchParams.get("state");
  if (!state || state !== request.cookies.get(STATE_COOKIE)?.value) {
    return profileRedirect(request, "error");
  }

  try {
    const clientId = process.env.AUTH_GITHUB_ID;
    const clientSecret = process.env.AUTH_GITHUB_SECRET;
    if (!clientId || !clientSecret) throw new Error("GitHub OAuth is not configured");

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: new URL("/api/github/link", request.url).toString(),
      }),
      cache: "no-store",
    });
    const tokenPayload = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !tokenPayload.access_token) throw new Error("GitHub token exchange failed");

    await apiFetch("/auth/link/github", {
      token: session.accessToken,
      method: "POST",
      body: { accessToken: tokenPayload.access_token },
    });

    const response = profileRedirect(request, "linked");
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch {
    const response = profileRedirect(request, "error");
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
}
