import { createClient } from '@supabase/supabase-js';
import { hashPassword, sha256 } from './crypto';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dhohqdsbpnykicqsrgru.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QG3SOQKSRKsKb2C8tUlVag_t6gRaHgS';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  !supabaseUrl.includes('your-project-id') && 
  !supabaseAnonKey.includes('your_supabase_anon_key')
);

// Clear any stale legacy local database caches
try {
  localStorage.removeItem('authentiq_profiles_db');
  localStorage.removeItem('authentiq_scans_db');
} catch {
  // Ignore
}

// Initialize Supabase Client
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Checks if a given custom user_id already exists in Supabase.
 * @param {string} userId 
 * @returns {Promise<boolean>}
 */
export async function checkUserIdExists(userId) {
  if (!userId) return false;
  const cleanId = userId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('user_id', cleanId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase checkUserIdExists warning:', error.message);
      }
      return Boolean(data);
    } catch (err) {
      console.warn('Supabase check error:', err);
    }
  }

  return false;
}

/**
 * Checks if an email is already registered in Supabase.
 * @param {string} email 
 * @returns {Promise<boolean>}
 */
export async function checkEmailExists(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.warn('Supabase checkEmailExists warning:', error.message);
      }
      return Boolean(data);
    } catch (err) {
      console.warn('Supabase email check error:', err);
    }
  }

  return false;
}

/**
 * Saves all user registration information into Supabase `public.profiles`.
 * Hashes passwords cryptographically with PBKDF2-SHA256 before persisting.
 * @param {Object} profile 
 * @returns {Promise<{ data: Object | null, error: string | null }>}
 */
export async function saveUserProfile(profile) {
  let passwordHash = profile.password_hash || null;
  if (profile.password) {
    passwordHash = await hashPassword(profile.password);
  }

  const profilePayload = {
    user_id: profile.user_id.toUpperCase(),
    first_name: profile.first_name,
    last_name: profile.last_name || '',
    email: profile.email.toLowerCase(),
    phone: profile.phone,
    role: profile.role,
    password_hash: passwordHash,
    clerk_id: profile.clerk_id || null,
    is_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profilePayload], { onConflict: 'email' })
        .select()
        .single();

      if (error) {
        console.error('Supabase upsert error:', error);
        return { data: null, error: error.message || 'Database write error' };
      }

      console.log('Profile saved to Supabase profiles table:', data.user_id);
      return { data, error: null };
    } catch (err) {
      console.error('Supabase exception:', err);
      return { data: null, error: err.message || 'Failed to connect to database' };
    }
  }

  return { data: profilePayload, error: null };
}

/**
 * Fetches a profile directly from Supabase by user_id
 * @param {string} userId 
 * @returns {Promise<Object | null>}
 */
export async function fetchProfileByUserId(userId) {
  if (!userId) return null;
  const cleanId = userId.trim().toUpperCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', cleanId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  return null;
}

/**
 * Fetches a profile directly from Supabase by email
 * @param {string} email 
 * @returns {Promise<Object | null>}
 */
export async function fetchProfileByEmail(email) {
  if (!email) return null;
  const cleanEmail = email.trim().toLowerCase();

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', cleanEmail)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase fetch error:', err);
    }
  }

  return null;
}

const APPS_STORAGE_KEY = 'authentiq_traveller_applications';

/**
 * Fetches applications for a specific traveller.
 * Returns only user submitted applications (no dummy/mock items).
 * @param {string} userId 
 * @returns {Promise<Array>}
 */
