-- Add DELETE policy for profiles table
CREATE POLICY "Only authenticated users can delete their own profile"
ON public.profiles
FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);