-- Add analytics fields to health_goals table
ALTER TABLE public.health_goals
ADD COLUMN IF NOT EXISTS starting_weight_kg NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS ai_analysis TEXT,
ADD COLUMN IF NOT EXISTS estimated_weeks TEXT;