export async function fetchUserApplications(userId) {
  if (!userId) return [];
  const cleanId = userId.trim().toUpperCase();

  // 1. Check persistent localStorage cache
  try {
    const raw = localStorage.getItem(`${APPS_STORAGE_KEY}_${cleanId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        // Filter out any legacy hardcoded mock IDs
        const cleanList = parsed.filter(item => 
          item.id !== 'APP-IND-2026-89412' && 
          item.id !== 'APP-IND-2026-89405' &&
          !item.id.includes('DEMO')
        );
        return cleanList;
      }
    }
  } catch (err) {
    console.warn('LocalStorage applications read error:', err);
  }

  // 2. Query Supabase if table exists
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('document_applications')
        .select('*')
        .eq('user_id', cleanId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const cleanList = data.filter(item => 
          item.id !== 'APP-IND-2026-89412' && 
          item.id !== 'APP-IND-2026-89405' &&
          !item.id.includes('DEMO')
        );
        localStorage.setItem(`${APPS_STORAGE_KEY}_${cleanId}`, JSON.stringify(cleanList));
        return cleanList;
      }
    } catch (err) {
      console.warn('Supabase document_applications fetch notice:', err);
    }
  }

  return [];
}

/**
 * Saves a newly submitted document application containing:
 * 1. Passport Image (Compulsory)
 * 2. Visa Image (Compulsory)
 * 3. National ID Image (Compulsory)
 * 4. Driving License Image (Optional)
 * @param {Object} appData 
 * @returns {Promise<{ success: boolean, data: Object }>}
 */
export async function saveDocumentApplication(appData) {
  const cleanId = (appData.user_id || 'TUSER10001').toUpperCase();
  const today = new Date();
  const issueDateStr = today.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const expDate = new Date();
  expDate.setFullYear(expDate.getFullYear() + 1);
  const expDateStr = expDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const status = appData.status || 'PASSED'; // 'PASSED' | 'UNDER_REVIEW' | 'REJECTED'

  const newApp = {
    id: appData.id || `APP-${today.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    certificate_id: status === 'PASSED'
      ? (appData.certificate_id || `AUTH-CERT-${today.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`)
      : null,
    user_id: cleanId,
    applicant_name: appData.applicant_name || 'Traveller',
    destination: appData.destination || 'All Transit Gates & E-Gates',
    
    // 1. Passport Details
    passport_image: appData.passport_image || '',
    passport_name: appData.passport_name || '',
    passport_number: (appData.passport_number || '').toUpperCase(),
    passport_nationality: appData.passport_nationality || 'IND',
    passport_dob: appData.passport_dob || '',
    passport_doe: appData.passport_doe || '',
    passport_gender: appData.passport_gender || 'Male',
    passport_place_of_issue: appData.passport_place_of_issue || '',
    passport_doi: appData.passport_doi || '',
    
    // 2. Visa Details
    visa_image: appData.visa_image || '',
    visa_name: appData.visa_name || '',
    visa_number: (appData.visa_number || '').toUpperCase(),
    visa_type: appData.visa_type || 'Tourist',
    visa_entry_type: appData.visa_entry_type || 'Multiple Entry',
    visa_nationality: appData.visa_nationality || 'IND',
    visa_dob: appData.visa_dob || '',
    visa_doi: appData.visa_doi || '',
    visa_doe: appData.visa_doe || '',
    visa_gender: appData.visa_gender || 'Male',
    
    // 3. National ID (Aadhaar) Details
    national_id_image: appData.national_id_image || '',
    national_id_name: appData.national_id_name || '',
    national_id_number: (appData.national_id_number || '').toUpperCase(),
    national_id_dob: appData.national_id_dob || '',
    national_id_gender: appData.national_id_gender || 'Male',
    national_id_guardian: appData.national_id_guardian || '',
    national_id_address: appData.national_id_address || '',
    national_id_pincode: appData.national_id_pincode || '',
    
    // 4. Driving License (Indian DL) Details
    driving_license_image: appData.driving_license_image || '',
    driving_license_name: appData.driving_license_name || '',
    driving_license_number: (appData.driving_license_number || '').toUpperCase(),
    driving_license_dob: appData.driving_license_dob || '',
    driving_license_blood_group: appData.driving_license_blood_group || 'O+',
    driving_license_vehicle_class: appData.driving_license_vehicle_class || 'LMV, MCWG',
    driving_license_doi: appData.driving_license_doi || '',
    driving_license_doe: appData.driving_license_doe || '',
    driving_license_rto: appData.driving_license_rto || '',

    status: status,
    status_message: status === 'PASSED' 
      ? 'All compulsory documents verified and passed. Verification certificate active.' 
      : status === 'UNDER_REVIEW' 
      ? 'Application documents are currently under verification review.'
      : 'Application rejected. Please re-upload clear document images.',
    
    issue_date: status === 'PASSED' ? (appData.issue_date || issueDateStr) : null,
    valid_until: status === 'PASSED' ? (appData.valid_until || expDateStr) : null,
    created_at: new Date().toISOString()
  };

  // 1. Update localStorage cache
  try {
    const raw = localStorage.getItem(`${APPS_STORAGE_KEY}_${cleanId}`);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [newApp, ...existing.filter(item => item.id !== newApp.id)];
    localStorage.setItem(`${APPS_STORAGE_KEY}_${cleanId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage app write warning:', err);
  }

  // 2. Try Supabase write
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from('document_applications').upsert([newApp]);
    } catch (err) {
      console.warn('Supabase document_applications write notice:', err);
    }
  }

  return { success: true, data: newApp };
}

/**
 * Record document scan helper
 */
export async function recordDocumentScan(scanData) {
  return saveDocumentApplication(scanData);
}

/**
 * Maps a raw Supabase/Postgres duplicate-key error to a clear UI message.
 * @param {string} msg
 * @returns {string}
 */
function parseSaveError(msg) {
  if (!msg) return 'A database error occurred. Please try again.';
  const m = msg.toLowerCase();
  if (m.includes('passport_no'))     return 'A traveller with this Passport Number is already registered.';
  if (m.includes('visa_no'))         return 'A traveller with this Visa Number is already registered.';
  if (m.includes('aadhaar_no'))      return 'A traveller with this Aadhaar Number is already registered.';
  if (m.includes('identity_hash'))   return 'A traveller with identical identity details already exists in the system.';
  if (m.includes('duplicate key') || m.includes('unique constraint'))
    return 'One or more document numbers are already registered. Please verify Passport, Visa and Aadhaar details.';
  return 'Registration failed. Please check the entered details and try again.';
}

/**
 * Saves a new traveller identity record created by an officer.
 *
 * SHA-256 hash is computed from exactly the values stored in the DB,
 * using the same capitalisation / format:
 *   fullName (Title Case) | passportNo (UPPER) | visaNo (UPPER)
 *   | aadhaarNo (digits only) | dob (yyyy-mm-dd)
 *   | gender (Title Case) | nationality (Title Case)
 *
 * NOT included in hash: officer user_id, created_at, updated_at.
 *
 * @param {Object} identityData - Pre-sanitized fields from Create User form
 * @param {string} officerUserId - Logged-in officer's user_id (stored in DB only, not hashed)
 * @returns {Promise<{ success: boolean, data: Object | null, error: string | null }>}
 */
export async function saveTravellerIdentity(identityData, officerUserId) {
  const { fullName, passportNo, visaNo, aadhaarNo, dob, gender, nationality } = identityData;

  // Normalise to exact DB-stored format
  const storedName        = String(fullName).trim();            // Title Case  – enforced by form
  const storedPassport    = String(passportNo).trim().toUpperCase();
  const storedVisa        = String(visaNo).trim().toUpperCase();
  const storedAadhaar     = String(aadhaarNo).trim();           // digits only – enforced by form
  const storedDob         = String(dob).trim();                 // yyyy-mm-dd  – from <input type="date">
  const storedGender      = String(gender).trim();              // Male / Female / Other
  const storedNationality = String(nationality).trim();         // Title Case  – enforced by form

  // SHA-256: pipe-delimited, same format as what is stored in DB columns
  const hashInput = [
    storedName,
    storedPassport,
    storedVisa,
    storedAadhaar,
    storedDob,
    storedGender,
    storedNationality,
  ].join('|');

  const identityHash = await sha256(hashInput);

  const record = {
    full_name:          storedName,
    dob:                storedDob,
    gender:             storedGender,
    nationality:        storedNationality,
    passport_no:        storedPassport,
    visa_no:            storedVisa,
    aadhaar_no:         storedAadhaar,
    identity_hash:      identityHash,
    created_by_officer: officerUserId || null,
    // created_at / updated_at — handled by DB DEFAULT now()
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('traveller_identities')
        .insert([record])
        .select()
        .single();

      if (error) {
        console.error('Supabase traveller_identities insert error:', error);
        return { success: false, data: null, error: parseSaveError(error.message) };
      }

      console.log('Traveller identity saved. Hash:', identityHash);
      return { success: true, data: { ...data, identity_hash: identityHash }, error: null };
    } catch (err) {
      console.error('Supabase exception:', err);
      return { success: false, data: null, error: parseSaveError(err.message) };
    }
  }

  // Offline fallback
  return { success: true, data: { ...record }, error: null };
}


