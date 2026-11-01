import type { SongWithSheets } from '@/types/database';

/**
 * 기본 악보의 키: 직접 고른 악보가 있으면 그 키, 없으면 첫 번째 악보의 키.
 * (songs.original_key에 기본 악보의 키를 저장한다)
 */
export function getDefaultSheetKey(song: Pick<SongWithSheets, 'original_key' | 'song_sheets'>): string | null {
  const chosen = song.original_key;
  if (chosen && song.song_sheets.some((s) => s.music_key === chosen)) return chosen;
  return song.song_sheets[0]?.music_key ?? null;
}
