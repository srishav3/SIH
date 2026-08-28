import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  fetchProfileByUserId, 
  saveUserProfile, 
  checkUserIdExists, 
  isSupabaseConfigured
} from '../lib/supabase';
import { generateUniqueUserId } from '../lib/idGenerator';
import { isClerkConfigured } from '../lib/clerk';
import { verifyPassword } from '../lib/crypto';

const AuthContext = createContext(null);

const SESSION_KEY = 'authentiq_active_session';

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(SESSION_KEY);
    }
  }, [currentUser]);

  /**
   * Log in user by User ID and Password
   */
  const login = async (userId, password) => {
    setLoading(true);
    try {
      const cleanId = userId.trim().toUpperCase();
      const profile = await fetchProfileByUserId(cleanId);

      if (!profile) {
        return { 
          success: false, 
          error: `User ID "${cleanId}" was not found. Please verify your ID or sign up first.` 
        };
      }

      // Check password if stored (supports cryptographic PBKDF2 hash & fallback)
      if (profile.password_hash) {
        const isMatch = await verifyPassword(password, profile.password_hash);
        if (!isMatch) {
          return { 
            success: false, 
            error: 'Incorrect password. Please try again.' 
          };
        }
      }

      // Sanitize profile object so password_hash is not kept in client session
      const { password_hash: _unusedHash, ...safeProfile } = profile;

      setCurrentUser(safeProfile);
      return { success: true, user: safeProfile };
    } catch (err) {
      console.error('Login error:', err);
      return { success: false, error: 'Login service encountered an unexpected error.' };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user and generate unique User ID
   */
  const registerUser = async (formData, clerkUserId = null) => {
    setLoading(true);
    try {
      // 1. Generate unique 10-char User ID (T... or O...)
      const allocatedUserId = await generateUniqueUserId(formData.role, checkUserIdExists);

      // 2. Save into Supabase / Profile repository
      const profilePayload = {
        user_id: allocatedUserId,
        first_name: formData.firstName.trim(),
        last_name: (formData.lastName || '').trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: formData.role, // 'traveller' | 'officer'
        password: formData.password,
        clerk_id: clerkUserId,
        is_verified: true
      };

      const result = await saveUserProfile(profilePayload);
      if (result.error) {
        return { success: false, error: result.error };
      }

      const createdUser = result.data || profilePayload;
      const { password_hash: _unusedHash, password: _unusedPwd, ...safeCreatedUser } = createdUser;
      return { 
        success: true, 
        user: safeCreatedUser,
        allocatedUserId 
      };
    } catch (err) {
      console.error('Registration error:', err);
      return { success: false, error: 'Failed to create user account. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      setCurrentUser,
      login,
      registerUser,
      logout,
      loading,
      isSupabaseConfigured,
      isClerkConfigured
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
