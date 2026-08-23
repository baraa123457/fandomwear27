-- Migration: Add variants and color_images to public.products
alter table public.products
  add column if not exists variants jsonb not null default '[]',
  add column if not exists color_images jsonb not null default '{}';

comment on column public.products.variants is 'Array of variant objects e.g. [{"size": "L", "color": "Red", "stock": 10, "sku": "SPIDER-RED-L"}]';
comment on column public.products.color_images is 'Map of color name to image URLs e.g. {"Red": ["url1", "url2"], "Black": ["url3"]}';
