-- 사용자 역할 확장: admin, staff, worship_team, member
-- 기존 admin, member 역할은 유지되어 하위 호환성 보장

-- 기존 role 제약 조건 제거
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 새로운 역할을 포함한 제약 조건 추가
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_role_check
CHECK (role IN ('admin', 'staff', 'worship_team', 'member'));

-- 컬럼 설명 추가
COMMENT ON COLUMN public.profiles.role IS '사용자 역할:
- admin: 관리자 (모든 기능 접근 가능)
- worship_team: 찬양팀 (모든 기능 접근 가능)
- staff: 임원단 (보기만 가능, 추후 확장 예정)
- member: 일반 성도 (보기만 가능)';

-- 기존 사용자는 영향 없음 (admin과 member는 새 제약 조건에도 유효)
