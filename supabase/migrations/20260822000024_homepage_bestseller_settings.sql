-- Add bestseller customization support to homepage_settings
alter table public.homepage_settings
  add column if not exists bestseller_mode text not null default 'auto',
  add column if not exists bestseller_product_ids text[] default array[]::text[];
