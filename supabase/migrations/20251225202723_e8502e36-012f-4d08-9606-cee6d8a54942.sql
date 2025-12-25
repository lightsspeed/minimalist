-- Add source_task_id column to notes table to track which task a note was created from
ALTER TABLE public.notes ADD COLUMN source_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

-- Create an index for faster lookups
CREATE INDEX idx_notes_source_task_id ON public.notes(source_task_id);