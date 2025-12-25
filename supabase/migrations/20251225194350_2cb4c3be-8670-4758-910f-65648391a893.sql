-- Add parent_id column for nested subtasks
ALTER TABLE public.subtasks 
ADD COLUMN parent_id UUID REFERENCES public.subtasks(id) ON DELETE CASCADE DEFAULT NULL;

-- Create index for faster nested queries
CREATE INDEX idx_subtasks_parent_id ON public.subtasks(parent_id);