import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import {
  SESSION_COOKIE,
  expressSessionCookieOptions,
  sessionCookieOptions,
  signSession,
  verifySession,
} from "@/lib/session";
import { authenticateUser, registerUser } from "@/server/services/auth.service";
import { resetDb } from "../helpers/db";

beforeEach(resetDb);
afterAll(async () => {
  await db.$disconnect();
});

describe("password storage", () => {
  it("never stores the password itself", async () => {
    const hash = await hashPassword("CorrectHorseBattery9");
    expect(hash).not.toContain("CorrectHorseBattery9");
  });

  it("salts every hash so identical passwords differ", async () => {
    const [a, b] = await Promise.all([
      hashPassword("SamePassword123"),
      hashPassword("SamePassword123"),
    ]);
    expect(a).not.toBe(b);
  });

  it("uses bcrypt (cost 12) rather than a fast hash", async () => {
    const hash = await hashPassword("AnotherPass123");
    expect(hash.startsWith("$2")).toBe(true);
    // "$2<variant>$<cost>$" — the third field is the work factor.
    expect(Number(hash.split("$")[2])).toBe(12);
  });

  it("verifies the right password and rejects the wrong one", async () => {
    const hash = await hashPassword("CorrectHorseBattery9");
    await expect(verifyPassword("CorrectHorseBattery9", hash)).resolves.toBe(true);
    await expect(verifyPassword("correcthorsebattery9", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });
});

describe("session tokens", () => {
  const user = { sub: "c0ffee00-0000-4000-8000-000000000000", role: "BUYER" } as const;

  it("round-trips a session", async () => {
    const token = await signSession(user);
    const payload = await verifySession(token);
    expect(payload).toEqual(user);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(user);
    const [header, payload, signature] = token.split(".");
    const forged = `${header}.${payload}.${signature.slice(0, -2)}xx`;
    await expect(verifySession(forged)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    // `env` is captured once at boot (rotating the secret needs a restart),
    // so forge the token with the wrong key directly.
    const { SignJWT } = await import("jose");
    const forged = await new SignJWT({ role: user.role })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.sub)
      .setIssuedAt()
      .setExpirationTime("1h")
      .sign(new TextEncoder().encode("a-completely-different-secret-value-32b"));
    await expect(verifySession(forged)).resolves.toBeNull();
  });

  it("rejects a token with no role claim", async () => {
    // `verifySession` is defensive: a role-less token must not authorise.
    const token = await signSession(user);
    const [, payload] = token.split(".");
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString());
    delete decoded.role;
    const rebuilt = `${token.split(".")[0]}.${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${token.split(".")[2]}`;
    await expect(verifySession(rebuilt)).resolves.toBeNull();
  });

  it("refuses to verify garbage", async () => {
    await expect(verifySession("not-a-token")).resolves.toBeNull();
    await expect(verifySession("")).resolves.toBeNull();
  });
});

describe("session cookie attributes", () => {
  it("keeps the token out of JavaScript and cross-site requests", () => {
    const options = sessionCookieOptions();
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  it("express gets milliseconds, Next.js gets seconds", () => {
    // This mismatch silently shortened sessions from 7 days to 10 minutes.
    expect(sessionCookieOptions().maxAge).toBe(604_800);
    expect(expressSessionCookieOptions().maxAge).toBe(604_800_000);
  });

  it("names the cookie predictably so logout can clear it", () => {
    expect(SESSION_COOKIE).toBe("ms_session");
  });
});

describe("registration", () => {
  const base = { name: "Asha", email: "asha@example.test", password: "StrongPass123" };

  it("activates buyers immediately", async () => {
    const user = await registerUser({ ...base, role: "BUYER" });
    expect(user.status).toBe("ACTIVE");
  });

  it("holds sellers pending until an administrator approves them", async () => {
    const user = await registerUser({ ...base, role: "SELLER" });
    expect(user.status).toBe("PENDING");
  });

  it("never returns the password hash", async () => {
    const user = await registerUser({ ...base, role: "BUYER" });
    expect(user).not.toHaveProperty("passwordHash");
  });

  it("stores emails lower-cased so casing cannot split one account in two", async () => {
    const user = await registerUser({
      ...base,
      email: "  Mixed.Case@Example.test ",
      role: "BUYER",
    });
    expect(user.email).toBe("mixed.case@example.test");
    await expect(
      registerUser({ ...base, email: "mixed.case@example.test", role: "BUYER" })
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("refuses a duplicate that bypassed the application, at the database", async () => {
    // Defence in depth: the functional unique index catches case variants
    // even if a future code path forgets to normalise.
    await registerUser({ ...base, email: "db.level@example.test", role: "BUYER" });
    await expect(
      db.user.create({
        data: {
          name: "Impostor",
          email: "DB.Level@Example.test",
          passwordHash: "x",
          role: "BUYER",
          status: "ACTIVE",
        },
      })
    ).rejects.toThrow();
  });
});

describe("login", () => {
  beforeEach(async () => {
    await registerUser({
      name: "Buyer",
      email: "buyer@example.test",
      password: "StrongPass123",
      role: "BUYER",
    });
  });

  it("accepts correct credentials", async () => {
    const user = await authenticateUser({
      email: "buyer@example.test",
      password: "StrongPass123",
    });
    expect(user.email).toBe("buyer@example.test");
  });

  it("gives the same answer for a wrong password and an unknown account", async () => {
    // Avoids telling an attacker which emails are registered.
    const wrongPassword = await authenticateUser({
      email: "buyer@example.test",
      password: "WrongPass123",
    }).catch((error: unknown) => error as { code: string });
    const unknownUser = await authenticateUser({
      email: "nobody@example.test",
      password: "StrongPass123",
    }).catch((error: unknown) => error as { code: string });

    expect(wrongPassword).toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(unknownUser).toMatchObject({ code: "INVALID_CREDENTIALS" });
  });

  it("lets a pending seller sign in so onboarding can be finished", async () => {
    await registerUser({
      name: "Seller",
      email: "seller@example.test",
      password: "StrongPass123",
      role: "SELLER",
    });
    const user = await authenticateUser({
      email: "seller@example.test",
      password: "StrongPass123",
    });
    // Access to business operations is gated separately by
    // `requireActiveAccount` (see authorization.test.ts).
    expect(user.status).toBe("PENDING");
  });

  it("refuses a suspended account", async () => {
    await registerUser({
      name: "Suspended",
      email: "suspended@example.test",
      password: "StrongPass123",
      role: "BUYER",
    });
    await db.user.update({
      where: { email: "suspended@example.test" },
      data: { status: "SUSPENDED" },
    });
    await expect(
      authenticateUser({ email: "suspended@example.test", password: "StrongPass123" })
    ).rejects.toMatchObject({ code: "ACCOUNT_INACTIVE" });
  });
});
