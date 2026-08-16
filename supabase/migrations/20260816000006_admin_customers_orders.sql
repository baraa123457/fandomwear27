-- Mirrors src/lib/data/admin.ts (Customer, AdminOrder). This is the
-- admin-dashboard view of customers/orders as it exists today — a flat,
-- email-keyed record with no auth linkage and no line items. The later
-- AUTHENTICATION and ORDERS/CHECKOUT phases will add `profiles`,
-- `order_items`, and a proper order-creation function; this migration only
-- reproduces what the admin mock data already models, per Phase 2 scope.
create table public.customers (
  id text primary key,
  name text not null,
  email text not null unique,
  orders integer not null default 0 check (orders >= 0),
  total_spent numeric(10, 2) not null default 0 check (total_spent >= 0),
  joined timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.customers
  for each row execute function public.set_updated_at();

create table public.orders (
  id text primary key,
  customer text not null,
  email text not null,
  order_date timestamptz not null default now(),
  items integer not null check (items >= 0),
  total numeric(10, 2) not null check (total >= 0),
  status public.admin_order_status not null default 'processing',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_email_idx on public.orders(email);
create index orders_status_idx on public.orders(status);

create trigger set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.orders enable row level security;

comment on table public.customers is 'Admin-dashboard customer records. Locked down (no policies) until the ADMIN phase adds is_admin()-gated access.';
comment on table public.orders is 'Admin-dashboard order records. Locked down (no policies) until the ADMIN / ORDERS phases add proper access.';
