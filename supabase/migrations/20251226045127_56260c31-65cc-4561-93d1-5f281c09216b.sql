-- ==========================================
-- SECURE RLS POLICIES MIGRATION
-- ==========================================

-- 1. Drop insecure public policies
DROP POLICY IF EXISTS "Anyone can view shared notes by token" ON shared_notes;
DROP POLICY IF EXISTS "Anyone can view shared personal notes by token" ON shared_personal_notes;
DROP POLICY IF EXISTS "Anyone can update is_read on shared personal notes" ON shared_personal_notes;

-- 2. Create secure function to verify share token access for shared_notes
CREATE OR REPLACE FUNCTION public.get_shared_note_by_token(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  task_id UUID,
  title TEXT,
  description TEXT,
  tags TEXT[],
  subtasks JSONB,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sn.id,
    sn.task_id,
    sn.title,
    sn.description,
    sn.tags,
    sn.subtasks,
    sn.password_hash,
    sn.expires_at,
    sn.created_at
  FROM shared_notes sn
  WHERE sn.share_token = p_share_token
    AND (sn.expires_at IS NULL OR sn.expires_at > NOW());
END;
$$;

-- 3. Create secure function to verify share token access for shared_personal_notes
CREATE OR REPLACE FUNCTION public.get_shared_personal_note_by_token(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  title TEXT,
  content TEXT,
  password_hash TEXT,
  expires_at TIMESTAMPTZ,
  is_read BOOLEAN,
  delete_after_reading BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    spn.id,
    spn.note_id,
    spn.title,
    spn.content,
    spn.password_hash,
    spn.expires_at,
    spn.is_read,
    spn.delete_after_reading,
    spn.created_at
  FROM shared_personal_notes spn
  WHERE spn.share_token = p_share_token
    AND (spn.expires_at IS NULL OR spn.expires_at > NOW());
END;
$$;

-- 4. Create function to mark shared personal note as read (restricted to is_read only)
CREATE OR REPLACE FUNCTION public.mark_shared_note_as_read(p_share_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_note_id UUID;
  v_delete_after_reading BOOLEAN;
BEGIN
  -- Get the note and check if it exists
  SELECT id, delete_after_reading INTO v_note_id, v_delete_after_reading
  FROM shared_personal_notes
  WHERE share_token = p_share_token
    AND (expires_at IS NULL OR expires_at > NOW());
  
  IF v_note_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Mark as read
  UPDATE shared_personal_notes
  SET is_read = TRUE
  WHERE id = v_note_id;
  
  -- Delete if delete_after_reading is enabled
  IF v_delete_after_reading THEN
    DELETE FROM shared_personal_notes WHERE id = v_note_id;
  END IF;
  
  RETURN TRUE;
END;
$$;

-- 5. Create restrictive policies - only owners can access via direct table queries
-- Public access is now via the security definer functions above

-- shared_notes: Only task owners can SELECT directly
CREATE POLICY "Task owners can view their shared notes"
ON shared_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM tasks
  WHERE tasks.id = shared_notes.task_id
  AND tasks.user_id = auth.uid()
));

-- shared_personal_notes: Only note owners can SELECT directly
CREATE POLICY "Note owners can view their shared personal notes"
ON shared_personal_notes FOR SELECT
USING (EXISTS (
  SELECT 1 FROM notes
  WHERE notes.id = shared_personal_notes.note_id
  AND notes.user_id = auth.uid()
));

-- shared_personal_notes: Only note owners can UPDATE
CREATE POLICY "Note owners can update their shared personal notes"
ON shared_personal_notes FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM notes
  WHERE notes.id = shared_personal_notes.note_id
  AND notes.user_id = auth.uid()
));