-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- Create policies for subtasks (via task ownership)
CREATE POLICY "Users can view subtasks of their own tasks" 
ON public.subtasks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can create subtasks for their own tasks" 
ON public.subtasks 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can update subtasks of their own tasks" 
ON public.subtasks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

CREATE POLICY "Users can delete subtasks of their own tasks" 
ON public.subtasks 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.tasks 
  WHERE tasks.id = subtasks.task_id AND tasks.user_id = auth.uid()
));

-- Add trigger for updated_at
CREATE TRIGGER update_subtasks_updated_at
BEFORE UPDATE ON public.subtasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create notes table
CREATE TABLE public.notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- Create policies for notes
CREATE POLICY "Users can view their own notes" 
ON public.notes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes" 
ON public.notes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes" 
ON public.notes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes" 
ON public.notes 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();