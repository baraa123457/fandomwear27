-- Mirrors the Review shape produced by src/lib/data/reviews.ts.
-- The mock version procedurally generates reviews per product on every
-- render; this table stores real rows instead, seeded (Phase 2 seed.sql)
-- with output from that same generator so existing pages render identically
-- until the AUTHENTICATION phase lets real customers leave their own.
create table public.reviews (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  -- Nullable now; becomes NOT NULL-ish in practice once the AUTHENTICATION
  -- phase adds real reviewers (profiles.id). Left null for seeded/legacy rows.
  author text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '',
  body text not null default '',
  review_date timestamptz not null default now(),
  verified boolean not null default false,
  size public.product_size,
  created_at timestamptz not null default now()
);

create index reviews_product_id_idx on public.reviews(product_id);

alter table public.reviews enable row level security;

comment on table public.reviews is 'Product reviews. Public read-only for now; write policy added once auth exists.';
