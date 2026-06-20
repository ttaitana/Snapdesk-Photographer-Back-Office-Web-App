import type { Metadata, Viewport } from "next";
import { Anton, IBM_Plex_Sans_Thai } from "next/font/google";

import { ThemeProvider } from "@/components/theme-provider";
import { QueryProvider } from "@/components/query-provider";
import { RegisterServiceWorker } from "@/components/register-service-worker";
import "@/lib/env"; // validates process.env on startup — throws early if misconfigured
import "./globals.css";

// Heading: thick condensed/industrial feel — SPEC.md §3.3.
const heading = Anton({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-heading",
  display: "swap",
});

// Body: full Thai script support — SPEC.md §3.3.
const body = IBM_Plex_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

// P10 PWA (TASKS.md: "ตั้ง PWA — manifest + service worker"). manifest +
// appleWebApp here cover the install/home-screen side; sw.js (registered by
// <RegisterServiceWorker> below) covers the runtime caching/offline side.
export const metadata: Metadata = {
  title: "Snapdesk",
  description: "ผู้ช่วยจัดการงานหลังบ้านสำหรับช่างภาพ — คิวงาน ใบเสนอราคา การเงิน และภาษี",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Snapdesk",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#2e7dc4",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" suppressHydrationWarning className={`${heading.variable} ${body.variable}`}>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="snapdesk-theme">
          <QueryProvider>{children}</QueryProvider>
        </ThemeProvider>
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
