import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

export function useUsers() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setUsers(prev =>
        prev.map(user =>
          user.id === userId
            ? { ...user, role, updated_at: new Date().toISOString() }
            : user
        )
      );

      return true;
    } catch (error) {
      console.error('Failed to update user role:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    loading,
    fetchUsers,
    updateUserRole,
  };
}
