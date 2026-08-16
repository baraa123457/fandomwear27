-- Mirrors src/lib/data/universes.ts (UniverseInfo).
create table public.universes (
  id text primary key,
  label text not null,
  tagline text not null default '',
  color text not null,
  icon text not null,
  -- Legacy display field carried over from the mock data as-is. It is not
  -- derived from `products` and can drift; a future pass may replace reads
  -- of this column with `select count(*) from products where universe = id`.
  product_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.universes
  for each row execute function public.set_updated_at();

alter table public.universes enable row level security;

comment on table public.universes is 'Catalog universes (Marvel, DC, etc). Public read-only catalog data.';
