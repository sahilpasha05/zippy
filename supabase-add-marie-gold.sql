-- Britannia Marie Gold biscuits, ₹20. Photo is served from this site: /products/marie-gold-vita.png
insert into public.grocery_products (category_id, name, brand, price, mrp, image_url, in_stock, is_active, delivery_eta, grocery_partner_id)
select c.id, 'Britannia Marie Gold', 'Britannia', 20, 20, '/products/marie-gold-vita.png', true, true, '15 min', '74ecad61-222d-4821-bdee-fa9f80fbacbe'
from public.grocery_categories c
where c.slug = 'snacks'
  and not exists (select 1 from public.grocery_products p where p.name = 'Britannia Marie Gold');
