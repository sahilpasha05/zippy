-- Records where an order was placed: 'app' (mobile app) or 'website'.
-- Nullable on purpose: orders placed before this column existed have no source.
alter table public.orders add column if not exists source text;
