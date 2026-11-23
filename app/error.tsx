"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex flex-col items-center py-24 text-center">
      <h1 className="font-serif text-3xl font-semibold">Something went wrong</h1>
      <p className="mt-2 max-w-md text-muted">An unexpected error happened. Your data was not changed.</p>
      {error.message && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error.message}</p>}
      <div className="mt-8 flex gap-3">
        <button type="button" onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-outline">Go home</Link>
      </div>
    </div>
  );
}
