-- =====================================================================
-- BookNest database schema (Supabase / PostgreSQL)
-- CS353 Scenario C - E-Commerce Bookstore System (educational project)
--
-- Entities: profiles, books, cart_items, orders, order_items, order_status_events
-- Security: Row Level Security on every table + role checks inside
--           SECURITY DEFINER functions. No client can grant itself a role.
-- Apply:    Supabase Dashboard -> SQL Editor -> paste this file -> Run
--           (or `supabase db push` with the Supabase CLI).
-- =====================================================================

-- ---------- Types ----------
create type public.user_role as enum ('customer', 'warehouse_manager', 'admin');
create type public.order_status as enum ('placed', 'processing', 'shipped', 'delivered');

-- ---------- Tables ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 80),
  email       text not null default '',
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now()
);

create table public.books (
  id          text primary key check (id ~ '^[a-z0-9-]+$'),
  title       text not null check (char_length(title) between 1 and 200),
  author      text not null check (char_length(author) between 1 and 120),
  category    text not null,
  summary     text not null default '',
  price       numeric(10, 2) not null check (price >= 0),
  stock       integer not null default 0 check (stock >= 0),          -- stock can never go negative
  pages       integer not null default 0 check (pages >= 0),
  year        integer not null,
  featured    boolean not null default false,
  cover_from  text not null default '#24664a',
  cover_to    text not null default '#e08e17',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index books_category_idx on public.books (category);
create index books_title_lower_idx on public.books (lower(title));
create index books_author_lower_idx on public.books (lower(author));

create table public.cart_items (
  user_id     uuid not null references public.profiles (id) on delete cascade,
  book_id     text not null references public.books (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 100),
  created_at  timestamptz not null default now(),
  primary key (user_id, book_id)
);

create sequence public.order_number_seq start 1;

create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique
                  default ('BN-' || lpad(nextval('public.order_number_seq')::text, 5, '0')),
  user_id         uuid not null references public.profiles (id) on delete restrict,
  customer_name   text not null,
  recipient_name  text not null check (char_length(recipient_name) between 3 and 80),
  phone           text not null check (phone ~ '^(\+9665|05)[0-9]{8}$'),
  city            text not null,
  address         text not null check (char_length(address) between 10 and 200),
  subtotal        numeric(10, 2) not null check (subtotal >= 0),
  delivery_fee    numeric(10, 2) not null check (delivery_fee >= 0),
  total           numeric(10, 2) not null check (total = subtotal + delivery_fee),
  status          public.order_status not null default 'placed',
  created_at      timestamptz not null default now()
);
create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status);

create table public.order_items (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  book_id     text not null references public.books (id) on delete restrict,
  title       text not null,                                   -- title snapshot
  unit_price  numeric(10, 2) not null check (unit_price >= 0),  -- price snapshot at purchase time
  quantity    integer not null check (quantity > 0),
  unique (order_id, book_id)
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_book_idx on public.order_items (book_id);

create table public.order_status_events (
  id          bigint generated always as identity primary key,
  order_id    uuid not null references public.orders (id) on delete cascade,
  status      public.order_status not null,
  changed_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index order_status_events_order_idx on public.order_status_events (order_id, created_at);

-- ---------- Role helper functions ----------
-- SECURITY DEFINER so they can read profiles without recursive RLS checks.
create or replace function public.app_role()
returns public.user_role
language sql stable security definer set search_path = ''
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role in ('warehouse_manager', 'admin') from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------- New users always start as 'customer' ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(left(new.raw_user_meta_data ->> 'full_name', 80), ''),
    coalesce(new.email, ''),
    'customer'   -- never taken from client metadata
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Row Level Security ----------
alter table public.profiles            enable row level security;
alter table public.books               enable row level security;
alter table public.cart_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.order_status_events enable row level security;

-- profiles: a user sees their own profile; admins see all. No direct insert/update/delete
-- policies exist, so roles can only change through public.set_user_role().
create policy "profiles: read own or admin reads all"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- books: everyone (including guests) can browse. Stock changes only via public.set_book_stock().
create policy "books: public read"
  on public.books for select to anon, authenticated
  using (true);

-- cart_items: each user manages only their own cart.
create policy "cart: owner select" on public.cart_items for select to authenticated using (user_id = auth.uid());
create policy "cart: owner insert" on public.cart_items for insert to authenticated with check (user_id = auth.uid());
create policy "cart: owner update" on public.cart_items for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart: owner delete" on public.cart_items for delete to authenticated using (user_id = auth.uid());

-- orders: customers read their own orders; warehouse managers and admins read all (fulfilment / reports).
-- Orders are created and updated ONLY through the functions below.
create policy "orders: owner or staff read"
  on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

create policy "order_items: owner or staff read"
  on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));

create policy "order_status_events: owner or staff read"
  on public.order_status_events for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));

-- Extra safety: guests can never write; signed-in users cannot write profiles/books/orders directly.
revoke insert, update, delete on public.profiles, public.books, public.orders, public.order_items, public.order_status_events from anon, authenticated;
revoke insert, update, delete on public.cart_items from anon;

