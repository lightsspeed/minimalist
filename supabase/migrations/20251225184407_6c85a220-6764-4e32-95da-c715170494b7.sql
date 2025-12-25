-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public) 
VALUES ('note-attachments', 'note-attachments', false);

-- RLS policies for note-attachments bucket
-- Users can view their own attachments
CREATE POLICY "Users can view own note attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'note-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can upload their own attachments
CREATE POLICY "Users can upload own note attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'note-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own attachments
CREATE POLICY "Users can delete own note attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'note-attachments' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add attachments column to notes table
ALTER TABLE public.notes ADD COLUMN attachments JSONB DEFAULT '[]'::jsonb;

-- Add subtasks to shared_notes table so subtasks show when sharing tasks
ALTER TABLE public.shared_notes ADD COLUMN subtasks JSONB DEFAULT '[]'::jsonb;