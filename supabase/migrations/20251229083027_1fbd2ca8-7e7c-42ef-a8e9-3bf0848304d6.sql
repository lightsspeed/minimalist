-- Create a table to store application metrics
CREATE TABLE public.app_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name text NOT NULL,
  metric_value numeric NOT NULL DEFAULT 0,
  labels jsonb DEFAULT '{}'::jsonb,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_app_metrics_name ON public.app_metrics(metric_name);
CREATE INDEX idx_app_metrics_recorded_at ON public.app_metrics(recorded_at);

-- Enable RLS
ALTER TABLE public.app_metrics ENABLE ROW LEVEL SECURITY;

-- Only service role can access metrics (for edge functions)
CREATE POLICY "Service role can manage metrics"
ON public.app_metrics
FOR ALL
USING (false)
WITH CHECK (false);

-- Create a function to increment a counter metric
CREATE OR REPLACE FUNCTION public.increment_metric(
  p_metric_name text,
  p_labels jsonb DEFAULT '{}'::jsonb,
  p_increment numeric DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.app_metrics (metric_name, metric_value, labels, recorded_at)
  VALUES (p_metric_name, p_increment, p_labels, now());
END;
$$;

-- Create a function to get aggregated metrics
CREATE OR REPLACE FUNCTION public.get_aggregated_metrics()
RETURNS TABLE (
  metric_name text,
  labels jsonb,
  total_value numeric,
  count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    metric_name,
    labels,
    SUM(metric_value) as total_value,
    COUNT(*) as count
  FROM public.app_metrics
  WHERE recorded_at > now() - interval '1 hour'
  GROUP BY metric_name, labels;
$$;

-- Create function to get user activity stats
CREATE OR REPLACE FUNCTION public.get_user_activity_stats()
RETURNS TABLE (
  total_users bigint,
  tasks_created_today bigint,
  tasks_completed_today bigint,
  notes_created_today bigint,
  active_users_today bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (SELECT COUNT(DISTINCT user_id) FROM profiles) as total_users,
    (SELECT COUNT(*) FROM tasks WHERE created_at >= CURRENT_DATE) as tasks_created_today,
    (SELECT COUNT(*) FROM tasks WHERE completed_at >= CURRENT_DATE) as tasks_completed_today,
    (SELECT COUNT(*) FROM notes WHERE created_at >= CURRENT_DATE) as notes_created_today,
    (SELECT COUNT(DISTINCT user_id) FROM tasks WHERE created_at >= CURRENT_DATE OR updated_at >= CURRENT_DATE) as active_users_today;
$$;

-- Create function to get database stats
CREATE OR REPLACE FUNCTION public.get_database_stats()
RETURNS TABLE (
  table_name text,
  row_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 'tasks'::text, COUNT(*) FROM tasks
  UNION ALL
  SELECT 'notes'::text, COUNT(*) FROM notes
  UNION ALL
  SELECT 'subtasks'::text, COUNT(*) FROM subtasks
  UNION ALL
  SELECT 'profiles'::text, COUNT(*) FROM profiles
  UNION ALL
  SELECT 'shared_notes'::text, COUNT(*) FROM shared_notes
  UNION ALL
  SELECT 'shared_personal_notes'::text, COUNT(*) FROM shared_personal_notes;
$$;