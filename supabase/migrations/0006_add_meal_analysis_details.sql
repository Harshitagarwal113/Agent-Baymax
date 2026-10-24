-- Add detailed meal analysis fields to meal_analysis table
ALTER TABLE public.meal_analysis 
ADD COLUMN IF NOT EXISTS detected_items JSONB,
ADD COLUMN IF NOT EXISTS confidence INTEGER,
ADD COLUMN IF NOT EXISTS confidence_explanation TEXT;
