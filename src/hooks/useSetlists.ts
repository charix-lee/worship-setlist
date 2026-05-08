import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Setlist, SetlistWithItems } from '../types/database';

export function useSetlists() {
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSetlists = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('setlists')
        .select('*')
        .order('date', { ascending: false });

      if (fetchError) throw fetchError;

      setSetlists(data || []);
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
    const { data, error } = await supabase
      .from('setlists')
      .insert({
        title: setlistData.title,
        date: setlistData.date,
        service_type: setlistData.service_type,
        description: setlistData.description || null,
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
    const { error } = await supabase
      .from('setlist_items')
      .insert({
        setlist_id: setlistId,
        song_id: songId,
        position,
        selected_key: selectedKey || null,
        note: note || null,
      });

    if (error) throw error;
  };

  const updateSetlistItem = async (
    itemId: string,
    data: { selected_key?: string; note?: string; position?: number; annotations?: string }
  ) => {
    const updateData: Record<string, unknown> = {};
    if (data.selected_key !== undefined) updateData.selected_key = data.selected_key;
    if (data.note !== undefined) updateData.note = data.note;
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

  useEffect(() => {
    fetchSetlists();
  }, [fetchSetlists]);

  return {
    setlists,
    loading,
    error,
    fetchSetlists,
    fetchSetlistById,
    createSetlist,
    updateSetlist,
    deleteSetlist,
    addItemToSetlist,
    updateSetlistItem,
    removeItemFromSetlist,
    reorderSetlistItems,
  };
}
