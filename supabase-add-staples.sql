insert into public.grocery_products (category_id, name, brand, weight, price, mrp, image_url, in_stock, is_active, delivery_eta, grocery_partner_id)
select c.id, v.name, v.brand, v.weight, v.price, v.mrp, v.img, true, true, '15 min', '74ecad61-222d-4821-bdee-fa9f80fbacbe'
from (values
('atta-rice-dal','Aashirvaad Superior MP Chakki Atta','Aashirvaad','1kg',65,75,'/products/aashirvaad-superior-mp-chakki-atta-1-kg.png'),
('atta-rice-dal','Aashirvaad Superior MP Chakki Atta','Aashirvaad','2kg',115,120,'/products/aashirvaad-superior-mp-chakki-atta-2-kg.png'),
('atta-rice-dal','Aashirvaad Superior MP Chakki Atta','Aashirvaad','5kg',313,358,'/products/aashirvaad-superior-mp-chakki-atta-5-kg.png'),
('atta-rice-dal','Aashirvaad Superior MP Chakki Atta','Aashirvaad','10kg',547,666,'/products/aashirvaad-superior-mp-chakki-atta-10-kg.png'),
('atta-rice-dal','Aashirvaad High Fibre Atta with Multigrains','Aashirvaad','5kg',350,412,'/products/aashirvaad-high-fibre-atta-with-multigrains-5-kg.png'),
('atta-rice-dal','Parry''s Toor Dal','Parry''s','1kg',168,210,'/products/parry-s-toor-dal-1-kg.png'),
('atta-rice-dal','Tata Sampann Unpolished Toor Dal','Tata Sampann','500g',83,113,'/products/tata-sampann-unpolished-toor-dal-500-g.png'),
('atta-rice-dal','Fortune Chana Dal Unpolished','Fortune','1kg',128,179,'/products/fortune-chana-dal-unpolished-1-kg.png'),
('atta-rice-dal','Tata Sampann Unpolished Chana Dal','Tata Sampann','500g',71,81,'/products/tata-sampann-unpolished-chana-dal-500-g.png'),
('atta-rice-dal','Fortune Moong Dal Unpolished','Fortune','1kg',170,209,'/products/fortune-moong-dal-unpolished-1-kg.png'),
('atta-rice-dal','Tata Sampann Unpolished Yellow Moong Dal Split','Tata Sampann','500g',79,110,'/products/tata-sampann-unpolished-yellow-moong-dal-split-500-g.png'),
('atta-rice-dal','Daawat Raw Sonamasuri Rice','Daawat','5kg',420,525,'/products/daawat-raw-sonamasuri-rice-5-kg.png'),
('atta-rice-dal','Whole Farm Premium Raw Sonamasuri Rice','Whole Farm','1kg',103,120,'/products/whole-farm-premium-raw-sonamasuri-rice-1-kg.png'),
('atta-rice-dal','Sugar',null,'1kg',74,85,'/products/sugar-1-kg.png'),
('atta-rice-dal','Tata Salt','Tata','1kg',29,32,'/products/tata-salt-vacuum-evaporated-iodised-1-kg.png'),
('masala-oil','Fortune Refined Sunflower Oil','Fortune','1L',177,195,'/products/fortune-refined-sunflower-oil-1-ltr.png'),
('masala-oil','Freedom Refined Sunflower Oil','Freedom','1L',168,215,'/products/freedom-refined-sunflower-oil-1-ltr.png'),
('masala-oil','Sunpure Refined Sunflower Oil','Sunpure','5L',852,999,'/products/sunpure-refined-sunflower-oil-5-ltr.png')
) as v(slug, name, brand, weight, price, mrp, img)
join public.grocery_categories c on c.slug = v.slug
where not exists (select 1 from public.grocery_products p where p.name = v.name and p.weight = v.weight)
returning name, weight, price;