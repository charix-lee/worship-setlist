# Supabase 설정 가이드

## 1. Supabase 프로젝트 생성

1. [supabase.com](https://supabase.com) 접속
2. "Start your project" 클릭
3. GitHub 로그인
4. "New Project" 생성
   - Project name: `worship-setlist`
   - Database Password: 안전한 비밀번호 설정 (저장해두세요)
   - Region: `Northeast Asia (Seoul)` 선택

## 2. 데이터베이스 테이블 생성

Supabase Dashboard > SQL Editor에서 아래 SQL 실행:

```sql
-- 1. Songs 테이블
CREATE TABLE songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  artist VARCHAR(255),
  youtube_url TEXT,
  lyrics TEXT,
  memo TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Song Sheets 테이블 (악보 파일)
CREATE TABLE song_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  music_key VARCHAR(10) NOT NULL,
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Setlists 테이블 (콘티)
CREATE TABLE setlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  date DATE NOT NULL,
  service_type VARCHAR(50) NOT NULL,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Setlist Items 테이블 (콘티 곡 목록)
CREATE TABLE setlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setlist_id UUID NOT NULL REFERENCES setlists(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES songs(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  selected_key VARCHAR(10),
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_song_sheets_song_id ON song_sheets(song_id);
CREATE INDEX idx_setlist_items_setlist_id ON setlist_items(setlist_id);
CREATE INDEX idx_setlists_date ON setlists(date DESC);

-- updated_at 자동 업데이트 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 설정
CREATE TRIGGER update_songs_updated_at
  BEFORE UPDATE ON songs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_setlists_updated_at
  BEFORE UPDATE ON setlists
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

## 3. Storage 버킷 생성

Supabase Dashboard > Storage에서:

1. "New bucket" 클릭
2. 버킷 이름: `sheets`
3. **Public bucket** 체크 (악보 파일 공개 접근 필요)
4. "Create bucket" 클릭

### Storage 정책 설정

Storage > sheets 버킷 > Policies에서 아래 정책 추가:

```sql
-- 누구나 읽기 가능
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'sheets');

-- 누구나 업로드 가능 (인증 없이 - 개발용)
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'sheets');

-- 누구나 삭제 가능 (인증 없이 - 개발용)
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'sheets');
```

## 4. RLS (Row Level Security) 설정

현재는 인증 없이 사용하므로 RLS 비활성화:

```sql
-- RLS 비활성화 (개발 단계)
ALTER TABLE songs DISABLE ROW LEVEL SECURITY;
ALTER TABLE song_sheets DISABLE ROW LEVEL SECURITY;
ALTER TABLE setlists DISABLE ROW LEVEL SECURITY;
ALTER TABLE setlist_items DISABLE ROW LEVEL SECURITY;
```

> **주의:** 프로덕션 배포 시에는 RLS 활성화 및 정책 설정 필요

## 5. 환경 변수 설정

1. Supabase Dashboard > Settings > API에서 확인:
   - `Project URL` → VITE_SUPABASE_URL
   - `anon public` key → VITE_SUPABASE_ANON_KEY

2. 프로젝트 루트에 `.env` 파일 생성:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 6. 테스트 데이터 삽입 (선택)

```sql
-- 테스트 곡 추가
INSERT INTO songs (title, artist, lyrics, memo) VALUES
('주님께 드리는 노래', '어노인팅', '주님께 드리는 노래
나의 삶을 드리는 예배
이 작은 나의 마음이
주님께 기쁨이 되기를', '느리게 시작해서 점점 빌드업'),
('은혜 (Grace)', '마커스워십', '나 같은 죄인 살리신
주 은혜 놀라워', NULL),
('나의 가장 낮은 곳에서', '소원 (김윤진)', '나의 가장 낮은 곳에서
주님의 발을 적시네', '간주 때 싱어 솔로');

-- 테스트 콘티 추가
INSERT INTO setlists (title, date, service_type, description) VALUES
('2024-01-07 주일 1부', '2024-01-07', '주일 1부', '신년 첫 예배');
```

## 완료 체크리스트

- [ ] Supabase 프로젝트 생성
- [ ] 4개 테이블 생성 (songs, song_sheets, setlists, setlist_items)
- [ ] Storage 버킷 `sheets` 생성 및 Public 설정
- [ ] Storage 정책 설정
- [ ] RLS 비활성화
- [ ] `.env` 파일 생성 및 키 입력
- [ ] `npm run dev`로 테스트
