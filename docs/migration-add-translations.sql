-- Migration: Add translations JSONB column to wines, wineries, and flights tables
-- Structure: { "es": { "name": "...", "description": "..." } }
-- English is the source language stored in the existing columns.

ALTER TABLE wines ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;
ALTER TABLE wineries ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;
ALTER TABLE flights ADD COLUMN IF NOT EXISTS translations jsonb DEFAULT '{}'::jsonb;

-- Index for efficient JSONB lookups on the translations column
CREATE INDEX IF NOT EXISTS idx_wines_translations ON wines USING gin (translations);
CREATE INDEX IF NOT EXISTS idx_wineries_translations ON wineries USING gin (translations);
CREATE INDEX IF NOT EXISTS idx_flights_translations ON flights USING gin (translations);

COMMENT ON COLUMN wines.translations IS 'JSONB map of locale → { field: translated_value }. English is the source in base columns.';
COMMENT ON COLUMN wineries.translations IS 'JSONB map of locale → { field: translated_value }. English is the source in base columns.';
COMMENT ON COLUMN flights.translations IS 'JSONB map of locale → { field: translated_value }. English is the source in base columns.';
