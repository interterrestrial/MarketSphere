/**
 * Integration test setup.
 *
 * Runs before any test module is imported so `DATABASE_URL` is already
 * pointed at the throwaway test database and no test can reach dev data.
 */
process.env["DATABASE_URL"] =
  process.env["TEST_DATABASE_URL"] ?? "postgresql://Deepak@localhost:5432/marketsphere_test";

// Rate limiting would otherwise make auth tests interfere with each other.
process.env["AUTH_RATE_LIMIT_DISABLED"] = "true";
