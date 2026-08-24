-- Migration: Add main_color and color_videos to public.products
alter table public.products
  add column if not exists main_color text,
  add column if not exists color_videos jsonb not null default '{}';

comment on column public.products.main_color is 'The default primary color name e.g. "Red"';
comment on column public.products.color_videos is 'Map of color name to video URL e.g. {"Red": "videoUrl", "Black": "videoUrl"}';
