import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '../types/database';

export interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithKakao: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<Profile>) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
