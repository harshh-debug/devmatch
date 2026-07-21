import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DevMatch — Find your match. In code.",
  description:
    "Find DSA partners, hackathon teammates, and coding collaborators through verified developer profiles and mutual matching.",
  keywords: [
    "DSA partner India",
    "hackathon teammate India",
    "college coding collaborator",
    "competitive programming partner",
    "developer matching platform",
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
    <html lang="en">
      <body className={`${geist.variable} ${jetbrainsMono.variable} bg-bg font-sans text-ink antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
