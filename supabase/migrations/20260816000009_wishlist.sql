-- Phase 4 (WISHLIST): mirrors the Set<string> of product ids WishlistContext
-- used to keep in localStorage. Composite PK doubles as the "is this product
-- already saved" index and de-dupes toggles for free.

create table public.wishlist_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index wishlist_items_user_id_idx on public.wishlist_items(user_id);

alter table public.wishlist_items enable row level security;

create policy "Users manage own wishlist" on public.wishlist_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

comment on table public.wishlist_items is 'Signed-in wishlist. Signed-out visitors keep using the existing localStorage-only behavior (see WishlistContext).';
