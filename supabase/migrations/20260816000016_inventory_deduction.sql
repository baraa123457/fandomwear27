-- INVENTORY: products.stock (migration 003) has existed since the catalog
-- was first modeled, and purchase-panel.tsx / product cards / the admin
-- product form already read and write it — but create_order() (migration
-- 011) never touched it, so a successful checkout never actually reduced
-- inventory. This migration is the fix. It does NOT introduce a variant/
-- size/color-level stock column: this project's schema has always kept a
-- single `stock` count per product row (sizes/colors are just the list of
-- available options, not independently-stocked variants — see
-- products.sizes/products.colors in migration 003), so that's the level
-- this migration deducts at too. Introducing per-variant stock here would
-- be an unrequested schema redesign.

-- ---------------------------------------------------------------------
-- 1. create_order(): validate + atomically deduct stock, in the same
--    transaction as the order itself.
-- ---------------------------------------------------------------------
--
-- WHY HERE, AND WHY THIS AVOIDS RACE CONDITIONS / OVERSELLING:
-- create_order() already runs as a single Postgres function call, which
-- Postgres executes inside one implicit transaction — if anything inside
-- it raises, everything it did (order insert, order_items inserts,
-- coupon uses increment, AND the stock decrements below) is rolled back
-- together. That already solves "order created but stock not decreased"
-- and "stock decreased but order not created" (requirement 9): there is
-- no window where one happens without the other.
--
-- The decrement itself uses a single conditional UPDATE:
--   update products set stock = stock - qty where id = ... and stock >= qty
-- This is the standard atomic/race-safe pattern: Postgres takes a
-- row-level lock for the duration of the UPDATE, so if two checkouts for
-- the last unit of the same product commit at nearly the same instant,
-- the second one's UPDATE simply blocks until the first commits, then
-- re-evaluates `stock >= qty` against the now-decremented value and
-- correctly finds no matching row (0 rows updated -> FOUND is false ->
-- we raise, and that checkout's entire order is rolled back). Stock can
-- therefore never go negative and never gets oversold, without needing a
-- separate lock/RPC or client-side "check then update".
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

  -- Pass 1: price every line from the current products table, and
  -- atomically validate + reserve (deduct) stock for it. Trusted state
  -- only — the client's cart quantities/prices are never trusted; this
  -- re-reads and re-checks the real database row for every line, right
  -- now, not whatever the shopper's cart last saw.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid quantity for product %', v_item ->> 'product_id';
    end if;

    -- Conditional, atomic decrement — see function comment above for why
    -- this is race-safe. Matches zero rows if the product doesn't exist
    -- OR if current stock is insufficient; either way FOUND is false and
    -- we distinguish the two below only to give a clearer error message.
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

  -- Re-validate the coupon server-side; never trust a client-supplied discount.
  if p_coupon_code is not null and length(trim(p_coupon_code)) > 0 then
    select * into v_coupon from public.coupons
      where lower(code) = lower(trim(p_coupon_code))
        and active
        and expires >= current_date
        and (max_uses is null or uses < max_uses);
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

  -- Pass 2: write the priced line items now that the order row exists.
  -- (Stock was already deducted in pass 1; this re-select just picks up
  -- the current name/slug/price/art_icon snapshot, same as before.)
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
  'Sole write path for orders/order_items. Re-prices every line from products, re-validates the coupon, '
  'and atomically validates+deducts product.stock (rolling back the whole order if any line is unavailable) '
  '— ignores any client-computed totals or client-assumed stock.';

-- ---------------------------------------------------------------------
-- 2. Restore stock when an order is cancelled; re-deduct (safely) if a
--    cancelled order is reinstated. Order creation goes only through
--    create_order() above; status changes go through a plain
--    `update orders set status = ...` from the admin orders page
--    (see migration 20260816000012's policy) — a trigger is therefore
--    the only place to hook a stock-restoring side effect onto that.
-- ---------------------------------------------------------------------
alter table public.orders
  add column stock_restored boolean not null default false;

comment on column public.orders.stock_restored is
  'True once this order''s stock has been returned to inventory (set by order_status_stock_sync on cancellation). '
  'Prevents double-restoring stock if the order is cancelled, reopened, and cancelled again.';

create or replace function public.handle_order_status_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_line record;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'cancelled' and old.status <> 'cancelled' then
    -- Restore every line item's quantity, once. Guarded by
    -- stock_restored so re-saving/re-processing a cancellation already
    -- applied can't double-credit stock (requirement: no double
    -- restoration).
    if not old.stock_restored then
      for v_line in
        select product_id, sum(quantity) as qty
        from public.order_items
        where order_id = new.id
        group by product_id
      loop
        update public.products
          set stock = stock + v_line.qty
          where id = v_line.product_id;
      end loop;
      new.stock_restored := true;
    end if;

  elsif old.status = 'cancelled' and new.status <> 'cancelled' then
    -- Order reinstated after being cancelled: re-deduct what was
    -- restored, atomically and fail-safely — if someone else has since
    -- bought the remaining stock, block the status change rather than
    -- letting stock go negative.
    if old.stock_restored then
      for v_line in
        select product_id, sum(quantity) as qty
        from public.order_items
        where order_id = new.id
        group by product_id
      loop
        update public.products
          set stock = stock - v_line.qty
          where id = v_line.product_id
            and stock >= v_line.qty;
        if not found then
          raise exception
            'Cannot reinstate order %: insufficient stock for product %',
            new.id, v_line.product_id;
        end if;
      end loop;
      new.stock_restored := false;
    end if;
  end if;

  return new;
end;
$$;

create trigger order_status_stock_sync
  before update of status on public.orders
  for each row execute function public.handle_order_status_stock();

comment on trigger order_status_stock_sync on public.orders is
  'Restores product.stock when an order transitions into cancelled; re-deducts (or blocks the change) if a cancelled order is reinstated.';
