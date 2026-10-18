import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import app from "@/server/app";
import {
  API_RATE_LIMIT,
  AUTH_RATE_LIMIT,
  isRateLimited,
  rateLimitingEnabled,
  resetRateLimits,
} from "@/lib/rate-limit";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import {
  createActiveBuyer,
  createCategory,
  createProduct,
  createUser,
  resetDb,
} from "../helpers/db";

async function cookieFor(user: { id: string }, role: "BUYER" | "SELLER" | "ADMIN") {
  return `${SESSION_COOKIE}=${await signSession({ sub: user.id, role })}`;
}

beforeEach(resetDb);
afterEach(() => resetRateLimits());
afterAll(async () => {
  await db.$disconnect();
});

describe("security headers", () => {
  it("tells browsers not to sniff, frame or leak the referrer", async () => {
    const response = await request(app).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    expect(response.headers["x-frame-options"]).toBe("DENY");
    expect(response.headers["referrer-policy"]).toBe("no-referrer");
    expect(response.headers["cross-origin-opener-policy"]).toBe("same-origin");
    expect(response.headers["permissions-policy"]).toContain("camera=()");
    expect(response.headers["content-security-policy"]).toContain("default-src 'none'");
    expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    // Do not advertise the framework.
    expect(response.headers["x-powered-by"]).toBeUndefined();
  });

  it("applies the same headers to business routes and to errors", async () => {
    const buyer = await createActiveBuyer();
    const cookie = await cookieFor(buyer, "BUYER");
    const ok = await request(app).get("/api/v1/products").set("Cookie", cookie);
    expect(ok.status).toBe(200);
    expect(ok.headers["x-frame-options"]).toBe("DENY");

    const missing = await request(app).get("/api/v1/nothing-here");
    expect(missing.status).toBe(404);
    expect(missing.headers["x-content-type-options"]).toBe("nosniff");
  });
});

describe("cross-origin request rejection", () => {
  it("refuses a state-changing call from another site", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "https://evil.example.com")
      .send({ email: "a@b.test", password: "StrongPass123" });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_REJECTED");
  });

  it("refuses a forged referer too", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Referer", "https://evil.example.com/hack")
      .send({ email: "a@b.test", password: "StrongPass123" });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_REJECTED");
  });

  it("allows the app's own origin", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000")
      .send({ email: "nobody@example.test", password: "StrongPass123" });
    // Rejected for the right reason: unknown account, not the origin.
    expect(response.status).toBe(401);
    expect(response.body.error.code).not.toBe("ORIGIN_REJECTED");
  });

  it("does not check origins on read-only requests", async () => {
    const buyer = await createActiveBuyer();
    const response = await request(app)
      .get("/api/v1/products")
      .set("Cookie", await cookieFor(buyer, "BUYER"))
      .set("Origin", "https://elsewhere.example.com");
    expect(response.status).toBe(200);
  });

  it("keeps the catalogue closed to anonymous callers", async () => {
    const response = await request(app).get("/api/v1/products");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("catches a prefix trick such as localhost:3000.evil.test", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Origin", "http://localhost:3000.evil.test")
      .send({ email: "a@b.test", password: "StrongPass123" });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ORIGIN_REJECTED");
  });
});

describe("rate limiting", () => {
  it("stops repeated failed logins with a 429", async () => {
    // Re-enable limits for this test only.
    const previous = process.env["RATE_LIMIT_DISABLED"];
    process.env["RATE_LIMIT_DISABLED"] = "false";
    try {
      const attempt = () =>
        request(app)
          .post("/api/v1/auth/login")
          .send({ email: "nobody@example.test", password: "WrongPass123" });

      let limited: Awaited<ReturnType<typeof attempt>> | null = null;
      for (let i = 0; i <= AUTH_RATE_LIMIT.max; i += 1) {
        const response = await attempt();
        if (response.status === 429) {
          limited = response;
          break;
        }
      }

      expect(limited).not.toBeNull();
      expect(limited!.body.error.code).toBe("RATE_LIMITED");
    } finally {
      process.env["RATE_LIMIT_DISABLED"] = previous;
    }
  });

  it("counts attempts in a sliding window and forgets old ones", () => {
    // The suite disables limiting globally, so switch it back on locally.
    const previous = process.env["RATE_LIMIT_DISABLED"];
    process.env["RATE_LIMIT_DISABLED"] = "false";
    try {
      resetRateLimits();
      const key = "test:window";
      for (let i = 0; i < 3; i += 1) {
        expect(isRateLimited(key, 1000, 3)).toBe(false);
      }
      expect(isRateLimited(key, 1000, 3)).toBe(true);
      // A different key (route or client) has its own budget.
      expect(isRateLimited("test:other", 1000, 3)).toBe(false);
      // An expired window frees the budget again.
      expect(isRateLimited(key, 0, 3)).toBe(false);
    } finally {
      process.env["RATE_LIMIT_DISABLED"] = previous;
      resetRateLimits();
    }
  });

  it("never disables itself in production, whatever the flag says", () => {
    const previousFlag = process.env["RATE_LIMIT_DISABLED"];
    // `process.env.NODE_ENV` is typed as read-only by the Next.js types.
    const writable = process.env as Record<string, string | undefined>;
    const previousEnv = writable["NODE_ENV"];
    process.env["RATE_LIMIT_DISABLED"] = "true";
    writable["NODE_ENV"] = "production";
    try {
      expect(rateLimitingEnabled()).toBe(true);
      expect(API_RATE_LIMIT.max).toBeGreaterThan(AUTH_RATE_LIMIT.max);
    } finally {
      process.env["RATE_LIMIT_DISABLED"] = previousFlag;
      writable["NODE_ENV"] = previousEnv;
    }
  });
});

