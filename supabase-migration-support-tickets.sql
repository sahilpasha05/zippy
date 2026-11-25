-- Customer help tickets: raised from the "Need help?" button on every customer screen,
-- shown in the customer's own account and in Admin > Support Tickets.
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  ticket_no   bigint generated always as identity (start with 1001),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null,
  phone       text not null,
  category    text not null default 'other',
  order_id    uuid references public.orders(id) on delete set null,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
  admin_reply text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists support_tickets_user_idx   on public.support_tickets (user_id, created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets (status, created_at desc);

alter table public.support_tickets enable row level security;

drop policy if exists "Users create own tickets" on public.support_tickets;
create policy "Users create own tickets" on public.support_tickets
  for insert to authenticated
  with check (user_id = auth.uid() and status = 'open' and admin_reply is null);

drop policy if exists "Users read own tickets" on public.support_tickets;
create policy "Users read own tickets" on public.support_tickets
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "Admins manage all tickets" on public.support_tickets;
create policy "Admins manage all tickets" on public.support_tickets
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.support_tickets_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists support_tickets_touch on public.support_tickets;
create trigger support_tickets_touch before update on public.support_tickets
  for each row execute function public.support_tickets_touch();
