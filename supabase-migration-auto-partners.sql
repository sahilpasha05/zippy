-- Auto (Zippy Auto) partners and assigning them to bookings (applied to the live DB).
create table if not exists public.auto_partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  vehicle_number text,
  vehicle_type text not null default 'auto',
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);
alter table public.auto_partners enable row level security;
create policy "Admins manage auto partners" on public.auto_partners
  for all to authenticated using (is_admin()) with check (is_admin());
alter table public.auto_bookings
  add column if not exists partner_id uuid references public.auto_partners(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists drop_lat double precision,
  add column if not exists drop_lng double precision;
create index if not exists auto_bookings_partner_idx on public.auto_bookings (partner_id);
create policy "Customers see their assigned auto partner" on public.auto_partners
  for select to authenticated using (
    exists (select 1 from public.auto_bookings b where b.partner_id = auto_partners.id and b.user_id = auth.uid())
  );
