import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevMatch — Find your match. In code.",
  description:
    "Intent-driven developer matching backed by real GitHub data, LeetCode ratings, and mutual consent. No noise. No recruiters. Just collaborators.",
  keywords: [
    "developer matching",
    "hackathon partner",
    "coding collaborator",
    "GitHub",
    "LeetCode",
    "competitive programming",
  ],
  openGraph: {
    title: "DevMatch — Find your match. In code.",
    description:
      "Intent-driven developer matching backed by real data. No noise. No recruiters. Just collaborators.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://api.fontshare.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@1,2,3,4,5,6,7,8,9&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1,2,3,4,5,6,7,8,9&display=swap"
        />
      </head>
      <body
        className={`${jetbrainsMono.variable} font-body antialiased bg-bg text-ink`}
      >
        {children}
      </body>
    </html>
  );
}