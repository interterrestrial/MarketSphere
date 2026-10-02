/**
 * Display formatting helpers. Prices arrive as strings (PostgreSQL numeric)
 * and must always be described as indicative — MarketSphere does not take
 * payment and final terms are agreed on an order request (BR-06).
 */

export function formatMoney(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(amount)) return null;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** "Indicative price ₹1,250.00" or the seller-contact wording when unset. */
export function indicativePriceLabel(value: string | number | null | undefined): string {
  return formatMoney(value) ? `Indicative price ${formatMoney(value)}` : "Contact seller for price";
}

/** Minimum order quantity wording, or null when the seller set none. */
export function moqLabel(value: number | null | undefined): string | null {
  if (!value) return null;
  return `MOQ ${value}`;
}