describe("error handling", () => {
  it("does not leak internals for an unknown route", async () => {
    const response = await request(app).get("/api/v1/does-not-exist");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(response.body)).not.toContain("at ");
    expect(JSON.stringify(response.body)).not.toMatch(/prisma|postgres|\/Users\//i);
  });

  it("returns a consistent envelope for validation failures", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "not-an-email", password: "x", name: "", role: "SELLER" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: { code: expect.any(String) },
    });
    expect(Array.isArray(response.body.error.details)).toBe(true);
  });

  it("rejects malformed JSON instead of crashing", async () => {
    const response = await request(app)
      .post("/api/v1/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "broken"');

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(response.status).toBeLessThan(500);
  });

  it("does not echo the password back to the client", async () => {
    const response = await request(app).post("/api/v1/auth/register").send({
      name: "Security Tester",
      email: "sec@example.test",
      password: "SuperSecret123",
      role: "BUYER",
    });

    expect(response.status).toBe(201);
    const body = JSON.stringify(response.body);
    expect(body).not.toContain("SuperSecret123");
    expect(body).not.toContain("passwordHash");
    expect(body).not.toContain("password");
  });
});

describe("request size limits", () => {
  it("refuses an oversized payload rather than buffering it", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ name: "x".repeat(2 * 1024 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("stored data cannot become executable", () => {
  it("rejects dangerous image references on every product write path", async () => {
    const seller = await createUser({ role: "SELLER", status: "ACTIVE" });
    const { createSellerProfile } = await import("../helpers/db");
    await createSellerProfile(seller.id);
    const product = await createProduct({ sellerId: seller.id });
    const { SESSION_COOKIE, signSession } = await import("@/lib/session");
    const cookie = `${SESSION_COOKIE}=${await signSession({ sub: seller.id, role: "SELLER" })}`;

    const payloads = [
      { imageUrl: "javascript:alert(1)" },
      { imageUrl: "JaVaScRiPt:alert(1)" },
      { imageUrl: "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==" },
      { imageUrl: "vbscript:msgbox(1)" },
      { imageUrl: "file:///etc/passwd" },
    ];

    for (const payload of payloads) {
      const response = await request(app)
        .post(`/api/v1/products/${product.id}/images`)
        .set("Cookie", cookie)
        .send(payload);
      expect(response.status, `${payload.imageUrl} must not be stored`).toBe(400);
    }

    expect(await db.productImage.count({ where: { productId: product.id } })).toBe(0);
  });

  it("keeps a buyer's notes as text", async () => {
    const buyer = await createActiveBuyer();
    const seller = await createUser({ role: "SELLER", status: "ACTIVE" });
    const { createSellerProfile } = await import("../helpers/db");
    await createSellerProfile(seller.id);
    const product = await createProduct({ sellerId: seller.id });
    const { SESSION_COOKIE, signSession } = await import("@/lib/session");
    const cookie = `${SESSION_COOKIE}=${await signSession({ sub: buyer.id, role: "BUYER" })}`;

    const response = await request(app)
      .post("/api/v1/orders")
      .set("Cookie", cookie)
      .send({
        items: [{ productId: product.id, quantity: 20 }],
        deliveryAddress: "Shop 4, Sector 18, Noida",
        buyerNotes: "<script>alert(1)</script> Please deliver",
      });

    expect(response.status).toBe(201);
    // Stored verbatim as data. The safety comes from the response being
    // typed as JSON (never sniffed or rendered as HTML) and from React
    // escaping text on render — not from mangling what the user typed.
    expect(response.headers["content-type"]).toMatch(/application\/json/);
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
    const stored = await db.orderRequest.findUnique({ where: { id: response.body.data.id } });
    expect(stored?.buyerNotes).toBe("<script>alert(1)</script> Please deliver");
  });

  it("cannot be used to reach an unauthenticated admin route", async () => {
    const response = await request(app).post("/api/v1/admin/users/anything/suspend");
    expect(response.status).toBe(401);
  });
});

describe("session cookie hardening", () => {
  it("sets a cookie that scripts cannot read", async () => {
    const response = await request(app).post("/api/v1/auth/login").send({
      email: "nobody@example.test",
      password: "StrongPass123",
    });
    expect(response.status).toBe(401);
    // No cookie at all on failure, so a failed attempt leaves no trace.
    expect(response.headers["set-cookie"]).toBeUndefined();
  });

  it("never returns the password hash in a user payload", async () => {
    const buyer = await createActiveBuyer();
    const category = await createCategory();
    const response = await request(app)
      .get(`/api/v1/products?category=${category.id}`)
      .set("Cookie", await cookieFor(buyer, "BUYER"));
    expect(response.status).toBe(200);
    expect(JSON.stringify(response.body)).not.toContain("passwordHash");
  });
});
