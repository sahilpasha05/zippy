-- Rain mode: when on, customer pages show a rain animation and a "your order may be
-- delayed" notice. Switched from Admin > Settings. Applied to Tarikere on 2026-10-22.
alter table public.platform_settings add column if not exists rain_mode boolean not null default false;

-- Editable notice text, and the customer-to-rider call counter (2 calls per order).
-- Applied to Tarikere on 2026-10-22.
alter table public.platform_settings add column if not exists rain_message text not null default 'Due to the rain, your order may be delayed.';
alter table public.orders add column if not exists rider_calls_used int not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'orders_rider_calls_used_check') then
    alter table public.orders add constraint orders_rider_calls_used_check check (rider_calls_used >= 0);
  end if;
end $$;
