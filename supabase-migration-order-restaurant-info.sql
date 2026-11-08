-- Riders can't read a restaurant row once it is switched off (is_active = false), so their board showed
-- "Zippy Mart" with no address/phone. This hands back just name/address/phone for orders assigned to a rider.
create or replace function public.order_restaurant_info(p_order_ids uuid[])
returns table(order_id uuid, name text, address text, phone text)
language sql stable security definer set search_path = public as $$
  select o.id, r.name, r.address, r.phone
  from public.orders o join public.restaurants r on r.id = o.restaurant_id
  where o.id = any(p_order_ids) and o.delivery_partner_id is not null
$$;
grant execute on function public.order_restaurant_info(uuid[]) to anon, authenticated;
