-- Phase (ADMIN PRODUCT MEDIA — STORAGE): product photos/videos were being
-- stored as Base64 data URLs directly in `products.image` / `images` /
-- `video` (see 20260816000003_products.sql and 20260816000013_product_media.sql
-- for the historical reasoning). That doesn't scale — a save with 3 photos
-- + a video can turn into a multi-MB JSON request body, which is slow and,
-- once it crosses the API gateway's request-size limit, fails outright
-- with an opaque error.
--
-- This migration adds real Supabase Storage backing for product media.
-- `products.image` / `images` / `video` keep their existing `text` /
-- `text[]` types unchanged — they simply store Storage public URLs now
-- instead of data URLs. Legacy data URLs already saved on existing rows
-- keep rendering exactly as before (nothing here touches existing data).

-- 1. Bucket. Public so storefront pages can load images/video without an
--    auth round-trip (this is product catalog media, not private data).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-media',
  'product-media',
  true,
  20971520, -- 20MB — matches the admin form's MAX_VIDEO_BYTES; images are
            -- capped tighter (4MB) client-side already.
  array[
    'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
    'video/mp4', 'video/webm', 'video/quicktime'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 2. RLS policies on storage.objects, scoped to this bucket only.
--    Mirrors the exact admin check already used for every other
--    admin-gated write in this project (public.is_admin(), defined in
--    20260816000008_profiles_and_auth.sql and already used by
--    20260816000010_admin_policies.sql for the products table itself).

-- Public read: anyone (including anonymous storefront visitors) can view
-- product media, matching the public-read policy already in place on the
-- products table (20260816000007_public_read_policies.sql).
create policy "Public can read product media"
  on storage.objects for select
  using (bucket_id = 'product-media');

-- Admin-only write: only signed-in admins (profiles.role = 'admin') may
-- upload, replace, or delete product media. Uses the same is_admin()
-- helper as every other admin-gated policy in this project — no new
-- security model introduced.
create policy "Admins can upload product media"
  on storage.objects for insert
  with check (bucket_id = 'product-media' and public.is_admin());

create policy "Admins can update product media"
  on storage.objects for update
  using (bucket_id = 'product-media' and public.is_admin())
  with check (bucket_id = 'product-media' and public.is_admin());

create policy "Admins can delete product media"
  on storage.objects for delete
  using (bucket_id = 'product-media' and public.is_admin());

comment on policy "Public can read product media" on storage.objects is
  'Product photos/videos are public catalog content — same visibility as the products table itself.';
comment on policy "Admins can upload product media" on storage.objects is
  'Gated by the same public.is_admin() check used for every other admin catalog write.';
