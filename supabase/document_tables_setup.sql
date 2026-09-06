-- ====================================================================
-- AuthentiQ: Storage Policies + image_url column patch
--
-- Run this in Supabase SQL Editor ONLY IF you already ran:
--   passport_data.sql, visa_data.sql, aadhaar_data.sql, license_data.sql
--
-- This script:
--   1. Sets up Storage RLS for "document-images" bucket
--   2. Adds image_url column to all 4 existing tables (safe, skips if exists)
-- ====================================================================


-- ─── PART 1: Storage RLS ────────────────────────────────────────────────────
-- Drop first to avoid "already exists" error, then recreate

DROP POLICY IF EXISTS "allow_public_upload_document_images" ON storage.objects;
DROP POLICY IF EXISTS "allow_public_read_document_images"   ON storage.objects;

CREATE POLICY "allow_public_upload_document_images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'document-images');

CREATE POLICY "allow_public_read_document_images"
ON storage.objects FOR SELECT
USING (bucket_id = 'document-images');


-- ─── PART 2: Add image_url column to all 4 tables (IF NOT EXISTS) ───────────

ALTER TABLE public.passport_data
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.visa_data
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.aadhaar_data
  ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.license_data
  ADD COLUMN IF NOT EXISTS image_url TEXT;


-- ─── Verify ─────────────────────────────────────────────────────────────────
SELECT 'passport_data'  AS table_name, COUNT(*) FROM public.passport_data  UNION ALL
SELECT 'visa_data',                    COUNT(*) FROM public.visa_data       UNION ALL
SELECT 'aadhaar_data',                 COUNT(*) FROM public.aadhaar_data    UNION ALL
SELECT 'license_data',                 COUNT(*) FROM public.license_data;
