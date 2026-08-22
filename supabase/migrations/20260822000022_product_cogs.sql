-- Migration: Add COGS (Cost of Goods Sold / Cost per item) to products table
alter table public.products
  add column if not exists cost_per_item numeric(10, 2) check (cost_per_item is null or cost_per_item >= 0);

comment on column public.products.cost_per_item is 'Cost of goods sold (COGS) per item in EGP. Used in Admin Analytics to compute Net Profit and Gross Margins.';
