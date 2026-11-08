-- Restaurant settlements: the admin marks a day's delivered orders as paid to the restaurant
-- (Admin > Analytics > restaurant). The restaurant sees them in its Analytics panel.
create table if not exists public.restaurant_settlements (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  order_date date not null,              -- the day whose delivered orders were settled
  orders_count int not null default 0,
  amount numeric(10,2) not null check (amount >= 0),
  paid_by text,                          -- optional
  paid_to text,                          -- optional
  paid_on date not null default current_date,
  created_at timestamptz not null default now(),
  unique (restaurant_id, order_date)
);
alter table public.restaurant_settlements enable row level security;
drop policy if exists "Admins manage restaurant settlements" on public.restaurant_settlements;
create policy "Admins manage restaurant settlements" on public.restaurant_settlements for all using (public.is_admin()) with check (public.is_admin());
drop policy if exists "Owners read own settlements" on public.restaurant_settlements;
create policy "Owners read own settlements" on public.restaurant_settlements for select using (
  exists (select 1 from public.restaurants r where r.id = restaurant_id and r.owner_id = auth.uid())
);
