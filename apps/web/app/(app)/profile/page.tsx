"use client";

import { useState, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { useToken } from "@/hooks/useToken";
import type { UserProfile } from "@/lib/types";
import { CompletenessWidget } from "@/app/components/profile/CompletenessWidget";
import { GitHubActivity } from "@/app/components/profile/GitHubActivity";

const SKILLS_POOL = [
  "TypeScript",
  "React",
  "Next.js",
  "Node.js",
  "Python",
  "Rust",
  "Go",
  "Postgres",
  "Docker",
  "Kubernetes",
  "AWS",
  "TensorFlow",
  "PyTorch",
  "Tailwind",
  "GraphQL",
  "gRPC",
  "Redis",
  "MongoDB",
  "C++",
  "Java",
];

const ALL_COLLEGES = [
  "MIT",
  "Stanford",
  "UC Berkeley",
  "CMU",
  "Georgia Tech",
  "UT Austin",
  "UIUC",
  "Caltech",
  "Harvard",
  "Princeton",
];

export default function ProfilePage() {
  const isSettings = usePathname() === "/settings";
  const [isHydrated, setIsHydrated] = useState(false);
  const token = useToken();
  const queryClient = useQueryClient();
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [college, setCollege] = useState("");
  const [showCollegeDropdown, setShowCollegeDropdown] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [searchSkill, setSearchSkill] = useState("");
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [githubHandle, setGithubHandle] = useState("");
  const [leetcodeHandle, setLeetcodeHandle] = useState("");
  const [codeforcesHandle, setCodeforcesHandle] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncingLeetcode, setSyncingLeetcode] = useState(false);
  const [syncingCf, setSyncingCf] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["users", "me"],
    queryFn: () => apiFetch<UserProfile>("/users/me", { token }),
    enabled: !!token,
    retry: 0,
  });
  // The current service returns account fields at the top level and synced
  // platform fields under `profile`; present one form-friendly shape to the UI.
  const profileData = useMemo<UserProfile | undefined>(
    () =>
      profile
        ? ({ ...((profile as UserProfile & { profile?: UserProfile }).profile ?? {}), ...profile } as UserProfile)
        : undefined,
    [profile],
  );

  // Hydrate local form state once the profile loads.
  useEffect(() => {
    if (!profileData) return;
    setDisplayName(profileData.displayName ?? "");
    setUsername(profileData.username ?? "");
    setBio(profileData.bio ?? "");
    setCollege(profileData.college ?? "");
    setSelectedSkills(profileData.skillTags ?? []);
    setGithubHandle(profileData.githubUsername ?? profileData.githubHandle ?? "");
    setLeetcodeHandle(profileData.leetcodeHandle ?? "");
    setCodeforcesHandle(profileData.codeforcesHandle ?? "");
  }, [profileData]);

  useEffect(() => setIsHydrated(true), []);

  const addSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill]);
    }
    setSearchSkill("");
    setShowSkillDropdown(false);
  };

  const removeSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill));
  };

  const filteredSkills = SKILLS_POOL.filter(
    (s) =>
      s.toLowerCase().includes(searchSkill.toLowerCase()) &&
      !selectedSkills.includes(s)
  );

  const filteredColleges = ALL_COLLEGES.filter((c) =>
    c.toLowerCase().includes(college.toLowerCase())
  );
  const usernameCheck = useQuery({
    queryKey: ["users", "username-availability", username],
    queryFn: () => apiFetch<{ available: boolean }>("/users/username-availability", { token, query: { username } }),
    enabled: !!token && username.length >= 3 && username !== profileData?.username,
  });

  const profileCompleteness = () => {
    let score = 0;
    if (displayName) score += 20;
    if (bio) score += 20;
    if (college) score += 15;
    if (selectedSkills.length >= 3) score += 20;
    else if (selectedSkills.length > 0) score += 10;
    if (githubHandle) score += 12.5;
    if (leetcodeHandle) score += 12.5;
    return Math.round(score);
  };

  const completeness = profileCompleteness();
  const missingFields = [];
  if (!displayName) missingFields.push({ label: "Add your name", pts: 20, fieldId: "displayName" });
  if (!bio) missingFields.push({ label: "Add a bio", pts: 20, fieldId: "bio" });
  if (!college) missingFields.push({ label: "Add your college", pts: 15, fieldId: "college" });
  if (selectedSkills.length < 3) missingFields.push({ label: "Add 3+ skills", pts: 20, fieldId: "searchSkill" });
  if (!githubHandle) missingFields.push({ label: "Connect GitHub", pts: 12.5, fieldId: "githubHandle" });
  if (!leetcodeHandle) missingFields.push({ label: "Connect LeetCode", pts: 12.5, fieldId: "leetcodeHandle" });


  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["users", "me"] });
  };

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch("/users/me", {
        token,
        method: "PATCH",
        body: {
          username,
          displayName,
          bio,
          college,
        },
      }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not save profile."),
  });

  const saveSkills = useMutation({
    mutationFn: () =>
      apiFetch("/users/me/skills", {
        token,
        method: "PATCH",
        body: {
          skillTags: selectedSkills,
        },
      }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : "Could not save skills."),
  });

  function handleSave() {
    setError(null);
    setSavedMsg(null);
    Promise.all([saveProfile.mutateAsync(), saveSkills.mutateAsync()])
      .then(() => {
        invalidate();
        setSavedMsg("Profile saved.");
      })
      .catch(() => {
        /* errors surfaced via mutation onError */
      });
  }

  async function handleSyncGithub() {
    setError(null);
    setSavedMsg(null);
    setSyncing(true);
    try {
      await apiFetch("/users/me/connect/github", {
        token,
        method: "POST",
      });
      invalidate();
      setSavedMsg("GitHub sync started — data will refresh shortly.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "GitHub sync failed.");
    } finally {
      setSyncing(false);
    }
  }

  async function handleSyncLeetcode() {
    setError(null);
    setSavedMsg(null);
    if (!leetcodeHandle) {
      setError("Enter a LeetCode handle first.");
      return;
    }
    setSyncingLeetcode(true);
    try {
      await apiFetch("/users/me/connect/leetcode", {
        token,
        method: "POST",
        body: { handle: leetcodeHandle },
      });
      invalidate();
      setSavedMsg("LeetCode sync started — rating will refresh shortly.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "LeetCode sync failed.");
    } finally {
      setSyncingLeetcode(false);
    }
  }

  async function handleConnectCodeforces() {
    setError(null);
    setSavedMsg(null);
    if (!codeforcesHandle) {
      setError("Enter a Codeforces handle first.");
      return;
    }
    setSyncingCf(true);
    try {
      await apiFetch("/users/me/connect/codeforces", {
        token,
        method: "POST",
        body: { handle: codeforcesHandle },
      });
      invalidate();
      setSavedMsg("Codeforces sync started — rating will refresh shortly.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Codeforces sync failed.");
    } finally {
      setSyncingCf(false);
    }
  }

  if (!isHydrated) {
    return <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-8 text-[13px] text-muted">Loading profile…</div>;
  }

  if (!isSettings) {
    return (
      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center gap-3"><div className="w-12 h-12 rounded-full bg-ink/10 flex items-center justify-center text-sm font-semibold overflow-hidden">{profileData?.avatarUrl ? <img src={profileData.avatarUrl} alt="" className="w-full h-full object-cover" /> : (displayName[0] ?? "U")}</div><div><h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">Profile</h1><p className="text-[13px] text-muted mt-1">Your synced developer profile.</p></div></div>
        <CompletenessWidget completeness={completeness} missingFields={missingFields} />
        <section className="bg-bg border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-ink mb-3">Skills</h2>
          <div className="flex flex-wrap gap-1.5 mb-3">{selectedSkills.map((skill) => <button key={skill} onClick={() => removeSkill(skill)} className="px-2.5 py-1 text-[12px] rounded-full bg-primary/10 text-primary border border-primary/20">{skill} ×</button>)}</div>
          <div className="relative"><input id="searchSkill" value={searchSkill} onChange={(event) => { setSearchSkill(event.target.value); setShowSkillDropdown(true); }} onFocus={() => setShowSkillDropdown(true)} placeholder="Add a skill…" className="w-full px-3.5 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink focus:outline-none focus:border-ring" />{showSkillDropdown && filteredSkills.length > 0 && <div className="absolute z-dropdown left-0 right-0 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden">{filteredSkills.map((skill) => <button key={skill} onClick={() => addSkill(skill)} className="w-full text-left px-3 py-2 text-[12px] hover:bg-surface">{skill}</button>)}</div>}</div>
          <button onClick={() => saveSkills.mutate()} disabled={saveSkills.isPending} className="mt-3 px-3 py-2 text-[12px] rounded-lg bg-primary text-white disabled:opacity-60">{saveSkills.isPending ? "Saving…" : "Save skills"}</button>
        </section>
        {profileData && <div className="space-y-4">
          <GitHubActivity profile={profileData} />
          <div className="grid sm:grid-cols-2 gap-4">
            <section className="bg-bg border border-border rounded-xl p-5"><h2 className="text-[13px] font-medium text-ink">LeetCode</h2><p className="text-[12px] text-muted mt-1">{leetcodeHandle ? `@${leetcodeHandle}` : "Not connected"}</p><div className="grid grid-cols-2 gap-3 mt-4"><div><p className="text-[10px] text-muted">GLOBAL RANK</p><p className="font-mono text-[18px] text-ink">{profileData.lcRating ?? "—"}</p></div><div><p className="text-[10px] text-muted">SOLVED</p><p className="font-mono text-[18px] text-ink">{profileData.lcTotalSolved ?? "—"}</p></div></div>{!leetcodeHandle && <a href="/settings#leetcodeHandle" className="inline-block mt-4 text-[12px] text-primary">Connect LeetCode</a>}</section>
            <section className="bg-bg border border-border rounded-xl p-5"><h2 className="text-[13px] font-medium text-ink">Codeforces</h2><p className="text-[12px] text-muted mt-1">{codeforcesHandle ? `@${codeforcesHandle}` : "Not connected"}</p><div className="grid grid-cols-2 gap-3 mt-4"><div><p className="text-[10px] text-muted">RATING</p><p className="font-mono text-[18px] text-ink">{profileData.cfRating ?? "—"}</p></div><div><p className="text-[10px] text-muted">HANDLE</p><p className="font-mono text-[13px] text-ink truncate">{codeforcesHandle || "—"}</p></div></div>{!codeforcesHandle && <a href="/settings#codeforcesHandle" className="inline-block mt-4 text-[12px] text-primary">Connect Codeforces</a>}</section>
          </div>
        </div>}
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display font-semibold text-[24px] text-ink tracking-tight">
          Settings
        </h1>
        <p className="text-[13px] text-muted mt-0.5">
          Edit your identity, skills, and connected accounts
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile completeness */}
        {null}

        {/* Display Name */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <label
            htmlFor="displayName"
            className="block text-[13px] font-medium text-ink mb-1.5"
          >
            Display name
          </label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
          />
        </div>

        {/* Bio */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <label htmlFor="username" className="block text-[13px] font-medium text-ink mb-1.5">Username</label>
          <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring" />
          {username !== profileData?.username && username.length >= 3 && <p className={`mt-1 text-[11px] ${usernameCheck.data?.available ? "text-success" : "text-danger"}`}>{usernameCheck.isFetching ? "Checking…" : usernameCheck.data?.available ? "Username available" : "Username is already taken"}</p>}
          <p className="mt-1 text-[11px] text-muted">Use 3–30 letters, numbers, or underscores.</p>
        </div>

        {/* Bio */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <label
            htmlFor="bio"
            className="block text-[13px] font-medium text-ink mb-1.5"
          >
            Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            placeholder="Tell developers about yourself..."
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast resize-none"
          />
          <p className="mt-1 text-[11px] text-muted">{bio.length}/500</p>
        </div>

        {/* College */}
        <div className="bg-bg border border-border rounded-xl p-5 relative">
          <label
            htmlFor="college"
            className="block text-[13px] font-medium text-ink mb-1.5"
          >
            College
          </label>
          <input
            id="college"
            type="text"
            value={college}
            onChange={(e) => {
              setCollege(e.target.value);
              setShowCollegeDropdown(true);
            }}
            onFocus={() => setShowCollegeDropdown(true)}
            placeholder="Search your college..."
            className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
          />
          {showCollegeDropdown && filteredColleges.length > 0 && (
            <div className="absolute z-dropdown left-5 right-5 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden">
              {filteredColleges.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCollege(c);
                    setShowCollegeDropdown(false);
                  }}
                  className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors duration-fast"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Skills are managed from the profile dashboard. */}
        <div className="hidden bg-bg border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-[13px] font-medium text-ink">
              Skills
            </label>
            <span className="text-[11px] text-muted">
              {selectedSkills.length} selected
            </span>
          </div>

          {/* Selected skills */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selectedSkills.map((s) => (
              <span
                key={s}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[12px] rounded-full bg-primary/10 text-primary border border-primary/20"
              >
                {s}
                <button
                  onClick={() => removeSkill(s)}
                  className="hover:text-primary-hover"
                  aria-label={`Remove ${s}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>

          {/* Skill search */}
          <div className="relative">
            <input
              id="searchSkill"
              type="text"
              value={searchSkill}
              onChange={(e) => {
                setSearchSkill(e.target.value);
                setShowSkillDropdown(true);
              }}
              onFocus={() => setShowSkillDropdown(true)}
              placeholder="Search skills..."
              className="w-full px-3.5 py-2.5 text-[14px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
            />
            {showSkillDropdown && filteredSkills.length > 0 && (
              <div className="absolute z-dropdown left-0 right-0 top-full mt-1 bg-bg border border-border rounded-lg shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                {filteredSkills.map((s) => (
                  <button
                    key={s}
                    onClick={() => addSkill(s)}
                    className="w-full text-left px-3.5 py-2.5 text-[13px] text-ink hover:bg-surface transition-colors duration-fast"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-bg border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-medium text-ink mb-4">
            Connected accounts
          </h2>

          <div className="space-y-4">
            {/* GitHub */}
            <div className="space-y-2">
              <div id="githubHandle" className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-ink shrink-0" aria-hidden="true">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">GitHub</p>
                  <p className="text-[11px] text-muted truncate">{githubHandle || "Not connected"}</p>
                </div>
                {githubHandle && (
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                    Connected
                  </span>
                )}
                {githubHandle ? (
                  <button
                    onClick={handleSyncGithub}
                    disabled={syncing}
                    className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-60"
                  >
                    {syncing ? "Syncing…" : "Sync"}
                  </button>
                ) : (
                  <a
                    href="/api/github/link"
                    className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors"
                  >
                    Verify with GitHub
                  </a>
                )}
              </div>
            </div>

            {/* LeetCode */}
            <div className="space-y-2">
            <div id="leetcodeHandle" className="flex items-center gap-3 p-3 rounded-lg border border-border">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-warning shrink-0" aria-hidden="true">
                <path d="M16.102 16.977a.891.891 0 0 1-.637-.256l-5.207-5.208a.894.894 0 0 1 0-1.27l5.207-5.207a.891.891 0 0 1 1.27 0l.001.001 1.808 1.808a.891.891 0 0 1 0 1.27l-3.94 3.94 3.94 3.94a.891.891 0 0 1 0 1.27l-1.808 1.808a.891.891 0 0 1-.637.256z" />
                <path d="M9.255 19.963H4.226a.891.891 0 0 1-.891-.891V4.926a.891.891 0 0 1 .891-.891h5.029" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-ink">LeetCode</p>
                <p className="text-[11px] text-muted truncate">{leetcodeHandle || "Not connected"}</p>
              </div>
              {leetcodeHandle && (
                <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                  Connected
                </span>
              )}
              <button
                onClick={handleSyncLeetcode}
                disabled={syncingLeetcode}
                className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-60"
              >
                {syncingLeetcode ? "Syncing…" : leetcodeHandle ? "Sync" : "Connect"}
              </button>
            </div>
            {!profileData?.leetcodeHandle && (
              <input
                type="text"
                value={leetcodeHandle}
                onChange={(e) => setLeetcodeHandle(e.target.value)}
                placeholder="LeetCode username"
                className="w-full px-3.5 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
              />
            )}
            </div>

            {/* Codeforces */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 rounded-lg border border-border">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-info shrink-0" aria-hidden="true">
                  <rect x="1" y="14" width="4" height="7" rx="1" />
                  <rect x="7" y="10" width="4" height="11" rx="1" />
                  <rect x="13" y="4" width="4" height="17" rx="1" />
                  <rect x="19" y="6" width="4" height="15" rx="1" />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-ink">Codeforces</p>
                  <p className="text-[11px] text-muted">{codeforcesHandle || "Not connected"}</p>
                </div>
                {codeforcesHandle && (
                  <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-success/10 text-success">
                    Connected
                  </span>
                )}
                <button
                  onClick={handleConnectCodeforces}
                  disabled={syncingCf}
                  className="text-[11px] text-primary hover:text-primary-hover font-medium transition-colors disabled:opacity-60"
                >
                  {syncingCf ? "Connecting…" : codeforcesHandle ? "Sync" : "Connect"}
                </button>
              </div>
              {!profileData?.codeforcesHandle && (
                <input
                  type="text"
                  value={codeforcesHandle}
                  onChange={(e) => setCodeforcesHandle(e.target.value)}
                  placeholder="Codeforces handle (e.g. tourist)"
                  className="w-full px-3.5 py-2 text-[13px] bg-bg border border-border rounded-lg text-ink placeholder:text-muted/60 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring transition-colors duration-fast"
                />
              )}
            </div>
          </div>
        </div>

        {/* Save */}
        {error && (
          <p role="alert" className="text-[12px]" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        {savedMsg && (
          <p className="text-[12px]" style={{ color: "var(--color-success)" }}>
            {savedMsg}
          </p>
        )}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setSavedMsg(null);
              // Re-hydrate from the cached profile.
              if (profileData) {
                setDisplayName(profileData.displayName ?? "");
                setBio(profileData.bio ?? "");
                setCollege(profileData.college ?? "");
                setSelectedSkills(profileData.skillTags ?? []);
                setGithubHandle(profileData.githubUsername ?? profileData.githubHandle ?? "");
                setLeetcodeHandle(profileData.leetcodeHandle ?? "");
                setCodeforcesHandle(profileData.codeforcesHandle ?? "");
              }
            }}
            className="px-5 py-2.5 text-[13px] font-medium rounded-lg border border-border text-muted hover:text-ink transition-colors duration-fast"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saveProfile.isPending || saveSkills.isPending}
            className="px-5 py-2.5 text-[13px] font-medium rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors duration-fast disabled:opacity-60"
          >
            {saveProfile.isPending || saveSkills.isPending ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
