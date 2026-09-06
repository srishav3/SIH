-- ====================================================================
-- AuthentiQ: Driving License Data Table
-- Table Name: license_data
--
-- Stores Driving License details uploaded by the traveller.
-- Uses strict UPPERCASE constraints and tightened RLS.
-- ====================================================================

-- STEP 1: Create table
CREATE TABLE IF NOT EXISTS public.license_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Traveller's User ID

    -- License Fields (enforced UPPERCASE)
    full_name      TEXT NOT NULL CHECK (full_name = upper(full_name)),
    license_number TEXT NOT NULL UNIQUE CHECK (license_number = upper(license_number)),
    dob            DATE NOT NULL,
    blood_group    TEXT NOT NULL CHECK (blood_group = upper(blood_group)),
    vehicle_class  TEXT NOT NULL CHECK (vehicle_class = upper(vehicle_class)),
    date_of_issue  DATE NOT NULL,
    date_of_expiry DATE NOT NULL,
    rto            TEXT NOT NULL CHECK (rto = upper(rto)),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- STEP 2: Indexes (excluding UNIQUE columns which auto-index)
CREATE INDEX IF NOT EXISTS idx_license_user_id ON public.license_data (user_id);
CREATE INDEX IF NOT EXISTS idx_license_created ON public.license_data (created_at DESC);

-- STEP 3: RLS Security
ALTER TABLE public.license_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "license_select_all" ON public.license_data FOR SELECT USING (true);
CREATE POLICY "license_insert_all" ON public.license_data FOR INSERT WITH CHECK (true);
CREATE POLICY "license_update_none" ON public.license_data FOR UPDATE USING (false);
CREATE POLICY "license_delete_none" ON public.license_data FOR DELETE USING (false);

-- STEP 4: Auto-update trigger for updated_at
CREATE OR REPLACE FUNCTION public.set_license_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_license_updated_at ON public.license_data;
CREATE TRIGGER trg_license_updated_at
BEFORE UPDATE ON public.license_data
FOR EACH ROW EXECUTE FUNCTION public.set_license_updated_at();
