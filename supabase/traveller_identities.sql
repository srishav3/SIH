-- ====================================================================
-- AuthentiQ: Traveller Identities Table  (UPDATED)
-- Run this in your Supabase SQL editor
--
-- Data format enforced at application level:
--   full_name    → Title Case  (e.g. "Rajesh Kumar Sharma")
--   gender       → Title Case  (Male / Female / Other)
--   nationality  → Title Case  (e.g. "Indian")
--   passport_no  → UPPERCASE   (e.g. "R1234567")
--   visa_no      → UPPERCASE   (e.g. "V-9930218")
--   aadhaar_no   → 12 digits, no spaces (e.g. "123456789012")
--   dob          → DATE type   → stored as yyyy-mm-dd
--
-- SHA-256 identity_hash = sha256(
--   full_name | passport_no | visa_no | aadhaar_no | dob | gender | nationality
-- )  ← exact stored format, pipe-delimited
-- ====================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Create TRAVELLER_IDENTITIES Table (fresh install)
--    If the table already exists, this is a no-op.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.traveller_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Personal Information
    full_name   TEXT NOT NULL,
    dob         DATE NOT NULL,
    gender      TEXT NOT NULL CHECK (gender IN ('Male', 'Female', 'Other')),
    nationality TEXT NOT NULL,

    -- Document Numbers (all UNIQUE)
    passport_no   TEXT NOT NULL UNIQUE,
    visa_no       TEXT NOT NULL UNIQUE,
    aadhaar_no    TEXT NOT NULL UNIQUE,

    -- SHA-256 of 7 identity fields (same format as stored)
    identity_hash TEXT NOT NULL UNIQUE,

    -- Audit (stored in DB, NOT part of the hash)
    created_by_officer TEXT REFERENCES public.profiles(user_id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Migration: safely add UNIQUE on visa_no if it doesn't already exist.
--    (ADD CONSTRAINT IF NOT EXISTS is not valid Postgres syntax, so we use
--     a DO block that checks pg_constraint first.)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint
    WHERE  conname = 'traveller_identities_visa_no_key'
  ) THEN
    ALTER TABLE public.traveller_identities
      ADD CONSTRAINT traveller_identities_visa_no_key UNIQUE (visa_no);
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Indexes for Fast Lookups
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_traveller_identities_passport ON public.traveller_identities(passport_no);
CREATE INDEX IF NOT EXISTS idx_traveller_identities_visa     ON public.traveller_identities(visa_no);
CREATE INDEX IF NOT EXISTS idx_traveller_identities_aadhaar  ON public.traveller_identities(aadhaar_no);
CREATE INDEX IF NOT EXISTS idx_traveller_identities_hash     ON public.traveller_identities(identity_hash);
CREATE INDEX IF NOT EXISTS idx_traveller_identities_officer  ON public.traveller_identities(created_by_officer);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Enable Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.traveller_identities ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. RLS Policies
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "Allow public read traveller_identities"
ON public.traveller_identities FOR SELECT
USING (true);

CREATE POLICY "Allow insert traveller_identities"
ON public.traveller_identities FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow update traveller_identities"
ON public.traveller_identities FOR UPDATE
USING (true);
