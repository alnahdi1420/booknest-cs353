// npm run test:db
// Runs the BookNest migration + seed in PGlite with a stubbed Supabase auth schema,
// then exercises RLS and the SQL functions as different users.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), "..");
const db = new PGlite();
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("PASS", name); } else { fail++; console.log("FAIL", name, extra); }
};

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
  alter default privileges in schema public grant execute on functions to anon, authenticated;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
`);

const migDir = join(root, "supabase/migrations");
for (const f of readdirSync(migDir).sort()) await db.exec(readFileSync(join(migDir, f), "utf8"));
await db.exec(readFileSync(join(root, "supabase/seed.sql"), "utf8"));
check("migration + seed applied", true);

const U = { cust: "11111111-1111-1111-1111-111111111111", cust2: "22222222-2222-2222-2222-222222222222", wh: "33333333-3333-3333-3333-333333333333", admin: "44444444-4444-4444-4444-444444444444" };
await db.exec(`
  insert into auth.users values
   ('${U.cust}', 'sara@x.test', '{"full_name":"Sara","role":"admin"}'),
   ('${U.cust2}', 'omar@x.test', '{"full_name":"Omar"}'),
   ('${U.wh}', 'wh@x.test', '{"full_name":"Faisal"}'),
   ('${U.admin}', 'admin@x.test', '{"full_name":"Noura"}');
  update public.profiles set role = 'warehouse_manager' where id = '${U.wh}';
  update public.profiles set role = 'admin' where id = '${U.admin}';
