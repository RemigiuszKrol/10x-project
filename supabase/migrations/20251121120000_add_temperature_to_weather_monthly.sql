-- Migration: Add temperature column to weather_monthly table
-- Date: 2025-01-21
-- Description: Adds temperature column to store normalized monthly average temperature (0-100)

ALTER TABLE public.weather_monthly
ADD COLUMN temperature smallint NOT NULL DEFAULT 0 CHECK (temperature BETWEEN 0 AND 100);

-- Comment on column
COMMENT ON COLUMN public.weather_monthly.temperature IS 'Normalized monthly average temperature (0-100), where 0 = -30°C and 100 = +50°C';

