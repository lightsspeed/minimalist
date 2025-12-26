-- Drop ALL existing RLS policies on profiles table
DROP POLICY IF EXISTS "Users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can only insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous select access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous insert access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Deny anonymous update access to profiles" ON public.profiles;

-- Create single, clear policies for authenticated users only
-- Anonymous users are implicitly denied since no policy grants them access
CREATE POLICY "Authenticated users can only view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can only update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can only insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);