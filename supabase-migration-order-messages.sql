-- Chat between a customer and the rider delivering their order (admins can see
-- and join every conversation).
--
-- Riders open their panel by link with no login, so row-level security cannot
-- tell a rider from anyone else. Instead this table has RLS switched ON with NO
-- policies: the browser (anon key) can neither read nor write it. All access
-- goes through /api/orders/[orderId]/messages, which runs with the service key
-- and checks that the caller is the order's customer, the order's rider
-- (matched by their panel slug) or an admin.

create table if not exists public.order_messages (
  id          uuid primary key default uuid_generate_v4(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'rider', 'admin')),
  body        text not null check (char_length(body) between 1 and 1000),
  created_at  timestamptz not null default now()
);

create index if not exists order_messages_order_idx on public.order_messages (order_id, created_at);

alter table public.order_messages enable row level security;
-- (intentionally no policies)
