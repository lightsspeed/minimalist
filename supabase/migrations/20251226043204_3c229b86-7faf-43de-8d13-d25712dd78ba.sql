-- Add completed_at column to tasks table
ALTER TABLE public.tasks 
ADD COLUMN completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Update existing completed tasks to have completed_at set to their updated_at
UPDATE public.tasks 
SET completed_at = updated_at 
WHERE is_completed = true;