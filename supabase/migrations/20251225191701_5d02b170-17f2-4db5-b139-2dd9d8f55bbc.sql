-- Add folders and tags columns to notes table
ALTER TABLE public.notes 
ADD COLUMN folder TEXT DEFAULT NULL,
ADD COLUMN tags TEXT[] DEFAULT '{}'::text[];