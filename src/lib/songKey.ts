import type { SongWithSheets } from '@/types/database';

/** 곡 원키: 직접 지정한 값, 없으면 첫 번째 악보의 키 */
export function getOriginalKey(song: Pick<SongWithSheets, 'original_key' | 'song_sheets'>): string | null {
  return song.original_key || song.song_sheets[0]?.music_key || null;
}
