-- =============================================
-- 멀티테넌시 지원: 교회별 데이터 격리
-- =============================================

-- =============================================
-- 1. 테이블에 church_id 컬럼 추가
-- =============================================

-- songs 테이블에 church_id 추가
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- setlists 테이블에 church_id 추가
ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- song_sheets 테이블에 church_id 추가
ALTER TABLE public.song_sheets
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- setlist_items 테이블에 church_id 추가
ALTER TABLE public.setlist_items
  ADD COLUMN IF NOT EXISTS church_id UUID REFERENCES public.churches(id) ON DELETE CASCADE;

-- =============================================
-- 2. 인덱스 추가 (성능 최적화)
-- =============================================

CREATE INDEX IF NOT EXISTS songs_church_id_idx ON public.songs (church_id);
CREATE INDEX IF NOT EXISTS setlists_church_id_idx ON public.setlists (church_id);
CREATE INDEX IF NOT EXISTS song_sheets_church_id_idx ON public.song_sheets (church_id);
CREATE INDEX IF NOT EXISTS setlist_items_church_id_idx ON public.setlist_items (church_id);

-- =============================================
-- 3. 헬퍼 함수: 현재 사용자의 church_id 가져오기
-- =============================================

CREATE OR REPLACE FUNCTION public.get_user_church_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT church_id
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =============================================
-- 4. 기존 RLS 정책 삭제
-- =============================================

-- songs 정책 삭제
DROP POLICY IF EXISTS "곡 조회" ON public.songs;
DROP POLICY IF EXISTS "곡 추가" ON public.songs;
DROP POLICY IF EXISTS "곡 수정" ON public.songs;
DROP POLICY IF EXISTS "곡 삭제" ON public.songs;

-- song_sheets 정책 삭제
DROP POLICY IF EXISTS "악보 파일 조회" ON public.song_sheets;
DROP POLICY IF EXISTS "악보 파일 추가" ON public.song_sheets;
DROP POLICY IF EXISTS "악보 파일 삭제" ON public.song_sheets;

-- setlists 정책 삭제
DROP POLICY IF EXISTS "콘티 조회" ON public.setlists;
DROP POLICY IF EXISTS "콘티 추가" ON public.setlists;
DROP POLICY IF EXISTS "콘티 수정" ON public.setlists;
DROP POLICY IF EXISTS "콘티 삭제" ON public.setlists;

-- setlist_items 정책 삭제
DROP POLICY IF EXISTS "콘티 항목 조회" ON public.setlist_items;
DROP POLICY IF EXISTS "콘티 항목 추가" ON public.setlist_items;
DROP POLICY IF EXISTS "콘티 항목 수정" ON public.setlist_items;
DROP POLICY IF EXISTS "콘티 항목 삭제" ON public.setlist_items;

-- =============================================
-- 5. 새로운 RLS 정책: 교회별 데이터 격리
-- =============================================

-- ===== songs 테이블 정책 =====

-- 조회: 본인 교회 곡만 조회 가능
CREATE POLICY "본인 교회 곡만 조회" ON public.songs
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 추가: 본인 교회로만 추가 가능
CREATE POLICY "본인 교회로만 곡 추가" ON public.songs
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 수정: 본인 교회 곡만 수정 가능
CREATE POLICY "본인 교회 곡만 수정" ON public.songs
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 삭제: 본인 교회 곡만 삭제 가능
CREATE POLICY "본인 교회 곡만 삭제" ON public.songs
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- ===== song_sheets 테이블 정책 =====

-- 조회: 본인 교회 악보만 조회 가능
CREATE POLICY "본인 교회 악보만 조회" ON public.song_sheets
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 추가: 본인 교회로만 추가 가능
CREATE POLICY "본인 교회로만 악보 추가" ON public.song_sheets
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 삭제: 본인 교회 악보만 삭제 가능
CREATE POLICY "본인 교회 악보만 삭제" ON public.song_sheets
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- ===== setlists 테이블 정책 =====

-- 조회: 본인 교회 콘티만 조회 가능
CREATE POLICY "본인 교회 콘티만 조회" ON public.setlists
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 추가: 본인 교회로만 추가 가능
CREATE POLICY "본인 교회로만 콘티 추가" ON public.setlists
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 수정: 본인 교회 콘티만 수정 가능
CREATE POLICY "본인 교회 콘티만 수정" ON public.setlists
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 삭제: 본인 교회 콘티만 삭제 가능
CREATE POLICY "본인 교회 콘티만 삭제" ON public.setlists
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- ===== setlist_items 테이블 정책 =====

-- 조회: 본인 교회 콘티 항목만 조회 가능
CREATE POLICY "본인 교회 콘티 항목만 조회" ON public.setlist_items
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 추가: 본인 교회로만 추가 가능
CREATE POLICY "본인 교회로만 콘티 항목 추가" ON public.setlist_items
  FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 수정: 본인 교회 콘티 항목만 수정 가능
CREATE POLICY "본인 교회 콘티 항목만 수정" ON public.setlist_items
  FOR UPDATE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- 삭제: 본인 교회 콘티 항목만 삭제 가능
CREATE POLICY "본인 교회 콘티 항목만 삭제" ON public.setlist_items
  FOR DELETE
  USING (
    auth.role() = 'authenticated' AND
    church_id = public.get_user_church_id()
  );

-- =============================================
-- 6. profiles 테이블 RLS 정책 업데이트
-- =============================================

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- 새 정책: 본인 교회 사용자만 조회 가능
CREATE POLICY "본인 교회 사용자만 조회" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      church_id = public.get_user_church_id() OR
      id = auth.uid()
    )
  );
