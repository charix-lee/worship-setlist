-- 관리자가 다른 사용자의 권한을 변경할 수 있도록 RLS 정책 추가

-- 기존 정책은 유지하고, admin이 role을 변경할 수 있는 정책 추가
CREATE POLICY "Admins can update user roles"
  ON public.profiles
  FOR UPDATE
  USING (
    -- 본인 프로필이거나
    auth.uid() = id
    OR
    -- 현재 사용자가 admin인 경우
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    -- 본인 프로필이거나
    auth.uid() = id
    OR
    -- 현재 사용자가 admin인 경우
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 기존 "Users can update own profile" 정책 제거 (중복되므로)
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- 참고: 이제 admin은 다른 사용자의 role을 포함한 모든 필드를 수정할 수 있습니다.
-- 보안상 role 필드만 수정 가능하게 하려면 별도의 함수를 만들어야 하지만,
-- 현재 구조에서는 admin이 신뢰할 수 있는 사용자이므로 전체 수정 권한을 부여합니다.
