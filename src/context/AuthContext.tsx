'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, googleProvider } from '@/lib/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { supabase } from '@/lib/supabase';

// ইউজারের প্রোফাইলের জন্য একটি টাইপ ডিফাইন করছি
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  avatar_url: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ১. গুগল লগইন এবং সুপাবেস সিঙ্ক
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      if (!firebaseUser) return;

      // চেক করছি ইউজার অলরেডি সুপাবেসে আছে কিনা
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', firebaseUser.uid)
        .single();

      // নতুন ইউজার হলে সুপাবেসে ডাটা ইনসার্ট হবে
      if (!existingProfile) {
        const { error } = await supabase.from('profiles').insert([
          {
            id: firebaseUser.uid,
            username: firebaseUser.displayName || 'Anonymous',
            email: firebaseUser.email || '',
            avatar_url: firebaseUser.photoURL || '',
          },
        ]);
        if (error) console.error('Supabase Sync Error:', error);
      }
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  // ২. লগআউট
  const logout = async () => {
    await signOut(auth);
    setUser(null);
  };

  // ৩. ফায়ারবেস অথ লিসেনার
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', firebaseUser.uid)
          .single();

        setUser((profile as UserProfile) || null);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);