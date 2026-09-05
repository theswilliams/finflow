import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GUEST_COOKIE } from "@/app/demo/route";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-src", display: "swap" });

const SITE_URL = "https://finflow-cyan-theta.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "FinFlow — Personal finance, clearly",
    template: "%s · FinFlow",
  },
  description:
    "A calm, premium personal-finance dashboard: transaction categorization, spending insights, budgets, and savings goals. A portfolio project.",
  applicationName: "FinFlow",
  authors: [{ name: "Storm Williams", url: "https://github.com/theswilliams" }],
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "FinFlow",
    title: "FinFlow — Personal finance, clearly",
    description:
      "Transaction categorization, spending insights, budgets, and savings goals — a calm fintech-style dashboard. Live demo, no sign-up.",
  },
  twitter: {
    card: "summary_large_image",
    title: "FinFlow — Personal finance, clearly",
    description: "A calm, premium personal-finance dashboard. Live demo, no sign-up.",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const guest = (await cookies()).get(GUEST_COOKIE)?.value === "1";
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${mono.variable} font-sans antialiased`}>
        <Providers initialGuest={guest}>{children}</Providers>
      </body>
    </html>
  );
}
