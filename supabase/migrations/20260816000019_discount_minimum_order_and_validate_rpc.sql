-- PHASE 4 — Dynamic Inventory and Discounts.
--
-- Inventory needs no schema change: products.stock (migration 003),
-- .sku/.low_stock_threshold (migration 018), and the updated_at trigger
-- (migration 003) already cover every field the inventory dashboard spec
-- asks for. This migration is discounts-only.
--
-- 1. coupons.minimum_order — the one field the discount form spec asks
--    for that the table didn't have yet.
-- 2. validate_coupon(code, subtotal) — a single RPC the frontend calls
--    for both the cart/checkout "apply code" preview AND (indirectly,
--    since create_order() below shares the same rule set) the
--    server-side source of truth at order time. Before this migration,
--    `fetchCoupon()` re-implemented the active/expiry/max_uses checks
--    client-side (see its old comment: "the same way the old
--    client-side validateCoupon did") — that's exactly the duplicated
--    validation logic the brief says not to have. This RPC replaces it;
--    fetchCoupon() and the dead client-only mock validator in
--    lib/data/coupons.ts are removed in the same commit as this
--    migration.

alter table public.coupons
  add column minimum_order numeric(10, 2) not null default 0 check (minimum_order >= 0);

comment on column public.coupons.minimum_order is
  'Cart subtotal (pre-discount) required for this code to apply. 0 = no minimum.';

-- ---------------------------------------------------------------------
-- validate_coupon: the one place coupon eligibility is decided.
-- SECURITY DEFINER + a narrow return shape (no id, no internal fields
-- beyond what the shopper needs to see) so anon/authenticated can call
-- it directly without needing SELECT on public.coupons.
-- ---------------------------------------------------------------------
create or replace function public.validate_coupon(
  p_code text,
  p_subtotal numeric default 0
)
returns table (
  valid boolean,
  code text,
  type public.discount_type,
  value numeric,
  discount_amount numeric,
  minimum_order numeric,
  remaining_uses integer,
  expires date,
  message text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_coupon public.coupons%rowtype;
begin
  select * into v_coupon from public.coupons
    where lower(code) = lower(trim(coalesce(p_code, '')));

  if not found then
    return query select false, null::text, null::public.discount_type, null::numeric,
      0::numeric, null::numeric, null::integer, null::date, 'Code not found';
    return;
  end if;

  if not v_coupon.active then
    return query select false, v_coupon.code, v_coupon.type, v_coupon.value,
      0::numeric, v_coupon.minimum_order,
      (case when v_coupon.max_uses is null then null else greatest(v_coupon.max_uses - v_coupon.uses, 0) end),
      v_coupon.expires, 'This code is no longer active';
    return;
  end if;

  if v_coupon.expires < current_date then
    return query select false, v_coupon.code, v_coupon.type, v_coupon.value,
      0::numeric, v_coupon.minimum_order,
      (case when v_coupon.max_uses is null then null else greatest(v_coupon.max_uses - v_coupon.uses, 0) end),
      v_coupon.expires, 'This code has expired';
    return;
  end if;

  if v_coupon.max_uses is not null and v_coupon.uses >= v_coupon.max_uses then
    return query select false, v_coupon.code, v_coupon.type, v_coupon.value,
      0::numeric, v_coupon.minimum_order, 0,
      v_coupon.expires, 'This code has reached its usage limit';
    return;
  end if;

  if p_subtotal < v_coupon.minimum_order then
    return query select false, v_coupon.code, v_coupon.type, v_coupon.value,
      0::numeric, v_coupon.minimum_order,
      (case when v_coupon.max_uses is null then null else v_coupon.max_uses - v_coupon.uses end),
      v_coupon.expires,
      format('Add %s more to use this code', to_char(v_coupon.minimum_order - p_subtotal, 'FM$999999990.00'));
    return;
  end if;

  return query select
    true,
    v_coupon.code,
    v_coupon.type,
    v_coupon.value,
    least(
      case when v_coupon.type = 'percentage'
        then round(p_subtotal * v_coupon.value / 100, 2)
        else v_coupon.value
      end,
      p_subtotal
    ),
    v_coupon.minimum_order,
    (case when v_coupon.max_uses is null then null else v_coupon.max_uses - v_coupon.uses end),
    v_coupon.expires,
    'Applied';
end;
$$;

grant execute on function public.validate_coupon(text, numeric) to anon, authenticated;

comment on function public.validate_coupon is
  'Single source of truth for coupon eligibility (exists/active/not expired/under max_uses/meets minimum_order). '
  'Used by the cart/checkout "apply code" UI so the frontend never re-implements these checks; create_order() '
  'independently re-checks the same rules at order time and is the actual write path.';

-- ---------------------------------------------------------------------
-- create_order(): re-declared only to add the minimum_order check, so
-- a coupon that fails the minimum can never be applied at checkout even
-- if a stale client-side state tried to send it. Everything else is
-- unchanged from migration 016.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_items jsonb,
  p_email text,
  p_full_name text,
  p_line1 text,
  p_city text,
  p_state text,
  p_zip text,
  p_country text,
  p_payment_method text,
  p_coupon_code text default null
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_shipping numeric(10, 2);
  v_tax numeric(10, 2);
  v_total numeric(10, 2);
  v_item_count integer := 0;
  v_qty integer;
  v_coupon public.coupons%rowtype;
  v_item jsonb;
  v_product public.products%rowtype;
  v_order public.orders;
begin
  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;
  if p_payment_method not in ('card', 'cod') then
    raise exception 'Invalid payment method: %', p_payment_method;
  end if;

  v_order_id := 'FW-' || floor(10000 + random() * 89999)::text;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_item ->> 'product_id';
    end if;

    update public.products
      set stock = stock - v_qty
      where id = v_item ->> 'product_id'
        and stock >= v_qty
      returning * into v_product;

    if not found then
      if exists (select 1 from public.products where id = v_item ->> 'product_id') then
        raise exception 'Insufficient stock for %',
          (select name from public.products where id = v_item ->> 'product_id');
      else
        raise exception 'Unknown product: %', v_item ->> 'product_id';
      end if;
    end if;

    v_subtotal := v_subtotal + v_product.price * v_qty;
    v_item_count := v_item_count + v_qty;
  end loop;

  -- Re-validate the coupon server-side; never trust a client-supplied
  -- discount. Same rule set as validate_coupon() above (active, not
  -- expired, under max_uses, and now: subtotal meets minimum_order) —
  -- a coupon that no longer qualifies is silently dropped rather than
  -- failing the whole order, matching the pre-existing behavior for
  -- the other checks.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons
      where lower(code) = lower(trim(p_coupon_code))
        and active
        and expires >= current_date
        and (max_uses is null or uses < max_uses)
        and v_subtotal >= minimum_order;
    if found then
      v_discount := least(
        case when v_coupon.type = 'percentage'
          then round(v_subtotal * v_coupon.value / 100, 2)
          else v_coupon.value
        end,
        v_subtotal
      );
      update public.coupons set uses = uses + 1 where id = v_coupon.id;
    end if;
  end if;

  v_shipping := case
    when (v_subtotal - v_discount) = 0 or (v_subtotal - v_discount) >= 75 then 0
    else 5.99
  end;
  v_tax := round((v_subtotal - v_discount) * 0.08, 2);
  v_total := (v_subtotal - v_discount) + v_shipping + v_tax;

  insert into public.orders (
    id, customer, email, order_date, items, total, status,
    user_id, subtotal, discount, coupon_code, shipping_cost, tax, payment_method, shipping_address
  ) values (
    v_order_id, p_full_name, p_email, now(), v_item_count, v_total, 'processing',
    auth.uid(), v_subtotal, v_discount, nullif(trim(coalesce(p_coupon_code, '')), ''),
    v_shipping, v_tax, p_payment_method,
    jsonb_build_object(
      'fullName', p_full_name, 'line1', p_line1, 'city', p_city,
      'state', p_state, 'zip', p_zip, 'country', p_country
    )
  )
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = v_item ->> 'product_id';
    insert into public.order_items (order_id, product_id, name, slug, price, size, color, universe, art_icon, quantity)
    values (
      v_order_id, v_product.id, v_product.name, v_product.slug, v_product.price,
      (v_item ->> 'size')::public.product_size, v_item ->> 'color', v_product.universe, v_product.art_icon,
      (v_item ->> 'quantity')::integer
    );
  end loop;

  insert into public.customers (id, name, email, orders, total_spent, joined)
  values (v_order_id, p_full_name, p_email, 1, v_total, now())
  on conflict (email) do update set
    orders = public.customers.orders + 1,
    total_spent = public.customers.total_spent + excluded.total_spent,
    name = excluded.name;

  return v_order;
end;
$$;

grant execute on function public.create_order(
  jsonb, text, text, text, text, text, text, text, text, text
) to anon, authenticated;

comment on function public.create_order is
  'Sole write path for orders/order_items. Re-prices every line from products, re-validates the coupon '
  '(including minimum_order), and atomically validates+deducts product.stock (rolling back the whole order '
  'if any line is unavailable) — ignores any client-computed totals or client-assumed stock.';
