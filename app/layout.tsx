import type { Metadata } from "next";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "AI Website Operator",
  description:
    "Audit a startup website for AI answerability, generate sharper copy, and preview the patch on a live proxied page.",
};

const fontClasses = [
  spaceGrotesk.variable,
  plexMono.variable,
  "h-full",
  "antialiased",
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={fontClasses}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
