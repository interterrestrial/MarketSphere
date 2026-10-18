import { db } from "@/lib/db";
import type { BusinessProfile, Notification, OrderRequest, Product, User } from "@prisma/client";

/**
 * Test data helpers.
 *
 * Every integration test starts from `resetDb()` so business-rule tests
 * cannot pass or fail because of leftovers from a previous test.
 */

export async function resetDb(): Promise<void> {
  // TRUNCATE ... CASCADE wipes every table regardless of FK order.
  await db.$executeRawUnsafe(`
    TRUNCATE TABLE
      "audit_logs",
      "order_status_history",
      "order_items",
      "order_requests",
      "notifications",
      "reports",
      "product_images",
      "product_variants",
      "products",
      "categories",
      "business_profiles",
      "users"
    RESTART IDENTITY CASCADE
  `);
}

export interface UserOptions {
  role?: "BUYER" | "SELLER" | "ADMIN";
  status?: "PENDING" | "ACTIVE" | "REJECTED" | "SUSPENDED";
  name?: string;
  email?: string;
  phone?: string | null;
  password?: string;
}

let counter = 0;

export async function createUser(options: UserOptions = {}): Promise<User> {
  counter += 1;
  const role = options.role ?? "BUYER";
  return db.user.create({
    data: {
      name: options.name ?? `Test ${role} ${counter}`,
      email: options.email ?? `user-${counter}-${Date.now()}@example.test`,
      phone: options.phone ?? null,
      // Deliberately not a real hash: tests that care about hashing assert on
      // the hashPassword helper itself, not on these fixtures.
      passwordHash: options.password ?? "test-password-hash",
      role,
      status: options.status ?? "ACTIVE",
    },
  });
}

export async function createSellerProfile(
  userId: string,
  overrides: Partial<BusinessProfile> = {}
): Promise<BusinessProfile> {
  return db.businessProfile.create({
    data: {
      userId,
      businessName: overrides.businessName ?? `Test Textiles ${counter}`,
      businessType: overrides.businessType ?? "MANUFACTURER",
      description: overrides.description ?? "Home textile manufacturer.",
      address: overrides.address ?? "Plot 1, Industrial Area",
      city: overrides.city ?? "Sonipat",
      state: overrides.state ?? "Haryana",
      pincode: overrides.pincode ?? "131001",
      contactName: overrides.contactName ?? "Test Contact",
      contactPhone: overrides.contactPhone ?? "+91 98765 43210",
      serviceArea: overrides.serviceArea ?? "Delhi-NCR",
      verificationStatus: overrides.verificationStatus ?? "APPROVED",
    },
  });
}

export interface ProductOptions {
  sellerId: string;
  categoryId?: string | null;
  name?: string;
  status?: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "REJECTED" | "INACTIVE";
  indicativePrice?: string | null;
  minimumOrderQuantity?: number | null;
  isAvailable?: boolean;
}

export async function createProduct(options: ProductOptions): Promise<Product> {
  counter += 1;
  return db.product.create({
    data: {
      sellerId: options.sellerId,
      categoryId: options.categoryId ?? null,
      name: options.name ?? `Test Product ${counter}`,
      description: "A test listing.",
      indicativePrice: options.indicativePrice === undefined ? "1000.00" : options.indicativePrice,
      minimumOrderQuantity:
        options.minimumOrderQuantity === undefined ? 10 : options.minimumOrderQuantity,
      isAvailable: options.isAvailable ?? true,
      status: options.status ?? "ACTIVE",
    },
  });
}

export async function createCategory(name = `Category ${Date.now()}`): Promise<{ id: string }> {
  counter += 1;
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${counter}`;
  return db.category.create({ data: { name, slug } });
}

/** A fully set-up seller: ACTIVE account, approved profile. */
export async function createApprovedSeller(): Promise<User> {
  const seller = await createUser({ role: "SELLER", status: "ACTIVE" });
  await createSellerProfile(seller.id);
  return seller;
}

/** A fully set-up buyer: ACTIVE account with a delivery address on file. */
export async function createActiveBuyer(): Promise<User> {
  const buyer = await createUser({ role: "BUYER", status: "ACTIVE" });
  await createSellerProfile(buyer.id, { businessType: "RETAILER", city: "Noida" });
  return buyer;
}

export async function createAdmin(): Promise<User> {
  return createUser({ role: "ADMIN", status: "ACTIVE" });
}

export type { Notification, OrderRequest, Product, User };
