-- HOMEPAGE HERO PRODUCTS: the homepage Hero used to show
-- [products[13], products[20], products[6]] — three hardcoded array
-- indexes into whatever the catalog happened to return (see
-- src/components/home/hero.tsx). This table replaces that with an
-- admin-editable selection, stored in the database, independent from
-- Best Sellers (product_sales_counts / getBestSellers, migration
-- 20260816000015) — nothing here reads or writes sales data.
--
-- SINGLETON DESIGN: there is exactly one homepage-settings row. `id` is
-- constrained to always equal 1 (primary key + check), and that one row
-- is seeded below — clients only ever UPDATE it, never INSERT/DELETE, so
-- there's no policy for either and no way a second row can appear.
create table public.homepage_settings (
  id smallint primary key default 1,
  hero_product_1 text references public.products(id) on delete set null,
  hero_product_2 text references public.products(id) on delete set null,
  hero_product_3 text references public.products(id) on delete set null,
  updated_at timestamptz not null default now(),
  constraint homepage_settings_singleton check (id = 1)
);

-- Seed the single row so the frontend can always `select ... limit 1`
-- (or `.maybeSingle()`) without special-casing "row doesn't exist yet".
-- Starts with all three picks null; the storefront falls back to
-- existing catalog products client-side until an admin saves a
-- selection (see hero.tsx).
insert into public.homepage_settings (id) values (1);

create trigger set_updated_at
  before update on public.homepage_settings
  for each row execute function public.set_updated_at();

alter table public.homepage_settings enable row level security;

-- Public read: the storefront homepage is rendered for signed-out
-- visitors too.
create policy "Public can read homepage settings" on public.homepage_settings
  for select using (true);

-- Admin-only write, same is_admin() gate used for every other admin
-- catalog write (products/universes/coupons, migration 010). No insert
-- or delete policy is defined — the row is seeded once above and only
-- ever updated, which keeps this table a true singleton.
create policy "Admins can update homepage settings" on public.homepage_settings
  for update using (public.is_admin())
  with check (public.is_admin());

comment on table public.homepage_settings is
  'Singleton row (id=1) of homepage configuration. Currently: the 3 admin-selected Hero products '
  '(hero_product_1/2/3, each a products.id or null). Public read; admin-only update. '
  'Unrelated to Best Sellers (product_sales_counts) — this is manual curation, not sales-derived.';
