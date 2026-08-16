-- Phase 4 (ADMIN PRODUCT MEDIA): admin needs up to 3 product images and an
-- optional product video per product.
--
-- The existing `image` column (single photo, added in migration 003) is
-- kept as-is for backward compatibility — it continues to mirror
-- images[1] (the main/front image) so any code path still reading `image`
-- keeps working unchanged.
--
-- `images` holds up to 3 URLs (or legacy data URLs — same storage pattern
-- as the existing `image` column), ordered: [front, second, third].
-- `video` holds at most one URL and is always optional.
alter table public.products
  add column if not exists images text[] not null default '{}',
  add column if not exists video text;

-- Enforce "exactly 3 images max" and "1 video max" at the DB level too,
-- not just in the admin form.
alter table public.products
  add constraint products_images_max_3 check (array_length(images, 1) is null or array_length(images, 1) <= 3);

-- Backfill: existing products that already have a single `image` get it
-- copied into `images` so they keep displaying identically once the
-- storefront starts reading from `images` in a later phase.
update public.products
set images = array[image]
where image is not null
  and (images is null or array_length(images, 1) is null);

comment on column public.products.images is 'Up to 3 product photo URLs, ordered [main/front, second, third]. Mirrors legacy `image` (images[1]) for backward compatibility.';
comment on column public.products.video is 'Optional single product video URL. Never required.';
