-- ==========================================
-- SECURITY HARDENING: Restrict policies to authenticated + stop exposing password_hash
-- ==========================================

-- 1) Recreate RLS policies with explicit TO authenticated (removes anon/public role)

-- profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- notes
DROP POLICY IF EXISTS "Users can view their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON public.notes;

CREATE POLICY "Users can view their own notes"
ON public.notes
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
ON public.notes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
ON public.notes
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
ON public.notes
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- tasks
DROP POLICY IF EXISTS "Users can view their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can create their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON public.tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON public.tasks;

CREATE POLICY "Users can view their own tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- subtasks
DROP POLICY IF EXISTS "Users can view subtasks of their own tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can create subtasks for their own tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can update subtasks of their own tasks" ON public.subtasks;
DROP POLICY IF EXISTS "Users can delete subtasks of their own tasks" ON public.subtasks;

CREATE POLICY "Users can view subtasks of their own tasks"
ON public.subtasks
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create subtasks for their own tasks"
ON public.subtasks
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update subtasks of their own tasks"
ON public.subtasks
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete subtasks of their own tasks"
ON public.subtasks
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = subtasks.task_id
      AND tasks.user_id = auth.uid()
  )
);

-- shared_notes
DROP POLICY IF EXISTS "Task owners can view their shared notes" ON public.shared_notes;
DROP POLICY IF EXISTS "Task owners can create shared notes" ON public.shared_notes;
DROP POLICY IF EXISTS "Task owners can delete shared notes" ON public.shared_notes;

CREATE POLICY "Task owners can view their shared notes"
ON public.shared_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = shared_notes.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Task owners can create shared notes"
ON public.shared_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = shared_notes.task_id
      AND tasks.user_id = auth.uid()
  )
);

CREATE POLICY "Task owners can delete shared notes"
ON public.shared_notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks
    WHERE tasks.id = shared_notes.task_id
      AND tasks.user_id = auth.uid()
  )
);

-- shared_personal_notes
DROP POLICY IF EXISTS "Note owners can view their shared personal notes" ON public.shared_personal_notes;
DROP POLICY IF EXISTS "Note owners can create shared personal notes" ON public.shared_personal_notes;
DROP POLICY IF EXISTS "Note owners can update their shared personal notes" ON public.shared_personal_notes;
DROP POLICY IF EXISTS "Note owners can delete shared personal notes" ON public.shared_personal_notes;

CREATE POLICY "Note owners can view their shared personal notes"
ON public.shared_personal_notes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = shared_personal_notes.note_id
      AND notes.user_id = auth.uid()
  )
);

CREATE POLICY "Note owners can create shared personal notes"
ON public.shared_personal_notes
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = shared_personal_notes.note_id
      AND notes.user_id = auth.uid()
  )
);

CREATE POLICY "Note owners can update their shared personal notes"
ON public.shared_personal_notes
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = shared_personal_notes.note_id
      AND notes.user_id = auth.uid()
  )
);

CREATE POLICY "Note owners can delete shared personal notes"
ON public.shared_personal_notes
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.notes
    WHERE notes.id = shared_personal_notes.note_id
      AND notes.user_id = auth.uid()
  )
);

-- 2) Replace token access functions so they DO NOT return password_hash and do not leak content without password

DROP FUNCTION IF EXISTS public.get_shared_note_by_token(TEXT);
DROP FUNCTION IF EXISTS public.get_shared_personal_note_by_token(TEXT);

-- Preview (no content, no hash) for existence checks
CREATE OR REPLACE FUNCTION public.shared_note_preview(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT sn.id, sn.created_at
  FROM public.shared_notes sn
  WHERE sn.share_token = p_share_token
    AND (sn.expires_at IS NULL OR sn.expires_at > NOW())
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.shared_personal_note_preview(p_share_token TEXT)
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  delete_after_reading BOOLEAN,
  is_read BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT spn.id, spn.created_at, spn.expires_at, spn.delete_after_reading, spn.is_read
  FROM public.shared_personal_notes spn
  WHERE spn.share_token = p_share_token
  LIMIT 1;
$$;

-- Fetch only after password verification (no password_hash returned)
CREATE OR REPLACE FUNCTION public.fetch_shared_note(p_share_token TEXT, p_password_hash TEXT)
RETURNS TABLE (
  id UUID,
  task_id UUID,
  title TEXT,
  description TEXT,
  tags TEXT[],
  subtasks JSONB,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT sn.password_hash INTO v_hash
  FROM public.shared_notes sn
  WHERE sn.share_token = p_share_token
    AND (sn.expires_at IS NULL OR sn.expires_at > NOW())
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN;
  END IF;

  IF v_hash <> p_password_hash THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT sn.id, sn.task_id, sn.title, sn.description, sn.tags, sn.subtasks, sn.expires_at, sn.created_at
  FROM public.shared_notes sn
  WHERE sn.share_token = p_share_token
    AND (sn.expires_at IS NULL OR sn.expires_at > NOW())
  LIMIT 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.fetch_shared_personal_note(p_share_token TEXT, p_password_hash TEXT)
RETURNS TABLE (
  id UUID,
  note_id UUID,
  title TEXT,
  content TEXT,
  expires_at TIMESTAMPTZ,
  is_read BOOLEAN,
  delete_after_reading BOOLEAN,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  SELECT spn.password_hash INTO v_hash
  FROM public.shared_personal_notes spn
  WHERE spn.share_token = p_share_token
    AND (spn.expires_at IS NULL OR spn.expires_at > NOW())
  LIMIT 1;

  IF v_hash IS NULL THEN
    RETURN;
  END IF;

  IF v_hash <> p_password_hash THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT spn.id, spn.note_id, spn.title, spn.content, spn.expires_at, spn.is_read, spn.delete_after_reading, spn.created_at
  FROM public.shared_personal_notes spn
  WHERE spn.share_token = p_share_token
    AND (spn.expires_at IS NULL OR spn.expires_at > NOW())
  LIMIT 1;
END;
$$;