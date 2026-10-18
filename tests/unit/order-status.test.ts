import { describe, expect, it } from "vitest";
import { productSortOrder } from "@/server/services/product.service";
import {
  actionLabel,
  availableActions,
  isConfirmed,
  isTerminal,
  statusLabel,
} from "@/server/services/order-status";
import { formatMoney, indicativePriceLabel, moqLabel } from "@/lib/format";
import { SESSION_MAX_AGE_SECONDS } from "@/lib/session";

describe("order status machine", () => {
  it("labels every status with copy a buyer can act on", () => {
    expect(statusLabel("PENDING_SELLER")).toBe("Pending seller response");
    expect(statusLabel("AWAITING_BUYER")).toBe("Awaiting buyer response");
    expect(statusLabel("COMPLETED")).toBe("Completed");
  });

  it("treats only ACCEPTED and COMPLETED as confirmed orders", () => {
    // BR-04/BR-05: a submitted request must never read as an order.
    expect(isConfirmed("PENDING_SELLER")).toBe(false);
    expect(isConfirmed("SELLER_PROPOSED")).toBe(false);
    expect(isConfirmed("AWAITING_BUYER")).toBe(false);
    expect(isConfirmed("ACCEPTED")).toBe(true);
    expect(isConfirmed("COMPLETED")).toBe(true);
  });

  it("marks rejected, cancelled and completed as terminal", () => {
    expect(isTerminal("REJECTED")).toBe(true);
    expect(isTerminal("CANCELLED")).toBe(true);
    expect(isTerminal("COMPLETED")).toBe(true);
    expect(isTerminal("ACCEPTED")).toBe(false);
  });

  it("offers no actions once a request is closed", () => {
    expect(availableActions("REJECTED", "BUYER")).toHaveLength(0);
    expect(availableActions("CANCELLED", "SELLER")).toHaveLength(0);
    expect(availableActions("COMPLETED", "SELLER")).toHaveLength(0);
  });

  it("gives the buyer no accept/reject power while the seller is responding", () => {
    // FR-31: only the receiving seller confirms a request.
    const buyerActions = availableActions("PENDING_SELLER", "BUYER").map((a) => a.action);
    expect(buyerActions).not.toContain("ACCEPT");
    expect(buyerActions).not.toContain("REJECT");
    expect(buyerActions).toContain("CANCEL");
  });

  it("gives the seller no accept power while the buyer is responding", () => {
    const sellerActions = availableActions("AWAITING_BUYER", "SELLER").map((a) => a.action);
    expect(sellerActions).not.toContain("ACCEPT");
  });

  it("labels actions in plain language", () => {
    expect(actionLabel("ACCEPT_PROPOSAL")).toBe("Accept proposed terms");
    expect(actionLabel("SEND_PROPOSAL")).toBe("Send to buyer");
  });
});

describe("money formatting", () => {
  it("shows an indicative price, never a bare number", () => {
    expect(indicativePriceLabel("1250")).toContain("Indicative price");
    expect(indicativePriceLabel(null)).toBe("Contact seller for price");
  });

  it("returns null when a price is missing rather than guessing", () => {
    expect(formatMoney(null)).toBeNull();
    expect(formatMoney("")).toBeNull();
  });

  it("omits MOQ wording when the seller set none", () => {
    expect(moqLabel(null)).toBeNull();
    expect(moqLabel(25)).toBe("MOQ 25");
  });
});

describe("product sorting", () => {
  it("sorts unpriced listings last regardless of direction", () => {
    const asc = productSortOrder.price_asc[0] as { indicativePrice: { nulls: string } };
    const desc = productSortOrder.price_desc[0] as { indicativePrice: { nulls: string } };
    expect(asc.indicativePrice.nulls).toBe("last");
    expect(desc.indicativePrice.nulls).toBe("last");
  });
});

describe("session lifetime", () => {
  it("is one week, expressed in seconds", () => {
    // Guards the Express/Next unit mismatch that silently shortened sessions.
    expect(SESSION_MAX_AGE_SECONDS).toBe(604_800);
  });
});
