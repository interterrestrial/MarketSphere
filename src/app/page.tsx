import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="font-heading text-3xl text-body">MarketSphere</h1>
      <p className="mt-3 max-w-xl text-sm leading-6 text-secondary">
        A B2B marketplace connecting home-textile sellers in Sonipat with business buyers across
        Delhi-NCR. Buyers submit order requests; sellers confirm availability, pricing, and delivery
        before any order is accepted.
      </p>
      <div className="mt-6 flex gap-3">
        <Link href="/register" className="rounded-md bg-primary px-4 py-2 text-sm text-background">
          Join as a seller or buyer
        </Link>
        <Link
          href="/login"
          className="rounded-md border border-subtle px-4 py-2 text-sm text-secondary"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
