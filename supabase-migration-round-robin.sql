-- Server-side round robin for delivery partners.
--
-- Each order goes to the rider (in rr_settings.partner_ids) with the fewest orders today
-- (then the fewest pending); riders who are level take turns, using a shared counter (next_idx), so it no longer matters how many admin
-- browsers are open. A rider with max_pending unfinished orders (placed in the
-- last stale_hours) is "full" and is skipped until down to resume_at; if every
-- rider is full the new orders wait unassigned and are handed out as riders
-- deliver or cancel. Orders on hold, and online orders still unpaid, are skipped.
-- Applied to the Tarikere project on 2026-10-21.

create table if not exists public.rr_settings (
  id int primary key default 1 check (id = 1),
  enabled boolean not null default false,
  partner_ids uuid[] not null default '{}',
  next_idx int not null default 0,
  max_pending int not null default 6,
  resume_at int not null default 4,
  full_ids uuid[] not null default '{}',
  stale_hours int not null default 24,
  queue_hours int not null default 6,
  updated_at timestamptz not null default now()
);
alter table public.rr_settings enable row level security;
drop policy if exists "Admins manage rr settings" on public.rr_settings;
create policy "Admins manage rr settings" on public.rr_settings for all using (public.is_admin()) with check (public.is_admin());

create or replace function public.rr_dispatch() returns void
language plpgsql security definer set search_path = public as $$
declare
  s public.rr_settings%rowtype;
  ids uuid[]; full_list uuid[]; n int; i int; idx int; chosen_idx int;
  cand uuid; chosen uuid; ord record;
  pend int; today_cnt int; best_today int; best_pend int;
  day_start timestamptz := date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
begin
  if pg_trigger_depth() > 1 then return; end if;
  perform pg_advisory_xact_lock(4242001);

  select * into s from public.rr_settings where id = 1;
  if not found or not s.enabled then return; end if;
  ids := s.partner_ids;
  n := coalesce(array_length(ids, 1), 0);
  if n = 0 then return; end if;
  full_list := s.full_ids;

  -- A rider fills up at max_pending and only comes back at resume_at.
  foreach cand in array ids loop
    select count(*) into pend from public.orders
      where delivery_partner_id = cand and status not in ('delivered', 'cancelled')
        and placed_at > now() - make_interval(hours => s.stale_hours);
    if pend >= s.max_pending then
      if not (cand = any(full_list)) then full_list := array_append(full_list, cand); end if;
    elsif pend <= s.resume_at then
      full_list := array_remove(full_list, cand);
    end if;
  end loop;

  for ord in
    select o.id from public.orders o
    where o.delivery_partner_id is null
      and o.status not in ('delivered', 'cancelled')
      and o.placed_at > now() - make_interval(hours => s.queue_hours)
      and coalesce(o.notes, '') not ilike 'ON HOLD%'
      and not (coalesce(o.online_amount, 0) > 0 and o.payment_status in ('pending', 'failed'))
    order by o.placed_at, o.id
    for update
  loop
    chosen := null; best_today := null; best_pend := null;
    -- Fair share by day: fewest orders TODAY (delivered + pending; cancelled do not
    -- count; day = India time) wins. Level on today's orders -> fewer pending wins;
    -- still level -> whoever's turn it is (next_idx). Only a strictly better rider
    -- replaces the current pick while walking from whose turn it is.
    for i in 0 .. n - 1 loop
      idx := (s.next_idx + i) % n;
      cand := ids[idx + 1];
      if cand = any(full_list) then continue; end if;
      if not exists (select 1 from public.delivery_partners dp where dp.id = cand and dp.is_active and coalesce(dp.is_available, true)) then continue; end if;
      select count(*) into pend from public.orders
        where delivery_partner_id = cand and status not in ('delivered', 'cancelled')
          and placed_at > now() - make_interval(hours => s.stale_hours);
      select count(*) into today_cnt from public.orders
        where delivery_partner_id = cand and status <> 'cancelled' and placed_at >= day_start;
      if chosen is null or today_cnt < best_today or (today_cnt = best_today and pend < best_pend) then
        chosen := cand; chosen_idx := idx; best_today := today_cnt; best_pend := pend;
      end if;
    end loop;
    exit when chosen is null;

    s.next_idx := (chosen_idx + 1) % n;
    update public.orders set delivery_partner_id = chosen, accepted_at = null, updated_at = now()
      where id = ord.id and delivery_partner_id is null;

    if best_pend + 1 >= s.max_pending and not (chosen = any(full_list)) then full_list := array_append(full_list, chosen); end if;
  end loop;

  update public.rr_settings set next_idx = s.next_idx, full_ids = full_list, updated_at = now() where id = 1;
end $$;

revoke execute on function public.rr_dispatch() from public, anon;
grant execute on function public.rr_dispatch() to authenticated;

create or replace function public.rr_dispatch_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  begin
    perform public.rr_dispatch();
  exception when others then
    raise warning 'rr_dispatch failed: %', sqlerrm;
  end;
  return null;
end $$;

drop trigger if exists rr_after_insert on public.orders;
create trigger rr_after_insert after insert on public.orders
  for each row execute function public.rr_dispatch_trigger();

drop trigger if exists rr_after_update on public.orders;
create trigger rr_after_update after update of status, delivery_partner_id, payment_status, restaurant_id, notes on public.orders
  for each row
  when (old.status is distinct from new.status
     or old.delivery_partner_id is distinct from new.delivery_partner_id
     or old.payment_status is distinct from new.payment_status
     or old.restaurant_id is distinct from new.restaurant_id
     or old.notes is distinct from new.notes)
  execute function public.rr_dispatch_trigger();

-- Row for a new city: insert into public.rr_settings (id, enabled, partner_ids) values (1, false, '{...rider uuids...}');

-- Realtime, so every open admin panel sees changes at once:
-- alter publication supabase_realtime add table public.rr_settings;
