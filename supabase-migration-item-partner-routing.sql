-- Route each grocery order line to the partner whose panel should show it.
--   Nandini products (name or brand contains "nandini") -> Nandini milk
--   Fruits & Vegetables category                          -> ejju bhaiyya
--   other original-catalog items (cakes, sweets, ...)     -> the product's own partner
--   items added from 9 Nov (juices, biscuits, staples,
--   Bisleri, ...: grocery_products.auto_route = false)    -> unassigned (null)
-- An order with lines for two partners shows up in both panels, each seeing only its own lines.
-- Orders an admin assigns by hand (orders.grocery_partner_id) keep working: that partner sees the whole order.

alter table public.order_items add column if not exists grocery_partner_id uuid references public.grocery_partners(id) on delete set null;
create index if not exists idx_order_items_grocery_partner on public.order_items(grocery_partner_id, order_id);

alter table public.grocery_products add column if not exists auto_route boolean not null default true;
update public.grocery_products set auto_route = false where created_at >= '2026-11-09';

create or replace function public.item_partner(p_product uuid, p_name text) returns uuid
language sql stable security definer set search_path = public as $$
  select case
    when coalesce(p.name, p_name) ilike '%nandini%' or coalesce(p.brand, '') ilike '%nandini%'
      then (select id from public.grocery_partners where slug like 'nandini-milk%' and is_active limit 1)
    when coalesce(p.auto_route, true) and c.slug = 'fruits-vegetables'
      then (select id from public.grocery_partners where slug like 'ejju-bhaiyya%' and is_active limit 1)
    when coalesce(p.auto_route, true)
      then p.grocery_partner_id
  end
  from (select 1) x
  left join public.grocery_products p on p.id = p_product
  left join public.grocery_categories c on c.id = p.category_id
$$;

create or replace function public.route_order_item() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.product_type = 'grocery' and new.grocery_partner_id is null then
    new.grocery_partner_id := public.item_partner(new.product_id, new.name);
  end if;
  return new;
end $$;

drop trigger if exists trg_route_order_item on public.order_items;
create trigger trg_route_order_item before insert on public.order_items
  for each row execute function public.route_order_item();

-- History, so partner analytics are not empty.
update public.order_items set grocery_partner_id = public.item_partner(product_id, name) where product_type = 'grocery';

-- Live updates for the partner panels (filtered by grocery_partner_id).
do $$ begin
  alter publication supabase_realtime add table public.order_items;
exception when duplicate_object then null; end $$;
