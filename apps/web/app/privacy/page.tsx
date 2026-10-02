import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-ink sm:px-8">
      <Link href="/" className="text-sm text-primary">← DevMatch</Link>
      <h1 className="mt-8 font-display text-4xl font-semibold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 16, 2026</p>
      <div className="mt-10 space-y-8 text-sm leading-7 text-muted">
        <section><h2 className="text-lg font-semibold text-ink">Information we process</h2><p className="mt-2">DevMatch processes account identifiers, profile information, skills, matching preferences, connection activity, and chat messages. When you connect a coding account, we process its username and public statistics, repositories, languages, topics, ratings, and contribution activity.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">How we use information</h2><p className="mt-2">We use this information to authenticate you, build your profile, calculate recommendations, connect compatible users, operate chat, prevent abuse, and maintain the reliability and security of the service.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Providers and sharing</h2><p className="mt-2">Infrastructure and authentication data may be processed by Vercel, Amazon Web Services, Neon, and GitHub. Public profile information is visible to other users. We do not sell personal information.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Retention and deletion</h2><p className="mt-2">We retain information while your account is active and as needed for security or legal obligations. Deleting your account from Settings permanently removes its profile, matching records, connected-account data, and associated chat rooms from the active database. Backup copies may remain temporarily until normal backup retention expires.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Your choices</h2><p className="mt-2">You can edit profile and connected-account information in Settings and permanently delete your account there.</p></section>
      </div>
    </main>
  );
}
