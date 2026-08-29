-- =============================================
-- 슈퍼 관리자 기능 추가
-- =============================================

-- profiles 테이블에 is_super_admin 컬럼 추가
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN NOT NULL DEFAULT FALSE;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS profiles_is_super_admin_idx ON public.profiles (is_super_admin);

-- 슈퍼 관리자는 모든 교회 데이터를 볼 수 있도록 RLS 정책 수정

-- ===== songs 테이블 정책 업데이트 =====
DROP POLICY IF EXISTS "본인 교회 곡만 조회" ON public.songs;

CREATE POLICY "본인 교회 곡만 조회 (슈퍼 관리자 예외)" ON public.songs
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      -- 슈퍼 관리자는 모든 데이터 조회 가능
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
      )
      OR
      -- 일반 사용자는 본인 교회 데이터만 조회
      church_id = public.get_user_church_id()
    )
  );

-- ===== song_sheets 테이블 정책 업데이트 =====
DROP POLICY IF EXISTS "본인 교회 악보만 조회" ON public.song_sheets;

CREATE POLICY "본인 교회 악보만 조회 (슈퍼 관리자 예외)" ON public.song_sheets
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
      )
      OR
      church_id = public.get_user_church_id()
    )
  );

-- ===== setlists 테이블 정책 업데이트 =====
DROP POLICY IF EXISTS "본인 교회 콘티만 조회" ON public.setlists;

CREATE POLICY "본인 교회 콘티만 조회 (슈퍼 관리자 예외)" ON public.setlists
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
      )
      OR
      church_id = public.get_user_church_id()
    )
  );

-- ===== setlist_items 테이블 정책 업데이트 =====
DROP POLICY IF EXISTS "본인 교회 콘티 항목만 조회" ON public.setlist_items;

CREATE POLICY "본인 교회 콘티 항목만 조회 (슈퍼 관리자 예외)" ON public.setlist_items
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_super_admin = TRUE
      )
      OR
      church_id = public.get_user_church_id()
    )
  );

-- ===== profiles 테이블 정책 업데이트 =====
DROP POLICY IF EXISTS "본인 교회 사용자만 조회" ON public.profiles;

CREATE POLICY "본인 교회 사용자만 조회 (슈퍼 관리자 예외)" ON public.profiles
  FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    (
      -- 슈퍼 관리자는 모든 프로필 조회 가능
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.is_super_admin = TRUE
      )
      OR
      -- 본인 교회 사용자 조회 가능
      church_id = public.get_user_church_id()
      OR
      -- 본인 프로필은 항상 조회 가능
      id = auth.uid()
    )
  );
