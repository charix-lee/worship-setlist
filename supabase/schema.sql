-- =============================================
-- 찬양팀 콘티 관리 서비스 - Supabase 스키마
-- =============================================

-- 1. 사용자 프로필 테이블
-- Supabase Auth의 users 테이블과 연동
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 곡(악보) 테이블
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT,
  youtube_url TEXT,
  lyrics TEXT, -- 가사 텍스트 (방송팀용)
  memo TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 기존 테이블에 lyrics 컬럼 추가 (마이그레이션용)
-- ALTER TABLE songs ADD COLUMN IF NOT EXISTS lyrics TEXT;

-- 3. 악보 파일 테이블 (같은 곡도 코드별로 여러 파일 저장 가능)
CREATE TABLE song_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  music_key TEXT NOT NULL, -- G, C, D, A 등
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 콘티(세트리스트) 테이블
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, -- 예: "2024-01-07 주일 1부 예배"
  date DATE NOT NULL,
  service_type TEXT NOT NULL, -- 예: "주일 1부", "주일 2부", "수요예배"
  description TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 콘티 항목 테이블 (콘티에 포함된 곡 목록)
CREATE TABLE setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL, -- 순서
  selected_key TEXT, -- 이번 예배에서 사용할 코드
  note TEXT, -- 곡별 메모 (예: "인트로 2번 반복")
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_songs_title ON songs(title);
CREATE INDEX idx_songs_artist ON songs(artist);
CREATE INDEX idx_song_sheets_song_id ON song_sheets(song_id);
CREATE INDEX idx_setlists_date ON setlists(date DESC);
CREATE INDEX idx_setlist_items_setlist_id ON setlist_items(setlist_id);
CREATE INDEX idx_setlist_items_position ON setlist_items(setlist_id, position);

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

-- 모든 테이블에 RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE song_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items ENABLE ROW LEVEL SECURITY;

-- 프로필 정책: 로그인한 사용자는 모든 프로필 조회 가능, 자신의 프로필만 수정 가능
CREATE POLICY "프로필 조회" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "자신의 프로필 수정" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- 곡 정책: 로그인한 사용자는 모두 CRUD 가능
CREATE POLICY "곡 조회" ON songs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "곡 추가" ON songs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "곡 수정" ON songs
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "곡 삭제" ON songs
  FOR DELETE USING (auth.role() = 'authenticated');

-- 악보 파일 정책
CREATE POLICY "악보 파일 조회" ON song_sheets
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "악보 파일 추가" ON song_sheets
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "악보 파일 삭제" ON song_sheets
  FOR DELETE USING (auth.role() = 'authenticated');

-- 콘티 정책
CREATE POLICY "콘티 조회" ON setlists
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "콘티 추가" ON setlists
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "콘티 수정" ON setlists
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "콘티 삭제" ON setlists
  FOR DELETE USING (auth.role() = 'authenticated');

-- 콘티 항목 정책
CREATE POLICY "콘티 항목 조회" ON setlist_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "콘티 항목 추가" ON setlist_items
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "콘티 항목 수정" ON setlist_items
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "콘티 항목 삭제" ON setlist_items
  FOR DELETE USING (auth.role() = 'authenticated');

-- =============================================
-- 트리거: 자동 updated_at 갱신
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 트리거: 새 사용자 가입 시 프로필 자동 생성
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- Storage 버킷 설정 (Supabase 대시보드에서 실행)
-- =============================================
-- 1. 'sheets' 버킷 생성 (악보 파일 저장용)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('sheets', 'sheets', true);

-- 2. Storage 정책
-- CREATE POLICY "인증된 사용자 업로드" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'sheets' AND auth.role() = 'authenticated'
--   );

-- CREATE POLICY "모든 사용자 조회" ON storage.objects
--   FOR SELECT USING (bucket_id = 'sheets');

-- CREATE POLICY "인증된 사용자 삭제" ON storage.objects
--   FOR DELETE USING (
--     bucket_id = 'sheets' AND auth.role() = 'authenticated'
--   );
