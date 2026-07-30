/*
  # Fix handle_new_user trigger + drop temporary introspection helper

  handle_new_user() (defined outside this repo's migrations, discovered via
  introspection) did:
    insert into public.profiles (id, full_name)
    values (new.id, new.raw_user_meta_data->>'full_name');

  The app's real signup form (AuthContext.signUp) always passes full_name in
  the auth metadata, so this works for normal UI signups. But profiles.full_name
  is NOT NULL with no fallback here, so ANY signup path that doesn't supply
  full_name metadata (e.g. admin-created users via the Supabase Admin API)
  fails signup entirely with a 500 "Database error creating new user".

  Add a safe fallback (email local-part, then empty string) so the trigger
  never fails regardless of how the user was created.
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP FUNCTION IF EXISTS public._tmp_introspect_auth_trigger();
