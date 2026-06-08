import prismaClient from "db/client";
export interface GitHubUser {
	githubId: string;
	username: string;
	email: string;
	avatarUrl: string;
	displayName: string;
}
export async function getGitHubProfile(accessToken: string): Promise<GitHubUser> {
	const headers = {
		Authorization: `Bearer ${accessToken}`,
		"User-Agent": "devmatch", 
		Accept: "application/vnd.github.v3+json",
	};

	const profileRes = await fetch("https://api.github.com/user", { headers });

	if (!profileRes.ok) {
		throw new Error(`GitHub API error: ${profileRes.status}`);
	}

	const profile = (await profileRes.json()) as {
		id: number;
		login: string;
		email: string | null;
		avatar_url: string;
		name: string | null;
	};

	let email = profile.email;

	if (!email) {
		const emailsRes = await fetch("https://api.github.com/user/emails", {
			headers,
		});
		const emails = (await emailsRes.json()) as Array<{
			email: string;
			primary: boolean;
			verified: boolean;
		}>;

		const primary = emails.find((e) => e.primary && e.verified);
		if (!primary)
			throw new Error("No verified primary email on GitHub account");
		email = primary.email;
	}

	return {
		githubId: String(profile.id),
		username: profile.login,
		email,
		avatarUrl: profile.avatar_url,
		displayName: profile.name ?? profile.login,
	};
}

export async function resolveUsername(base: string): Promise<string> {
	let username = base;
	let counter = 1;

	while (true) {
		const existing = await prismaClient.user.findUnique({
			where: { username },
		});
		if (!existing) return username; 
		username = `${base}${counter}`;
		counter++;
	}
}
