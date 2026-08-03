-- Lets an admin pause grocery ordering platform-wide from Settings without
-- touching restaurant ordering. Defaults open so existing behavior doesn't
-- change until an admin explicitly switches it off.
alter table public.platform_settings
  add column if not exists groceries_available boolean not null default true;
