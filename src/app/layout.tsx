import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agent Baymax",
  description: "Your personal AI healthcare companion",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative bg-zinc-50/30 dark:bg-[#0A0A0A] overflow-x-hidden antialiased">
        {/* Global Shifting Liquid Background Blobs */}
        <div className="fixed -left-40 -top-40 h-[600px] w-[600px] bg-gradient-to-br from-red-400/10 to-orange-300/10 dark:from-red-500/5 dark:to-orange-500/5 rounded-full blur-[100px] pointer-events-none z-[-10] animate-pulse" style={{ animationDuration: '12s' }} />
        <div className="fixed -right-40 -bottom-40 h-[600px] w-[600px] bg-gradient-to-tr from-blue-400/10 to-cyan-300/10 dark:from-blue-500/5 dark:to-cyan-500/5 rounded-full blur-[100px] pointer-events-none z-[-10] animate-pulse" style={{ animationDuration: '16s' }} />
        <div className="fixed left-1/4 top-1/3 h-[500px] w-[500px] bg-purple-400/5 dark:bg-purple-500/2 rounded-full blur-[90px] pointer-events-none z-[-10]" />
        
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
