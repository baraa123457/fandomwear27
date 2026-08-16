-- Phase 4 (ORDERS / CHECKOUT): the `orders` table created in Phase 2 only
-- reproduced the flat admin-dashboard shape (src/lib/data/admin.ts). Real
-- checkout needs line items and the fields CheckoutPage/OrdersContext
-- actually use (subtotal, discount, coupon, shipping/tax breakdown, payment
-- method, shipping address) — added here rather than in Phase 2 because
-- that migration explicitly deferred this to this phase.

alter table public.orders
  add column user_id uuid references auth.users(id) on delete set null,
  add column subtotal numeric(10, 2) not null default 0 check (subtotal >= 0),
  add column discount numeric(10, 2) not null default 0 check (discount >= 0),
  add column coupon_code text,
  add column shipping_cost numeric(10, 2) not null default 0 check (shipping_cost >= 0),
  add column tax numeric(10, 2) not null default 0 check (tax >= 0),
  add column payment_method text check (payment_method in ('card', 'cod')),
  add column shipping_address jsonb;

create index orders_user_id_idx on public.orders(user_id);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null references public.products(id),
  name text not null,
  slug text not null,
  price numeric(10, 2) not null check (price >= 0),
  size public.product_size not null,
  color text not null,
  universe text not null,
  art_icon text not null,
  quantity integer not null check (quantity > 0)
);

create index order_items_order_id_idx on public.order_items(order_id);

alter table public.order_items enable row level security;

-- `orders` already has RLS enabled with no policies (locked to service role)
-- from Phase 2. Add real read access: the owning customer, or an admin.
-- Row creation only ever happens through create_order() below (SECURITY
-- DEFINER, bypasses RLS) — there is deliberately no insert/update/delete
-- policy here, so clients can't fabricate or edit orders directly.
create policy "Owners and admins can read orders" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

create policy "Owners and admins can read order items" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and (o.user_id = auth.uid() or public.is_admin())
    )
  );

comment on table public.order_items is 'Line items for an order. Written only by create_order(); read-gated to the order''s owner or an admin.';

-- The one place order totals are computed. Takes raw (product_id, size,
-- color, quantity) lines and re-prices everything from the products table
-- server-side — the client-computed subtotal/discount/total are never
-- trusted or accepted as input. Guest checkout is preserved: user_id is
-- auth.uid(), which is simply null for a signed-out shopper.
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

  -- Pass 1: price every line from the current products table.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_product from public.products where id = v_item ->> 'product_id';
    if not found then
      raise exception 'Unknown product: %', v_item ->> 'product_id';
    end if;
    if (v_item ->> 'quantity')::integer <= 0 then
      raise exception 'Invalid quantity for product %', v_product.id;
    end if;
    v_subtotal := v_subtotal + v_product.price * (v_item ->> 'quantity')::integer;
    v_item_count := v_item_count + (v_item ->> 'quantity')::integer;
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

comment on function public.create_order is 'Sole write path for orders/order_items. Re-prices every line from products and re-validates the coupon; ignores any client-computed totals.';
