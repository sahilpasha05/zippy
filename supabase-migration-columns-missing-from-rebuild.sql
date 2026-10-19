-- Columns the app uses that the rebuilt schema (supabase-schema-rebuild.sql) did
-- not include. Without restaurants.sort_order the customer restaurants list
-- query fails and shows "No restaurants found" even though restaurants exist.
alter table public.restaurants add column if not exists sort_order int default 0;
alter table public.grocery_products add column if not exists subcategory_id uuid references public.grocery_subcategories(id) on delete set null;
alter table public.grocery_products add column if not exists grocery_partner_id uuid references public.grocery_partners(id) on delete set null;
alter table public.grocery_products add column if not exists store_partner_id uuid references public.store_partners(id) on delete set null;
alter table public.delivery_partners add column if not exists push_token text;
