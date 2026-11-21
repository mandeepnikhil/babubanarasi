-- Babu Banarasi: customer profiles and orders
-- Run once in Supabase → SQL Editor (or `supabase db push`).

-- ---------- Profiles (one per signed-in customer) ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  email       text,
  address     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Create a profile automatically when someone signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Orders ----------
create table if not exists public.orders (
  id                   text primary key,                     -- e.g. BB261121-A1B2C
  user_id              uuid references auth.users (id) on delete set null,  -- null for guest orders
  status               text not null default 'created'
                       check (status in ('created', 'paid', 'failed', 'whatsapp', 'cancelled', 'shipped', 'delivered')),
  payment_method       text not null check (payment_method in ('razorpay', 'whatsapp')),
  items                jsonb not null,                       -- [{id, name, price, qty, madeToOrder}]
  subtotal             integer not null,                     -- rupees
  shipping             integer,                              -- null = to be quoted (outside India)
  gift_wrap            integer not null default 0,
  total                integer not null,
  currency             text not null default 'INR',
  customer             jsonb not null,                       -- name, phone, email, address
  notes                text,
  razorpay_order_id    text unique,
  razorpay_payment_id  text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);

alter table public.orders enable row level security;

-- Customers can read their own orders. Nobody can write from the browser:
-- only the server functions (service role) create and update orders.
drop policy if exists "orders: read own" on public.orders;
create policy "orders: read own" on public.orders
  for select using (auth.uid() = user_id);
