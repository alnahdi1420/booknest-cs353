"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useStore } from "./providers/store-context";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { canAccess } from "@/lib/core/access";
import { ROLE_LABELS } from "@/lib/types";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2" aria-label="BookNest home">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
          <path d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2V5Z" />
          <path d="M20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2V5Z" />
        </svg>
      </span>
      <span className="font-serif text-xl font-semibold tracking-tight">
        Book<span className="text-brand-600">Nest</span>
      </span>
    </Link>
  );
}

export function Header() {
  const { mode, user, cart, signOut } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const cartCount = cart.reduce((n, i) => n + i.quantity, 0);

  const links = [
    { href: "/books", label: "Browse books", show: true },
    { href: "/orders", label: "My orders", show: !!user },
    { href: "/warehouse", label: "Warehouse", show: canAccess(user?.role, "warehouse") },
    { href: "/admin", label: "Admin", show: canAccess(user?.role, "admin") },
  ].filter((l) => l.show);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  async function handleSignOut() {
    await signOut?.();
    setOpen(false);
    router.push("/");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`whitespace-nowrap rounded-full px-3 py-2 text-sm font-medium transition ${
                isActive(l.href) ? "bg-brand-50 text-brand-700" : "text-muted hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden lg:block">
            {mode === "demo" ? (
              <PersonaSwitcher />
            ) : user ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="hidden text-muted lg:inline">
                  {user.fullName} · <span className="font-medium text-brand-700">{ROLE_LABELS[user.role]}</span>
                </span>
                <button type="button" onClick={handleSignOut} className="btn-outline btn-sm">
                  Sign out
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-outline btn-sm">
                Sign in
              </Link>
            )}
          </div>

          <Link
            href="/cart"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white hover:border-brand-500"
            aria-label={`Shopping cart, ${cartCount} item${cartCount === 1 ? "" : "s"}`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
              <circle cx="10" cy="20" r="1.3" />
              <circle cx="17" cy="20" r="1.3" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-500 px-1 text-[11px] font-bold text-white">
                {cartCount}
              </span>
            )}
          </Link>

          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
              {open ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line bg-paper lg:hidden">
          <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={`rounded-xl px-3 py-2.5 text-sm font-medium ${isActive(l.href) ? "bg-brand-50 text-brand-700" : "text-ink"}`}
              >
                {l.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-line pt-3">
              {mode === "demo" ? (
                <PersonaSwitcher compact />
              ) : user ? (
                <button type="button" onClick={handleSignOut} className="btn-outline btn-sm">
                  Sign out ({user.fullName})
                </button>
              ) : (
                <Link href="/login" onClick={() => setOpen(false)} className="btn-outline btn-sm">
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
