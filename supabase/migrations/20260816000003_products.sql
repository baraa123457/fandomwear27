-- Mirrors src/lib/data/products.ts (Product) / src/lib/types.ts.
create table public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  universe text not null references public.universes(id) on update cascade,
  category text not null,
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2) check (compare_at_price is null or compare_at_price >= 0),
  description text not null default '',
  material text not null default '',
  sizes public.product_size[] not null default '{}',
  -- [{ "name": "Void Black", "hex": "#0B0B0D" }, ...]
  colors jsonb not null default '[]',
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  review_count integer not null default 0 check (review_count >= 0),
  stock integer not null default 0 check (stock >= 0),
  tags public.product_tag[] not null default '{}',
  art_icon text not null default '',
  -- Optional uploaded product photo. Data URLs from the current mock UI are
  -- large; this column accepts either a data URL (legacy) or, once storage
  -- is wired up in a later phase, a Supabase Storage public URL.
  image text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_universe_idx on public.products(universe);
create index products_tags_idx on public.products using gin(tags);
create index products_category_idx on public.products(category);

create trigger set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

alter table public.products enable row level security;

comment on table public.products is 'Product catalog. Public read-only; writes are admin-only (added in the ADMIN phase).';
