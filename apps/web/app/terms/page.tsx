import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-5 py-16 text-ink sm:px-8">
      <Link href="/" className="text-sm text-primary">← DevMatch</Link>
      <h1 className="mt-8 font-display text-4xl font-semibold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted">Last updated: August 16, 2026</p>
      <div className="mt-10 space-y-8 text-sm leading-7 text-muted">
        <section><h2 className="text-lg font-semibold text-ink">Using DevMatch</h2><p className="mt-2">You must provide accurate account information, keep your access credentials secure, and use the service only for lawful developer collaboration. You may not harass users, impersonate others, scrape the service, distribute malware, or interfere with its operation.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Connected services</h2><p className="mt-2">GitHub, LeetCode, and Codeforces remain independent services governed by their own terms. Connecting an account authorizes DevMatch to retrieve the public profile information needed for matching.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Content and matching</h2><p className="mt-2">You retain ownership of content you submit. You grant DevMatch permission to process and display it as needed to provide profiles, matching, and chat. Match scores and recommendations are automated suggestions and do not guarantee compatibility or outcomes.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Availability and termination</h2><p className="mt-2">The service may change, pause, or discontinue features. Accounts that abuse the service may be suspended. You may permanently delete your account from Settings.</p></section>
        <section><h2 className="text-lg font-semibold text-ink">Disclaimers</h2><p className="mt-2">DevMatch is provided on an “as is” and “as available” basis to the extent permitted by law. Do not use it as the sole basis for employment, financial, safety, or other high-impact decisions.</p></section>
      </div>
    </main>
  );
}
