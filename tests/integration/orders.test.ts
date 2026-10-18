import { afterAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { db } from "@/lib/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";
import app from "@/server/app";
import {
  getPlatformStats,
} from "@/server/services/admin-stats.service";
import {
  acceptProposal,
  cancelOrderRequest,
  declineProposal,
} from "@/server/services/order-buyer.service";
import {
  acceptOrderRequest,
  completeOrderRequest,
  proposeOrderChanges,
  rejectOrderRequest,
  sendProposalToBuyer,
} from "@/server/services/order-seller.service";
import {
  getOrderRequest,
  listOrderRequests,
  submitOrderRequest,
} from "@/server/services/order.service";
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from "@/server/services/notification.service";
import { getVisibleProduct, searchProducts } from "@/server/services/product-search.service";
import { getActiveSessionUser } from "@/server/services/auth.service";
import {
  createActiveBuyer,
  createAdmin,
  createApprovedSeller,
  createProduct,
  createUser,
  resetDb,
} from "../helpers/db";

/** Factory rows are structurally identical to the public auth user shape. */
const ADDRESS = "Shop 4, Sector 18, Noida";

beforeEach(resetDb);
afterAll(async () => {
  await db.$disconnect();
});

async function cookieFor(userId: string, role: "BUYER" | "SELLER" | "ADMIN") {
  return `${SESSION_COOKIE}=${await signSession({ sub: userId, role })}`;
}

/** A seller with an approved profile, an active buyer, and one live listing. */
async function scenario(
  options: { moq?: number | null; available?: boolean; status?: "ACTIVE" | "DRAFT" } = {}
) {
  const seller = await createApprovedSeller();
  const buyer = await createActiveBuyer();
  const product = await createProduct({
    sellerId: seller.id,
    minimumOrderQuantity: options.moq === undefined ? 10 : options.moq,
    isAvailable: options.available ?? true,
    status: options.status ?? "ACTIVE",
  });
  return { seller, buyer, product };
}

async function placeRequest(
  buyer: Awaited<ReturnType<typeof createActiveBuyer>>,
  product: { id: string },
  quantity = 20
) {
  return submitOrderRequest(buyer, {
    items: [{ productId: product.id, quantity }],
    deliveryAddress: ADDRESS,
  });
}

describe("order request creation", () => {
  it("starts as a request pending the seller, never as a confirmed order", async () => {
    // BR-04: submitting a request is not accepting an order.
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);

    expect(order.status).toBe("PENDING_SELLER");
    expect(order.statusLabel).toBe("Pending seller response");
    expect(order.confirmed).toBe(false);
    expect(order.agreedTotal).toBeNull();
    expect(order.proposedTotal).toBeNull();
    expect(order.seller.id).toBe(seller.id);
    expect(order.buyer.id).toBe(buyer.id);
    expect(order.reference).toMatch(/^REQ-[A-Z0-9]{6}$/);
    expect(order.history).toHaveLength(1);
    expect(order.history[0]!.previousStatus).toBeNull();
    expect(order.history[0]!.newStatus).toBe("PENDING_SELLER");
  });

  it("refuses a quantity below the seller's minimum", async () => {
    // BR-07.
    const { buyer, product } = await scenario({ moq: 25 });
    await expect(placeRequest(buyer, product, 10)).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: [{ path: "items.0.quantity" }],
    });
  });

  it("accepts any quantity when the seller set no minimum", async () => {
    const { buyer, product } = await scenario({ moq: null });
    const order = await placeRequest(buyer, product, 1);
    expect(order.items[0]!.quantity).toBe(1);
  });

  it("refuses a listing the seller has closed", async () => {
    const { buyer, product } = await scenario({ available: false });
    await expect(placeRequest(buyer, product)).rejects.toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
    });
  });

  it("refuses a listing that is not live", async () => {
    const { buyer, product } = await scenario({ status: "DRAFT" });
    await expect(placeRequest(buyer, product)).rejects.toMatchObject({
      code: "PRODUCT_UNAVAILABLE",
    });
  });

  it("refuses a basket spanning two sellers", async () => {
    const { buyer, product } = await scenario();
    const other = await createApprovedSeller();
    const otherProduct = await createProduct({ sellerId: other.id });
    await expect(
      submitOrderRequest(buyer, {
        items: [
          { productId: product.id, quantity: 20 },
          { productId: otherProduct.id, quantity: 20 },
        ],
        deliveryAddress: ADDRESS,
      })
    ).rejects.toMatchObject({ code: "ONE_SELLER_PER_REQUEST" });
  });

  it("refuses a variant the listing does not offer", async () => {
    const { buyer, product } = await scenario();
    await expect(
      submitOrderRequest(buyer, {
        items: [{ productId: product.id, quantity: 20, variantLabel: "size: Emperor" }],
        deliveryAddress: ADDRESS,
      })
    ).rejects.toMatchObject({
      code: "VALIDATION_ERROR",
      details: [{ path: "items.0.variantLabel" }],
    });
  });

  it("refuses requests to a seller who is not trading", async () => {
    const pending = await createUser({ role: "SELLER", status: "PENDING" });
    const product = await createProduct({ sellerId: pending.id });
    const buyer = await createActiveBuyer();
    await expect(placeRequest(buyer, product)).rejects.toMatchObject({
      code: "SELLER_UNAVAILABLE",
    });
  });

  it("freezes the product name so later edits cannot rewrite history", async () => {
    // BR-08.
    const { buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await db.product.update({ where: { id: product.id }, data: { name: "Renamed listing" } });

    const reloaded = await getOrderRequest(buyer, order.id);
    expect(reloaded.items[0]!.productName).toBe(order.items[0]!.productName);
    expect(reloaded.items[0]!.productActive).toBe(true);
  });

  it("ignores totals and prices supplied by the client", async () => {
    const { buyer, product } = await scenario();
    const order = await submitOrderRequest(buyer, {
      items: [{ productId: product.id, quantity: 20, requestedUnitPrice: "1.00" }],
      deliveryAddress: ADDRESS,
      // Not part of the schema; nothing client-supplied may set a price.
      agreedTotal: "1.00",
    } as never);

    expect(order.agreedTotal).toBeNull();
    // The buyer's hint is stored as given (Prisma normalises "1.00" to "1"),
    // but it stays a hint: it is never treated as an agreed price.
    expect(order.items[0]!.requestedUnitPrice).toBe("1");
    expect(order.items[0]!.agreedUnitPrice).toBeNull();
    expect(order.confirmed).toBe(false);
  });

  it("stops a seller from submitting a request over HTTP", async () => {
    const { seller, product } = await scenario();
    const response = await request(app)
      .post("/api/v1/orders")
      .set("Cookie", await cookieFor(seller.id, "SELLER"))
      .send({ items: [{ productId: product.id, quantity: 20 }], deliveryAddress: ADDRESS });
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ROLE_FORBIDDEN");
  });
});

