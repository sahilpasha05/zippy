-- Restaurants flagged here are left out of the admin wallet (Collections), Day Book and the main
-- Analytics totals/counts. Their orders get a separate count in Analytics and still count in
-- delivery boy analytics.
alter table public.restaurants add column if not exists exclude_from_totals boolean not null default false;
