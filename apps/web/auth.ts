import NextAuth, { type DefaultSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/apiClient";

/**
 * NextAuth v5 (Auth.js) configuration.
 *
 * The frontend manages sessions but must explicitly pass the backend-issued JWT
 * to microservices via `Authorization: Bearer <token>`. The token is captured
 * here in the `jwt` callback and surfaced on the client session as
 * `session.accessToken` (see .claude/FRONTEND.md §5).
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      onboardingComplete: boolean;
    } & DefaultSession["user"];
    accessToken: string;
  }

  interface User {
    accessToken?: string;
    username?: string;
    onboardingComplete?: boolean;
  }
}

interface BackendAuthResponse {
  token: string;
  user: { id: string; email: string; username: string };
}

/** Minimal profile shape — only fields needed for onboarding gate. */
interface MeResponse {
  intentType?: string;
  matchingOnboardingComplete?: boolean;
}

const PROTECTED_PREFIXES = [
  "/discover",
  "/requests",
  "/matches",
  "/chat",
  "/profile",
  "/settings",
];

function isProtected(path: string) {
  return PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/") || path === p);
}

export const { handlers, auth, signIn, signOut, unstable_update } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        try {
          const data = await apiFetch<BackendAuthResponse>("/auth/login", {
            method: "POST",
            body: { email, password },
          });
          // Check if the user has already completed onboarding (has an active intent).
          let onboardingComplete = false;
          try {
            const me = await apiFetch<MeResponse>("/users/me", { token: data.token });
            onboardingComplete = me?.matchingOnboardingComplete ?? !!me?.intentType;
          } catch {
            // If /users/me fails, conservatively assume onboarding not done.
          }
          return {
            id: data.user.id,
            email: data.user.email,
            username: data.user.username,
            accessToken: data.token,
            onboardingComplete,
          };
        } catch {
          return null;
        }
      },
    }),
    GitHub({
      // Exchange the GitHub access token for a DevMatch JWT in the signIn
      // callback below (POST /auth/oauth). Requires AUTH_GITHUB_ID / SECRET.
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "github" && account.access_token) {
        try {
          const data = await apiFetch<BackendAuthResponse>("/auth/oauth", {
            method: "POST",
            body: { accessToken: account.access_token, provider: "github" },
          });
          user.id = data.user.id;
          user.email = data.user.email;
          user.username = data.user.username;
          user.accessToken = data.token;
          // Check if the user has already completed onboarding.
          try {
            const me = await apiFetch<MeResponse>("/users/me", { token: data.token });
            user.onboardingComplete = me?.matchingOnboardingComplete ?? !!me?.intentType;
          } catch {
            user.onboardingComplete = false;
          }
        } catch {
          // Backend rejected the OAuth exchange — abort sign-in.
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, session }) {
      // `user` is only present on first sign-in; persist its fields on the JWT.
      if (user) {
        token.accessToken = user.accessToken;
        token.username = user.username;
        token.onboardingComplete = user.onboardingComplete ?? false;
        if (user.id) token.sub = user.id;
      }
      // `unstable_update` merges `session` into the token on update triggers.
      if (trigger === "update" && session) {
        const update = session as { onboardingComplete?: boolean };
        if (update.onboardingComplete !== undefined) {
          token.onboardingComplete = update.onboardingComplete;
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : "";
      if (session.user) {
        session.user.id = token.sub ?? "";
        session.user.username = typeof token.username === "string" ? token.username : "";
        session.user.onboardingComplete = token.onboardingComplete === true;
      }
      return session;
    },
    authorized({ request, auth }) {
      const path = request.nextUrl.pathname;
      const isLoggedIn = !!auth?.user;
      const isAuthRoute = path === "/login" || path === "/signup";

      // Unauthenticated → force login for protected routes.
      if (!isLoggedIn && isProtected(path)) {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
      }

      if (isLoggedIn) {
        // Authenticated users on login/signup go directly to discover.
        if (isAuthRoute) {
          return NextResponse.redirect(new URL("/discover", request.nextUrl));
        }
      }

      return true;
    },
  },
});
