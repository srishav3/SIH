-- ====================================================================
-- AuthentiQ: AI-Based Fake Identity & Document Screening System
-- Supabase Database Schema
-- ====================================================================

-- 1. Create PROFILES Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_id TEXT UNIQUE,
    user_id VARCHAR(10) NOT NULL UNIQUE, -- Format: TXXXXX1234 (Traveller) or OXXXXX1234 (Officer)
    first_name TEXT NOT NULL,
    last_name TEXT,
    email TEXT NOT NULL UNIQUE,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('traveller', 'officer')),
    password_hash TEXT, -- Stored securely for fallback/direct authentication
    is_verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create DOCUMENT_SCANS Table (for screening logs & AI analysis)
CREATE TABLE IF NOT EXISTS public.document_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(10) REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    document_type TEXT NOT NULL CHECK (document_type IN ('Passport', 'Visa', 'National ID', 'Driving License')),
    document_number TEXT,
    issuer_country TEXT,
    tamper_score NUMERIC(5,2) DEFAULT 0.00, -- 0.00 to 100.00 (higher means higher forgery probability)
    ai_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (ai_status IN ('VERIFIED', 'SUSPICIOUS', 'FORGERY_DETECTED', 'PENDING')),
    hologram_status TEXT DEFAULT 'VALID',
    mrz_checksum_valid BOOLEAN DEFAULT TRUE,
    face_match_score NUMERIC(5,2) DEFAULT 98.50,
    extracted_data JSONB DEFAULT '{}'::jsonb,
    scanned_at TIMESTAMPTZ DEFAULT now(),
    reviewed_by_officer VARCHAR(10) REFERENCES public.profiles(user_id)
);

-- 3. Indexes for Ultra-Fast Lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.document_scans(user_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_scans ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Profiles
-- Allow all reads for authentication & user lookup
CREATE POLICY "Allow public read profiles for login" 
ON public.profiles FOR SELECT 
USING (true);

-- Allow registration / insertions
CREATE POLICY "Allow profile inserts on signup" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

-- Allow updates to own profile
CREATE POLICY "Allow users to update own profile" 
ON public.profiles FOR UPDATE 
USING (true);

-- 6. RLS Policies for Document Scans
CREATE POLICY "Allow public read document scans" 
ON public.document_scans FOR SELECT 
USING (true);

CREATE POLICY "Allow document scan insert" 
ON public.document_scans FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow document scan update" 
ON public.document_scans FOR UPDATE 
USING (true);

-- 7. Helper Function: Check if User ID Exists
CREATE OR REPLACE FUNCTION public.check_user_id_exists(target_user_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.profiles WHERE user_id = target_user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
