-- Phase 4 (AUTHENTICATION): backs the existing AuthContext API with real
-- Supabase Auth. `profiles` is the one row of app-owned data per auth user
-- (auth.users itself is managed by Supabase and not directly queryable from
-- the client). role is a plain text check-constraint rather than a new enum
-- so the ADMIN phase can promote a user with a single UPDATE statement.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'customer' check (role in ('customer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = (select role from public.profiles where id = auth.uid()));

comment on table public.profiles is 'One row per auth.users row. role is admin-managed — promote a user by updating this column directly (e.g. via the SQL editor), there is no self-serve upgrade path.';

-- Auto-create the profile row the moment someone signs up, so the app never
-- has to handle "authenticated but no profile yet".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'name', ''));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Used by RLS policies (products/universes/coupons writes, customers/orders
-- reads) added in the ADMIN phase. SECURITY DEFINER + a pinned search_path
-- so it can read `profiles` regardless of the calling role's own grants.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to anon, authenticated;
