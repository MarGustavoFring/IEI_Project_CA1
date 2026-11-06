-- Try-On Kiosk: database schema for Supabase.
-- Safe to run more than once. Applied by `npm run db:setup`.
--
-- Security model (row level security):
--   * Anyone (even signed out) can READ stock, so guests see sizes.
--   * Only admins can CHANGE stock.
--   * A signed-in user can read and edit only their own profile, and can never change their own role.

-- ---------- profiles ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  role       text not null default 'member' check (role in ('member', 'admin')),
  foot       jsonb,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "Users read their own profile" on public.profiles;
create policy "Users read their own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "Users update their own profile" on public.profiles;
create policy "Users update their own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Column-level rights: users may change their name and foot scan, never their role.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, foot) on public.profiles to authenticated;

-- Every new sign-up gets a profile, using the name given at registration.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- stock ----------
-- One row per product colourway, floor and UK size.
create table if not exists public.stock (
  product_code text not null,
  colour_id    text not null,
  floor        text not null,
  size         numeric(4, 1) not null,
  qty          integer not null default 0 check (qty between 0 and 999),
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users (id) on delete set null,
  primary key (product_code, colour_id, floor, size)
);
alter table public.stock enable row level security;

drop policy if exists "Anyone can read stock" on public.stock;
create policy "Anyone can read stock" on public.stock
  for select to anon, authenticated using (true);

drop policy if exists "Admins add stock rows" on public.stock;
create policy "Admins add stock rows" on public.stock
  for insert to authenticated with check (public.is_admin());

drop policy if exists "Admins change stock" on public.stock;
create policy "Admins change stock" on public.stock
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.stock from anon, authenticated;
grant select on public.stock to anon, authenticated;
grant insert, update on public.stock to authenticated;

create or replace function public.stamp_stock()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end $$;

drop trigger if exists stock_stamp on public.stock;
create trigger stock_stamp before insert or update on public.stock
  for each row execute function public.stamp_stock();

-- Live updates: kiosks hear about stock changes as soon as an admin saves them.
do $$
begin
  alter publication supabase_realtime add table public.stock;
exception when duplicate_object then null;
end $$;
