import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

/**
 * Test setup (Phase 9).
 *
 * Three projects so unit, integration, and DOM tests each get the right
 * environment:
 * - `unit`        pure logic, no database
 * - `integration` services and HTTP handlers against a real PostgreSQL schema
 *                 (DATABASE_URL is overridden below so tests never touch dev data)
 * - `frontend`    React Testing Library in jsdom
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          // Integration tests share one database; never run them in parallel.
          fileParallelism: false,
          setupFiles: ["tests/setup/integration.ts"],
          testTimeout: 30_000,
          hookTimeout: 30_000,
        },
      },
      {
        extends: true,
        plugins: [react()],
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["tests/frontend/**/*.test.tsx"],
          globals: true,
          setupFiles: ["tests/setup/frontend.ts"],
        },
      },
    ],
  },
});
