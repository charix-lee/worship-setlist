import { useAuth } from '../contexts/AuthContext';
import { hasPermission, hasAnyPermission, hasAllPermissions, can, isAdmin } from '../lib/permissions';
import type { Permission } from '../types/database';

/**
 * 컴포넌트에서 권한을 체크하기 위한 훅
 */
export function usePermissions() {
  const { profile } = useAuth();

  return {
    hasPermission: (permission: Permission) => hasPermission(profile, permission),
    hasAnyPermission: (permissions: Permission[]) => hasAnyPermission(profile, permissions),
    hasAllPermissions: (permissions: Permission[]) => hasAllPermissions(profile, permissions),
    can: {
      createSong: can.createSong(profile),
      editSong: can.editSong(profile),
      deleteSong: can.deleteSong(profile),
      createSetlist: can.createSetlist(profile),
      editSetlist: can.editSetlist(profile),
      deleteSetlist: can.deleteSetlist(profile),
      viewSetlist: can.viewSetlist(profile),
    },
    isAdmin: isAdmin(profile),
    profile,
  };
}
