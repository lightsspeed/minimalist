-- Add RLS policies to share_access_attempts table
-- This table should only be accessible by the service role (Edge Functions)
-- Regular users should have NO access to this table

-- Policy: Deny all SELECT operations for regular users
-- (No policy = no access, but we'll be explicit with a restrictive policy)
CREATE POLICY "No public select access"
ON public.share_access_attempts
FOR SELECT
TO authenticated, anon
USING (false);

-- Policy: Deny all INSERT operations for regular users  
-- Only service role can insert (which bypasses RLS)
CREATE POLICY "No public insert access"
ON public.share_access_attempts
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Policy: Deny all UPDATE operations
CREATE POLICY "No public update access"
ON public.share_access_attempts
FOR UPDATE
TO authenticated, anon
USING (false);

-- Policy: Deny all DELETE operations
CREATE POLICY "No public delete access"
ON public.share_access_attempts
FOR DELETE
TO authenticated, anon
USING (false);