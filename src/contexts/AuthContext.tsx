import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';
import type { Profile } from '../types/database';

// TODO: 로그인 기능 활성화 시 아래 import 주석 해제
// import { useEffect, useState } from 'react';
// import type { User, Session } from '@supabase/supabase-js';
// import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 임시 Mock 사용자 (로그인 없이 사용)
const mockProfile: Profile = {
  id: 'mock-user',
  email: 'user@church.org',
  name: '찬양팀',
  role: 'admin',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export function AuthProvider({ children }: { children: ReactNode }) {
  // TODO: 로그인 기능 활성화 시 실제 인증 로직으로 교체
  const user = { id: 'mock-user', email: 'user@church.org' };
  const profile = mockProfile;
  const loading = false;

  const signIn = async (_email: string, _password: string) => {
    console.log('로그인 기능은 아직 비활성화 상태입니다.');
  };

  const signUp = async (_email: string, _password: string, _name: string) => {
    console.log('회원가입 기능은 아직 비활성화 상태입니다.');
  };

  const signOut = async () => {
    console.log('로그아웃 기능은 아직 비활성화 상태입니다.');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
