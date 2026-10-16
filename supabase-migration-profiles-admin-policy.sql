-- The original "Admins can view all profiles" policy selected from profiles
-- inside a policy ON profiles, which Postgres rejects with "infinite recursion
-- detected in policy for relation profiles" - the role lookup at admin login
-- then returned nothing and every admin was told "no admin access".
-- A SECURITY DEFINER helper reads the role without going through RLS.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" on public.profiles for all using (public.is_admin());