describe("seller confirmation", () => {
  it("accepts with a final price per line and totals it server-side", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product, 20);
    const accepted = await acceptOrderRequest(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
      note: "Confirmed at 950.",
    });

    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.confirmed).toBe(true);
    // 20 x 950, calculated on the server from the confirmed quantity.
    expect(accepted.agreedTotal).toBe("19000");
    expect(accepted.items[0]!.agreedUnitPrice).toBe("950");
    expect(accepted.history.at(-1)!.previousStatus).toBe("PENDING_SELLER");
    expect(accepted.history.at(-1)!.note).toBe("Confirmed at 950.");
  });

  it("insists on a confirmed price for every line", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await expect(
      acceptOrderRequest(seller, order.id, { items: [] })
    ).rejects.toMatchObject({ code: "PRICE_REQUIRED" });
  });

  it("rejects a price for a line that is not part of the request", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await expect(
      acceptOrderRequest(seller, order.id, {
        items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }, {
          itemId: "00000000-0000-4000-8000-000000000000",
          agreedUnitPrice: "1.00",
        }],
      })
    ).rejects.toMatchObject({ code: "INVALID_ITEM" });
  });

  it("re-checks availability at confirmation time", async () => {
    // BR-09: availability is seller-provided, so it is re-read on accept.
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await db.product.update({ where: { id: product.id }, data: { status: "INACTIVE" } });

    await expect(
      acceptOrderRequest(seller, order.id, {
        items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
      })
    ).rejects.toMatchObject({ code: "PRODUCT_UNAVAILABLE" });
  });

  it("closes the request permanently once the seller rejects it", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    const rejected = await rejectOrderRequest(seller, order.id, "Material unavailable.");
    expect(rejected.status).toBe("REJECTED");

    await expect(
      acceptOrderRequest(seller, order.id, {
        items: [{ itemId: rejected.items[0]!.id, agreedUnitPrice: "950.00" }],
      })
    ).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    await expect(cancelOrderRequest(buyer, order.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });
});

