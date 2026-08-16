-- The mock app has two overlapping shapes for the same concept:
--   src/lib/data/coupons.ts       DiscountCode  { code, type, value, active, expires }
--   src/lib/data/admin.ts         DiscountCode  { id, code, type, value, uses, maxUses, active, expires }
-- These are unified into one table. `uses` / `max_uses` are nullable so
-- codes that only ever existed in the public list (no admin-tracked cap)
-- seed cleanly with unlimited use.
create table public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type public.discount_type not null,
  value numeric(10, 2) not null check (value >= 0),
  active boolean not null default true,
  expires date not null,
  uses integer not null default 0 check (uses >= 0),
  max_uses integer check (max_uses is null or max_uses >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.coupons
  for each row execute function public.set_updated_at();

alter table public.coupons enable row level security;

comment on table public.coupons is 'Discount codes. Validation (active/expires/max_uses) enforced in application code and, from the ORDERS phase on, in the order-creation Postgres function.';
