insert into public.grocery_products (category_id, name, brand, weight, price, mrp, image_url, in_stock, is_active, delivery_eta, grocery_partner_id)
select c.id, v.name, v.brand, v.weight, v.price, v.mrp, v.img, true, true, '15 min', '74ecad61-222d-4821-bdee-fa9f80fbacbe'
from (values
('sweet-tooth','Nestle KitKat 4 Fingers Choco Coated Wafer Bar','Nestle','38.5g',30,30,'/products/nestle-kitkat-4-fingers-choco-coated-wafer-bar-38-5g.png'),
('sweet-tooth','Kinder Schoko Bons Crispy','Kinder','67.2g',150,150,'/products/kinder-schoko-bons-crispy-67-2g.png'),
('sweet-tooth','Kinder Joy Blue','Kinder','20g',50,50,'/products/kinder-joy-blue-20g.png'),
('sweet-tooth','Kinder Joy Pink','Kinder','20g',50,50,'/products/kinder-joy-pink-20g.png'),
('snacks','Bingo Mad Angles Achaari Masti Chips','Bingo','56g',20,20,'/products/bingo-mad-angles-achaari-masti-chips-56g.png'),
('drinks','Coca-Cola Soft Drink','Coca-Cola','750ml',40,40,'/products/coca-cola-soft-drink-750ml.png'),
('drinks','Sprite Lime Soft Drink','Sprite','750ml',40,40,'/products/sprite-lime-soft-drink-750ml.png'),
('drinks','Maaza Mango Drink','Maaza','600ml',35,35,'/products/maaza-mango-drink-600ml.png'),
('drinks','Red Bull Energy Drink Pack of 6','Red Bull','6 x 250ml',700,700,'/products/red-bull-energy-drink-pack-of-6-6-x-250ml.png'),
('dairy','Nandini Goodlife Toned Milk','Nandini','500ml',41,41,'/products/nandini-goodlife-toned-milk-500ml.png'),
('dairy','Nandini Goodlife Toned Milk','Nandini','1L',80,80,'/products/nandini-goodlife-toned-milk-1l.png'),
('snacks','Sunfeast Dark Fantasy Choco Fill Cookies','Sunfeast','69g',40,40,'/products/sunfeast-dark-fantasy-choco-fill-cookies-69g.png'),
('snacks','Britannia Little Hearts Classic Crunch Biscuit','Britannia','79g',30,30,'/products/britannia-little-hearts-classic-crunch-biscuit-79g.png'),
('snacks','Parle Hide & Seek Choco Chip Cookies','Parle','100g',30,30,'/products/parle-hide-seek-choco-chip-cookies-100g.png'),
('masala-oil','Gold Winner Refined Sunflower Oil','Gold Winner','1L',206,206,'/products/gold-winner-refined-sunflower-oil-1l.png')
) as v(slug, name, brand, weight, price, mrp, img)
join public.grocery_categories c on c.slug = v.slug
where not exists (select 1 from public.grocery_products p where p.name = v.name and p.weight = v.weight)
returning name, weight, price;