-- ====================================================================
-- AuthentiQ: Aadhaar Data Table
-- Table Name: aadhaar_data
--
-- Stores Aadhaar details uploaded by the traveller.
-- Uses strict UPPERCASE constraints, 12-digit format checks, and tightened RLS.
-- ====================================================================

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS public.aadhaar_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Traveller's User ID

    -- Aadhaar Fields
    full_name      TEXT NOT NULL CHECK (full_name = upper(full_name)),
    aadhaar_number TEXT NOT NULL UNIQUE CHECK (aadhaar_number ~ '^\d{12}$'),
    dob            DATE NOT NULL,
    gender         TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    guardian_name  TEXT CHECK (guardian_name IS NULL OR guardian_name = upper(guardian_name)),
    address        TEXT NOT NULL CHECK (address = upper(address)),
    pincode        TEXT NOT NULL CHECK (pincode ~ '^\d{6}$'),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Indexes (excluding UNIQUE columns which auto-index)
CREATE INDEX IF NOT EXISTS idx_aadhaar_user_id ON public.aadhaar_data (user_id);
CREATE INDEX IF NOT EXISTS idx_aadhaar_created ON public.aadhaar_data (created_at DESC);

-- STEP 3: RLS Security
ALTER TABLE public.aadhaar_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "aadhaar_select_all" ON public.aadhaar_data FOR SELECT USING (true);
CREATE POLICY "aadhaar_insert_all" ON public.aadhaar_data FOR INSERT WITH CHECK (true);
CREATE POLICY "aadhaar_update_none" ON public.aadhaar_data FOR UPDATE USING (false);
CREATE POLICY "aadhaar_delete_none" ON public.aadhaar_data FOR DELETE USING (false);

-- STEP 4: Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_aadhaar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_aadhaar_updated_at ON public.aadhaar_data;
CREATE TRIGGER trg_aadhaar_updated_at
BEFORE UPDATE ON public.aadhaar_data
FOR EACH ROW EXECUTE FUNCTION public.set_aadhaar_updated_at();
