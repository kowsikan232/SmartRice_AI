import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

export const DEFAULT_PROFILE = {
  name: 'Kowsikan',
  email: 'user@email.com',
  department: 'Artificial Intelligence & Data Science',
  college: 'S.A. Engineering College',
  role: '',
  avatar: ''
};

const STORAGE_KEY = 'smartrice_user_profile';

const ProfileContext = createContext(null);

/**
 * Validates that an avatar URL is a user profile picture,
 * and NOT a rice grain/sample/analysis image accidentally stored.
 */
export function isValidUserAvatar(url) {
  if (!url || typeof url !== 'string') return false;
  const clean = url.toLowerCase();
  if (
    clean.includes('arborio') ||
    clean.includes('basmati') ||
    clean.includes('jasmine') ||
    clean.includes('karacadag') ||
    clean.includes('ipsala') ||
    clean.includes('ponni') ||
    clean.includes('sample') ||
    clean.includes('grain') ||
    clean.includes('rice-analysis') ||
    clean.includes('prediction')
  ) {
    return false;
  }
  return true;
}

/**
 * Derives avatar initials from the profile name.
 */
export function getInitials(name) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    return 'K';
  }
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Clear any old rice image mistakenly cached in localStorage
        if (parsed.avatar && !isValidUserAvatar(parsed.avatar)) {
          parsed.avatar = '';
        }
        return { ...DEFAULT_PROFILE, ...parsed, name: 'Kowsikan' };
      }
    } catch (e) {
      console.error('Failed to parse profile from localStorage', e);
    }
    return DEFAULT_PROFILE;
  });

  // Sync profile from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let isMounted = true;

    async function loadRemoteProfile() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[Supabase Profile] Remote query note:', error.message);
          return;
        }

        if (data && isMounted) {
          const rawAvatar = data.avatar_url || '';
          const cleanAvatar = isValidUserAvatar(rawAvatar) ? rawAvatar : '';

          // If a rice image was stored in Supabase profiles, clean it up
          if (rawAvatar && !cleanAvatar) {
            supabase
              .from('profiles')
              .update({ avatar_url: null })
              .eq('id', data.id)
              .then(() => {});
          }

          const remoteProfile = {
            id: data.id,
            name: 'Kowsikan',
            email: data.email || DEFAULT_PROFILE.email,
            department: data.department || DEFAULT_PROFILE.department,
            college: data.college || DEFAULT_PROFILE.college,
            role: data.role || '',
            avatar: cleanAvatar
          };
          setProfile(remoteProfile);
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteProfile));
          } catch {}
        } else if (!data && isMounted) {
          // Initialize default profile in Supabase
          const { data: created, error: insertErr } = await supabase
            .from('profiles')
            .insert([{
              name: 'Kowsikan',
              email: DEFAULT_PROFILE.email,
              department: DEFAULT_PROFILE.department,
              college: DEFAULT_PROFILE.college,
              role: '',
              avatar_url: null
            }])
            .select()
            .maybeSingle();

          if (!insertErr && created && isMounted) {
            setProfile((prev) => ({ ...prev, id: created.id, name: 'Kowsikan' }));
          }
        }
      } catch (err) {
        console.warn('[Supabase Profile] Initialization error:', err);
      }
    }

    loadRemoteProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const updateProfile = async (updatedFields) => {
    // Ensure name is always Kowsikan and avatar is verified
    const cleanAvatar = isValidUserAvatar(updatedFields.avatar) ? updatedFields.avatar : '';
    const updated = {
      ...profile,
      ...updatedFields,
      name: 'Kowsikan',
      avatar: cleanAvatar
    };
    setProfile(updated);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to persist profile to localStorage', e);
    }

    if (isSupabaseConfigured && supabase) {
      try {
        const payload = {
          name: 'Kowsikan',
          email: updated.email,
          department: updated.department,
          college: updated.college,
          role: updated.role,
          avatar_url: cleanAvatar || null,
          updated_at: new Date().toISOString()
        };

        if (updated.id) {
          const { error } = await supabase
            .from('profiles')
            .update(payload)
            .eq('id', updated.id);
          if (error) {
            console.error('[Supabase Profile Update Error]', error.message);
          }
        } else {
          const { data, error } = await supabase
            .from('profiles')
            .insert([payload])
            .select()
            .maybeSingle();
          if (!error && data?.id) {
            setProfile((prev) => ({ ...prev, id: data.id }));
          }
        }
      } catch (err) {
        console.error('[Supabase Profile Save Exception]', err);
      }
    }

    return updated;
  };

  const resetProfile = () => {
    setProfile(DEFAULT_PROFILE);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to reset profile in localStorage', e);
    }
  };

  return (
    <ProfileContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}
