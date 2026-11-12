-- Bisleri 1 L water bottle, ₹20. Photo is served from this site: /products/bisleri-1l.jpg
insert into public.grocery_products (category_id, name, brand, price, mrp, weight, image_url, in_stock, is_active, delivery_eta, grocery_partner_id)
select c.id, 'Bisleri Water Bottle', 'Bisleri', 20, 20, '1 L', '/products/bisleri-1l.jpg', true, true, '15 min', '74ecad61-222d-4821-bdee-fa9f80fbacbe'
from public.grocery_categories c where c.slug = 'drinks'
  and not exists (select 1 from public.grocery_products p where p.name = 'Bisleri Water Bottle');
