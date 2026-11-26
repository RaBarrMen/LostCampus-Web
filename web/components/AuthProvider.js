'use client';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { api } from '@/lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (s) => {
    if (!s) return setProfile(null);
    try {
      setProfile(await api('/profile'));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await loadProfile(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') loadProfile(s);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, loading, signOut, reloadProfile: () => loadProfile(session) }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
