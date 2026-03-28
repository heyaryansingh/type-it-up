import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafafa" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export const metadata: Metadata = {
  title: "type-it-up — Handwritten Notes to LaTeX",
  description:
    "Transform handwritten notes into publication-ready LaTeX, Markdown, and PDF. Handles text, math equations, advanced notation, and diagrams.",
  keywords: ["OCR", "LaTeX", "handwriting", "math", "notes", "converter", "equations", "PDF", "Markdown"],
  openGraph: {
    title: "type-it-up — Handwritten Notes to LaTeX",
    description: "Transform handwritten notes into publication-ready LaTeX, Markdown, and PDF.",
    type: "website",
    siteName: "type-it-up",
  },
  twitter: {
    card: "summary_large_image",
    title: "type-it-up — Handwritten Notes to LaTeX",
    description: "Transform handwritten notes into publication-ready LaTeX, Markdown, and PDF.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
