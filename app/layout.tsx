// app/layout.tsx
// Purpose: Root layout of the app. Wraps all pages in AuthShell and defines global HTML/body styling.

import type { Metadata } from "next";
import "./globals.css";

import AuthShell from "@/components/AuthShell";

export const metadata: Metadata = {
  title: "AgeWinners",
  description: "Uplifting community focused on wellbeing and positive living.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" suppressHydrationWarning>
      {/* 
        MVP fix: overflow-x-hidden prevents any accidental horizontal scroll caused by layout overflow
        (common reasons: 100vw/w-screen, negative margins, wide flex children, etc.)
      */}
      <body className="bg-slate-50 text-slate-900 w-full overflow-x-hidden">
        <AuthShell>{children}</AuthShell>
      </body>
    </html>
  );
}