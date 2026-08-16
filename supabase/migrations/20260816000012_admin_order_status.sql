-- Phase 4 (ORDERS / CHECKOUT + ADMIN): the admin orders page lets an admin
-- move an order through processing -> shipped -> delivered/cancelled. The
-- "Owners and admins can read orders" policy from migration 011 only
-- covers select; without this, admin status updates would silently no-op
-- under RLS. There is still no insert/delete policy, and no update policy
-- for non-admins — create_order() (SECURITY DEFINER) remains the only way
-- an order is created, and only its status can meaningfully change after.
create policy "Admins can update orders" on public.orders
  for update using (public.is_admin())
  with check (public.is_admin());
