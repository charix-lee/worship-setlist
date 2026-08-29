import { useState, useEffect, useCallback } from 'react';
import { supabase, uploadSheetFile, deleteSheetFile } from '../lib/supabase';
import type { SongWithSheets, SongSheet } from '../types/database';
import { useAuth } from '../contexts/AuthContext';

export function useSongs() {
  const { profile } = useAuth();
  const [songs, setSongs] = useState<SongWithSheets[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSongs = useCallback(async (search?: string) => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('songs')
        .select(`
          *,
          song_sheets (*)
        `)
        .order('created_at', { ascending: false });

      if (search) {
        query = query.or(`title.ilike.%${search}%,artist.ilike.%${search}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setSongs(data || []);
    } catch (err) {
      console.error('곡 목록 조회 실패:', err);
      setError(err instanceof Error ? err.message : '조회 실패');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSongById = useCallback(async (id: string): Promise<SongWithSheets | null> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('songs')
        .select(`
          *,
          song_sheets (*)
        `)
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      return data;
    } catch (err) {
      console.error('곡 상세 조회 실패:', err);
      return null;
    }
  }, []);

  const createSong = async (songData: {
    title: string;
    artist?: string;
    youtube_url?: string;
    lyrics?: string;
    memo?: string;
  }): Promise<SongWithSheets> => {
    if (!profile?.church_id) {
      throw new Error('교회 정보가 없습니다. 온보딩을 완료해주세요.');
    }

    const { data, error } = await supabase
      .from('songs')
      .insert({
        title: songData.title,
        artist: songData.artist || null,
        youtube_url: songData.youtube_url || null,
        lyrics: songData.lyrics || null,
        memo: songData.memo || null,
        church_id: profile.church_id,
      })
      .select()
      .single();

    if (error) throw error;

    const newSong: SongWithSheets = {
      ...data,
      song_sheets: [],
    };

    await fetchSongs();
    return newSong;
  };

  const updateSong = async (
    id: string,
    songData: {
      title?: string;
      artist?: string;
      youtube_url?: string;
      lyrics?: string;
      memo?: string;
    }
  ) => {
    const { error } = await supabase
      .from('songs')
      .update({
        title: songData.title,
        artist: songData.artist,
        youtube_url: songData.youtube_url,
        lyrics: songData.lyrics,
        memo: songData.memo,
      })
      .eq('id', id);

    if (error) throw error;

    await fetchSongs();
  };

  const deleteSong = async (id: string) => {
    // 먼저 연결된 악보 파일들 조회
    const { data: sheets } = await supabase
      .from('song_sheets')
      .select('file_url')
      .eq('song_id', id);

    // Storage에서 파일 삭제
    if (sheets) {
      for (const sheet of sheets) {
        try {
          await deleteSheetFile(sheet.file_url);
        } catch (err) {
          console.error('파일 삭제 실패:', err);
        }
      }
    }

    // DB에서 곡 삭제 (CASCADE로 song_sheets도 삭제됨)
    const { error } = await supabase
      .from('songs')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchSongs();
  };

  const addSheet = async (
    songId: string,
    file: File,
    musicKey: string,
    songTitle?: string
  ): Promise<SongSheet> => {
    // 같은 키의 악보가 있는지 확인
    const { data: existing } = await supabase
      .from('song_sheets')
      .select('id')
      .eq('song_id', songId)
      .eq('music_key', musicKey)
      .single();

    if (existing) {
      throw new Error(`${musicKey} 키의 악보가 이미 존재합니다.`);
    }

    // 곡 제목 가져오기 (전달되지 않은 경우)
    let title = songTitle;
    if (!title) {
      const { data: songData } = await supabase
        .from('songs')
        .select('title')
        .eq('id', songId)
        .single();
      title = songData?.title;
    }

    // Storage에 파일 업로드
    const { publicUrl, fileName } = await uploadSheetFile(file, songId, musicKey, title);

    // DB에 레코드 추가
    if (!profile?.church_id) {
      throw new Error('교회 정보가 없습니다. 온보딩을 완료해주세요.');
    }

    const { data, error } = await supabase
      .from('song_sheets')
      .insert({
        song_id: songId,
        music_key: musicKey,
        file_url: publicUrl,
        file_name: fileName,
        church_id: profile.church_id,
      })
      .select()
      .single();

    if (error) {
      // 실패 시 업로드된 파일 삭제
      await deleteSheetFile(publicUrl);
      throw error;
    }

    await fetchSongs();
    return data;
  };

  const checkSheetUsage = async (sheetId: string) => {
    // 먼저 악보 정보 조회 (music_key, song_id)
    const { data: sheetData, error: sheetError } = await supabase
      .from('song_sheets')
      .select('music_key, song_id')
      .eq('id', sheetId)
      .single();

    if (sheetError) throw sheetError;
    if (!sheetData) throw new Error('악보를 찾을 수 없습니다.');

    // 이 악보를 사용하는 콘티 항목 확인
    const { data: usedInSetlists, error: checkError } = await supabase
      .from('setlist_items')
      .select(`
        id,
        setlists (
          id,
          date,
          service_type
        )
      `)
      .eq('song_id', sheetData.song_id)
      .eq('selected_key', sheetData.music_key);

    if (checkError) throw checkError;

    if (usedInSetlists && usedInSetlists.length > 0) {
      const setlistInfo = usedInSetlists
        .map((item: any) => {
          const setlist = item.setlists;
          if (setlist) {
            const date = new Date(setlist.date).toLocaleDateString('ko-KR');
            return `${date} ${setlist.service_type}`;
          }
          return null;
        })
        .filter(Boolean);

      return {
        isUsed: true,
        setlists: setlistInfo,
      };
    }

    return { isUsed: false, setlists: [] };
  };

  const removeSheet = async (sheetId: string, fileUrl: string, force: boolean = false) => {
    // 강제 삭제가 아니면 사용 중인지 체크
    if (!force) {
      const usage = await checkSheetUsage(sheetId);
      if (usage.isUsed) {
        const setlistList = usage.setlists.join('\n• ');
        throw new Error(`SHEET_IN_USE:${setlistList}`);
      }
    }

    // Storage에서 파일 삭제
    await deleteSheetFile(fileUrl);

    // DB에서 레코드 삭제
    const { error } = await supabase
      .from('song_sheets')
      .delete()
      .eq('id', sheetId);

    if (error) throw error;

    await fetchSongs();
  };

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return {
    songs,
    loading,
    error,
    fetchSongs,
    fetchSongById,
    createSong,
    updateSong,
    deleteSong,
    addSheet,
    removeSheet,
    checkSheetUsage,
  };
}
