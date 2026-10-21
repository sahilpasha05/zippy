-- How the rider took the amount due at the door: cash in hand, or online (UPI QR to the
-- company account). collected_amount is the exact amount taken, collected_at when.
-- Applied to the Tarikere project on 2026-10-22.
alter table public.orders add column if not exists collection_mode text;
alter table public.orders add column if not exists collected_amount numeric(10,2);
alter table public.orders add column if not exists collected_at timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'orders_collection_mode_check') then
    alter table public.orders add constraint orders_collection_mode_check check (collection_mode is null or collection_mode in ('cash', 'online'));
  end if;
end $$;
