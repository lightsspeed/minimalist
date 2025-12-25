-- Add is_template column to tasks table
ALTER TABLE public.tasks ADD COLUMN is_template boolean NOT NULL DEFAULT false;

-- Create index for templates
CREATE INDEX idx_tasks_is_template ON public.tasks(is_template);