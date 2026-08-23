-- Run this in Supabase SQL Editor
-- Creates a secure RPC function that lets a logged-in user delete their own account

create or replace function delete_user()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  calling_user_id uuid;
begin
  -- Get the currently authenticated user
  calling_user_id := auth.uid();

  if calling_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete profile row (cascades to wishlist, etc. if FK is set)
  delete from public.profiles where id = calling_user_id;

  -- Delete the auth user (requires security definer to access auth schema)
  delete from auth.users where id = calling_user_id;
end;
$$;

-- Grant execute permission to authenticated users only
revoke execute on function delete_user() from public;
grant execute on function delete_user() to authenticated;
