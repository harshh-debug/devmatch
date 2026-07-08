"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [matchNotifs, setMatchNotifs] = useState(true);
  const [messageNotifs, setMessageNotifs] = useState(true);

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Settings
        </h1>
        <p className="text-[13px] text-muted mt-0.5">
          Manage your account preferences
        </p>
      </div>

      <div className="space-y-6">
        {/* Connected accounts */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-display font-semibold text-ink tracking-tight mb-4">
            Connected accounts
          </h2>
          <div className="space-y-3">
            {[
              {
                name: "GitHub",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                ),
                connected: true,
                handle: "sarahchen",
              },
              {
                name: "LeetCode",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-warning" aria-hidden="true">
                    <path d="M16.102 16.977a.891.891 0 0 1-.637-.256l-5.207-5.208a.894.894 0 0 1 0-1.27l5.207-5.207a.891.891 0 0 1 1.27 0l.001.001 1.808 1.808a.891.891 0 0 1 0 1.27l-3.94 3.94 3.94 3.94a.891.891 0 0 1 0 1.27l-1.808 1.808a.891.891 0 0 1-.637.256z" />
                    <path d="M9.255 19.963H4.226a.891.891 0 0 1-.891-.891V4.926a.891.891 0 0 1 .891-.891h5.029" />
                  </svg>
                ),
                connected: true,
                handle: "sarahchen_dev",
              },
              {
                name: "Codeforces",
                icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-info" aria-hidden="true">
                    <rect x="1" y="14" width="4" height="7" rx="1" />
                    <rect x="7" y="10" width="4" height="11" rx="1" />
                    <rect x="13" y="4" width="4" height="17" rx="1" />
                    <rect x="19" y="6" width="4" height="15" rx="1" />
                  </svg>
                ),
                connected: false,
                handle: null,
              },
            ].map((account) => (
              <div
                key={account.name}
                className="flex items-center gap-3 p-3 rounded-lg border border-border"
              >
                <span className="shrink-0">{account.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">
                    {account.name}
                  </p>
                  {account.handle && (
                    <p className="text-[11px] text-muted truncate">
                      {account.handle}
                    </p>
                  )}
                </div>
                {account.connected ? (
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                    Connected
                  </span>
                ) : (
                  <button className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors">
                    Connect
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Password change */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-display font-semibold text-ink tracking-tight mb-4">
            Change password
          </h2>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="currentPassword"
                className="block text-[13px] font-medium text-ink mb-1.5"
              >
                Current password
              </label>
              <input
                id="currentPassword"
                type="password"
                className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
                placeholder="Enter current password"
              />
            </div>
            <div>
              <label
                htmlFor="newPassword"
                className="block text-[13px] font-medium text-ink mb-1.5"
              >
                New password
              </label>
              <input
                id="newPassword"
                type="password"
                className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
                placeholder="Enter new password"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast"
            >
              Update password
            </button>
          </form>
        </div>

        {/* Notification preferences */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <h2 className="text-[15px] font-display font-semibold text-ink tracking-tight mb-4">
            Notification preferences
          </h2>
          <div className="space-y-4">
            {[
              {
                label: "Email notifications",
                desc: "Receive updates via email",
                checked: emailNotifs,
                onChange: setEmailNotifs,
              },
              {
                label: "Push notifications",
                desc: "Receive push notifications in browser",
                checked: pushNotifs,
                onChange: setPushNotifs,
              },
              {
                label: "Match alerts",
                desc: "Get notified when you get a new match",
                checked: matchNotifs,
                onChange: setMatchNotifs,
              },
              {
                label: "Message alerts",
                desc: "Get notified when you receive a message",
                checked: messageNotifs,
                onChange: setMessageNotifs,
              },
            ].map((item) => (
              <label
                key={item.label}
                className="flex items-center justify-between py-2"
              >
                <div>
                  <p className="text-[13px] text-ink">{item.label}</p>
                  <p className="text-[11px] text-muted">{item.desc}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={item.checked}
                  onClick={() => item.onChange(!item.checked)}
                  className={`relative w-10 h-6 rounded-full transition-colors duration-fast ${
                    item.checked ? "bg-primary" : "bg-border"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-fast shadow-sm ${
                      item.checked ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </label>
            ))}
          </div>
        </div>

        {/* Danger zone */}
        <div className="bg-bg border border-danger/30 rounded-xl p-5">
          <h2 className="text-[15px] font-display font-semibold text-danger tracking-tight mb-2">
            Danger zone
          </h2>
          <p className="text-[13px] text-muted mb-4">
            Irreversible account actions. Proceed with caution.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-5 py-2.5 text-[13px] font-medium rounded-lg border border-danger/30 text-danger hover:bg-danger-bg transition-colors duration-fast">
              Delete account
            </button>
            <button className="px-5 py-2.5 text-[13px] font-medium rounded-lg border border-border text-muted hover:text-ink transition-colors duration-fast">
              Export data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}