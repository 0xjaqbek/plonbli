import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        external: ["firebase-admin", "firebase-admin/messaging"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "firebase-admin/messaging": path.resolve(__dirname, "tests/__mocks__/firebase-admin-messaging.ts"),
    },
  },
});
