-- System Health (Admin > System Health)
-- 1) app_errors: errors the browser reports (checkout failed, a page crashed ...). Anyone can add one, only admins read.
create table if not exists public.app_errors (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  source text not null default 'client' check (char_length(source) <= 40),
  message text not null check (char_length(message) <= 600),
  url text check (char_length(url) <= 300),
  user_agent text check (char_length(user_agent) <= 300),
  details text check (char_length(details) <= 1500)
);
create index if not exists app_errors_created_idx on public.app_errors (created_at desc);
alter table public.app_errors enable row level security;
drop policy if exists "Anyone can report errors" on public.app_errors;
create policy "Anyone can report errors" on public.app_errors for insert to anon, authenticated with check (true);
drop policy if exists "Admins read errors" on public.app_errors;
create policy "Admins read errors" on public.app_errors for select using (public.is_admin());
drop policy if exists "Admins delete errors" on public.app_errors;
create policy "Admins delete errors" on public.app_errors for delete using (public.is_admin());

-- 2) admin_db_health(): live database numbers for admins only.
create or replace function public.admin_db_health()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
declare result jsonb;
begin
  if not public.is_admin() then raise exception 'admins only'; end if;
  select jsonb_build_object(
    'db_size_bytes', pg_database_size(current_database()),
    'connections', (select count(*) from pg_stat_activity where datname = current_database()),
    'active_queries', (select count(*) from pg_stat_activity where datname = current_database() and state = 'active' and pid <> pg_backend_pid()),
    'idle_in_transaction', (select count(*) from pg_stat_activity where datname = current_database() and state like 'idle in transaction%'),
    'max_connections', current_setting('max_connections')::int,
    'cache_hit_pct', (select round(100.0 * sum(blks_hit) / nullif(sum(blks_hit) + sum(blks_read), 0), 2) from pg_stat_database where datname = current_database()),
    'slow_queries', coalesce((
      select jsonb_agg(q) from (
        select pid, round(extract(epoch from now() - query_start)::numeric, 1) as seconds, left(query, 160) as query
        from pg_stat_activity
        where datname = current_database() and state = 'active' and backend_type = 'client backend' and query not ilike 'START_REPLICATION%' and pid <> pg_backend_pid() and now() - query_start > interval '2 seconds'
        order by query_start limit 10) q), '[]'::jsonb),
    'tables', coalesce((
      select jsonb_agg(t) from (
        select relname as name, n_live_tup as rows, pg_total_relation_size(relid) as bytes
        from pg_stat_user_tables where schemaname = 'public'
        order by pg_total_relation_size(relid) desc limit 15) t), '[]'::jsonb)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_db_health() from public, anon;
grant execute on function public.admin_db_health() to authenticated;

-- 3) Live visitors: the site pings every ~45 s while a page is open and visible (see VisitorPing).
create table if not exists public.site_visitors (
  session_id text primary key check (char_length(session_id) <= 64),
  path text not null check (char_length(path) <= 200),
  device text,
  last_seen timestamptz not null default now(),
  first_seen timestamptz not null default now()
);
create index if not exists site_visitors_last_seen_idx on public.site_visitors (last_seen desc);
alter table public.site_visitors enable row level security;
drop policy if exists "Admins read visitors" on public.site_visitors;
create policy "Admins read visitors" on public.site_visitors for select using (public.is_admin());

create or replace function public.ping_visitor(p_session text, p_path text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.site_visitors (session_id, path, device) values (left(p_session, 64), left(p_path, 200), left(p_device, 20))
  on conflict (session_id) do update set path = excluded.path, last_seen = now();
  if random() < 0.02 then delete from public.site_visitors where last_seen < now() - interval '24 hours'; end if;
end $$;
revoke all on function public.ping_visitor(text, text, text) from public;
grant execute on function public.ping_visitor(text, text, text) to anon, authenticated;
