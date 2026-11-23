import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line bg-white">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="font-serif text-lg font-semibold">
            Book<span className="text-brand-600">Nest</span>
          </p>
          <p className="mt-2 max-w-xs text-muted">
            An educational online bookstore built for the CS353 Software Engineering course (Scenario C).
          </p>
        </div>
        <div>
          <p className="font-semibold">Shop</p>
          <ul className="mt-2 space-y-1.5 text-muted">
            <li><Link href="/books" className="hover:text-brand-700">All books</Link></li>
            <li><Link href="/cart" className="hover:text-brand-700">Shopping cart</Link></li>
            <li><Link href="/orders" className="hover:text-brand-700">Track my orders</Link></li>
          </ul>
        </div>
        <div>
          <p className="font-semibold">Important</p>
          <p className="mt-2 text-muted">
            This is a student demo. Checkout is simulated, no payment is taken, and order tracking shows internal
            statuses only (no real courier).
          </p>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">BookNest · CS353 academic project</div>
    </footer>
  );
}
