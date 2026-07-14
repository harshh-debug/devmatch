import type { UserProfile } from "@/lib/types";

type ContributionWeek = NonNullable<UserProfile["githubContributions"]>[number];

function activityLevel(count: number, max: number) {
  if (count === 0) return "var(--color-surface)";
  const intensity = 25 + Math.round((count / max) * 70);
  return `color-mix(in oklch, var(--color-primary) ${intensity}%, var(--color-surface))`;
}

export function contributionStats(weeks?: ContributionWeek[]) {
  const days = weeks?.flatMap((week) => week.days) ?? [];
  const total = days.reduce((sum, day) => sum + day.count, 0);
  const completedDays = [...days];

  // Today's GitHub cell may still be empty while the day is in progress. Start
  // from yesterday in that case, then count the active consecutive run.
  if (completedDays.at(-1)?.count === 0) completedDays.pop();
  let streak = 0;
  for (let index = completedDays.length - 1; index >= 0; index--) {
    if (completedDays[index]!.count === 0) break;
    streak++;
  }

  return { total, streak, max: Math.max(...days.map((day) => day.count), 1) };
}

export function GitHubActivity({ profile }: { profile: UserProfile }) {
  const weeks = profile.githubContributions;
  const { total, streak, max } = contributionStats(weeks);
  const languages = profile.topLanguages ?? [];

  return (
    <section className="bg-bg border border-border rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-ink" aria-hidden="true">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
        </svg>
        <span className="text-[13px] font-medium text-ink">GitHub</span>
        <span className="text-[11px] text-muted ml-auto">
          {profile.githubUsername ?? profile.githubHandle ? `@${profile.githubUsername ?? profile.githubHandle}` : "Not connected"}
        </span>
      </div>

      {weeks?.length ? (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-[13px] text-ink mb-3">
            <span className="font-semibold">{total.toLocaleString()}</span> contributions in the last year
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-2">
              <div className="grid grid-rows-7 gap-1 pt-5 text-[9px] text-muted leading-[10px]">
                <span aria-hidden="true" />
                <span>Mon</span>
                <span aria-hidden="true" />
                <span>Wed</span>
                <span aria-hidden="true" />
                <span>Fri</span>
                <span aria-hidden="true" />
              </div>
              <div className="flex gap-1">
                {weeks.map((week, weekIndex) => {
                  const firstDay = week.days[0];
                  const previousDay = weeks[weekIndex - 1]?.days[0];
                  const month = firstDay ? new Date(`${firstDay.date}T00:00:00`).toLocaleString("en-US", { month: "short" }) : "";
                  const previousMonth = previousDay ? new Date(`${previousDay.date}T00:00:00`).toLocaleString("en-US", { month: "short" }) : "";
                  return (
                    <div key={firstDay?.date ?? weekIndex} className="grid grid-rows-[16px_repeat(7,10px)] gap-1">
                      <span className="text-[9px] text-muted whitespace-nowrap">{month !== previousMonth ? month : ""}</span>
                      {week.days.map((day) => (
                        <span
                          key={day.date}
                          title={`${day.date}: ${day.count} contributions`}
                          className="w-2.5 h-2.5 rounded-[2px]"
                          style={{ backgroundColor: activityLevel(day.count, max) }}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="flex justify-end items-center gap-1.5 mt-2 text-[10px] text-muted">
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((level) => <span key={level} className="w-2.5 h-2.5 rounded-[2px]" style={{ backgroundColor: activityLevel(Math.ceil(max * level), max) }} />)}
            <span>More</span>
          </div>
        </div>
      ) : <p className="mt-4 text-[11px] text-muted">Contribution history will appear after the next GitHub sync.</p>}

      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
        <div><p className="text-[10px] text-muted">CURRENT STREAK</p><p className="font-mono text-[18px] text-ink">{weeks?.length ? streak : (profile.contributionStreak ?? "—")}</p></div>
        <div><p className="text-[10px] text-muted">GITHUB STARS</p><p className="font-mono text-[18px] text-ink">{profile.githubStars ?? "—"}</p></div>
        <div><p className="text-[10px] text-muted">MOST USED</p><p className="text-[12px] text-ink truncate mt-1" title={languages.join(", ")}>{languages.length ? languages.join(", ") : "—"}</p></div>
      </div>
    </section>
  );
}
