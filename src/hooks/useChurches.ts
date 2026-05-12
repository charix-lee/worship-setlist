import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Church } from '@/types/database';

export function useChurches() {
  const [churches, setChurches] = useState<Church[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChurches = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .order('name');

    if (error) {
      console.error('교회 목록 조회 실패:', error);
    } else {
      setChurches(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChurches();
  }, [fetchChurches]);

  // 교회 검색
  const searchChurches = useCallback(async (query: string): Promise<Church[]> => {
    if (!query.trim()) return churches;

    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('name')
      .limit(20);

    if (error) {
      console.error('교회 검색 실패:', error);
      return [];
    }
    return data || [];
  }, [churches]);

  // 교회 추가
  const createChurch = useCallback(async (
    churchData: Omit<Church, 'id' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<Church | null> => {
    const { data: newChurch, error } = await supabase
      .from('churches')
      .insert({
        name: churchData.name,
        address: churchData.address,
        denomination: churchData.denomination,
      })
      .select()
      .single();

    if (error) {
      console.error('교회 추가 실패:', error);
      throw error;
    }

    // 목록 갱신
    await fetchChurches();
    return newChurch;
  }, [fetchChurches]);

  // 교회 조회 (ID로)
  const getChurchById = useCallback(async (id: string): Promise<Church | null> => {
    const { data, error } = await supabase
      .from('churches')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('교회 조회 실패:', error);
      return null;
    }
    return data;
  }, []);

  return {
    churches,
    loading,
    fetchChurches,
    searchChurches,
    createChurch,
    getChurchById,
  };
}
