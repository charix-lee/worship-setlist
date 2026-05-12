// 교회
export interface Church {
  id: string;
  name: string;
  address: string | null;
  denomination: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  email: string | null;
  name: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  region: string | null;
  church_id: string | null;
  role: 'admin' | 'member';
  is_onboarded: boolean;
  created_at: string;
  updated_at: string;
}

// 교회 정보가 포함된 프로필
export interface ProfileWithChurch extends Profile {
  church: Church | null;
}

// 한국 교단 목록
export const DENOMINATIONS = [
  '대한예수교장로회(합동)',
  '대한예수교장로회(통합)',
  '대한예수교장로회(고신)',
  '대한예수교장로회(합신)',
  '대한예수교장로회(백석)',
  '기독교대한감리회',
  '기독교대한성결교회',
  '기독교대한복음교회',
  '대한예수교침례회',
  '예수교대한하나님의성회(순복음)',
  '기독교한국루터회',
  '한국기독교장로회',
  '구세군대한본영',
  '기타',
] as const;

// 지역 목록
export const REGIONS = [
  '서울특별시',
  '부산광역시',
  '대구광역시',
  '인천광역시',
  '광주광역시',
  '대전광역시',
  '울산광역시',
  '세종특별자치시',
  '경기도',
  '강원도',
  '충청북도',
  '충청남도',
  '전라북도',
  '전라남도',
  '경상북도',
  '경상남도',
  '제주특별자치도',
] as const;

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

// 일정/행사
export interface Schedule {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// 일정 아이콘 목록
export const SCHEDULE_ICONS = [
  { id: 'church', label: '예배', icon: 'Church' },
  { id: 'book', label: '성경공부', icon: 'BookOpen' },
  { id: 'users', label: '모임', icon: 'Users' },
  { id: 'heart', label: '봉사', icon: 'Heart' },
  { id: 'music', label: '찬양', icon: 'Music' },
  { id: 'cake', label: '행사', icon: 'Cake' },
  { id: 'megaphone', label: '공지', icon: 'Megaphone' },
  { id: 'calendar', label: '일정', icon: 'CalendarDays' },
  { id: 'gift', label: '선물', icon: 'Gift' },
  { id: 'sun', label: '수련회', icon: 'Sun' },
  { id: 'graduation', label: '졸업', icon: 'GraduationCap' },
  { id: 'baby', label: '출산/돌', icon: 'Baby' },
] as const;

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
