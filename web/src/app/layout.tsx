import type { Metadata } from "next";
import { Inter, Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuroraBackground } from "@/components/glass/AuroraBackground";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aether — The Intelligent Active Study Engine",
  description:
    "Turn textbooks, lecture notes, and slides into personalized active study systems with concept trees, SM-2 spaced repetition, and adaptive rescue loops.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} antialiased bg-[#fafbfc] text-slate-900 min-h-dvh flex flex-col font-sans`}
      >
        <AuroraBackground />
        <Navbar />
        <div className="flex-1 pt-20 sm:pt-22">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
