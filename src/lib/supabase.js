import { createClient } from '@supabase/supabase-js';
import { hashPassword } from './crypto';

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
