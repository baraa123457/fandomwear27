-- Catalog data (universes, products, reviews, coupons) is public in the
-- current app — anyone can browse the shop and see reviews without
-- logging in, and a shopper needs to be able to look up a coupon to
-- validate it at checkout. `customers` and `orders` are intentionally
-- left with RLS enabled and NO policy (i.e. locked to the service role)
-- until the ADMIN phase adds an is_admin() check.
--
-- Write access (insert/update/delete) for products/universes/coupons is
-- deliberately not granted here — that's added in the ADMIN phase once
-- profiles.role exists to gate it.

create policy "Public read access" on public.universes
  for select using (true);

create policy "Public read access" on public.products
  for select using (true);

create policy "Public read access" on public.reviews
  for select using (true);

create policy "Public read access" on public.coupons
  for select using (true);
