-- Phase 2: shared setup used by every table that follows.
-- Enums mirror the union types already defined in src/lib/types.ts and the
-- data files, so the schema stays a direct translation of the mock data.

create extension if not exists "pgcrypto";

create type public.product_size as enum ('S', 'M', 'L', 'XL', 'XXL');

create type public.product_tag as enum ('new', 'bestseller', 'sale', 'limited');

create type public.discount_type as enum ('percentage', 'fixed');

create type public.admin_order_status as enum ('processing', 'shipped', 'delivered', 'cancelled');

-- Generic "keep updated_at current" trigger, reused by every table below
-- that has an updated_at column.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
