import Link from "next/link";

export default function SupportPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <main className="mx-auto max-w-2xl px-5 py-16 text-ink sm:px-8">
      <Link href="/" className="text-sm text-primary">← DevMatch</Link>
      <h1 className="mt-8 font-display text-4xl font-semibold">Support</h1>
      <p className="mt-5 leading-7 text-muted">For account, safety, privacy, or technical support, send a request without including passwords, tokens, private messages, or other sensitive data.</p>
      <a href={supportEmail ? `mailto:${supportEmail}` : "https://github.com/harshh-debug/devmatch/issues/new"} className="mt-8 inline-flex rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white">{supportEmail ? "Email support" : "Open a technical support request"}</a>
      <p className="mt-6 text-xs leading-5 text-muted">For a privacy request, identify only the DevMatch username involved. Support may ask you to verify account ownership inside the application.</p>
    </main>
  );
}
