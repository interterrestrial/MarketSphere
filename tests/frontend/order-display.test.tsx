import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { RequestStatus } from "@prisma/client";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { StatusBadge } from "@/components/ui/status-badge";
import type { OrderHistoryEntryDto } from "@/types/order";

/**
 * BR-04: a pending request must never read as a confirmed order, so every
 * status is asserted by its literal label rather than by its colour.
 */
describe("OrderStatusBadge", () => {
  const expected: Record<RequestStatus, string> = {
    PENDING_SELLER: "Pending seller response",
    SELLER_PROPOSED: "Seller proposed changes",
    AWAITING_BUYER: "Awaiting your response",
    ACCEPTED: "Accepted",
    REJECTED: "Rejected",
    CANCELLED: "Cancelled",
    COMPLETED: "Completed",
  };

  it.each(Object.entries(expected) as Array<[RequestStatus, string]>)(
    "labels %s plainly",
    (status, label) => {
      render(<OrderStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeTruthy();
    }
  );

  it("never calls a pending request accepted", () => {
    render(<OrderStatusBadge status="PENDING_SELLER" />);
    expect(screen.queryByText("Accepted")).toBeNull();
  });

  it("speaks to the seller in the second person when the buyer must respond", () => {
    render(<OrderStatusBadge status="AWAITING_BUYER" viewerRole="SELLER" />);
    expect(screen.getByText("Awaiting buyer response")).toBeTruthy();
  });

  it("keeps the buyer-facing wording for the buyer", () => {
    render(<OrderStatusBadge status="AWAITING_BUYER" viewerRole="BUYER" />);
    expect(screen.getByText("Awaiting your response")).toBeTruthy();
  });

  it("states the status as text and not with colour alone", () => {
    const { container } = render(<StatusBadge tone="success">Live</StatusBadge>);
    // Accessible text is present...
    expect(screen.getByText("Live")).toBeTruthy();
    // ...and the colour is decoration on top of it.
    expect(container.querySelector("span")?.className).toContain("text-success");
  });
});

function entry(overrides: Partial<OrderHistoryEntryDto> = {}): OrderHistoryEntryDto {
  return {
    id: "h1",
    previousStatus: null,
    newStatus: "PENDING_SELLER",
    statusLabel: "Pending seller response",
    note: null,
    changedByName: "Asha Buyer",
    changedByRole: "BUYER",
    createdAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("OrderTimeline", () => {
  it("explains an empty history instead of showing a blank panel", () => {
    render(<OrderTimeline history={[]} />);
    expect(screen.getByText("No activity recorded yet.")).toBeTruthy();
  });

  it("shows the newest step first", () => {
    render(
      <OrderTimeline
        history={[
          entry({ id: "h1", statusLabel: "Pending seller response" }),
          entry({
            id: "h2",
            statusLabel: "Order marked complete",
            changedByName: "Ravi Seller",
            changedByRole: "SELLER",
          }),
        ]}
      />
    );

    const items = screen.getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toContain("Order marked complete");
    expect(items[1]!.textContent).toContain("Pending seller response");
  });

  it("names the party that acted", () => {
    render(
      <OrderTimeline
        history={[
          entry({ changedByRole: "BUYER", changedByName: "Asha Buyer" }),
          entry({ id: "h2", changedByRole: "SELLER", changedByName: "Ravi Seller" }),
          entry({ id: "h3", changedByRole: "ADMIN", changedByName: "Admin" }),
        ]}
      />
    );

    const text = document.body.textContent ?? "";
    expect(text).toContain("Buyer · Asha Buyer");
    expect(text).toContain("Seller · Ravi Seller");
    expect(text).toContain("Admin · Admin");
  });

  it("includes a note when one was given and omits it otherwise", () => {
    const { unmount } = render(
      <OrderTimeline history={[entry({ note: "Only 30 units from this lot." })]} />
    );
    expect(screen.getByText("Only 30 units from this lot.")).toBeTruthy();
    unmount();

    render(<OrderTimeline history={[entry({ note: null })]} />);
    expect(screen.queryByText("Only 30 units from this lot.")).toBeNull();
  });

  it("renders any user-supplied note as text, never as markup", () => {
    // Notes are free text from another user; they must not become elements.
    render(<OrderTimeline history={[entry({ note: "<img src=x onerror=alert(1)>" })]} />);

    expect(document.querySelector("img")).toBeNull();
    expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeTruthy();
  });
});
