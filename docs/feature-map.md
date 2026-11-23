# BookNest — Feature Map

Maps each implemented feature to its user role, the page/component that implements it, and how it behaves in
Demo Mode vs Supabase Mode. Supabase Mode code is written but **has not been run against a live Supabase project yet**
(see `build-decisions.md`).

## Features

| # | Feature | Role | Page / component | Demo Mode | Supabase Mode |
|---|---|---|---|---|---|
| 1 | Home: hero, featured books, categories, search box | Everyone | `app/page.tsx` | Books from `lib/demo/books.json` | Books from `books` table |
| 2 | Keyword search (title/author), category filter, sorting | Everyone | `app/books/CatalogView.tsx`, `lib/core/catalog.ts` | Same pure function | Same pure function on loaded rows |
| 3 | Book details, stock display, quantity + add to cart | Everyone / Customer | `app/books/[id]/page.tsx` | Active persona's cart | Requires sign-in; `cart_items` table |
| 4 | Sign in / sign up / sign out | Everyone | `app/login/page.tsx` | Persona choice (simulated, no passwords) | Supabase Auth email + password |
| 5 | Persona switcher + active persona display | Everyone (demo) | `components/PersonaSwitcher.tsx`, `components/DemoBanner.tsx` | Yes | Not shown |
| 6 | Reset Demo Data | Everyone (demo) | `components/DemoBanner.tsx` | Restores seed data | Not shown |
| 7 | Cart: edit quantity, remove, subtotal, delivery fee, total | Customer | `app/cart/page.tsx`, `lib/core/cart.ts` | localStorage | `cart_items` with RLS (own rows only) |
| 8 | Checkout (simulated, no card fields), validation, confirmation | Customer | `app/checkout/page.tsx`, `lib/core/checkout.ts` | `placeOrder()` pure all-or-nothing function | `place_order()` SQL function (single transaction) |
| 9 | Order history and order detail | Customer | `app/orders/page.tsx`, `app/orders/[id]/page.tsx` | Own orders | RLS: own orders only |
| 10 | Tracking timeline Placed → Processing → Shipped → Delivered | Customer | `components/OrderTimeline.tsx` | Status history saved per order | `order_status_events` table |
| 11 | Inventory list, search, stock-level filter, low/out-of-stock highlight | Warehouse Manager, Admin | `app/warehouse/page.tsx`, `lib/core/inventory.ts` | Yes | Yes |
| 12 | Set stock with numeric validation | Warehouse Manager, Admin | `app/warehouse/page.tsx` (`StockRow`) | Role checked in `DemoStore.setStock` | `set_book_stock()` checks role in DB |
| 13 | Move order to next status | Warehouse Manager, Admin | `app/warehouse/page.tsx` (`FulfilmentList`) | `DemoStore.advanceOrderStatus` | `advance_order_status()` checks role in DB |
| 14 | Sales report: total orders, total value, books sold, average, by status, top books | Admin | `app/admin/page.tsx`, `lib/core/reports.ts` | From stored orders | From orders visible via RLS (admin sees all) |
| 15 | User list and role change (not own role) | Admin | `app/admin/page.tsx` (`UserAccounts`) | `DemoStore.setUserRole` | `set_user_role()` checks admin in DB |
| 16 | Route protection | All | `components/RoleGuard.tsx`, `proxy.ts`, `lib/core/access.ts` | Client-side guard on every protected page | Server proxy + client guard + RLS |
| 17 | 404, error page, loading and empty states | Everyone | `app/not-found.tsx`, `app/error.tsx`, `components/ui.tsx` | Yes | Yes |

**State change notification (factual note for later design discussion):** `lib/demo/demo-store.ts` has a
`subscribe(listener)` method and calls every listener after each change; `DemoStoreProvider` subscribes with
React's `useSyncExternalStore`, so pages re-render when, for example, an order status changes. This exists only in
Demo Mode. Supabase Mode reloads data after each action; it does **not** use Supabase Realtime subscriptions.

## Candidate functional requirements

1. FR-1 The system shall let any visitor search books by a keyword that matches the title or author (case-insensitive).
2. FR-2 The system shall let any visitor filter books by category and sort them by title, price or publication year.
3. FR-3 The system shall let a signed-in customer add a book to the cart only if the total quantity in the cart does not exceed the available stock.
4. FR-4 The system shall show the cart subtotal, delivery fee (15 SAR, free from 200 SAR) and total.
5. FR-5 The system shall place an order only after validating the recipient name, Saudi mobile number, city and address, and re-checking stock for every item.
6. FR-6 The system shall reduce stock, save each item's unit price at purchase time and empty the cart when an order is placed, and shall change nothing if any check fails.
7. FR-7 The system shall show each customer only their own orders with the current status and a status timeline.
8. FR-8 The system shall allow only warehouse managers and administrators to change stock levels and to move an order to its next status.
9. FR-9 The system shall show administrators the total number of orders, total order value, orders per status and top-selling books.
10. FR-10 The system shall allow only administrators to change another user's role, and shall create every new account with the Customer role.

Not implemented (candidates mentioned for completeness): adding/editing/deleting books from the UI, order
cancellation, password reset page, real payment, real courier tracking, email notifications.

## Candidate non-functional requirements (objectively testable)

- NFR-1 (Correctness) All money values are rounded to 2 decimal places; unit tests check totals (e.g. 2 × 39.50 + 20 = 99.00 SAR).
- NFR-2 (Integrity) Stock can never be negative: `CHECK (stock >= 0)` in the database and validation in the UI/demo store.
- NFR-3 (Security) Every Supabase table has Row Level Security enabled; no `service_role` key is used anywhere in the code.
- NFR-4 (Usability/Responsive) Pages render without horizontal scrolling at 375 px width (checked manually on the catalog page in the browser).
- NFR-5 (Accessibility) All form inputs have labels; errors are linked with `aria-describedby`; there is a "Skip to content" link and visible keyboard focus.
- NFR-6 (Maintainability) Business rules live in `lib/core/` as pure functions with automated tests (`npm test`).
