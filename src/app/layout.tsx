import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AnalyticsScript } from "@/domains/analytics";

const inter = Inter({ subsets: ["latin", "latin-ext"] });

export const metadata: Metadata = {
  title: "plonbli",
  description: "Platforma dla rolnikow i konsumentow",
  manifest: "/manifest.json",
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
      <body className={inter.className}>
        {children}
        <AnalyticsScript />
      </body>
    </html>
  );
}
