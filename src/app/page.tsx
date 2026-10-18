import Link from "next/link";
import { PageShell } from "@/components/layout/page-shell";

const STEPS = [
  {
    title: "Browse and request",
    body: "Search home textiles from verified Sonipat sellers, then send an order request with the quantities you need.",
  },
  {
    title: "Seller confirms terms",
    body: "The seller checks stock, minimum order quantities, price, and delivery feasibility, then accepts or proposes changes.",
  },
  {
    title: "Agree and fulfil",
    body: "Once both sides agree the terms, the request becomes an order. Payment and delivery are arranged directly.",
  },
];

export default function Home() {
  return (
    <PageShell
      width="wide"
      title="Wholesale home textiles, without the guesswork"
      description="MarketSphere connects home-textile manufacturers and wholesalers in Sonipat with business buyers across Delhi-NCR. Orders are requested, negotiated, and confirmed — never bought by accident."
    >
      <div className="flex flex-wrap gap-3">
        <Link
          href="/register"
          className="rounded-md bg-primary px-4 py-2 text-sm text-on-primary hover:bg-primary-strong"
        >
          Join as a seller or buyer
        </Link>
        <Link
          href="/products"
          className="rounded-md border border-subtle bg-surface px-4 py-2 text-sm text-secondary hover:border-primary hover:text-body"
        >
          Explore products
        </Link>
      </div>

      <section className="mt-12">
        <h2 className="font-heading text-xl text-body">How ordering works</h2>
        <ol className="mt-4 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="rounded-lg border border-subtle bg-surface p-5 shadow-panel"
            >
              <p className="font-mono text-xs text-primary">Step {index + 1}</p>
              <p className="mt-2 font-heading text-base text-body">{step.title}</p>
              <p className="mt-2 text-sm text-secondary">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-subtle bg-surface p-5 shadow-panel">
          <h2 className="font-heading text-base text-body">For sellers</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-secondary">
            <li>Publish a catalogue with images, variants, and minimum order quantities</li>
            <li>Review incoming requests and accept, decline, or propose changes</li>
            <li>Keep your business details in one place buyers can see</li>
          </ul>
        </div>
        <div className="rounded-lg border border-subtle bg-surface p-5 shadow-panel">
          <h2 className="font-heading text-base text-body">For buyers</h2>
          <ul className="mt-2 space-y-1.5 text-sm text-secondary">
            <li>See indicative pricing, minimum orders, and availability before you enquire</li>
            <li>Negotiate quantities and prices before anything is committed</li>
            <li>Track every request and its agreed terms in one place</li>
          </ul>
        </div>
      </section>

      <p className="mt-10 text-xs text-muted">
        MarketSphere does not take payment or arrange delivery. Availability shown on a listing is
        provided by the seller and confirmed when they accept a request.
      </p>
    </PageShell>
  );
}
