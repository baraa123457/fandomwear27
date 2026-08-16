-- Phase 5 (BEST SELLERS): the storefront's "Best Sellers" section used to
-- be powered by a manually-set `bestseller` product tag (see
-- product_tag enum, migration 001). That tag is still used for the
-- merchandising badge shown on product cards (src/components/shared/
-- product-card.tsx) and as a tiebreaker in a couple of places, so it is
-- kept — but it is no longer the source of truth for which products are
-- actually best sellers. That now comes from real sales, computed here.
--
-- WHY A VIEW INSTEAD OF A STORED COUNTER:
-- order_items rows already exist for every order (see migration 011,
-- create_order()) and are small in volume for this project, so summing
-- them live is both correct and cheap. A view means:
--   - no denormalized `sales_count` column that can drift out of sync
--   - no client-side increments, no race conditions between simultaneous
--     purchases — Postgres computes the aggregate itself, from source
--     data, every time it's queried
--   - order status changes (processing -> shipped -> delivered,
--     or -> cancelled) are reflected automatically on the next read,
--     with no trigger/RPC bookkeeping required
--
-- WHY SECURITY_INVOKER IS DELIBERATELY LEFT OFF:
-- orders/order_items are RLS-locked to "owner or admin" (migration 011) —
-- that must not change. This view intentionally aggregates across ALL
-- orders regardless of who queries it (that's the whole point: a
-- storefront visitor needs the *store's* best sellers, not their own
-- purchase history), and it exposes only a product id + a unit count —
-- no PII, no order id, no price, no customer/shipping data. Granting
-- SELECT on this view to anon/authenticated therefore does not weaken
-- the RLS on the underlying tables (direct queries against orders/
-- order_items by anon/authenticated remain exactly as restricted as
-- before); it only exposes a safe, non-identifying aggregate derived
-- from them.
create view public.product_sales_counts as
select
  oi.product_id,
  sum(oi.quantity)::integer as total_sold
from public.order_items oi
join public.orders o on o.id = oi.order_id
-- Only orders that were actually placed and not cancelled count as
-- sales. This project's order lifecycle (admin_order_status enum,
-- migration 001) has no separate "paid"/"unpaid" or "refunded" status —
-- an order is created already-priced and paid via create_order(), and
-- 'cancelled' is the only status that invalidates it — so every other
-- status (processing, shipped, delivered) counts, and 'cancelled' is
-- excluded. If a refund/payment-status system is added later, extend
-- this WHERE clause accordingly.
where o.status <> 'cancelled'
group by oi.product_id;

comment on view public.product_sales_counts is
  'Aggregate units sold per product, from non-cancelled orders only. '
  'Public read-only (product_id + a unit count, no PII or order data) — '
  'powers the dynamic Best Sellers feature. Recomputed on every query, '
  'so it can never go stale and requires no counter bookkeeping.';

grant select on public.product_sales_counts to anon, authenticated;
