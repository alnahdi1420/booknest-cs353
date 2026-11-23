# BookNest — Online Bookstore (CS353 Scenario C)

BookNest is an **educational e-commerce bookstore** built for the CS353 Software Engineering course
(Scenario C: E-Commerce Bookstore System). It is a working demo, **not a real shop**.

> ⚠️ **Limitations (read first)**
> - Educational demo only. **Checkout is simulated**: no payment is taken and no card details are ever requested.
> - **Order tracking is internal** (Placed → Processing → Shipped → Delivered), updated by the warehouse team.
>   There is **no real courier or shipping carrier**.
> - **Demo Mode** stores data in your browser's `localStorage`. It is not secure and not shared between devices.

## 1. Overview and roles

| Role | What they can do |
| --- | --- |
| **Customer** | Search books (title/author), filter by category, sort, view details, manage a cart, place a simulated order, view order history and tracking. |
| **Warehouse Manager** | View and search inventory, see low/out-of-stock books, set stock levels, move orders to the next status. |
| **Administrator** | Sales dashboard (total orders, total order value, orders by status, top-selling books), list all users, change other users' roles. Admins also have warehouse access. |

**Tech stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase (Auth + PostgreSQL + RLS) · Vitest · deploys on Vercel.

The site runs in one of two modes, chosen automatically:

| Mode | When | Data |
| --- | --- | --- |
| **Demo Mode** | Supabase variables are **empty** (default) | Browser `localStorage`, sample personas, no passwords |
| **Supabase Mode** | Both `NEXT_PUBLIC_SUPABASE_*` variables are set | Real sign-up/sign-in, PostgreSQL, Row Level Security |

## 2. Start immediately in Demo Mode (no Supabase needed)

Requirements: **Node.js 20.9 or newer** and npm.

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. A yellow **DEMO MODE** banner at the top shows the active persona and a **Reset Demo Data** button.

Other scripts:

```bash
npm test           # unit tests (Vitest)
npm run test:db    # database tests: runs the SQL migration in an in-process PostgreSQL (PGlite)
npm run lint       # ESLint
npm run typecheck  # TypeScript check
npm run build      # production build
npm run seed:sql   # regenerate supabase/seed.sql from lib/demo/books.json
```

## 3. How to demo the three roles

Switch persona with the selector in the header, or open **/login** and pick a persona card.

**Customer checkout (persona: Customer – Sara)**
1. Search "Austen" on the home page, or open **Browse books** and filter by a category.
2. Open a book, choose a quantity, click **Add to cart** (you cannot add more than the stock).
3. Open the cart (top-right icon), change quantities, then **Proceed to checkout**.
4. Enter a name, a Saudi mobile number (e.g. `0551234567`), a city and an address. Click **Place order**.
5. You see a confirmation with an order number (e.g. `BN-00006`) and the tracking timeline. Stock has gone down.

**Warehouse stock update (persona: Warehouse – Faisal)**
1. Open **Warehouse**. The summary shows low-stock and out-of-stock counts; low rows are highlighted.
2. Type a new number in **Set new stock** and press **Save** (only whole numbers 0–10000 are accepted).
3. Open **Order fulfilment** and click **Mark as Processing / Shipped / Delivered**.
4. Switch back to the customer and open **My orders** → the tracking timeline shows the new status.

**Admin sales dashboard (persona: Admin – Noura)**
1. Open **Admin** → **Sales report**: total orders, total order value, books sold, orders by status, top-selling books.
2. **User accounts**: change another user's role (you cannot change your own role).
3. Try opening `/admin` as the customer → you get **Access denied**.

Click **Reset Demo Data** at any time to restore the original sample data.

## 4. Later: Supabase setup (student does this)

1. Create a free project at <https://supabase.com> → **New project**.
2. **SQL Editor** → paste and run `supabase/migrations/20261123000000_booknest_schema.sql`
   (creates tables, constraints, indexes, Row Level Security, the role trigger and the SQL functions).
3. **SQL Editor** → paste and run `supabase/seed.sql` (20 sample books; safe to run again).
4. **Project Settings → API** (or **Connect**) → copy the *Project URL* and the *anon public* key
   (the newer *publishable* key `sb_publishable_...` also works).
5. Copy `.env.example` to `.env.local` and fill in:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```
   **Never** use the `service_role` / secret key in this project.
6. **Authentication → URL Configuration**: set *Site URL* to `http://localhost:3000` (later your Vercel URL) and add
   `http://localhost:3000/auth/callback` and `https://YOUR-APP.vercel.app/auth/callback` to *Redirect URLs*.
7. Restart `npm run dev`. The Demo banner disappears; use **Sign in → Sign up** to create accounts.
   Every new account is a **Customer** (set by a database trigger, not by the browser).
8. **Create the first administrator** (only possible from the Supabase dashboard): sign up normally, then in the SQL Editor run:
   ```sql
   update public.profiles set role = 'admin' where email = 'your-email@example.com';
   ```
   After that, the admin can promote other users (e.g. a warehouse manager) from the **Admin → User accounts** page.

Security in Supabase Mode:
- Every table has Row Level Security. Customers can only read their own cart and orders.
- Checkout calls `public.place_order()`: one database transaction that locks the books, re-checks stock, saves the order
  with price snapshots, reduces stock and clears the cart. If anything fails, nothing is saved.
- Stock changes (`set_book_stock`), status changes (`advance_order_status`) and role changes (`set_user_role`) check
  the caller's role **inside the database**. `proxy.ts` also checks roles on the server before showing `/warehouse` and `/admin`.

## 5. Later: GitHub and Vercel (student does this)

1. Create an empty GitHub repository, then in this folder:
   ```bash
   git init
   git add .
   git commit -m "BookNest initial version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USER/booknest.git
   git push -u origin main
   ```
   `.gitignore` already excludes `node_modules`, `.next` and `.env.local`.
2. On <https://vercel.com> → **Add New → Project** → import the repository (framework: Next.js, default settings).
3. To deploy in **Demo Mode**, add no variables. To use **Supabase Mode**, add
   `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` under **Settings → Environment Variables**, then redeploy.
4. Add `https://YOUR-APP.vercel.app/auth/callback` to Supabase *Redirect URLs* and set the *Site URL* to your Vercel URL.

## Project structure

```
app/                     Pages (App Router): home, books, cart, checkout, orders, login, warehouse, admin
components/              UI components, RoleGuard, providers (Demo + Supabase data sources)
lib/core/                Pure business rules (cart, checkout, inventory, orders, reports, access) — unit tested
lib/demo/                Demo Mode seed data and localStorage store
lib/supabase/            Supabase clients and row mappers
proxy.ts                 Server-side route protection (Supabase Mode)
supabase/migrations/     Database schema, RLS policies, SQL functions
supabase/seed.sql        Sample books (generated)
tests/                   Vitest unit tests
scripts/                 seed.sql generator, database test script
docs/                    feature-map.md, build-decisions.md
```
