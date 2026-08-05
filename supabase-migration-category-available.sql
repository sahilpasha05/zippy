-- Lets an admin pause ordering for a single grocery category (e.g.
-- "Vegetables & Fruits") without touching the rest of groceries or
-- restaurant ordering. Mirrors platform_settings.groceries_available, but
-- scoped per category instead of platform-wide.
--
-- Deliberately a separate column from is_active: is_active controls whether
-- the category is shown/browsable at all, while available controls whether
-- it's currently open for ordering (customers still see the paused category,
-- with a "currently unavailable" message, instead of it just disappearing).
--
-- Defaults open so existing behavior doesn't change until an admin
-- explicitly switches a category off.
alter table public.grocery_categories
  add column if not exists available boolean not null default true;