describe("proposed changes", () => {
  async function drafted() {
    const base = await scenario();
    const order = await placeRequest(base.buyer, base.product, 40);
    const proposed = await proposeOrderChanges(base.seller, order.id, {
      items: [
        { itemId: order.items[0]!.id, proposedQuantity: 30, proposedUnitPrice: "950.00" },
      ],
      note: "Only 30 units from this lot.",
    });
    return { ...base, order, proposed };
  }

  it("keeps a draft proposal private to the seller", async () => {
    // FR-33: figures can be corrected before the buyer ever sees them.
    const { seller, buyer, order, proposed } = await drafted();
    expect(proposed.status).toBe("SELLER_PROPOSED");
    expect(proposed.proposedTotal).toBe("28500");

    const buyerView = await getOrderRequest(buyer, order.id);
    expect(buyerView.items[0]!.proposedQuantity).toBeNull();
    expect(buyerView.items[0]!.proposedUnitPrice).toBeNull();
    expect(buyerView.items[0]!.effectiveQuantity).toBe(40);
    expect(buyerView.proposedTotal).toBeNull();
    expect(buyerView.proposalNote).toBeNull();
    expect(buyerView.confirmed).toBe(false);

    const sellerView = await getOrderRequest(seller, order.id);
    expect(sellerView.items[0]!.proposedQuantity).toBe(30);
  });

  it("reveals the terms once the seller sends them", async () => {
    const { seller, buyer, order } = await drafted();
    const sent = await sendProposalToBuyer(seller, order.id);
    expect(sent.status).toBe("AWAITING_BUYER");

    const buyerView = await getOrderRequest(buyer, order.id);
    expect(buyerView.items[0]!.proposedQuantity).toBe(30);
    expect(buyerView.items[0]!.proposedUnitPrice).toBe("950");
    expect(buyerView.items[0]!.effectiveQuantity).toBe(30);
    expect(buyerView.proposedTotal).toBe("28500");
    expect(buyerView.proposalNote).toBe("Only 30 units from this lot.");
    expect(buyerView.confirmed).toBe(false);
  });

  it("turns proposed terms into agreed terms only on the buyer's acceptance", async () => {
    // FR-34 / BR-05.
    const { seller, buyer, order } = await drafted();
    await sendProposalToBuyer(seller, order.id);
    const accepted = await acceptProposal(buyer, order.id);

    expect(accepted.status).toBe("ACCEPTED");
    expect(accepted.confirmed).toBe(true);
    expect(accepted.agreedTotal).toBe("28500");
    expect(accepted.items[0]!.quantity).toBe(30);
    expect(accepted.items[0]!.agreedUnitPrice).toBe("950");
    // The buyer's original ask is preserved as the request, not overwritten.
    expect(accepted.proposedQuantity).toBeUndefined();
    expect(accepted.items[0]!.proposedQuantity).toBeNull();
  });

  it("will not accept terms the seller never sent", async () => {
    const { buyer, order } = await drafted();
    await expect(acceptProposal(buyer, order.id)).rejects.toMatchObject({ code: "NO_PROPOSAL" });
  });

  it("will not send a proposal that was never written", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await expect(sendProposalToBuyer(seller, order.id)).rejects.toMatchObject({
      code: "NO_PROPOSAL",
    });
  });

  it("rejects the negotiation when the buyer declines", async () => {
    const { seller, buyer, order } = await drafted();
    await sendProposalToBuyer(seller, order.id);
    const declined = await declineProposal(buyer, order.id, "Price is too high.");
    expect(declined.status).toBe("REJECTED");
    expect(declined.confirmed).toBe(false);
  });

  it("keeps the seller from responding to their own buyer's request", async () => {
    const { buyer, product, seller } = await scenario();
    const order = await placeRequest(buyer, product);
    const otherSeller = await createApprovedSeller();
    await expect(
      acceptOrderRequest(otherSeller, order.id, {
        items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "1.00" }],
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(seller.id).not.toBe(otherSeller.id);
  });
});

