import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <p className="font-serif text-7xl font-semibold text-brand-600">404</p>
      <h1 className="mt-4 font-serif text-3xl font-semibold">This page is not on our shelves</h1>
      <p className="mt-2 max-w-md text-muted">The page you are looking for does not exist or has moved.</p>
      <div className="mt-8 flex gap-3">
        <Link href="/" className="btn-primary">Go home</Link>
        <Link href="/books" className="btn-outline">Browse books</Link>
      </div>
    </div>
  );
}
