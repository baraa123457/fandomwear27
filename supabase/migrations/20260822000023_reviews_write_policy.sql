-- Enable customer insert policy for product reviews
alter table public.reviews enable row level security;

drop policy if exists "Allow public read reviews" on public.reviews;
create policy "Allow public read reviews" on public.reviews for select using (true);

drop policy if exists "Allow customer write reviews" on public.reviews;
create policy "Allow customer write reviews" on public.reviews for insert with check (true);
