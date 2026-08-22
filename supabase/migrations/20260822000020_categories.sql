-- Phase 6 (CONTENT MANAGEMENT): categories are currently stored in
-- localStorage on the client (fandomwear:catalog-categories). This migration
-- moves them to Supabase so admin edits persist across sessions and
-- devices and reflect on the storefront dynamically.
--
-- DESIGN: categories are simple name-keyed strings — the product table
-- already stores a free-text `category` column, so this table is just a
-- curated allowlist that the admin manages (add/remove) and the shop's
-- filter panel reads. It does NOT use a FK relationship against products
-- because: (a) existing products must not break if a category is removed,
-- and (b) adding a new category should not require creating a product first.
create table public.categories (
  name text primary key,
  created_at timestamptz not null default now()
);

alter table public.categories enable row level security;

-- Public read: the shop filter panel is visible to signed-out visitors.
create policy "Public can read categories" on public.categories
  for select using (true);

-- Admin-only write: uses the same is_admin() gate as every other admin-
-- managed catalog table (universes, products, coupons, homepage_settings).
create policy "Admins can manage categories" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Seed from distinct category values already in the product catalog so
-- the list matches the existing data from day one. `on conflict do nothing`
-- makes this safe to re-run.
insert into public.categories (name)
  select distinct category from public.products
  on conflict do nothing;

comment on table public.categories is
  'Admin-curated category allowlist. Public read; admin-only insert/delete. '
  'Seeded from distinct products.category values. No FK to products — removing '
  'a category does not affect existing products, it only removes it from the '
  'shop filter panel and the admin category picker.';
