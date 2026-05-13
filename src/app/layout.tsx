import type { Metadata, Viewport } from "next";
import { Lora, DM_Sans } from "next/font/google";
import "./globals.css";
import { AnalyticsScript } from "@/domains/analytics";

const lora = Lora({
  subsets: ["latin", "latin-ext"],
  variable: "--font-lora",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "plonbli",
  description: "Platforma dla rolnikow i konsumentow",
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon.ico",
    apple: "/icons/android-chrome-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "plonbli",
  },
};

export const viewport: Viewport = {
  themeColor: "#4a7c59",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <body
        className={`${lora.variable} ${dmSans.variable} font-sans`}
        suppressHydrationWarning
      >
        {children}
        <AnalyticsScript />
      </body>
    </html>
  );
}
