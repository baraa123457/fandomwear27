-- Phase 4 (ADMIN): gates catalog/discount writes and customer/order reads
-- behind profiles.role via is_admin(), as flagged as deferred work in
-- 20260816000007_public_read_policies.sql.

create policy "Admins can insert products" on public.products
  for insert with check (public.is_admin());
create policy "Admins can update products" on public.products
  for update using (public.is_admin());
create policy "Admins can delete products" on public.products
  for delete using (public.is_admin());

create policy "Admins can insert universes" on public.universes
  for insert with check (public.is_admin());
create policy "Admins can update universes" on public.universes
  for update using (public.is_admin());
create policy "Admins can delete universes" on public.universes
  for delete using (public.is_admin());

create policy "Admins can insert coupons" on public.coupons
  for insert with check (public.is_admin());
create policy "Admins can update coupons" on public.coupons
  for update using (public.is_admin());
create policy "Admins can delete coupons" on public.coupons
  for delete using (public.is_admin());

create policy "Admins can read customers" on public.customers
  for select using (public.is_admin());

comment on table public.customers is 'Admin-dashboard customer records, kept in sync by public.create_order(). Readable only by admins.';
