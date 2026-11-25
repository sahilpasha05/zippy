-- One row per phone that allowed notifications, tied to the logged-in customer (applied to the live DB).
create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null default 'android',
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);
alter table public.push_tokens enable row level security;
create policy "Users manage own push tokens" on public.push_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins read push tokens" on public.push_tokens
  for select to authenticated using (is_admin());
