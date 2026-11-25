-- Zippy Auto ride bookings made from the mobile app (applied to the live DB).
create table if not exists public.auto_bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ride_type text not null default 'auto',
  status text not null default 'requested'
    check (status in ('requested','accepted','arrived','in_progress','completed','cancelled')),
  pickup_address text not null,
  pickup_lat double precision,
  pickup_lng double precision,
  drop_address text not null,
  fare numeric not null check (fare >= 0),
  tip numeric not null default 0 check (tip >= 0),
  total numeric generated always as (fare + tip) stored,
  payment_method text not null default 'cod' check (payment_method in ('cod','upi','card')),
  payment_status text not null default 'pending',
  customer_name text,
  customer_phone text,
  source text not null default 'app',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists auto_bookings_user_idx on public.auto_bookings (user_id, created_at desc);
create index if not exists auto_bookings_status_idx on public.auto_bookings (status, created_at desc);
alter table public.auto_bookings enable row level security;
create policy "Users create own auto bookings" on public.auto_bookings
  for insert to authenticated with check (auth.uid() = user_id and status = 'requested');
create policy "Users see own auto bookings" on public.auto_bookings
  for select to authenticated using (auth.uid() = user_id);
create policy "Users cancel own auto bookings" on public.auto_bookings
  for update to authenticated using (auth.uid() = user_id and status = 'requested')
  with check (auth.uid() = user_id and status in ('requested','cancelled'));
create policy "Admins manage all auto bookings" on public.auto_bookings
  for all to authenticated using (is_admin()) with check (is_admin());