`);
const roleOf = async (id) => (await db.query(`select role from public.profiles where id = $1`, [id])).rows[0].role;
check("new user defaults to customer even if metadata says admin", (await roleOf(U.cust)) === "customer");

async function as(uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec(`reset role; select set_config('request.jwt.claim.sub', '', false);`); }
}
const tryq = async (sql, params) => { try { return { ok: true, res: await db.query(sql, params) }; } catch (e) { return { ok: false, error: e.message }; } };
const stock = async (id) => (await db.query(`select stock from public.books where id = $1`, [id])).rows[0].stock;

check("20 books seeded", (await db.query(`select count(*)::int c from public.books`)).rows[0].c === 20);

// Customer places an order
const tmBefore = await stock("the-time-machine");
await as(U.cust, async () => {
  const a = await tryq(`insert into public.cart_items (user_id, book_id, quantity) values ($1, 'the-time-machine', 2), ($1, 'meditations', 1)`, [U.cust]);
  check("customer can add own cart items", a.ok, a.error);
  const b = await tryq(`insert into public.cart_items (user_id, book_id, quantity) values ($1, 'meditations', 1)`, [U.cust2]);
  check("customer cannot add items to another user's cart", !b.ok);
  const r = await tryq(`select public.place_order('Sara Ahmed', '0551234567', 'Riyadh', 'Olaya District, Building 12') as id`);
  check("place_order succeeds", r.ok, r.error);
  const o = await tryq(`select o.order_number, o.subtotal::float, o.delivery_fee::float, o.total::float, o.status from public.orders o`);
  check("order totals correct (2x29 + 32 = 90 + 15 fee)", o.ok && o.res.rows.length === 1 && o.res.rows[0].total === 105 && o.res.rows[0].order_number === "BN-00001", JSON.stringify(o.res?.rows));
  const items = await tryq(`select title, unit_price::float, quantity from public.order_items order by title`);
  check("order items snapshot prices", items.ok && items.res.rows.length === 2 && items.res.rows.some((i) => i.unit_price === 29 && i.quantity === 2));
  const cart = await tryq(`select count(*)::int c from public.cart_items`);
  check("cart emptied after order", cart.res.rows[0].c === 0);
  const ev = await tryq(`select status from public.order_status_events`);
  check("placed event recorded", ev.ok && ev.res.rows.length === 1 && ev.res.rows[0].status === "placed");
});
check("stock decreased by 2", (await stock("the-time-machine")) === tmBefore - 2);

// Insufficient stock -> nothing changes
await as(U.cust2, async () => {
  await db.query(`insert into public.cart_items (user_id, book_id, quantity) values ($1, 'the-silk-notebook', 1), ($1, 'frankenstein', 3)`, [U.cust2]);
  await db.query(`update public.cart_items set quantity = 3 where book_id = 'the-silk-notebook'`); // stock is 2
  const r = await tryq(`select public.place_order('Omar Khalid', '0559876543', 'Jeddah', 'Al Hamra District, Street 5')`);
  check("place_order fails when stock is insufficient", !r.ok && /Not enough stock/.test(r.error), r.error);
  const mine = await tryq(`select count(*)::int c from public.orders`);
  check("customer sees only own orders (0 for Omar)", mine.res.rows[0].c === 0);
  const cart = await tryq(`select count(*)::int c from public.cart_items`);
  check("cart kept after failed checkout", cart.res.rows[0].c === 2);
  const bad = await tryq(`select public.place_order('Omar', 'abc', 'Paris', 'x')`);
  check("place_order rejects invalid form data", !bad.ok);
});
check("no partial stock change after failed order (frankenstein still 4)", (await stock("frankenstein")) === 4);
check("no order created by failed checkout", (await db.query(`select count(*)::int c from public.orders`)).rows[0].c === 1);

// Customer privilege escalation attempts
await as(U.cust, async () => {
  const r1 = await tryq(`update public.profiles set role = 'admin' where id = $1`, [U.cust]);
  check("customer cannot update own role directly", !r1.ok, "update succeeded");
  const r2 = await tryq(`select public.set_user_role($1, 'admin')`, [U.cust]);
  check("customer cannot call set_user_role", !r2.ok);
  const r3 = await tryq(`select public.set_book_stock('meditations', 999)`);
  check("customer cannot set stock", !r3.ok);
  const r4 = await tryq(`update public.books set stock = 999 where id = 'meditations'`);
  check("customer cannot update books directly", !r4.ok);
  const r5 = await tryq(`select count(*)::int c from public.profiles`);
  check("customer sees only own profile", r5.res.rows[0].c === 1);
  const r6 = await tryq(`insert into public.orders (user_id, customer_name, recipient_name, phone, city, address, subtotal, delivery_fee, total) values ($1,'x','xxx','0551234567','Riyadh','0123456789ab',0,0,0)`, [U.cust]);
  check("customer cannot insert orders directly", !r6.ok);
});
check("customer role unchanged", (await roleOf(U.cust)) === "customer");

// Warehouse manager
await as(U.wh, async () => {
  const s = await tryq(`select public.set_book_stock('meditations', 7)`);
  check("warehouse can set stock", s.ok, s.error);
  const neg = await tryq(`select public.set_book_stock('meditations', -1)`);
  check("negative stock rejected", !neg.ok);
  const all = await tryq(`select id from public.orders`);
  check("warehouse sees all orders", all.ok && all.res.rows.length === 1);
  const adv = await tryq(`select public.advance_order_status($1) as s`, [all.res.rows[0].id]);
  check("warehouse can advance status", adv.ok && adv.res.rows[0].s === "processing", adv.error);
  const role = await tryq(`select public.set_user_role($1, 'admin')`, [U.cust]);
  check("warehouse cannot change roles", !role.ok);
  const users = await tryq(`select count(*)::int c from public.profiles`);
  check("warehouse cannot list all users", users.res.rows[0].c === 1);
});
check("stock is 7 after warehouse update", (await stock("meditations")) === 7);

// Admin
await as(U.admin, async () => {
  const users = await tryq(`select count(*)::int c from public.profiles`);
  check("admin sees all profiles", users.res.rows[0].c === 4);
  const r = await tryq(`select public.set_user_role($1, 'warehouse_manager')`, [U.cust2]);
  check("admin can change another user's role", r.ok, r.error);
  const self = await tryq(`select public.set_user_role($1, 'customer')`, [U.admin]);
  check("admin cannot change own role", !self.ok);
});
check("Omar is now warehouse_manager", (await roleOf(U.cust2)) === "warehouse_manager");

// Guests
await db.exec(`set role anon; select set_config('request.jwt.claim.sub', '', false);`);
const g1 = await tryq(`select count(*)::int c from public.books`);
check("guest can read books", g1.ok && g1.res.rows[0].c === 20);
const g2 = await tryq(`select count(*)::int c from public.orders`);
check("guest cannot read orders", !g2.ok || g2.res.rows[0].c === 0);
const g3 = await tryq(`select public.place_order('Guest', '0551234567', 'Riyadh', 'Somewhere long enough')`);
check("guest cannot call place_order", !g3.ok);
await db.exec(`reset role;`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
