-- Phase 7 (STORE SETTINGS): singleton row for store-wide configuration.
-- Uses the same singleton pattern as homepage_settings (migration 017):
-- id is constrained to always equal 1, seeded once, clients only UPDATE.
--
-- CURRENCY NOTE: currency is stored as a text field but the application
-- enforces EGP as the only supported value. The column exists for
-- completeness and future extensibility — the storefront's formatPrice()
-- function (src/lib/utils.ts) always uses EGP regardless of this column's
-- value. The admin UI presents currency as a read-only display.
--
-- SHIPPING / TAX NOTE: these values mirror the hardcoded constants in
-- create_order() (migration 011). A future migration can replace those
-- constants with reads from this table; for now the admin page shows
-- the current values for transparency.
create table public.store_settings (
  id smallint primary key default 1,
  store_name text not null default 'FandomWear',
  store_email text not null default 'hello@fandomwear.com',
  contact_phone text not null default '',
  contact_address text not null default '',
  -- Currency display only — see note above. EGP is the sole runtime value.
  currency text not null default 'EGP',
  -- Shipping: flat rate when order < free_threshold, 0 when >= threshold.
  shipping_flat_rate numeric(10, 2) not null default 5.99,
  shipping_free_threshold numeric(10, 2) not null default 75.00,
  -- Tax: applied as a fraction (0.08 = 8%).
  tax_rate numeric(5, 4) not null default 0.0800,
  -- Payment method toggles.
  payment_cod_enabled boolean not null default true,
  payment_card_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint store_settings_singleton check (id = 1)
);

-- Seed the single row.
insert into public.store_settings (id) values (1);

create trigger set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

alter table public.store_settings enable row level security;

-- Public read: the storefront may display the store name, contact info, etc.
create policy "Public can read store settings" on public.store_settings
  for select using (true);

-- Admin-only write. No insert/delete policy — singleton enforced by the
-- check constraint; the row is seeded above and only ever updated.
create policy "Admins can update store settings" on public.store_settings
  for update using (public.is_admin())
  with check (public.is_admin());

comment on table public.store_settings is
  'Singleton row (id=1) of store-wide configuration. Public read; admin-only '
  'update. Currency is display-only (EGP always used at runtime). Shipping and '
  'tax values shown for transparency; create_order() uses its own constants '
  'until a future migration wires this table in.';
