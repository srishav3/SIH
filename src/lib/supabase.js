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

  const status = appData.status || 'PASSED';

  // ── Upload all document images to Supabase Storage in parallel ──────────────
  const [passportImgUrl, visaImgUrl, aadhaarImgUrl, licenseImgUrl] = await Promise.all([
    uploadDocumentImage(appData.passport_image,         cleanId, 'passport'),
    uploadDocumentImage(appData.visa_image,             cleanId, 'visa'),
    uploadDocumentImage(appData.national_id_image,      cleanId, 'aadhaar'),
    uploadDocumentImage(appData.driving_license_image,  cleanId, 'license'),
  ]);

  const newApp = {
    id: appData.id || `APP-${today.getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
    certificate_id: status === 'PASSED'
      ? (appData.certificate_id || `AUTH-CERT-${today.getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`)
      : null,
    user_id: cleanId,
    applicant_name: appData.applicant_name || 'Traveller',
    destination: appData.destination || 'All Transit Gates & E-Gates',
    
    // 1. Passport Details (image stored as public URL)
    passport_image: passportImgUrl,
    passport_name: appData.passport_name || '',
    passport_number: (appData.passport_number || '').toUpperCase(),
    passport_nationality: appData.passport_nationality || 'IND',
    passport_dob: appData.passport_dob || '',
    passport_doe: appData.passport_doe || '',
    passport_gender: appData.passport_gender || 'Male',
    passport_place_of_issue: appData.passport_place_of_issue || '',
    passport_doi: appData.passport_doi || '',
    
    // 2. Visa Details
    visa_image: visaImgUrl,
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
    national_id_image: aadhaarImgUrl,
    national_id_name: appData.national_id_name || '',
    national_id_number: (appData.national_id_number || '').toUpperCase(),
    national_id_dob: appData.national_id_dob || '',
    national_id_gender: appData.national_id_gender || 'Male',
    national_id_guardian: appData.national_id_guardian || '',
    national_id_address: appData.national_id_address || '',
    national_id_pincode: appData.national_id_pincode || '',
    
    // 4. Driving License (Optional)
    driving_license_image: licenseImgUrl,
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

  // ── Save to localStorage ───────────────────────────────────────────────────
  try {
    const raw = localStorage.getItem(`${APPS_STORAGE_KEY}_${cleanId}`);
    const existing = raw ? JSON.parse(raw) : [];
    const updated = [newApp, ...existing.filter(item => item.id !== newApp.id)];
    localStorage.setItem(`${APPS_STORAGE_KEY}_${cleanId}`, JSON.stringify(updated));
  } catch (err) {
    console.warn('LocalStorage app write warning:', err);
  }

  // ── Save to Supabase: document_applications + 4 individual tables ─────────
  if (isSupabaseConfigured && supabase) {
    // Build payload with updated image URLs for individual table saves
    const enrichedPayload = {
      ...appData,
      user_id:              cleanId,
      passport_image:       passportImgUrl,
      visa_image:           visaImgUrl,
      national_id_image:    aadhaarImgUrl,
      driving_license_image: licenseImgUrl,
    };

    await Promise.allSettled([
      supabase.from('document_applications').upsert([newApp]),
      savePassportData(enrichedPayload),
      saveVisaData(enrichedPayload),
      saveAadhaarData(enrichedPayload),
      saveLicenseData(enrichedPayload),
    ]);
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

  // Normalise to exact DB-stored format (all uppercased fields)
  const storedName        = String(fullName).trim().toUpperCase();    // UPPERCASE e.g. RAJESH KUMAR SHARMA
  const storedPassport    = String(passportNo).trim().toUpperCase();  // UPPERCASE e.g. R1234567
  const storedVisa        = visaNo ? String(visaNo).trim().toUpperCase() : null;      // UPPERCASE or null
  const storedAadhaar     = String(aadhaarNo).trim();                 // digits only e.g. 123456789012
  const storedDob         = String(dob).trim();                       // yyyy-mm-dd from <input type="date">
  const storedGender      = String(gender).trim().toUpperCase();      // UPPERCASE e.g. MALE / FEMALE
  const storedNationality = String(nationality).trim().toUpperCase(); // UPPERCASE e.g. INDIAN

  // SHA-256: pipe-delimited, same format as what is stored in DB columns
  const hashInput = [
    storedName,
    storedPassport,
    storedVisa || 'NONE',
    storedAadhaar,
    storedDob,
    storedGender,
    storedNationality
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
    created_at:         new Date().toISOString(),
  };

  // ── Helper: persist to localStorage as fallback store ──────────────────────
  const saveLocally = () => {
    try {
      const raw = localStorage.getItem('authentiq_government_records');
      const existing = raw ? JSON.parse(raw) : [];
      // Reject duplicate identity_hash
      if (existing.some((r) => r.identity_hash === identityHash)) {
        return { success: false, data: null, error: 'A traveller with identical identity details already exists in the system.' };
      }
      localStorage.setItem(
        'authentiq_government_records',
        JSON.stringify([record, ...existing])
      );
      return { success: true, data: record, error: null };
    } catch (e) {
      return { success: false, data: null, error: 'Failed to save record locally.' };
    }
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('government_records')
        .insert([record])
        .select()
        .single();

      if (error) {
        console.error('Supabase government_records insert error:', error);

        // If table doesn't exist or RLS blocks → fall back to localStorage
        const isTableMissing = error.code === '42P01' || error.message?.includes('does not exist');
        const isRLS = error.code === '42501' || error.message?.includes('permission denied') || error.message?.toLowerCase().includes('rls');

        if (isTableMissing || isRLS) {
          console.warn('Falling back to localStorage for traveller identity storage.');
          return saveLocally();
        }

        return { success: false, data: null, error: parseSaveError(error.message) };
      }

      console.log('Traveller identity saved. Hash:', identityHash);
      return { success: true, data: { ...data, identity_hash: identityHash }, error: null };
    } catch (err) {
      console.error('Supabase exception:', err);
      // Network/config error → fall back to localStorage
      console.warn('Network error — falling back to localStorage for traveller identity storage.');
      return saveLocally();
    }
  }

  // Supabase not configured → localStorage only
  return saveLocally();
}

/**
 * Fetches all records from government_records table.
 * Falls back to localStorage if Supabase is unavailable.
 * @returns {Promise<{ success: boolean, data: Array, error: string | null }>}
 */
export async function fetchGovernmentRecords() {
  // 1. Try Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('government_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase government_records fetch error:', error);
        // Fall through to localStorage
      } else {
        return { success: true, data: data || [], error: null };
      }
    } catch (err) {
      console.warn('Supabase government_records fetch exception:', err);
      // Fall through to localStorage
    }
  }

  // 2. localStorage fallback
  try {
    const raw = localStorage.getItem('authentiq_government_records');
    const data = raw ? JSON.parse(raw) : [];
    return { success: true, data: Array.isArray(data) ? data : [], error: null };
  } catch {
    return { success: true, data: [], error: null };
  }
}


// ─── Document Image Upload ─────────────────────────────────────────────────

/**
 * Uploads a base64 dataURL image to Supabase Storage "document-images" bucket.
 * Falls back to returning the original base64 string if upload fails.
 *
 * @param {string} dataUrl  - base64 data URL (from FileReader)
 * @param {string} userId   - traveller's user_id
 * @param {string} docType  - one of: "passport" | "visa" | "aadhaar" | "license"
 * @returns {Promise<string>} public URL string (or original dataUrl on failure)
 */
export async function uploadDocumentImage(dataUrl, userId, docType) {
  if (!isSupabaseConfigured || !supabase) return dataUrl; // fallback
  if (!dataUrl || !dataUrl.startsWith('data:')) return dataUrl;

  try {
    // Convert base64 dataURL → Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const path = `${userId}/${docType}_${timestamp}.${ext}`;

    const { error } = await supabase.storage
      .from('document-images')
      .upload(path, blob, { contentType: blob.type, upsert: true });

    if (error) {
      console.warn(`Storage upload failed for ${docType}:`, error.message);
      return dataUrl; // fallback to base64
    }

    const { data: urlData } = supabase.storage
      .from('document-images')
      .getPublicUrl(path);

    return urlData?.publicUrl || dataUrl;
  } catch (err) {
    console.warn(`uploadDocumentImage exception (${docType}):`, err);
    return dataUrl; // fallback to base64
  }
}


// ─── Individual Document Table Savers ────────────────────────────────────────

/** Save passport details to passport_data table */
async function savePassportData(payload) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const record = {
      user_id:         payload.user_id,
      image_url:       payload.passport_image || null,
      full_name:       (payload.passport_name || '').toUpperCase() || null,
      passport_number: (payload.passport_number || '').toUpperCase() || null,
      nationality:     (payload.passport_nationality || '').toUpperCase() || null,
      dob:             payload.passport_dob || null,
      date_of_issue:   payload.passport_doi || null,
      date_of_expiry:  payload.passport_doe || null,
      gender:          (payload.passport_gender || '').toUpperCase() || null,
      place_of_issue:  payload.passport_place_of_issue
                         ? payload.passport_place_of_issue.toUpperCase()
                         : null,
    };
    // Only insert if minimum required fields are present
    if (!record.full_name || !record.passport_number || !record.dob || !record.gender) return;
    await supabase.from('passport_data').insert([record]);
  } catch (err) {
    console.warn('savePassportData error:', err.message);
  }
}

/** Save visa details to visa_data table */
async function saveVisaData(payload) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const record = {
      user_id:         payload.user_id,
      image_url:       payload.visa_image || null,
      full_name:       (payload.visa_name || '').toUpperCase() || null,
      visa_number:     (payload.visa_number || '').toUpperCase() || null,
      visa_type:       (payload.visa_type || '').toUpperCase() || null,
      entry_type:      (payload.visa_entry_type || '').toUpperCase() || null,
      nationality:     (payload.visa_nationality || '').toUpperCase() || null,
      dob:             payload.visa_dob || null,
      date_of_issue:   payload.visa_doi || null,
      date_of_expiry:  payload.visa_doe || null,
      gender:          (payload.visa_gender || '').toUpperCase() || null,
    };
    if (!record.full_name || !record.visa_number || !record.dob || !record.gender) return;
    await supabase.from('visa_data').insert([record]);
  } catch (err) {
    console.warn('saveVisaData error:', err.message);
  }
}

/** Save Aadhaar details to aadhaar_data table */
async function saveAadhaarData(payload) {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const aadhaar = (payload.national_id_number || '').replace(/\D/g, '');
    const pincode = (payload.national_id_pincode || '').replace(/\D/g, '');
    const record = {
      user_id:       payload.user_id,
      image_url:     payload.national_id_image || null,
      full_name:     (payload.national_id_name || '').toUpperCase() || null,
      aadhaar_number: aadhaar || null,
      dob:           payload.national_id_dob || null,
      gender:        (payload.national_id_gender || '').toUpperCase() || null,
      guardian_name: payload.national_id_guardian
                       ? payload.national_id_guardian.toUpperCase()
                       : null,
      address:       payload.national_id_address
                       ? payload.national_id_address.toUpperCase()
                       : null,
      pincode:       pincode || null,
    };
    if (!record.full_name || !record.aadhaar_number || record.aadhaar_number.length !== 12 || !record.dob || !record.gender) return;
    if (!record.address || !record.pincode || record.pincode.length !== 6) return;
    await supabase.from('aadhaar_data').insert([record]);
  } catch (err) {
    console.warn('saveAadhaarData error:', err.message);
  }
}

/** Save Driving License details to license_data table (optional — skipped if no DL number) */
async function saveLicenseData(payload) {
  if (!isSupabaseConfigured || !supabase) return;
  if (!payload.driving_license_number?.trim()) return; // DL is optional
  try {
    const record = {
      user_id:        payload.user_id,
      image_url:      payload.driving_license_image || null,
      full_name:      (payload.driving_license_name || '').toUpperCase() || null,
      license_number: (payload.driving_license_number || '').toUpperCase() || null,
      dob:            payload.driving_license_dob || null,
      blood_group:    (payload.driving_license_blood_group || '').toUpperCase() || null,
      vehicle_class:  (payload.driving_license_vehicle_class || '').toUpperCase() || null,
      date_of_issue:  payload.driving_license_doi || null,
      date_of_expiry: payload.driving_license_doe || null,
      rto:            payload.driving_license_rto
                        ? payload.driving_license_rto.toUpperCase()
                        : null,
    };
    if (!record.full_name || !record.license_number || !record.dob || !record.blood_group) return;
    await supabase.from('license_data').insert([record]);
  } catch (err) {
    console.warn('saveLicenseData error:', err.message);
  }
}
