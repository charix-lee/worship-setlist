import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { Shield, Loader2, Users, ArrowLeft } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleName } from '@/lib/permissions';
import type { UserRole } from '@/types/database';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
});

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: '관리자',
    description: '모든 기능 접근 가능',
  },
  {
    value: 'worship_team',
    label: '찬양팀',
    description: '모든 기능 접근 가능',
  },
  {
    value: 'staff',
    label: '임원단',
    description: '콘티 보기만 가능',
  },
  {
    value: 'member',
    label: '일반 성도',
    description: '콘티 보기만 가능',
  },
];

function AdminUsersPage() {
  const navigate = useNavigate();
  const { users, loading, updateUserRole } = useUsers();
  const { isAdmin, profile } = usePermissions();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // 권한 체크 - admin이 아니면 접근 불가
  useEffect(() => {
    if (!loading && !isAdmin) {
      toast.error('관리자만 접근할 수 있습니다.');
      navigate({ to: '/' });
    }
  }, [isAdmin, loading, navigate]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // 본인의 권한은 변경할 수 없음
    if (userId === profile?.id) {
      toast.error('자신의 권한은 변경할 수 없습니다.');
      return;
    }

    if (!confirm(`정말 이 사용자의 권한을 "${getRoleName(newRole)}"(으)로 변경하시겠습니까?`)) {
      return;
    }

    setUpdatingUserId(userId);
    try {
      await updateUserRole(userId, newRole);
      toast.success('권한이 변경되었습니다.');
    } catch (error) {
      toast.error('권한 변경에 실패했습니다.');
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (loading || !isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate({ to: '/mypage' })}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            뒤로 가기
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Shield className="w-8 h-8 text-primary-600" />
            <h1 className="text-2xl font-bold text-gray-900">사용자 권한 관리</h1>
          </div>
          <p className="text-gray-600">사용자의 역할을 관리하고 권한을 부여합니다.</p>
        </div>

        {/* 권한 설명 카드 */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" />
            권한 역할 설명
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {ROLE_OPTIONS.map((role) => (
              <div key={role.value} className="bg-white rounded-lg p-3">
                <div className="font-medium text-gray-900">{role.label}</div>
                <div className="text-sm text-gray-600">{role.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 사용자 목록 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    이메일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    현재 권한
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    권한 변경
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const isCurrentUser = user.id === profile?.id;
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr key={user.id} className={isCurrentUser ? 'bg-blue-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-bold">
                              {user.name?.[0] || user.email?.[0] || '?'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || '이름 없음'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs text-blue-600 font-semibold">(나)</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin'
                              ? 'bg-red-100 text-red-800'
                              : user.role === 'worship_team'
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'staff'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {getRoleName(user.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dayjs(user.created_at).format('YYYY.MM.DD')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isCurrentUser ? (
                          <span className="text-sm text-gray-400">변경 불가</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                            disabled={isUpdating}
                            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {users.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">등록된 사용자가 없습니다.</p>
            </div>
          )}
        </div>

        {/* 통계 */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {ROLE_OPTIONS.map((role) => {
            const count = users.filter((u) => u.role === role.value).length;
            return (
              <div key={role.value} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-sm text-gray-600">{role.label}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
