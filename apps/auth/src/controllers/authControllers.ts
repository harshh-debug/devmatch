import prismaClient from "db/client";
import type { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ── Types ─────────────────────────────────────────────────────────────────────

interface GitHubUser {
  githubId: string;
  username: string;
  email: string;
  avatarUrl: string;
  displayName: string;
}

// Shape returned to frontend for both login and signup
// Keeping it consistent so NextAuth doesn't need different handling per flow
interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

// ── Helper: issue JWT ─────────────────────────────────────────────────────────
// Single place where tokens are created — if you change the payload shape,
// you only change it here, not scattered across handlers

function issueToken(user: { id: string; email: string; username: string }): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET not defined");

  return jwt.sign(
    {
      sub:      user.id,
      email:    user.email,
      username: user.username,
      role:     "user",
    },
    secret,
    { expiresIn: "7d" }
  );
}

function safeUser(user: {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}) {
  return {
    id:          user.id,
    email:       user.email,
    username:    user.username,
    displayName: user.displayName,
    avatarUrl:   user.avatarUrl,
  };
}

// ── LOGIN ─────────────────────────────────────────────────────────────────────

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prismaClient.user.findUnique({
      where: { email },
    });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (!user.password) {
      return res.status(401).json({ message: "Please sign in with GitHub" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = issueToken(user);

    const response: AuthResponse = {
      token,
      user: safeUser(user),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("[loginUser]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── SIGNUP ────────────────────────────────────────────────────────────────────

export const signupUser = async (req: Request, res: Response) => {
  try {
    const { email, password, username, displayName } = req.body;

    // Validate all required fields
    if (!email || !password || !username) {
      return res.status(400).json({ message: "Email, password, and username are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters" });
    }

    // Check email is not already taken
    const existingEmail = await prismaClient.user.findUnique({
      where: { email },
    });
    if (existingEmail) {
      return res.status(409).json({ message: "Email already in use" });
    }

    // Check username is not already taken
    const existingUsername = await prismaClient.user.findUnique({
      where: { username },
    });
    if (existingUsername) {
      return res.status(409).json({ message: "Username already taken" });
    }

    // Hash password — 12 rounds is the sweet spot between security and speed
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prismaClient.user.create({
      data: {
        email,
        username,
        password:    hashedPassword,
        displayName: displayName ?? username, // fall back to username if no display name given
      },
    });

    const token = issueToken(user);

    const response: AuthResponse = {
      token,
      user: safeUser(user),
    };

    // 201 Created for new resource
    return res.status(201).json(response);
  } catch (error) {
    console.error("[signupUser]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── OAUTH (GitHub) ────────────────────────────────────────────────────────────
// NextAuth calls this endpoint after it completes the GitHub OAuth flow.
// It sends the GitHub access_token, we call GitHub API, find/create the user,
// and return OUR JWT — same shape as login/signup so NextAuth handles it identically.

export const oauthUser = async (req: Request, res: Response) => {
  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ message: "accessToken is required" });
    }

    // ── Step 1: Get GitHub profile using their access token ─────────────────
    let githubUser: GitHubUser;

    try {
      githubUser = await getGitHubProfile(accessToken);
    } catch {
      // GitHub returned an error — token is invalid or expired
      return res.status(401).json({ message: "Invalid GitHub token" });
    }

    // ── Step 2: Account linking logic ────────────────────────────────────────
    // Case A: User already signed up with GitHub before → find by githubId
    // Case B: User signed up with email/password, now tries GitHub with same email
    //         → link githubId to their existing account
    // Case C: Brand new user → create account (password: null)

    let user = await prismaClient.user.findUnique({
      where: { githubId: githubUser.githubId },
    });

    if (!user) {
      // Check if email already exists (Case B — account linking)
      const existingByEmail = await prismaClient.user.findUnique({
        where: { email: githubUser.email },
      });

      if (existingByEmail) {
        // Link their GitHub to the existing account
        user = await prismaClient.user.update({
          where: { id: existingByEmail.id },
          data: {
            githubId:  githubUser.githubId,
            avatarUrl: githubUser.avatarUrl, // update avatar from GitHub
          },
        });
      } else {
        // Case C — new user entirely

        // Username might be taken if someone else registered with it manually
        // Append a number suffix until we find a free one
        const username = await resolveUsername(githubUser.username);

        user = await prismaClient.user.create({
          data: {
            email:       githubUser.email,
            username,
            displayName: githubUser.displayName,
            avatarUrl:   githubUser.avatarUrl,
            githubId:    githubUser.githubId,
            password:    null, // OAuth user — no password
          },
        });
      }
    } else {
      // Case A — returning GitHub user, refresh their avatar
      user = await prismaClient.user.update({
        where: { id: user.id },
        data:  { avatarUrl: githubUser.avatarUrl },
      });
    }

    // ── Step 3: Issue our JWT — same as email/password flow ─────────────────
    const token = issueToken(user);

    const response: AuthResponse = {
      token,
      user: safeUser(user),
    };

    return res.status(200).json(response);
  } catch (error) {
    console.error("[oauthUser]", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ── GitHub API helper ─────────────────────────────────────────────────────────
// Kept in this file for now — move to github.service.ts when it grows

async function getGitHubProfile(accessToken: string): Promise<GitHubUser> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "User-Agent":  "devmatch",           // GitHub rejects requests without this
    Accept:        "application/vnd.github.v3+json",
  };

  // Fetch basic profile
  const profileRes = await fetch("https://api.github.com/user", { headers });

  if (!profileRes.ok) {
    throw new Error(`GitHub API error: ${profileRes.status}`);
  }

  const profile = await profileRes.json() as {
    id:         number;
    login:      string;
    email:      string | null;
    avatar_url: string;
    name:       string | null;
  };

  // GitHub email can be null if user set it private
  // In that case fetch from /user/emails and pick primary + verified
  let email = profile.email;

  if (!email) {
    const emailsRes = await fetch("https://api.github.com/user/emails", { headers });
    const emails = await emailsRes.json() as Array<{
      email:    string;
      primary:  boolean;
      verified: boolean;
    }>;

    const primary = emails.find((e) => e.primary && e.verified);
    if (!primary) throw new Error("No verified primary email on GitHub account");
    email = primary.email;
  }

  return {
    githubId:    String(profile.id),
    username:    profile.login,
    email,
    avatarUrl:   profile.avatar_url,
    displayName: profile.name ?? profile.login,
  };
}

// ── Username conflict resolver ────────────────────────────────────────────────
// If "harsh" is taken, tries "harsh1", "harsh2", etc.

async function resolveUsername(base: string): Promise<string> {
  let username = base;
  let counter  = 1;

  while (true) {
    const existing = await prismaClient.user.findUnique({ where: { username } });
    if (!existing) return username;       // found a free one
    username = `${base}${counter}`;
    counter++;
  }
}