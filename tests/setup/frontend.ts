import "@testing-library/jest-dom/vitest";

// Components read configuration at import time; keep tests hermetic.
// NODE_ENV is read-only on the typed ProcessEnv, so assign via the index.
process.env["AUTH_SECRET"] = "test-secret-do-not-use-in-production-0123456789";
