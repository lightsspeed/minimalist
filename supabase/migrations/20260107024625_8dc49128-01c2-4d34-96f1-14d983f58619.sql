-- Add repeat_daily column to tasks table
ALTER TABLE public.tasks ADD COLUMN repeat_daily boolean NOT NULL DEFAULT false;