describe("cancelling and completing", () => {
  it("lets the buyer cancel at any point before terms are agreed", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product, 40);
    await proposeOrderChanges(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, proposedUnitPrice: "900.00" }],
    });
    const cancelled = await cancelOrderRequest(buyer, order.id, "Found locally.");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.confirmed).toBe(false);
  });

  it("will not let the buyer cancel after terms are agreed", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    const accepted = await acceptOrderRequest(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
    });
    await expect(cancelOrderRequest(buyer, accepted.id)).rejects.toMatchObject({
      code: "INVALID_TRANSITION",
    });
  });

  it("completes only from an accepted order, and only once", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    const accepted = await acceptOrderRequest(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
    });
    const completed = await completeOrderRequest(seller, accepted.id);
    expect(completed.status).toBe("COMPLETED");
    expect(completed.confirmed).toBe(true);

    for (const attempt of [
      completeOrderRequest(seller, accepted.id),
      rejectOrderRequest(seller, accepted.id),
      cancelOrderRequest(buyer, accepted.id),
    ]) {
      await expect(attempt).rejects.toMatchObject({ code: "INVALID_TRANSITION" });
    }
  });

  it("keeps completion with the seller", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    const accepted = await acceptOrderRequest(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
    });
    await expect(completeOrderRequest(buyer, accepted.id)).rejects.toMatchObject({
      code: "ROLE_FORBIDDEN",
    });
  });

  it("records the whole trail with the actor for each step", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product, 40);
    await proposeOrderChanges(seller, order.id, {
      items: [
        { itemId: order.items[0]!.id, proposedQuantity: 30, proposedUnitPrice: "950.00" },
      ],
    });
    await sendProposalToBuyer(seller, order.id);
    const accepted = await acceptProposal(buyer, order.id);
    await completeOrderRequest(seller, accepted.id);

    const final = await getOrderRequest(buyer, order.id);
    expect(final.history.map((entry) => entry.newStatus)).toEqual([
      "PENDING_SELLER",
      "SELLER_PROPOSED",
      "AWAITING_BUYER",
      "ACCEPTED",
      "COMPLETED",
    ]);
    expect(
      final.history.map((entry) => entry.changedByRole)
    ).toEqual(["BUYER", "SELLER", "SELLER", "BUYER", "SELLER"]);
    expect(final.history.every((entry) => entry.changedByName.length > 0)).toBe(true);
  });
});

describe("party isolation", () => {
  it("shows each party only their own requests", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);

    const buyerList = await listOrderRequests(buyer);
    const sellerList = await listOrderRequests(seller);
    expect(buyerList.items.map((row) => row.id)).toContain(order.id);
    expect(sellerList.items.map((row) => row.id)).toContain(order.id);
    // The summary carries the other party's identity, not internal ids.
    expect(buyerList.items[0]!.counterpartyName).toBeTruthy();
    expect(buyerList.items[0]!.total).toBeNull();

    const stranger = await createActiveBuyer();
    expect((await listOrderRequests(stranger)).items).toHaveLength(0);
    await expect(getOrderRequest(stranger, order.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("counts statuses for the dashboard", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await acceptOrderRequest(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, agreedUnitPrice: "950.00" }],
    });
    await placeRequest(buyer, product, 30);

    const { counts, total } = await listOrderRequests(buyer);
    expect(total).toBe(2);
    expect(counts).toEqual({ ACCEPTED: 1, PENDING_SELLER: 1 });

    const filtered = await listOrderRequests(buyer, { status: "ACCEPTED" });
    expect(filtered.items).toHaveLength(1);
    expect(filtered.items[0]!.total).toBe("19000");
  });
});

