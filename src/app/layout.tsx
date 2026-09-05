import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { GUEST_COOKIE } from "@/app/demo/route";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-src", display: "swap" });

export const metadata: Metadata = {
  title: "FinFlow — Personal finance, clearly",
  description:
    "A calm, premium personal finance dashboard for tracking spending, budgets, and savings goals.",
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
