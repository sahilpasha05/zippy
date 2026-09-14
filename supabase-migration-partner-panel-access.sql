-- The restaurant, delivery, store and grocery panels are all shared by URL
-- (e.g. /restaurant/<slug>/orders) with no partner login screen — the slug
-- itself is the only thing standing in for "who is allowed in". But `orders`,
-- `order_items` and `delivery_partners` only granted access to the row's own
-- customer, the restaurant's `owner_id`, or an admin. Anyone opening a shared
-- link without being signed in as that exact account saw an empty panel —
-- which, for shop owners and every delivery partner (no owner-style policy
-- existed for them at all), was effectively everyone.
--
-- This opens read/update on those three tables to match the "anyone with the
-- link" model already used for restaurants/products/grocery_partners in
-- supabase-schema.sql. Note this also means the anon key alone (not just a
-- specific shop's link) can read/update any order — the same tradeoff this
-- app already makes elsewhere, just now applied consistently.

create policy "Public read orders" on public.orders for select using (true);
create policy "Public update orders" on public.orders for update using (true) with check (true);

create policy "Public read order items" on public.order_items for select using (true);

create policy "Public read delivery partners" on public.delivery_partners for select using (true);
create policy "Public update delivery partners" on public.delivery_partners for update using (true) with check (true);
