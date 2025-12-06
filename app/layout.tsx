import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 1. The Title Template
  // If you are on the home page, it says "Toolkit". 
  // If you are on a sub-page (e.g., /stopwatch), it says "Stopwatch | Toolkit"
  title: {
    default: "Toolkit",
    template: "%s | Toolkit", 
  },
  
  // 2. Strong Description
  description: "A collection of simple, playful, and useful utilities. Fast tools for everyday tasks, all in one place.",
  
  // 3. Keywords for SEO (helps search engines understand your app)
  keywords: ["utilities", "tools", "productivity", "web apps", "converter", "calculator", "minimalist"],

  // 4. Authorship
  authors: [{ name: "Jatin" }],

  // 5. Icons (Connects your generated SVG/ICO)
  icons: {
    icon: "/favicon.ico", // or "/favicon.svg" if you use the SVG directly
    apple: "/apple-touch-icon.png", // Optional: for iPhone home screen
  },

  // 6. Open Graph (How it looks when shared on Twitter/WhatsApp/LinkedIn)
  openGraph: {
    title: "Utilities",
    description: "Daily use Apps.",
    siteName: "Toolkit",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}