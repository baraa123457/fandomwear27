-- Migration: Wire store_settings directly into create_order() RPC
-- Reads tax_rate, shipping_flat_rate, shipping_free_threshold from public.store_settings (id = 1)
-- If tax_rate is 0, v_tax = 0.00 and no tax is charged on the order.

create or replace function public.create_order(
  p_full_name text,
  p_email text,
  p_line1 text,
  p_city text,
  p_state text,
  p_zip text,
  p_country text,
  p_items jsonb,
  p_payment_method text,
  p_coupon_code text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id text;
  v_subtotal numeric(10, 2) := 0;
  v_discount numeric(10, 2) := 0;
  v_shipping numeric(10, 2) := 0;
  v_tax numeric(10, 2) := 0;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product record;
  v_qty integer;
  v_item_count integer := 0;
  v_coupon record;
  v_tax_rate numeric(6, 4) := 0;
  v_shipping_flat numeric(10, 2) := 0;
  v_shipping_threshold numeric(10, 2) := 0;
begin
  if p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Full name is required';
  end if;

  if p_email is null or length(trim(p_email)) = 0 then
    raise exception 'Email is required';
  end if;

  if p_items is null or jsonb_array_length(p_items) = 0 then
    raise exception 'Order must contain at least one item';
  end if;

  v_order_id := 'FW-' || lpad(floor(random() * 100000)::text, 5, '0');

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

  -- Read live store settings (tax rate, flat shipping, free shipping threshold)
  select
    coalesce(tax_rate, 0),
    coalesce(shipping_flat_rate, 0),
    coalesce(shipping_free_threshold, 0)
  into v_tax_rate, v_shipping_flat, v_shipping_threshold
  from public.store_settings
  where id = 1;

  if not found then
    v_tax_rate := 0;
    v_shipping_flat := 0;
    v_shipping_threshold := 0;
  end if;

  v_shipping := case
    when (v_subtotal - v_discount) = 0 or (v_subtotal - v_discount) >= v_shipping_threshold then 0
    else v_shipping_flat
  end;
  v_tax := round((v_subtotal - v_discount) * v_tax_rate, 2);
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
  );

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.order_items (
      order_id, product_id, product_name, price, quantity, size, color, universe
    ) values (
      v_order_id,
      v_item ->> 'product_id',
      v_item ->> 'name',
      (v_item ->> 'price')::numeric(10, 2),
      (v_item ->> 'quantity')::integer,
      v_item ->> 'size',
      v_item ->> 'color',
      v_item ->> 'universe'
    );
  end loop;

  return v_order_id;
end;
$$;

grant execute on function public.create_order(
  text, text, text, text, text, text, text, jsonb, text, text
) to anon, authenticated;
