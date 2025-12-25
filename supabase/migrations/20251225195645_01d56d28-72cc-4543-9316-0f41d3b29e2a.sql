-- Add is_pinned to tasks table
ALTER TABLE public.tasks ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Add due_date to tasks table
ALTER TABLE public.tasks ADD COLUMN due_date timestamp with time zone DEFAULT NULL;

-- Add is_pinned to notes table
ALTER TABLE public.notes ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX idx_tasks_is_pinned ON public.tasks(is_pinned);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_notes_is_pinned ON public.notes(is_pinned);