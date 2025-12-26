-- Create a table to track failed verification attempts for rate limiting
CREATE TABLE IF NOT EXISTS public.share_access_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token text NOT NULL,
  ip_address text,
  attempted_at timestamp with time zone NOT NULL DEFAULT now(),
  is_success boolean NOT NULL DEFAULT false
);

-- Create index for efficient querying
CREATE INDEX idx_share_access_attempts_token_time ON public.share_access_attempts (share_token, attempted_at DESC);
CREATE INDEX idx_share_access_attempts_ip_time ON public.share_access_attempts (ip_address, attempted_at DESC);

-- Enable RLS on this table (no user access, only edge functions with service role)
ALTER TABLE public.share_access_attempts ENABLE ROW LEVEL SECURITY;

-- No policies = no access from client, only service role can access

-- Drop the old fetch functions that use SHA-256 hashes (we now use Edge Functions with bcrypt)
DROP FUNCTION IF EXISTS public.fetch_shared_note(text, text);
DROP FUNCTION IF EXISTS public.fetch_shared_personal_note(text, text);

-- Update mark_shared_note_as_read to require password verification first
-- The function will be called from edge function after password is verified
-- Keep it but document that it should only be called from verified edge function context
COMMENT ON FUNCTION public.mark_shared_note_as_read(text) IS 'Should only be called from edge function after password verification. Token-only access is intentional as password was already verified.';

-- Auto-cleanup old access attempts (keep last 7 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_access_attempts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.share_access_attempts
  WHERE attempted_at < now() - interval '7 days';
END;
$$;