-- Applied to the live DB on 25 Nov:
-- 1) the app gets live updates when a driver is assigned / the ride status changes
alter publication supabase_realtime add table public.auto_bookings;
-- 2) optional steeper per-km rate after N km for Zippy Auto
alter table public.auto_ride_types
  add column if not exists hike_after_km numeric check (hike_after_km is null or hike_after_km >= 0),
  add column if not exists hike_per_km numeric check (hike_per_km is null or hike_per_km >= 0);
-- 3) per-zone auto rules (see supabase-migration-zone-auto.sql)
