-- Migration: Add temperature_score column to plant_placements table
-- Date: 2025-01-21
-- Description: Adds temperature_score column to store AI temperature fit score (1-5)

ALTER TABLE public.plant_placements
ADD COLUMN temperature_score smallint CHECK (temperature_score BETWEEN 1 AND 5);

-- Comment on column
COMMENT ON COLUMN public.plant_placements.temperature_score IS 'AI temperature fit score (1-5), where 1 = poor fit, 5 = excellent fit';

