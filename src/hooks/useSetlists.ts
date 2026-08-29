import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Setlist, SetlistWithItems, SetlistWithCreator } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useSetlists() {
  const { profile } = useAuth();
  const [setlists, setSetlists] = useState<SetlistWithCreator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSetlists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 먼저 콘티 목록 조회
      const { data: setlistsData, error: fetchError } = await supabase
        .from('setlists')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      // 각 콘티의 생성자 정보 조회
      const setlistsWithCreator = await Promise.all(
        (setlistsData || []).map(async (setlist) => {
          if (!setlist.created_by) {
            return { ...setlist, creator: null };
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', setlist.created_by)
            .single();

          return {
            ...setlist,
            creator: profile ? { name: profile.name } : null,
          };
        })
      );

      setSetlists(setlistsWithCreator);
    } catch (err) {
      console.error('콘티 목록 조회 실패:', err);
      setError(err instanceof Error ? err.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSetlistById = useCallback(async (id: string): Promise<SetlistWithItems | null> => {
    try {
      // 콘티 기본 정보 조회
      const { data: setlist, error: setlistError } = await supabase
        .from('setlists')
        .select('*')
        .eq('id', id)
        .single();

      if (setlistError) throw setlistError;
      if (!setlist) return null;

      // 콘티 아이템 + 곡 정보 + 악보 정보 조회
      const { data: items, error: itemsError } = await supabase
        .from('setlist_items')
        .select(`
          *,
          song:songs (
            *,
            song_sheets (*)
          )
        `)
        .eq('setlist_id', id)
        .order('position', { ascending: true });

      if (itemsError) throw itemsError;

      return {
        ...setlist,
        setlist_items: items || [],
      };
    } catch (err) {
      console.error('콘티 상세 조회 실패:', err);
      return null;
    }
  }, []);

  const createSetlist = async (setlistData: {
    title: string;
    date: string;
    service_type: string;
    description?: string;
  }): Promise<Setlist> => {
    if (!profile?.church_id) {
      throw new Error('교회 정보가 없습니다. 온보딩을 완료해주세요.');
    }

    // 현재 로그인한 사용자 가져오기
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('setlists')
      .insert({
        title: setlistData.title,
        date: setlistData.date,
        service_type: setlistData.service_type,
        description: setlistData.description || null,
        church_id: profile.church_id,
        created_by: user?.id || null,
      })
      .select()
      .single();

    if (error) throw error;

    await fetchSetlists();
    return data;
  };

  const updateSetlist = async (
    id: string,
    setlistData: {
      title?: string;
      date?: string;
      service_type?: string;
      description?: string;
    }
  ) => {
    const { error } = await supabase
      .from('setlists')
      .update({
        title: setlistData.title,
        date: setlistData.date,
        service_type: setlistData.service_type,
        description: setlistData.description,
      })
      .eq('id', id);

    if (error) throw error;

    await fetchSetlists();
  };

  const deleteSetlist = async (id: string) => {
    const { error } = await supabase
      .from('setlists')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchSetlists();
  };

  // 콘티 아이템 관리
  const addItemToSetlist = async (
    setlistId: string,
    songId: string,
    position: number,
    selectedKey?: string,
    note?: string
  ) => {
    if (!profile?.church_id) {
      throw new Error('교회 정보가 없습니다. 온보딩을 완료해주세요.');
    }

    const { error } = await supabase
      .from('setlist_items')
      .insert({
        setlist_id: setlistId,
        song_id: songId,
        position,
        selected_key: selectedKey || null,
        note: note || null,
        church_id: profile.church_id,
      });

    if (error) throw error;
  };

  const updateSetlistItem = async (
    itemId: string,
    data: { selected_key?: string; note?: string; comment?: string; position?: number; annotations?: string }
  ) => {
    const updateData: Record<string, unknown> = {};
    if (data.selected_key !== undefined) updateData.selected_key = data.selected_key;
    if (data.note !== undefined) updateData.note = data.note;
    if (data.comment !== undefined) updateData.comment = data.comment;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.annotations !== undefined) updateData.annotations = data.annotations;

    const { error } = await supabase
      .from('setlist_items')
      .update(updateData)
      .eq('id', itemId);

    if (error) throw error;
  };

  const removeItemFromSetlist = async (itemId: string) => {
    const { error } = await supabase
      .from('setlist_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  };

  const reorderSetlistItems = async (
    _setlistId: string,
    items: { id: string; position: number }[]
  ) => {
    // 각 아이템의 position 업데이트
    for (const item of items) {
      const { error } = await supabase
        .from('setlist_items')
        .update({ position: item.position })
        .eq('id', item.id);

      if (error) throw error;
    }
  };

  // 특정 곡이 포함된 콘티 목록 조회
  const fetchSetlistsBySongId = useCallback(async (songId: string): Promise<Setlist[]> => {
    try {
      const { data, error } = await supabase
        .from('setlist_items')
        .select('setlist:setlists(*)')
        .eq('song_id', songId);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // 중복 제거 및 날짜순 정렬
      const setlistMap = new Map<string, Setlist>();
      for (const item of data) {
        const setlist = item.setlist as unknown as Setlist;
        if (setlist && !setlistMap.has(setlist.id)) {
          setlistMap.set(setlist.id, setlist);
        }
      }

      return Array.from(setlistMap.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (err) {
      console.error('곡이 포함된 콘티 조회 실패:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  return {
    setlists,
    loading,
    error,
    fetchSetlists,
    fetchSetlistById,
    fetchSetlistsBySongId,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    addItemToSetlist,
    updateSetlistItem,
    removeItemFromSetlist,
    reorderSetlistItems,
  };
}
