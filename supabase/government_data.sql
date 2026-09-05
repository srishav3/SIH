-- ====================================================================
-- AuthentiQ: Government Records Table
-- Table Name: government_records
--
-- Run this entire file in your Supabase SQL Editor:
--   Supabase Dashboard  SQL Editor  New Query  Paste  Run
--
-- This table stores traveller identity records registered by
-- immigration officers. It has NO foreign key dependencies so
-- it works independently of the profiles table.
--
-- Data format enforced at application level (all UPPERCASE):
--   full_name    → UPPERCASE  (e.g. "RAJESH KUMAR SHARMA")
--   gender       → UPPERCASE  (MALE / FEMALE / OTHER)
--   nationality  → UPPERCASE  (e.g. "INDIAN")
--   passport_no  → UPPERCASE  (e.g. "R1234567")
--   visa_no      → UPPERCASE  (e.g. "V-9930218")
--   aadhaar_no   → 12 digits, no spaces (e.g. "123456789012")
--   dob          → DATE type  → stored as yyyy-mm-dd
--
-- SHA-256 identity_hash is computed from:
--   full_name | passport_no | visa_no | aadhaar_no | dob | gender | nationality
--   (pipe-delimited, all values in UPPERCASE as stored above)
-- ====================================================================


-- STEP 1: Create the government_records table
CREATE TABLE IF NOT EXISTS public.government_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal Information (stored in UPPERCASE)
    full_name   TEXT        NOT NULL CHECK (full_name = upper(full_name)),
    dob         DATE        NOT NULL,
    gender      TEXT        NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    nationality TEXT        NOT NULL CHECK (nationality = upper(nationality)),

    -- Document Numbers (each must be globally unique)
    passport_no  TEXT NOT NULL UNIQUE CHECK (passport_no = upper(passport_no)),
    visa_no      TEXT UNIQUE CHECK (visa_no IS NULL OR visa_no = upper(visa_no)),
    aadhaar_no   TEXT NOT NULL UNIQUE CHECK (aadhaar_no ~ '^\d{12}$'),

    -- SHA-256 fingerprint of all 7 identity fields (pipe-delimited)
    identity_hash TEXT NOT NULL UNIQUE,

    -- Who registered this record (officer user_id, plain text, no FK)
    created_by_officer TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- STEP 2: Indexes for fast lookups
-- (passport, visa, aadhaar, and identity_hash already have unique indexes due to UNIQUE constraint)
CREATE INDEX IF NOT EXISTS idx_gov_records_officer   ON public.government_records (created_by_officer);
CREATE INDEX IF NOT EXISTS idx_gov_records_created   ON public.government_records (created_at DESC);


-- STEP 3: Enable Row Level Security (RLS)
ALTER TABLE public.government_records ENABLE ROW LEVEL SECURITY;


-- STEP 4: RLS Policies (tightened)
CREATE POLICY "gov_records_select_all"
ON public.government_records FOR SELECT USING (true);

CREATE POLICY "gov_records_insert_all"
ON public.government_records FOR INSERT WITH CHECK (true);

-- Disable anonymous update and delete to reduce security risk
CREATE POLICY "gov_records_update_none"
ON public.government_records FOR UPDATE USING (false);

CREATE POLICY "gov_records_delete_none"
ON public.government_records FOR DELETE USING (false);


-- STEP 5: Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gov_records_updated_at ON public.government_records;
CREATE TRIGGER trg_gov_records_updated_at
BEFORE UPDATE ON public.government_records
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- STEP 6: Verify (should return 0 rows)
SELECT COUNT(*) AS total_records FROM public.government_records;
