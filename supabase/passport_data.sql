-- ====================================================================
-- AuthentiQ: Passport Data Table
-- Table Name: passport_data
--
-- Stores passport details uploaded by the traveller.
-- Uses strict UPPERCASE constraints and tightened RLS.
-- ====================================================================

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS public.passport_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Traveller's User ID

    -- Passport Fields (enforced UPPERCASE)
    full_name        TEXT NOT NULL CHECK (full_name = upper(full_name)),
    passport_number  TEXT NOT NULL UNIQUE CHECK (passport_number = upper(passport_number)),
    nationality      TEXT NOT NULL CHECK (nationality = upper(nationality)),
    dob              DATE NOT NULL,
    date_of_issue    DATE NOT NULL,
    date_of_expiry   DATE NOT NULL,
    gender           TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
    place_of_issue   TEXT NOT NULL CHECK (place_of_issue = upper(place_of_issue)),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Indexes (excluding UNIQUE columns which auto-index)
CREATE INDEX IF NOT EXISTS idx_passport_user_id ON public.passport_data (user_id);
CREATE INDEX IF NOT EXISTS idx_passport_created ON public.passport_data (created_at DESC);

-- STEP 3: RLS Security
ALTER TABLE public.passport_data ENABLE ROW LEVEL SECURITY;

-- Allowed: Anyone can read/insert (or you can tie this to specific roles if needed)
CREATE POLICY "passport_select_all" ON public.passport_data FOR SELECT USING (true);
CREATE POLICY "passport_insert_all" ON public.passport_data FOR INSERT WITH CHECK (true);

-- Denied: No anonymous updates/deletes
CREATE POLICY "passport_update_none" ON public.passport_data FOR UPDATE USING (false);
CREATE POLICY "passport_delete_none" ON public.passport_data FOR DELETE USING (false);

-- STEP 4: Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_passport_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_passport_updated_at ON public.passport_data;
CREATE TRIGGER trg_passport_updated_at
BEFORE UPDATE ON public.passport_data
FOR EACH ROW EXECUTE FUNCTION public.set_passport_updated_at();
