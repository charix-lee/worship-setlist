import type { UserRole, Permission, Profile } from '../types/database';

// 역할별 권한 매핑
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'songs:create',
    'songs:edit',
    'songs:delete',
    'setlists:create',
    'setlists:edit',
    'setlists:delete',
    'setlists:view',
  ],
  worship_team: [
    'songs:create',
    'songs:edit',
    'songs:delete',
    'setlists:create',
    'setlists:edit',
    'setlists:delete',
    'setlists:view',
  ],
  staff: [
    'setlists:view',
  ],
  member: [
    'setlists:view',
  ],
};

/**
 * 사용자가 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(
  profile: Profile | null,
  permission: Permission
): boolean {
  if (!profile) return false;

  const permissions = ROLE_PERMISSIONS[profile.role] || [];
  return permissions.includes(permission);
}

/**
 * 사용자가 여러 권한 중 하나라도 가지고 있는지 확인
 */
export function hasAnyPermission(
  profile: Profile | null,
  permissions: Permission[]
): boolean {
  if (!profile) return false;

  return permissions.some(permission => hasPermission(profile, permission));
}

/**
 * 사용자가 여러 권한을 모두 가지고 있는지 확인
 */
export function hasAllPermissions(
  profile: Profile | null,
  permissions: Permission[]
): boolean {
  if (!profile) return false;

  return permissions.every(permission => hasPermission(profile, permission));
}

/**
 * 편리한 권한 체크 헬퍼
 */
export const can = {
  createSong: (profile: Profile | null) => hasPermission(profile, 'songs:create'),
  editSong: (profile: Profile | null) => hasPermission(profile, 'songs:edit'),
  deleteSong: (profile: Profile | null) => hasPermission(profile, 'songs:delete'),
  createSetlist: (profile: Profile | null) => hasPermission(profile, 'setlists:create'),
  editSetlist: (profile: Profile | null) => hasPermission(profile, 'setlists:edit'),
  deleteSetlist: (profile: Profile | null) => hasPermission(profile, 'setlists:delete'),
  viewSetlist: (profile: Profile | null) => hasPermission(profile, 'setlists:view'),
};

/**
 * 역할의 한국어 이름 반환
 */
export function getRoleName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    admin: '관리자',
    staff: '임원단',
    worship_team: '찬양팀',
    member: '일반 성도',
  };
  return roleNames[role] || role;
}

/**
 * 관리자 권한 체크
 */
export function isAdmin(profile: Profile | null): boolean {
  return profile?.role === 'admin';
}
