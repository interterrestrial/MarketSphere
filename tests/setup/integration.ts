/**
 * Integration test setup.
 *
 * Runs before any test module is imported so `DATABASE_URL` is already
 * pointed at the throwaway test database and no test can reach dev data.
 */
process.env["DATABASE_URL"] =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://Deepak@localhost:5432/marketsphere_test";

// Fixed test-only signing key. Set explicitly rather than inherited from
// `.env`, so the suite never depends on a developer's local configuration and
// can never sign a token with a real secret.
process.env["AUTH_SECRET"] = "test-secret-do-not-use-in-production-0123456789";

// Rate limiting would otherwise make auth tests interfere with each other.
process.env["RATE_LIMIT_DISABLED"] = "true";
