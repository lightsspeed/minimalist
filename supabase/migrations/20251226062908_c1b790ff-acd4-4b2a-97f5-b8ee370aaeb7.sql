-- Fix profiles table RLS policies
DROP POLICY IF EXISTS "Authenticated users can only view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can only update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can only insert their own profile" ON public.profiles;

-- Create policies with explicit auth.uid() IS NOT NULL check
CREATE POLICY "Only authenticated users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Fix notes table RLS policies
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

-- Create policies with explicit auth.uid() IS NOT NULL check
CREATE POLICY "Only authenticated users can view their own notes"
ON public.notes
FOR SELECT
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can create their own notes"
ON public.notes
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can update their own notes"
ON public.notes
FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "Only authenticated users can delete their own notes"
ON public.notes
FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);