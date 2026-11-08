-- Day Book (Admin > Day Book): what the owner records by hand for each day.
--   kind = 'collection'  cash handed over by a delivery boy
--   kind = 'expense'     money spent that day
-- Delivered totals and Cashfree amounts are read from orders, not stored here.
create table if not exists public.daybook_entries (
  id uuid primary key default uuid_generate_v4(),
  entry_date date not null,
  kind text not null check (kind in ('collection', 'expense')),
  label text,
  amount numeric(10,2) not null check (amount >= 0),
  created_at timestamptz not null default now()
);
create index if not exists daybook_entries_date_idx on public.daybook_entries (entry_date);
alter table public.daybook_entries enable row level security;
drop policy if exists "Admins manage daybook entries" on public.daybook_entries;
create policy "Admins manage daybook entries" on public.daybook_entries for all using (public.is_admin()) with check (public.is_admin());
