-- Adds the is_pinned column that BannerCarousel and the admin banners page
-- already select and order by. Without it, the public banners query 400s.
alter table public.banners
  add column if not exists is_pinned boolean default false;
