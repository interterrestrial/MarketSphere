/**
 * Applies migrations to the throwaway test database.
 *
 * Deliberately refuses to run against anything but a database whose name ends
 * in `_test`: a stray `npm run test:db:setup` must never migrate the
 * development database.
 */
import { execFileSync } from "node:child_process";

const url =
  process.env.TEST_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "postgresql://Deepak@localhost:5432/marketsphere_test";

const name = new URL(url).pathname.replace(/^\//, "");
if (!name.endsWith("_test")) {
  console.error(
    `Refusing to migrate "${name}": the test setup only ever touches a database whose name ends in "_test".\n` +
      "Set TEST_DATABASE_URL to your test database and try again."
  );
  process.exit(1);
}

console.log(`Applying migrations to ${name}…`);
execFileSync("npx", ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: url },
});
