export interface Profile {
  id: string;
  email: string;
  name: string | null;
  role: 'admin' | 'member';
  created_at: string;
  updated_at: string;
}

export interface Song {
  id: string;
  title: string;
  artist: string | null;
  youtube_url: string | null;
  lyrics: string | null; // 가사 텍스트 (방송팀용)
  memo: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SongSheet {
  id: string;
  song_id: string;
  music_key: string;
  file_url: string;
  file_name: string;
  created_at: string;
}

export interface Setlist {
  id: string;
  title: string;
  date: string;
  service_type: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetlistItem {
  id: string;
  setlist_id: string;
  song_id: string;
  position: number;
  selected_key: string | null;
  note: string | null;
  annotations: string | null; // JSON string of drawing strokes
  created_at: string;
}

// 조인된 타입들
export interface SongWithSheets extends Song {
  song_sheets: SongSheet[];
}

export interface SetlistItemWithSong extends SetlistItem {
  song: SongWithSheets;
}

export interface SetlistWithItems extends Setlist {
  setlist_items: SetlistItemWithSong[];
}

// Supabase Database 타입
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      songs: {
        Row: Song;
        Insert: Omit<Song, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Song, 'id' | 'created_at'>>;
      };
      song_sheets: {
        Row: SongSheet;
        Insert: Omit<SongSheet, 'id' | 'created_at'>;
        Update: Partial<Omit<SongSheet, 'id' | 'created_at'>>;
      };
      setlists: {
        Row: Setlist;
        Insert: Omit<Setlist, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Setlist, 'id' | 'created_at'>>;
      };
      setlist_items: {
        Row: SetlistItem;
        Insert: Omit<SetlistItem, 'id' | 'created_at'>;
        Update: Partial<Omit<SetlistItem, 'id' | 'created_at'>>;
      };
    };
  };
}

// 서비스 타입 상수
export const SERVICE_TYPES: string[] = [
  '청년부',
  '주일 1부',
  '주일 2부',
  '주일 3부',
  '수요예배',
  '금요기도회',
  '새벽기도회',
  '수련회',
  '기타',
];

// 음악 키 상수
export const MUSIC_KEYS = [
  'C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F',
  'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B',
  'Cm', 'C#m', 'Dm', 'D#m', 'Ebm', 'Em', 'Fm',
  'F#m', 'Gm', 'G#m', 'Am', 'A#m', 'Bbm', 'Bm',
] as const;
