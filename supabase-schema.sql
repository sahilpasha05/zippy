-- =============================================
-- ZIPPY — Supabase Schema
-- Run this in your Supabase SQL editor
-- =============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =============================================
-- USERS / PROFILES
-- =============================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'customer' check (role in ('customer','restaurant_owner','admin','delivery_partner')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- ADDRESSES
-- =============================================
create table if not exists public.addresses (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_address text not null,
  city text not null default 'Bangalore',
  pincode text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  contact_name text,
  contact_phone text,
  is_default boolean default false,
  created_at timestamptz default now()
);

alter table public.addresses enable row level security;
create policy "Users manage own addresses" on public.addresses for all using (auth.uid() = user_id);

-- =============================================
-- GROCERY CATEGORIES
-- =============================================
create table if not exists public.grocery_categories (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  image_url text,
  icon text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.grocery_categories enable row level security;
create policy "Public read grocery categories" on public.grocery_categories for select using (is_active = true);
create policy "Admins manage grocery categories" on public.grocery_categories for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- GROCERY PRODUCTS
-- =============================================
create table if not exists public.grocery_products (
  id uuid primary key default uuid_generate_v4(),
  category_id uuid references public.grocery_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price numeric(10,2) not null,
  mrp numeric(10,2) not null,
  weight text,
  unit text,
  brand text,
  rating numeric(3,2) default 4.0,
  rating_count int default 0,
  in_stock boolean default true,
  delivery_eta text default '15 min',
  tags text[],
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.grocery_products enable row level security;
create policy "Public read active products" on public.grocery_products for select using (is_active = true);
create policy "Admins manage products" on public.grocery_products for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Index for category lookups
create index if not exists idx_grocery_products_category on public.grocery_products(category_id);
create index if not exists idx_grocery_products_active on public.grocery_products(is_active);

-- =============================================
-- GROCERY PARTNERS
-- =============================================
create table if not exists public.grocery_partners (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  phone text,
  address text,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.grocery_partners enable row level security;
create policy "Public read active grocery partners" on public.grocery_partners
  for select using (is_active = true);
create policy "Admins manage grocery partners" on public.grocery_partners
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- =============================================
-- RESTAURANTS
-- =============================================
create table if not exists public.restaurants (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  cover_url text,
  cuisine text[] default '{}',
  rating numeric(3,2) default 4.0,
  rating_count int default 0,
  distance numeric(5,2),
  delivery_time int default 30,
  min_order numeric(10,2) default 99,
  delivery_fee numeric(10,2) default 0,
  is_open boolean default true,
  is_active boolean default true,
  address text,
  phone text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  created_at timestamptz default now()
);

alter table public.restaurants enable row level security;
create policy "Public read active restaurants" on public.restaurants for select using (is_active = true);
create policy "Owners manage own restaurant" on public.restaurants for all using (auth.uid() = owner_id);
create policy "Admins manage all restaurants" on public.restaurants for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create index if not exists idx_restaurants_active on public.restaurants(is_active);

-- =============================================
-- RESTAURANT CATEGORIES
-- =============================================
create table if not exists public.restaurant_categories (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null,
  sort_order int default 0,
  is_active boolean default true
);

alter table public.restaurant_categories enable row level security;
create policy "Public read restaurant categories" on public.restaurant_categories for select using (is_active = true);
create policy "Owners manage own categories" on public.restaurant_categories for all using (
  exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
);

-- =============================================
-- RESTAURANT PRODUCTS (MENU ITEMS)
-- =============================================
create table if not exists public.restaurant_products (
  id uuid primary key default uuid_generate_v4(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid references public.restaurant_categories(id) on delete set null,
  name text not null,
  description text,
  image_url text,
  price numeric(10,2) not null,
  mrp numeric(10,2),
  is_veg boolean default true,
  rating numeric(3,2) default 4.0,
  is_available boolean default true,
  is_bestseller boolean default false,
  customization_options jsonb,
  created_at timestamptz default now()
);

alter table public.restaurant_products enable row level security;
create policy "Public read available menu items" on public.restaurant_products for select using (is_available = true);
create policy "Owners manage own menu" on public.restaurant_products for all using (
  exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
);

create index if not exists idx_restaurant_products_restaurant on public.restaurant_products(restaurant_id);

-- =============================================
-- ORDERS
-- =============================================
create table if not exists public.orders (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  restaurant_id uuid references public.restaurants(id) on delete set null,
  order_type text not null check (order_type in ('grocery','restaurant')),
  status text not null default 'pending' check (status in ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
  total numeric(10,2) not null,
  delivery_fee numeric(10,2) default 0,
  discount numeric(10,2) default 0,
  address text not null,
  notes text,
  coupon_code text,
  payment_method text default 'upi',
  payment_status text default 'pending' check (payment_status in ('pending','partially_paid','paid','failed','refunded')),
  online_amount numeric(10,2) default 0,
  cod_amount numeric(10,2) default 0,
  cash_collected_at timestamptz,
  cash_proof_image_url text,
  delivered_at timestamptz,
  grocery_partner_id uuid references public.grocery_partners(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.orders enable row level security;
create policy "Users see own orders" on public.orders for select using (auth.uid() = user_id);
create policy "Users create own orders" on public.orders for insert with check (auth.uid() = user_id);
create policy "Restaurant owners see their orders" on public.orders for select using (
  exists (select 1 from public.restaurants where id = restaurant_id and owner_id = auth.uid())
);
create policy "Admins manage all orders" on public.orders for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_orders_grocery_partner on public.orders(grocery_partner_id);

-- =============================================
-- ORDER ITEMS
-- =============================================
create table if not exists public.order_items (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null,
  product_type text not null check (product_type in ('grocery','restaurant')),
  name text not null,
  image_url text,
  price numeric(10,2) not null,
  quantity int not null default 1
);

alter table public.order_items enable row level security;
create policy "Users see own order items" on public.order_items for select using (
  exists (select 1 from public.orders where id = order_id and user_id = auth.uid())
);

-- =============================================
-- CART
-- =============================================
create table if not exists public.cart (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null,
  product_type text not null check (product_type in ('grocery','restaurant')),
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  name text not null,
  image_url text,
  price numeric(10,2) not null,
  quantity int not null default 1,
  updated_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table public.cart enable row level security;
create policy "Users manage own cart" on public.cart for all using (auth.uid() = user_id);

-- =============================================
-- WISHLIST
-- =============================================
create table if not exists public.wishlist (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null,
  product_type text not null,
  created_at timestamptz default now(),
  unique(user_id, product_id)
);

alter table public.wishlist enable row level security;
create policy "Users manage own wishlist" on public.wishlist for all using (auth.uid() = user_id);

-- =============================================
-- OFFERS / COUPONS
-- =============================================
create table if not exists public.offers (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  image_url text,
  discount_type text not null check (discount_type in ('percentage','flat')),
  discount_value numeric(10,2) not null,
  min_order numeric(10,2),
  code text unique,
  applicable_to text default 'all' check (applicable_to in ('all','grocery','restaurant')),
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table public.offers enable row level security;
create policy "Public read active offers" on public.offers for select using (is_active = true);
create policy "Admins manage offers" on public.offers for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- BANNERS
-- =============================================
create table if not exists public.banners (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  subtitle text,
  image_url text not null,
  link text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.banners enable row level security;
create policy "Public read active banners" on public.banners for select using (is_active = true);
create policy "Admins manage banners" on public.banners for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- REVIEWS
-- =============================================
create table if not exists public.reviews (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  restaurant_id uuid references public.restaurants(id) on delete cascade,
  product_id uuid,
  order_id uuid references public.orders(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  images text[],
  created_at timestamptz default now()
);

alter table public.reviews enable row level security;
create policy "Public read reviews" on public.reviews for select using (true);
create policy "Users create own reviews" on public.reviews for insert with check (auth.uid() = user_id);

-- =============================================
-- NOTIFICATIONS
-- =============================================
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text default 'info' check (type in ('info','order','promo','alert')),
  is_read boolean default false,
  data jsonb,
  created_at timestamptz default now()
);

alter table public.notifications enable row level security;
create policy "Users manage own notifications" on public.notifications for all using (auth.uid() = user_id);

-- =============================================
-- DELIVERY PARTNERS
-- =============================================
create table if not exists public.delivery_partners (
  id uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type text check (vehicle_type in ('bicycle','motorcycle','car')),
  vehicle_number text,
  is_available boolean default false,
  current_latitude numeric(10,7),
  current_longitude numeric(10,7),
  rating numeric(3,2) default 5.0,
  total_deliveries int default 0,
  created_at timestamptz default now()
);

alter table public.delivery_partners enable row level security;
create policy "Partners manage own profile" on public.delivery_partners for all using (auth.uid() = id);
create policy "Admins view all partners" on public.delivery_partners for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- PAYMENTS
-- =============================================
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(10,2) not null,
  method text not null,
  gateway_order_id text,
  gateway_payment_id text,
  status text not null default 'pending' check (status in ('pending','success','failed','refunded')),
  metadata jsonb,
  created_at timestamptz default now()
);

alter table public.payments enable row level security;
create policy "Users see own payments" on public.payments for select using (auth.uid() = user_id);
create policy "Admins see all payments" on public.payments for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- =============================================
-- REALTIME: enable for live order tracking
-- =============================================
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;

-- =============================================
-- TRIGGER: auto-create profile on signup
-- =============================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =============================================
-- SEED: grocery categories
-- =============================================
insert into public.grocery_categories (name, slug, icon, sort_order) values
  ('Fruits & Vegetables', 'fruits-vegetables', '🥦', 1),
  ('Dairy & Eggs', 'dairy', '🥛', 2),
  ('Bakery', 'bakery', '🍞', 3),
  ('Snacks', 'snacks', '🍿', 4),
  ('Drinks', 'drinks', '🧃', 5),
  ('Frozen Food', 'frozen', '🧊', 6),
  ('Home Care', 'home-care', '🏠', 7),
  ('Personal Care', 'personal-care', '🧴', 8),
  ('Baby Care', 'baby-care', '👶', 9),
  ('Pet Supplies', 'pet-supplies', '🐾', 10)
on conflict (slug) do nothing;
