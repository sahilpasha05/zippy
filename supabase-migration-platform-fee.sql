-- Platform fee is charged today (it is folded into orders.total) but has
-- nowhere to be recorded separately, which makes it invisible to accounting
-- and to any future refund that needs to split the fee back out.
-- Bands live in src/lib/cartPricing.ts: <100 -> 2, 100-500 -> 5, 500+ -> 9.
alter table public.orders
  add column if not exists platform_fee numeric(10,2) default 0;
