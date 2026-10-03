import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import path from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbopack: {
    // This repository uses a Git worktree with its own lockfile. Without an
    // explicit root, Turbopack can select the parent checkout and serve a
    // different route tree.
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "**.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.fbcdn.net",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        // Campaign images — user-provided URLs
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/api/actions/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, OPTIONS" },
          {
            key: "Access-Control-Allow-Headers",
            value: "Content-Type, Authorization, Accept-Encoding",
          },
          { key: "X-Action-Version", value: "2.2" },
          { key: "X-Blockchain-Ids", value: "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1" },
        ],
      },
      {
        source: "/actions.json",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
        ],
      },
    ];
  },
};

export default withPWA(withNextIntl(nextConfig));
