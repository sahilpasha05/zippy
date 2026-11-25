-- Per-zone Zippy Auto rules, edited in Admin > Delivery zones (applied to the live DB).
alter table public.delivery_zones
  add column if not exists auto_enabled boolean not null default true,
  add column if not exists auto_surcharge numeric(10,2) not null default 0 check (auto_surcharge >= 0);
update public.delivery_zones set auto_enabled = false where kind = 'outside';