-- ---------- Checkout: one atomic transaction ----------
-- Locks the books in the cart, re-checks stock, snapshots prices, creates the order and
-- its items, reduces stock, records the 'placed' event and empties the cart.
-- Any error raises an exception and PostgreSQL rolls back EVERYTHING (no partial order).
create or replace function public.place_order(
  p_recipient_name text,
  p_phone text,
  p_city text,
  p_address text
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid       uuid := auth.uid();
  v_name      text;
  v_order_id  uuid;
  v_subtotal  numeric(10, 2) := 0;
  v_fee       numeric(10, 2);
  v_items     integer;
  v_line      record;
begin
  if v_uid is null then
    raise exception 'You must be signed in to place an order.' using errcode = '42501';
  end if;

  if char_length(trim(coalesce(p_recipient_name, ''))) < 3 then
    raise exception 'Enter the recipient''s full name (at least 3 characters).';
  end if;
  if coalesce(p_phone, '') !~ '^(\+9665|05)[0-9]{8}$' then
    raise exception 'Enter a Saudi mobile number, e.g. 05XXXXXXXX.';
  end if;
  if trim(coalesce(p_city, '')) not in ('Riyadh','Jeddah','Makkah','Madinah','Dammam','Khobar','Jubail',
      'Dhahran','Taif','Abha','Tabuk','Buraidah','Hail','Najran','Jazan') then
    raise exception 'Choose a delivery city from the list.';
  end if;
  if char_length(trim(coalesce(p_address, ''))) not between 10 and 200 then
    raise exception 'Enter a delivery address (10 to 200 characters).';
  end if;

  select count(*) into v_items from public.cart_items where user_id = v_uid;
  if v_items = 0 then
    raise exception 'Your cart is empty.';
  end if;

  -- Lock every book row in the cart (ordered by id to avoid deadlocks) and check stock.
  for v_line in
    select c.book_id, c.quantity, b.title, b.price, b.stock
      from public.cart_items c
      join public.books b on b.id = c.book_id
     where c.user_id = v_uid
     order by c.book_id
       for update of b
  loop
    if v_line.quantity > v_line.stock then
      raise exception 'Not enough stock for "%". Available: %, in cart: %.', v_line.title, v_line.stock, v_line.quantity;
    end if;
    v_subtotal := v_subtotal + v_line.price * v_line.quantity;
  end loop;

  -- Same rule as lib/core/cart.ts: free delivery from 200 SAR, otherwise 15 SAR.
  v_fee := case when v_subtotal >= 200 then 0 else 15 end;

  select coalesce(nullif(full_name, ''), email) into v_name from public.profiles where id = v_uid;

  insert into public.orders (user_id, customer_name, recipient_name, phone, city, address, subtotal, delivery_fee, total)
  values (v_uid, v_name, trim(p_recipient_name), p_phone, trim(p_city), trim(p_address), v_subtotal, v_fee, v_subtotal + v_fee)
  returning id into v_order_id;

  insert into public.order_items (order_id, book_id, title, unit_price, quantity)
  select v_order_id, b.id, b.title, b.price, c.quantity
    from public.cart_items c
    join public.books b on b.id = c.book_id
   where c.user_id = v_uid;

  update public.books b
     set stock = b.stock - c.quantity,
         updated_at = now()
    from public.cart_items c
   where c.user_id = v_uid
     and c.book_id = b.id;

  insert into public.order_status_events (order_id, status, changed_by) values (v_order_id, 'placed', v_uid);

  delete from public.cart_items where user_id = v_uid;

  return v_order_id;
end;
$$;

-- ---------- Warehouse: set stock ----------
create or replace function public.set_book_stock(p_book_id text, p_stock integer)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'Only warehouse managers or administrators can change stock.' using errcode = '42501';
  end if;
  if p_stock is null or p_stock < 0 or p_stock > 10000 then
    raise exception 'Stock must be a whole number from 0 to 10000.';
  end if;
  update public.books set stock = p_stock, updated_at = now() where id = p_book_id;
  if not found then
    raise exception 'Book not found.';
  end if;
end;
$$;

-- ---------- Warehouse: move an order to its next internal status ----------
create or replace function public.advance_order_status(p_order_id uuid)
returns public.order_status
language plpgsql security definer set search_path = ''
as $$
declare
  v_status public.order_status;
  v_next   public.order_status;
begin
  if not public.is_staff() then
    raise exception 'Only warehouse managers or administrators can update order status.' using errcode = '42501';
  end if;
  select status into v_status from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'Order not found.';
  end if;
  v_next := case v_status
              when 'placed' then 'processing'
              when 'processing' then 'shipped'
              when 'shipped' then 'delivered'
              else null
            end;
  if v_next is null then
    raise exception 'This order is already delivered.';
  end if;
  update public.orders set status = v_next where id = p_order_id;
  insert into public.order_status_events (order_id, status, changed_by) values (p_order_id, v_next, auth.uid());
  return v_next;
end;
$$;

-- ---------- Admin: change another user's role ----------
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change roles.' using errcode = '42501';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;
  update public.profiles set role = p_role where id = p_user_id;
  if not found then
    raise exception 'User not found.';
  end if;
end;
$$;

-- ---------- Function permissions ----------
revoke execute on function public.place_order(text, text, text, text)        from public, anon;
revoke execute on function public.set_book_stock(text, integer)              from public, anon;
revoke execute on function public.advance_order_status(uuid)                 from public, anon;
revoke execute on function public.set_user_role(uuid, public.user_role)      from public, anon;
revoke execute on function public.handle_new_user()                          from public, anon, authenticated;

grant execute on function public.place_order(text, text, text, text)         to authenticated;
grant execute on function public.set_book_stock(text, integer)               to authenticated;
grant execute on function public.advance_order_status(uuid)                  to authenticated;
grant execute on function public.set_user_role(uuid, public.user_role)       to authenticated;
grant execute on function public.app_role()                                  to authenticated;
grant execute on function public.is_staff()                                  to anon, authenticated;
grant execute on function public.is_admin()                                  to anon, authenticated;
