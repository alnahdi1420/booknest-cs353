# BookNest — Build Decisions (factual record)

This file records what was built and verified. It deliberately does **not** contain teamwork contributions,
process-model choices, risk analysis, design-pattern claims or citations — those will be decided by the team.

## Technology choices

| Area | Choice | Reason |
|---|---|---|
| Framework | Next.js 16.4 (App Router), React 19, TypeScript 5.9 | Deploys directly on Vercel; one codebase for pages and server proxy. |
| Styling | Tailwind CSS 4 | No extra UI library needed; responsive utilities. |
| Backend (optional) | Supabase: Auth + PostgreSQL + Row Level Security | Free tier, SQL functions for atomic checkout, RLS for authorization. |
| Packages | `@supabase/supabase-js`, `@supabase/ssr` | Official clients; `@supabase/ssr` stores the session in cookies so `proxy.ts` can read it. |
| Tests | Vitest (unit), PGlite (in-process PostgreSQL for SQL tests) | Both run locally with no services. |
| Fonts | Inter + Fraunces via `next/font/google` | Downloaded at build time (needs internet during `npm run build`). |
| Book covers | Generated with CSS gradients (`components/BookCover.tsx`) | No image files or external URLs that could break. |

## Architecture

- **Pure business rules** in `lib/core/` (cart totals, quantity rules, checkout validation and order creation,
  inventory parsing, order status pipeline, sales report, role permissions). No React or database code inside.
- **One data interface** (`StoreValue` in `lib/data/types.ts`) with two implementations:
  - `components/providers/DemoStoreProvider.tsx` → `lib/demo/demo-store.ts` (browser `localStorage`).
  - `components/providers/SupabaseStoreProvider.tsx` → Supabase tables + SQL functions.
  `StoreProvider` picks one: Supabase Mode only when both `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set; otherwise Demo Mode.
- **Pages** are client components that read from `useStore()`, so the same page works in both modes.
- **Authorization layers:**
  1. `RoleGuard` component on `/checkout`, `/orders`, `/warehouse`, `/admin` (runs on direct URL visits too).
  2. `proxy.ts` (Next.js 16's renamed middleware) — Supabase Mode only — reads the user's role from the
     `profiles` table on the server and redirects unauthorized users.
  3. Database: RLS policies on all six tables, and role checks inside the SQL functions. This is the real
     security boundary in Supabase Mode.
  In Demo Mode the demo store also checks roles before stock/status/role changes, but any visitor can switch
  persona — Demo Mode is **not secure by design**.

## Checkout logic (two separate implementations)

| | Demo Mode | Supabase Mode |
|---|---|---|
| Where | `placeOrder()` in `lib/core/checkout.ts`, saved by `DemoStore.placeOrder` | `public.place_order()` in the migration |
| Atomicity | Pure function returns either a complete new state or an error; the store saves everything in one `commit` | One PostgreSQL transaction; any `raise exception` rolls everything back |
| Stock check | Re-checks every cart line against current stock | Locks book rows (`FOR UPDATE`, ordered by id) then re-checks |
| Price snapshot | `unitPrice` copied into each order item | `unit_price` copied into `order_items` |
| Delivery fee | 15 SAR, free from 200 SAR | Same rule in SQL |

## What is real vs demo / simulated

- **Real (in Supabase Mode):** sign-up/sign-in/sign-out, profiles with roles, cart, orders, stock changes,
  status changes, role changes, sales metrics from stored orders.
- **Simulated everywhere:** payment (none is taken, no card fields exist), shipping (statuses are internal; no courier).
- **Demo only:** persona switching without passwords, data in `localStorage`, Reset Demo Data.
- **Deliberately limited:** account management = list users + change other users' roles. No user deletion,
  no book create/edit/delete from the UI (books are managed with `supabase/seed.sql` or the Supabase dashboard),
  no order cancellation, no password-reset page. Warehouse managers can read all orders (needed for fulfilment)
  but cannot list users.
- **State-change notification:** the demo store has `subscribe()`/notify (listeners called after each change),
  used by React through `useSyncExternalStore`. Supabase Mode re-fetches data after each action and does not use
  Supabase Realtime.

## Verification actually performed (23 Nov 2026, Windows 11, Node 26.13.1, npm 11.20.0)

| Command | Result |
|---|---|
| `npm test` (Vitest) | **30 passed**, 0 failed (2 files: `tests/core.test.ts`, `tests/demo-store.test.ts`) |
| `npm run test:db` (PGlite) | **38 passed**, 0 failed — migration + seed applied; RLS and SQL functions exercised as customer, warehouse manager, admin and guest |
| `npm run lint` | 0 errors, 0 warnings |
| `npm run typecheck` | 0 errors |
| `npm run build` (Demo Mode) | Success, 12 routes + proxy |
| `npm run build` with placeholder Supabase variables | Success (compiles the Supabase path; no connection is made at build time) |

Manual browser check (Demo Mode, `npm run dev`): home page; book detail → add 2 to cart; checkout with empty
fields shows validation errors; valid checkout creates order BN-00006 with confirmation and timeline; customer
opening `/admin` sees "Access denied"; warehouse persona sets a stock value and moves BN-00006 to Processing;
admin sales report shows 6 orders and 900.00 SAR (matches a manual sum of the six order totals); user list shows
5 users with own role locked; catalog at 375 px width has no horizontal scroll.

**Not verified:** the app has **not** been connected to a real Supabase project (no project/keys were used).
`test:db` uses PGlite with a *stubbed* `auth` schema (`auth.users`, `auth.uid()`), which imitates but is not
identical to Supabase. Email-confirmation redirect (`/auth/callback`) and `proxy.ts` role redirects have not been
run against real Supabase Auth. Vercel deployment has not been performed.

## Trade-offs

- Pages are client-rendered so Demo Mode (browser storage) and Supabase Mode can share one UI. Cost: content is
  not server-rendered for SEO, and a short loading state appears on first load.
- Book IDs are readable slugs (`pride-and-prejudice`) instead of UUIDs so URLs are identical in both modes.
- Sales metrics are calculated in the browser from the orders an admin can read (RLS). Fine for a classroom
  dataset; a large shop would use a SQL view or function instead.
- The delivery-fee rule exists in both TypeScript and SQL and must be changed in both places together.