describe("order notifications", () => {
  it("notifies the other party at each hand-off", async () => {
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product, 40);
    // The buyer acted, so the seller is the one to hear about it.
    expect(await unreadCount(seller.id)).toBe(1);
    expect(await unreadCount(buyer.id)).toBe(0);

    await proposeOrderChanges(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, proposedUnitPrice: "950.00" }],
    });
    expect(await unreadCount(buyer.id)).toBe(0);

    await sendProposalToBuyer(seller, order.id);
    expect(await unreadCount(buyer.id)).toBe(1);

    await acceptProposal(buyer, order.id);
    expect(await unreadCount(seller.id)).toBe(2);

    // The feed is newest-first, so the original request is the oldest entry.
    const sellerFeed = await listNotifications(seller);
    expect(sellerFeed.items.map((item) => item.type)).toEqual([
      "ORDER_RESPONSE",
      "ORDER_REQUEST",
    ]);
    expect(sellerFeed.items.at(-1)!.title).toContain(order.reference);
    expect(sellerFeed.total).toBe(2);
    expect(sellerFeed.unread).toBe(2);
  });

  it("keeps notifications to their owner", async () => {
    const { seller, buyer, product } = await scenario();
    await placeRequest(buyer, product);

    const stranger = await createActiveBuyer();
    expect((await listNotifications(stranger)).items).toHaveLength(0);

    const feed = await listNotifications(seller);
    const notMine = feed.items[0]!;
    await expect(markRead(stranger, notMine.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await unreadCount(seller.id)).toBe(1);
  });

  it("marks read for the owner only", async () => {
    const { seller, buyer, product } = await scenario();
    await placeRequest(buyer, product);

    const feed = await listNotifications(seller);
    const marked = await markRead(seller, feed.items[0]!.id);
    expect(marked.isRead).toBe(true);
    expect(await unreadCount(seller.id)).toBe(0);

    await placeRequest(buyer, product, 30);
    expect(await unreadCount(seller.id)).toBe(1);
    const result = await markAllRead(seller);
    expect(result).toEqual({ updated: 1, unread: 0 });

    const unreadOnly = await listNotifications(seller, { unreadOnly: true });
    expect(unreadOnly.items).toHaveLength(0);
    expect(unreadOnly.total).toBe(0);
  });
});

describe("catalogue visibility follows account state", () => {
  it("hides listings of sellers who are not approved", async () => {
    const rejected = await createUser({ role: "SELLER", status: "REJECTED" });
    const product = await createProduct({ sellerId: rejected.id });
    const visible = await searchProducts({
      page: 1,
      pageSize: 12,
      sort: "newest",
      availability: "any",
    });
    expect(visible.total).toBe(0);
    await expect(getVisibleProduct(product.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("keeps a suspended seller's listing out of search", async () => {
    const seller = await createApprovedSeller();
    const product = await createProduct({ sellerId: seller.id });
    expect((await searchProducts({ page: 1, pageSize: 12, sort: "newest", availability: "any" })).total).toBe(1);

    await db.user.update({ where: { id: seller.id }, data: { status: "SUSPENDED" } });
    expect((await searchProducts({ page: 1, pageSize: 12, sort: "newest", availability: "any" })).total).toBe(0);
    await expect(getVisibleProduct(product.id)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("stops resolving an existing session the moment an account is suspended", async () => {
    const { buyer } = await scenario();
    expect(await getActiveSessionUser(buyer.id)).not.toBeNull();
    await db.user.update({ where: { id: buyer.id }, data: { status: "SUSPENDED" } });
    expect(await getActiveSessionUser(buyer.id)).toBeNull();
  });
});

describe("platform statistics", () => {
  it("counts the platform rather than guessing", async () => {
    await createAdmin();
    const { seller, buyer, product } = await scenario();
    const order = await placeRequest(buyer, product);
    await proposeOrderChanges(seller, order.id, {
      items: [{ itemId: order.items[0]!.id, proposedUnitPrice: "950.00" }],
    });

    const stats = await getPlatformStats();
    expect(stats.users.total).toBe(3);
    expect(stats.users.byRole).toEqual({ ADMIN: 1, BUYER: 1, SELLER: 1 });
    expect(stats.users.byStatus["ACTIVE"]).toBe(3);
    expect(stats.sellers.total).toBe(1);
    expect(stats.products.total).toBe(1);
    expect(stats.products.byStatus["ACTIVE"]).toBe(1);
    expect(stats.products.awaitingReview).toBe(0);
    expect(stats.orders.total).toBe(1);
    expect(stats.orders.byStatus["SELLER_PROPOSED"]).toBe(1);
    expect(stats.orders.awaitingSeller).toBe(0);
    expect(stats.orders.awaitingBuyer).toBe(0);
    expect(stats.reports).toEqual({ total: 0, open: 0 });
  });
});
