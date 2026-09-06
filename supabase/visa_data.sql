-- ====================================================================
-- AuthentiQ: Visa Data Table
-- Table Name: visa_data
--
-- Stores visa details uploaded by the traveller.
-- Uses strict UPPERCASE constraints and tightened RLS.
-- ====================================================================

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS public.visa_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Traveller's User ID

    -- Visa Fields (enforced UPPERCASE)
    full_name      TEXT NOT NULL CHECK (full_name = upper(full_name)),
    visa_number    TEXT NOT NULL UNIQUE CHECK (visa_number = upper(visa_number)),
    visa_type      TEXT NOT NULL CHECK (visa_type = upper(visa_type)),
    entry_type     TEXT NOT NULL CHECK (entry_type = upper(entry_type)),
    nationality    TEXT NOT NULL CHECK (nationality = upper(nationality)),
    dob            DATE NOT NULL,
    date_of_issue  DATE NOT NULL,
    date_of_expiry DATE NOT NULL,
    gender         TEXT NOT NULL CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Indexes (excluding UNIQUE columns which auto-index)
CREATE INDEX IF NOT EXISTS idx_visa_user_id ON public.visa_data (user_id);
CREATE INDEX IF NOT EXISTS idx_visa_created ON public.visa_data (created_at DESC);

-- STEP 3: RLS Security
ALTER TABLE public.visa_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visa_select_all" ON public.visa_data FOR SELECT USING (true);
CREATE POLICY "visa_insert_all" ON public.visa_data FOR INSERT WITH CHECK (true);
CREATE POLICY "visa_update_none" ON public.visa_data FOR UPDATE USING (false);
CREATE POLICY "visa_delete_none" ON public.visa_data FOR DELETE USING (false);

-- STEP 4: Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_visa_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_visa_updated_at ON public.visa_data;
CREATE TRIGGER trg_visa_updated_at
BEFORE UPDATE ON public.visa_data
FOR EACH ROW EXECUTE FUNCTION public.set_visa_updated_at();
