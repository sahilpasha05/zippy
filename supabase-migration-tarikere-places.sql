-- Admin-editable places (gullies, shops, landmarks) that riders can search when booking an auto.
create table if not exists public.tarikere_places (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  kind text not null default 'Landmark',
  area text,
  keywords text,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists tarikere_places_active_idx on public.tarikere_places (is_active);
alter table public.tarikere_places enable row level security;
create policy "Anyone can read active places" on public.tarikere_places
  for select to anon, authenticated using (is_active);
create policy "Admins manage places" on public.tarikere_places
  for all to authenticated using (is_admin()) with check (is_admin());
