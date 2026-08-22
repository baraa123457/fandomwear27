-- Phase 2 (ADMIN PRODUCT MANAGEMENT): the admin Products page needs a real
-- three-state status (Active/Draft/Archived), not just the boolean
-- `is_active` from migration 003. It also needs a few fields the Add
-- Product form collects that had nowhere to live yet: SKU, a per-product
-- low-stock threshold, a "Featured" flag for the homepage Featured
-- Products section, and basic SEO fields.

create type public.product_status as enum ('active', 'draft', 'archived');

alter table public.products
  add column status public.product_status not null default 'active',
  add column sku text,
  add column low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  add column featured boolean not null default false,
  add column seo_title text,
  add column seo_description text;

-- Backfill status from the existing is_active flag before dropping it, so
-- every product already archived via the old archiveProductRow() stays
-- archived under the new column.
update public.products
set status = case when is_active then 'active'::public.product_status else 'archived'::public.product_status end;

alter table public.products drop column is_active;

create index products_status_idx on public.products(status);
create index products_featured_idx on public.products(featured) where featured = true;
create unique index products_sku_key on public.products(sku) where sku is not null and sku <> '';

comment on column public.products.status is 'Active = visible on the storefront. Draft/Archived = admin-only. Supersedes the old is_active boolean.';
comment on column public.products.sku is 'Optional admin-facing stock-keeping unit, distinct from the internal `id` primary key. Unique when set.';
comment on column public.products.low_stock_threshold is 'Per-product low-stock threshold shown in the admin Inventory/Dashboard views. Defaults to 10, same as the dashboard-wide default.';
comment on column public.products.featured is 'Manually curated by the admin (Products page). Powers the homepage Featured Products section — independent of Best Sellers (product_sales_counts) and the Hero (homepage_settings).';
