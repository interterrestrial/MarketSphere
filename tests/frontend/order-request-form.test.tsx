import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrderRequestForm } from "@/components/orders/order-request-form";
import type { ProductDetailDto } from "@/types/product";

/**
 * FR-28 / BR-04 / BR-07 behaviour of the request form:
 *
 *  - the screen must say plainly that this is a request, not an order;
 *  - the seller's minimum order quantity is enforced before submitting;
 *  - only one seller may be involved, so the picker is limited to that seller;
 *  - server-side field errors are surfaced on the right inputs.
 */

const push = vi.fn();
const refresh = vi.fn();
const post = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}));

vi.mock("@/lib/api-client", () => ({
  api: (...args: unknown[]) => post(...args),
  // Mirrors the real ApiError signature so the mock stays honest.
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public status: number,
      public fields: Array<{ path: string; message: string }> = []
    ) {
      super(message);
    }
  },
}));

function product(overrides: Partial<ProductDetailDto> = {}): ProductDetailDto {
  return {
    id: "p1",
    name: "Cotton Bedsheet King",
    description: "Soft cotton",
    status: "ACTIVE",
    isAvailable: true,
    indicativePrice: "1250.00",
    minimumOrderQuantity: 25,
    categoryId: null,
    sellerId: "s1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    images: [],
    variants: [],
    category: null,
    seller: {
      id: "s1",
      name: "Ravi Textiles",
      businessName: "Ravi Textiles",
      city: "Sonipat",
      businessType: "WHOLESALER",
      verificationStatus: "APPROVED",
      gstin: null,
      phone: null,
      addressLine: null,
      productCategories: [],
    },
    ...overrides,
  } as ProductDetailDto;
}

beforeEach(() => {
  push.mockReset();
  refresh.mockReset();
  post.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

function renderForm(
  options: { minimumOrderQuantity?: number | null; address?: string | null } = {}
) {
  const main = product({
    minimumOrderQuantity:
      options.minimumOrderQuantity === undefined ? 25 : options.minimumOrderQuantity,
  });
  return render(
    <OrderRequestForm
      initialProduct={main}
      sellerCatalogue={[
        { id: "p1", name: "Cotton Bedsheet King", minimumOrderQuantity: main.minimumOrderQuantity },
        { id: "p2", name: "Pillow Cover Pair", minimumOrderQuantity: 10 },
      ]}
      defaultDeliveryAddress={
        options.address === undefined ? "Shop 4, Sector 18, Noida" : options.address
      }
    />
  );
}

describe("OrderRequestForm", () => {
  it("states that submitting is a request, not an order", () => {
    renderForm();
    expect(screen.getByText(/This sends a/i).textContent).toMatch(/not an order/i);
    expect(screen.getByText(/Nothing is charged/i)).toBeTruthy();
  });

  it("starts each line at the seller's minimum quantity", () => {
    renderForm({ minimumOrderQuantity: 25 });
    expect(screen.getByLabelText("Quantity")).toHaveValue("25");
  });

  it("explains a seller with no minimum", () => {
    renderForm({ minimumOrderQuantity: null });
    expect(screen.getByText(/No minimum order quantity set/)).toBeTruthy();
  });

  it("refuses a quantity below the minimum and does not call the API", async () => {
    const user = userEvent.setup();
    renderForm({ minimumOrderQuantity: 25 });

    const quantity = screen.getByLabelText("Quantity");
    await user.clear(quantity);
    await user.type(quantity, "10");
    await user.click(screen.getByRole("button", { name: /send request|submit|request/i }));

    expect(await screen.findByText("This seller requires a minimum of 25 units.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
    // The failure is announced, not just painted.
    expect(screen.getByText("Please fix the highlighted fields.")).toBeTruthy();
  });

  it("refuses an incomplete delivery address", async () => {
    const user = userEvent.setup();
    // Shorter than the five characters the form requires.
    renderForm({ address: "Noid" });

    await user.click(screen.getByRole("button", { name: /send request|submit|request/i }));

    expect(await screen.findByText("Enter a complete delivery address.")).toBeTruthy();
    expect(post).not.toHaveBeenCalled();
  });

  it("submits the buyer's terms once the form is valid", async () => {
    const user = userEvent.setup();
    post.mockResolvedValue({ id: "req-1" });
    renderForm({ address: "Shop 4, Sector 18, Noida" });

    await user.click(screen.getByRole("button", { name: /send request|submit|request/i }));

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1));
    const [url, init] = post.mock.calls[0] as [string, { body: string }];
    expect(url).toBe("/api/orders");
    const payload = JSON.parse(init.body);
    expect(payload.deliveryAddress).toBe("Shop 4, Sector 18, Noida");
    expect(payload.items).toEqual([
      { productId: "p1", quantity: 25, variantLabel: undefined, requestedUnitPrice: undefined },
    ]);
    // No total is ever sent: prices are agreed, not assumed (BR-04).
    expect(JSON.stringify(payload)).not.toContain("agreedTotal");
    await waitFor(() => expect(push).toHaveBeenCalledWith("/buyer/requests/req-1"));
  });

  it("offers the seller's other listings but never another seller's", async () => {
    const user = userEvent.setup();
    renderForm();

    const select = screen.getByLabelText(/Add another product from this seller/i);
    const options = Array.from(select.querySelectorAll("option")).map((o) => o.textContent);
    expect(options).toContain("Pillow Cover Pair");
    // The listing already on the request cannot be added twice.
    expect(options).not.toContain("Cotton Bedsheet King");

    await user.selectOptions(select, "p2");
    expect(await screen.findByText("Pillow Cover Pair")).toBeTruthy();
    // A second line appears with its own minimum, and can be removed again.
    expect(screen.getAllByLabelText("Quantity")).toHaveLength(2);
    // Every line can be removed once there is more than one.
    await user.click(screen.getAllByRole("button", { name: "Remove" })[0]!);
    expect(screen.getAllByLabelText("Quantity")).toHaveLength(1);
  });

  it("puts a server-side field error on the field it belongs to", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api-client");
    post.mockRejectedValue(
      new ApiError("VALIDATION_ERROR", "The request contains invalid fields.", 400, [
        { path: "items.0.quantity", message: "That quantity just sold out." },
      ])
    );
    renderForm();

    await user.click(screen.getByRole("button", { name: /send request|submit|request/i }));

    expect(await screen.findByText("That quantity just sold out.")).toBeTruthy();
    expect(screen.getByLabelText("Quantity").getAttribute("aria-invalid")).toBe("true");
    expect(push).not.toHaveBeenCalled();
  });

  it("reports a general failure without losing what was typed", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api-client");
    post.mockRejectedValue(
      new ApiError(
        "SELLER_UNAVAILABLE",
        "This seller is not currently accepting order requests.",
        409
      )
    );
    renderForm();

    await user.click(screen.getByRole("button", { name: /send request|submit|request/i }));

    expect(
      await screen.findByText("This seller is not currently accepting order requests.")
    ).toBeTruthy();
    expect(screen.getByLabelText("Quantity")).toHaveValue("25");
  });
});
