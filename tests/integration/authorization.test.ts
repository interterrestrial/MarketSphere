import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import app from "@/server/app";
import { signSession, SESSION_COOKIE } from "@/lib/session";
import { authenticate, requireRole } from "@/server/middleware/require-auth";
import { validate } from "@/server/middleware/validate";
import {
  createActiveBuyer,
  createAdmin,
  createApprovedSeller,
  createCategory,
  createProduct,
  createUser,
  resetDb,
} from "../helpers/db";
import { z } from "zod";

beforeEach(resetDb);
afterAll(async () => {
  await db.$disconnect();
});

/** Signs a real session cookie for a user, exactly as the login route does. */
async function cookieFor(userId: string, role: "BUYER" | "SELLER" | "ADMIN") {
  const token = await signSession({ sub: userId, role });
  return `${SESSION_COOKIE}=${token}`;
}

describe("session authentication over HTTP", () => {
  it("refuses an anonymous request to a protected route", async () => {
    const response = await request(app).get("/api/v1/orders");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("refuses a forged session cookie", async () => {
    const response = await request(app)
      .get("/api/v1/orders")
      .set("Cookie", `${SESSION_COOKIE}=not.a.real.token`);
    expect(response.status).toBe(401);
  });

  it("refuses a cookie for an account that has been suspended", async () => {
    // Suspension must take effect immediately, without waiting for expiry.
    const buyer = await createUser({ role: "BUYER", status: "SUSPENDED" });
    const cookie = await cookieFor(buyer.id, "BUYER");
    const response = await request(app).get("/api/v1/orders").set("Cookie", cookie);
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_INACTIVE");
  });

  it("lets an active buyer reach their own orders", async () => {
    const buyer = await createActiveBuyer();
    const cookie = await cookieFor(buyer.id, "BUYER");
    const response = await request(app).get("/api/v1/orders").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});

describe("role-based access control over HTTP", () => {
  it("stops a buyer from creating products", async () => {
    const buyer = await createActiveBuyer();
    const cookie = await cookieFor(buyer.id, "BUYER");
    const response = await request(app)
      .post("/api/v1/products")
      .set("Cookie", cookie)
      .send({ name: "Buyer listing", categoryId: (await createCategory()).id });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ROLE_FORBIDDEN");
  });

  it("stops a buyer from reading the admin surface", async () => {
    const buyer = await createActiveBuyer();
    const cookie = await cookieFor(buyer.id, "BUYER");
    for (const path of [
      "/api/v1/admin/stats",
      "/api/v1/admin/users",
      "/api/v1/admin/products",
      "/api/v1/admin/sellers",
      "/api/v1/admin/reports",
      "/api/v1/admin/audit",
    ]) {
      const response = await request(app).get(path).set("Cookie", cookie);
      expect(response.status, `${path} should be forbidden`).toBe(403);
    }
  });

  it("stops a seller from moderating their own listing into visibility", async () => {
    const seller = await createApprovedSeller();
    const product = await createProduct({ sellerId: seller.id });
    const cookie = await cookieFor(seller.id, "SELLER");
    const response = await request(app)
      .post(`/api/v1/admin/products/${product.id}/approve`)
      .set("Cookie", cookie)
      .send({});
    expect(response.status).toBe(403);
  });

  it("lets an administrator use the admin surface", async () => {
    const admin = await createAdmin();
    const cookie = await cookieFor(admin.id, "ADMIN");
    const response = await request(app).get("/api/v1/admin/stats").set("Cookie", cookie);
    expect(response.status).toBe(200);
    expect(response.body.data.users).toBeDefined();
  });

  it("stops a seller from submitting a listing before approval", async () => {
    // BR-02: drafts are allowed while pending, publication is not.
    const seller = await createUser({ role: "SELLER", status: "PENDING" });
    const product = await createProduct({ sellerId: seller.id, status: "DRAFT" });
    const cookie = await cookieFor(seller.id, "SELLER");

    const draftEdit = await request(app)
      .patch(`/api/v1/products/${product.id}`)
      .set("Cookie", cookie)
      .send({ name: "Prepared while pending" });
    expect(draftEdit.status).toBe(200);

    const publish = await request(app)
      .post(`/api/v1/products/${product.id}/publish`)
      .set("Cookie", cookie)
      .send({});
    expect(publish.status).toBe(403);
    expect(publish.body.error.code).toBe("ACCOUNT_PENDING");
  });
});

describe("product ownership", () => {
  it("does not let one seller edit, archive or delete another's listing", async () => {
    const owner = await createApprovedSeller();
    const intruder = await createApprovedSeller();
    const product = await createProduct({ sellerId: owner.id });
    const cookie = await cookieFor(intruder.id, "SELLER");

    // 404 rather than 403: the existence of another seller's listing is not
    // something this account may learn.
    for (const call of [
      request(app)
        .patch(`/api/v1/products/${product.id}`)
        .set("Cookie", cookie)
        .send({ name: "Hijacked" }),
      request(app).post(`/api/v1/products/${product.id}/archive`).set("Cookie", cookie).send({}),
      request(app).delete(`/api/v1/products/${product.id}`).set("Cookie", cookie),
    ]) {
      const response = await call;
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }

    const unchanged = await db.product.findUnique({ where: { id: product.id } });
    expect(unchanged?.name).toBe(product.name);
  });

  it("does not let a seller attach images or variants to another's listing", async () => {
    const owner = await createApprovedSeller();
    const intruder = await createApprovedSeller();
    const product = await createProduct({ sellerId: owner.id });
    const cookie = await cookieFor(intruder.id, "SELLER");

    const image = await request(app)
      .post(`/api/v1/products/${product.id}/images`)
      .set("Cookie", cookie)
      .send({ imageUrl: "https://cdn.example.com/x.jpg" });
    expect(image.status).toBe(404);

    const variant = await request(app)
      .post(`/api/v1/products/${product.id}/variants`)
      .set("Cookie", cookie)
      .send({ name: "size", value: "King" });
    expect(variant.status).toBe(404);

    expect(await db.productImage.count({ where: { productId: product.id } })).toBe(0);
    expect(await db.productVariant.count({ where: { productId: product.id } })).toBe(0);
  });

  it("does not let one seller read another seller's order", async () => {
    const owner = await createApprovedSeller();
    const intruder = await createApprovedSeller();
    const buyer = await createActiveBuyer();
    const product = await createProduct({ sellerId: owner.id });

    const buyerCookie = await cookieFor(buyer.id, "BUYER");
    const created = await request(app)
      .post("/api/v1/orders")
      .set("Cookie", buyerCookie)
      .send({
        items: [{ productId: product.id, quantity: 20 }],
        deliveryAddress: "Shop 4, Sector 18, Noida",
      });
    expect(created.status).toBe(201);

    const intruderCookie = await cookieFor(intruder.id, "SELLER");
    const peek = await request(app)
      .get(`/api/v1/orders/${created.body.data.id}`)
      .set("Cookie", intruderCookie);
    expect(peek.status).toBe(404);
  });
});

describe("product validation", () => {
  it("rejects an unusable product name", async () => {
    const seller = await createApprovedSeller();
    const cookie = await cookieFor(seller.id, "SELLER");
    const response = await request(app)
      .post("/api/v1/products")
      .set("Cookie", cookie)
      .send({ name: "AB", categoryId: (await createCategory()).id });
    expect(response.status).toBe(400);
    expect(response.body.error.details[0].path).toBe("name");
  });

  it("rejects a malformed price, a zero MOQ and an unknown id", async () => {
    const seller = await createApprovedSeller();
    const cookie = await cookieFor(seller.id, "SELLER");
    const response = await request(app).post("/api/v1/products").set("Cookie", cookie).send({
      name: "Bedsheet listing",
      indicativePrice: "free",
      minimumOrderQuantity: "0",
      categoryId: "not-a-uuid",
    });
    expect(response.status).toBe(400);
    const paths = response.body.error.details.map((d: { path: string }) => d.path);
    expect(paths).toContain("indicativePrice");
    expect(paths).toContain("minimumOrderQuantity");
    expect(paths).toContain("categoryId");
  });

  it("accepts a well-formed listing and stores it as a draft owned by the caller", async () => {
    const seller = await createApprovedSeller();
    const category = await createCategory();
    const cookie = await cookieFor(seller.id, "SELLER");
    const response = await request(app).post("/api/v1/products").set("Cookie", cookie).send({
      name: "Cotton Bedsheet King",
      categoryId: category.id,
      indicativePrice: "1250.00",
      minimumOrderQuantity: "25",
    });
    expect(response.status).toBe(201);
    expect(response.body.data.sellerId ?? undefined).toBeUndefined();
    expect(response.body.data.status).toBe("DRAFT");

    const stored = await db.product.findFirst({ where: { name: "Cotton Bedsheet King" } });
    expect(stored?.sellerId).toBe(seller.id);
    expect(stored?.indicativePrice?.toString()).toBe("1250");
  });

  it("never lets a client set the product status directly", async () => {
    const seller = await createApprovedSeller();
    const cookie = await cookieFor(seller.id, "SELLER");
    const response = await request(app)
      .post("/api/v1/products")
      .set("Cookie", cookie)
      .send({ name: "Sneaky listing", status: "ACTIVE" });
    // `status` is not part of the create schema, so it is stripped, not honoured.
    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("DRAFT");
  });

  it("only accepts http(s) image references", async () => {
    // A `javascript:` or `data:` URL stored here would be rendered back into
    // an <img src>, so the scheme has to be constrained at the boundary.
    const seller = await createApprovedSeller();
    const cookie = await cookieFor(seller.id, "SELLER");
    const product = await createProduct({ sellerId: seller.id });

    for (const imageUrl of [
      "javascript:alert(document.cookie)",
      "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
      "file:///etc/passwd",
    ]) {
      const response = await request(app)
        .post(`/api/v1/products/${product.id}/images`)
        .set("Cookie", cookie)
        .send({ imageUrl });
      expect(response.status, `${imageUrl} must be rejected`).toBe(400);
    }

    const allowed = await request(app)
      .post(`/api/v1/products/${product.id}/images`)
      .set("Cookie", cookie)
      .send({ imageUrl: "https://cdn.example.com/bed.jpg" });
    expect(allowed.status).toBe(201);
  });
});

describe("validation middleware", () => {
  it("replaces the payload with parsed, coerced values", async () => {
    // Coercion must happen server-side, not be trusted from the client.
    const handler = validate({
      query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    });
    const req = { query: { page: "3" }, body: {}, params: {} } as never;
    let ran = false;
    handler(req, {} as never, () => {
      ran = true;
    });
    expect(ran).toBe(true);
    expect((req as unknown as { query: { page: number } }).query.page).toBe(3);
  });

  it("does not call next when the payload is invalid", async () => {
    const handler = validate({ body: z.object({ name: z.string().min(3) }) });
    let ran = false;
    expect(() =>
      handler({ query: {}, body: { name: "ab" }, params: {} } as never, {} as never, () => {
        ran = true;
      })
    ).toThrow();
    expect(ran).toBe(false);
  });
});

describe("middleware composition", () => {
  it("requires a session before checking a role", async () => {
    // Order matters: requireRole alone must not grant access.
    const req = { query: {}, body: {}, params: {}, headers: {} } as never;

    const forwarded: unknown[] = [];
    requireRole("ADMIN")(req, {} as never, (error?: unknown) => forwarded.push(error));
    expect(forwarded).toHaveLength(1);
    expect(forwarded[0]).toMatchObject({ code: "UNAUTHENTICATED" });

    const authErrors: unknown[] = [];
    authenticate(req, {} as never, (error?: unknown) => authErrors.push(error));
    await new Promise((resolve) => setImmediate(resolve));
    expect(authErrors).toHaveLength(1);
    expect(authErrors[0]).toMatchObject({ code: "UNAUTHENTICATED" });
  });
});
