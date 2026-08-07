"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { apiFetch, ApiError } from "@/lib/apiClient";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkPasswordStrength = (val: string) => {
    let score = 0;
    if (val.length >= 8) score += 1;
    if (/[A-Z]/.test(val)) score += 1;
    if (/[a-z]/.test(val)) score += 1;
    if (/[0-9]/.test(val)) score += 1;
    if (/[^A-Za-z0-9]/.test(val)) score += 1;
    setPasswordStrength(score);
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"];
  const strengthColor = [
    "",
    "var(--color-danger)",
    "var(--color-warning)",
    "var(--color-warning)",
    "var(--color-success)",
    "var(--color-success)",
  ];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiFetch("/auth/signup", {
        method: "POST",
        body: { email, password, displayName },
      });
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not create account. Try again.",
      );
      return;
    }

    // Auto-login: re-run the credentials provider against /auth/login.
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (!result || result.error) {
      // Account was created but auto-login failed — send to login.
      router.push("/login");
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  function handleGithub() {
    setError(null);
    void signIn("github", { redirectTo: "/onboarding" });
  }

  return (
    <div className="relative z-10 flex flex-1 items-center justify-center px-5 pb-20 pt-8 sm:px-8">
      <div className="w-full max-w-md rounded-[1.75rem] border border-white/15 bg-surface/90 p-6 shadow-2xl shadow-black/35 backdrop-blur sm:p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-semibold tracking-[-0.055em] text-ink">
            Create your account
          </h1>
          <p className="mt-2 text-[15px] text-muted">
            Join DevMatch and find your next collaborator.
          </p>
        </div>

        {/* GitHub OAuth */}
        <button
          type="button"
          onClick={handleGithub}
          className="flex w-full items-center justify-center gap-2.5 rounded-xl border border-white/15 bg-bg px-5 py-3.5 text-[14px] font-medium text-ink transition-colors duration-fast hover:border-white/30 hover:bg-white/5"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          Continue with GitHub
        </button>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-surface px-3 text-[12px] text-muted">or</span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 px-3.5 py-2.5 rounded-lg text-[13px] border"
            style={{
              borderColor: "var(--color-danger)",
              color: "var(--color-danger)",
              backgroundColor: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
            }}
          >
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="displayName"
              className="block text-[13px] font-medium text-ink mb-1.5"
            >
              Display name
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Sarah Chen"
              required
              autoComplete="name"
              className="w-full rounded-xl border border-white/15 bg-bg px-3.5 py-3 text-[14px] text-ink placeholder:text-muted/60 transition-colors duration-fast focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-[13px] font-medium text-ink mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full rounded-xl border border-white/15 bg-bg px-3.5 py-3 text-[14px] text-ink placeholder:text-muted/60 transition-colors duration-fast focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-[13px] font-medium text-ink mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  checkPasswordStrength(e.target.value);
                }}
                placeholder="Create a strong password"
                required
                className="w-full rounded-xl border border-white/15 bg-bg px-3.5 py-3 pr-10 text-[14px] text-ink placeholder:text-muted/60 transition-colors duration-fast focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors duration-fast"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {password && (
              <div className="mt-2">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          i <= passwordStrength
                            ? strengthColor[passwordStrength]
                            : "var(--color-border)",
                      }}
                    />
                  ))}
                </div>
                <p
                  className="text-[11px]"
                  style={{ color: strengthColor[passwordStrength] || "var(--color-muted)" }}
                >
                  {strengthLabel[passwordStrength]}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary py-3 text-[14px] font-semibold text-bg transition-colors duration-fast hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-[13px] text-muted">
          Already have an account?{" "}
          <a
            href="/login"
            className="text-primary hover:text-primary-hover font-medium transition-colors duration-fast"
          >
            Sign in
          </a>
        </p>

        <p className="mt-4 text-center text-[11px] text-muted leading-relaxed">
          By creating an account, you agree to our{" "}
          <a href="/" className="underline hover:text-ink transition-colors">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/" className="underline hover:text-ink transition-colors">
            Privacy Policy
          </a>
          .
        </p>
      </div>
    </div>
  );
}
