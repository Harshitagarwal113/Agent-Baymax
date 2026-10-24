-- Add serving_size to nutrition_logs
ALTER TABLE public.nutrition_logs 
ADD COLUMN IF NOT EXISTS serving_size TEXT;
