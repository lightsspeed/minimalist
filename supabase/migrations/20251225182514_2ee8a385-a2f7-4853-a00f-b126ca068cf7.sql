-- Add position column to tasks for ordering
ALTER TABLE public.tasks ADD COLUMN position INTEGER DEFAULT 0;

-- Add position column to subtasks for ordering
ALTER TABLE public.subtasks ADD COLUMN position INTEGER DEFAULT 0;

-- Create shared_personal_notes table for sharing notes
CREATE TABLE public.shared_personal_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  note_id UUID NOT NULL REFERENCES public.notes(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'Shared Note',
  content TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  delete_after_reading BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shared_personal_notes ENABLE ROW LEVEL SECURITY;

-- Anyone can view shared notes by token
CREATE POLICY "Anyone can view shared personal notes by token" 
ON public.shared_personal_notes 
FOR SELECT 
USING (true);

-- Note owners can create shared notes
CREATE POLICY "Note owners can create shared personal notes" 
ON public.shared_personal_notes 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = shared_personal_notes.note_id AND notes.user_id = auth.uid()
));

-- Note owners can delete shared notes
CREATE POLICY "Note owners can delete shared personal notes" 
ON public.shared_personal_notes 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.notes 
  WHERE notes.id = shared_personal_notes.note_id AND notes.user_id = auth.uid()
));

-- Allow updating is_read for delete after reading functionality
CREATE POLICY "Anyone can update is_read on shared personal notes" 
ON public.shared_personal_notes 
FOR UPDATE 
USING (true)
WITH CHECK (true);