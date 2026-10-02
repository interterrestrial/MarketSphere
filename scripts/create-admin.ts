// Creates (or confirms) an administrator account. Admins are never
// self-registered; run out-of-band:
//
//   ADMIN_NAME="Ops" ADMIN_EMAIL="admin@example.com" ADMIN_PASSWORD="…" npm run admin:create
import "dotenv/config";
import { hashPassword } from "../src/lib/password";
import { db } from "../src/lib/db";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing ${name}. Example:`);
    console.error(`  ${name}=… npm run admin:create`);
    process.exit(1);
  }
  return value;
}

async function main(): Promise<void> {
  const name = process.env["ADMIN_NAME"] ?? "Administrator";
  const email = required("ADMIN_EMAIL").trim().toLowerCase();
  const password = required("ADMIN_PASSWORD");
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters.");
    process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email} (${existing.status})`);
    return;
  }
  const admin = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      role: "ADMIN",
      status: "ACTIVE",
    },
  });
  console.log(`Admin created: ${admin.email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
