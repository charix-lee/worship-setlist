import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, useParams } from '@tanstack/react-router';
import { Shield, Loader2, Users, ArrowLeft, Building2, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useChurches } from '@/hooks/useChurches';
import { supabase } from '@/lib/supabase';
import { getRoleName } from '@/lib/permissions';
import type { UserRole, Profile } from '@/types/database';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';

dayjs.locale('ko');

export const Route = createFileRoute('/super-admin/churches/$churchId/users')({
  component: SuperAdminChurchUsersPage,
});

const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: '교회 관리자',
    description: '교회 내 모든 기능 접근 가능 + 본인 교회 사용자 권한 관리',
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

function SuperAdminChurchUsersPage() {
  const navigate = useNavigate();
  const { churchId } = useParams({ from: '/super-admin/churches/$churchId/users' });
  const { profile, loading: authLoading } = useAuth();
  const { getChurchById } = useChurches();
  const [users, setUsers] = useState<Profile[]>([]);
  const [churchName, setChurchName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // 권한 체크 - super_admin이 아니면 접근 불가
  useEffect(() => {
    if (!authLoading && !profile?.is_super_admin) {
      toast.error('슈퍼 관리자만 접근할 수 있습니다.');
      navigate({ to: '/' });
    }
  }, [profile, authLoading, navigate]);

  // 교회 정보 및 사용자 목록 가져오기
  useEffect(() => {
    if (!churchId || authLoading) return;

    const fetchData = async () => {
      setLoading(true);

      // 교회 정보 조회
      const church = await getChurchById(churchId);
      if (church) {
        setChurchName(church.name);
      }

      // 해당 교회 사용자 조회
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('church_id', churchId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('사용자 조회 실패:', error);
        toast.error('사용자 목록을 불러올 수 없습니다.');
      } else {
        setUsers(data || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [churchId, authLoading, getChurchById]);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    // 교회 관리자가 여러 명 있는지 확인
    const currentAdmins = users.filter(u => u.role === 'admin');

    // 마지막 관리자를 다른 역할로 변경하려는 경우 경고
    if (user.role === 'admin' && newRole !== 'admin' && currentAdmins.length === 1) {
      if (!confirm(
        `⚠️ 경고: 이 사용자는 ${churchName}의 유일한 관리자입니다.\n\n` +
        `관리자가 없으면 교회 멤버들의 권한을 관리할 수 없습니다.\n\n` +
        `정말 "${getRoleName(newRole)}"(으)로 변경하시겠습니까?`
      )) {
        return;
      }
    } else {
      if (!confirm(`"${user.name || user.email}"의 권한을 "${getRoleName(newRole)}"(으)로 변경하시겠습니까?`)) {
        return;
      }
    }

    setUpdatingUserId(userId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // 로컬 상태 업데이트
      setUsers(prev =>
        prev.map(u =>
          u.id === userId
            ? { ...u, role: newRole, updated_at: new Date().toISOString() }
            : u
        )
      );

      toast.success('권한이 변경되었습니다.');
    } catch (error) {
      toast.error('권한 변경에 실패했습니다.');
      console.error(error);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (authLoading || loading || !profile?.is_super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const adminCount = users.filter(u => u.role === 'admin').length;

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate({ to: '/super-admin/churches' })}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            교회 목록으로
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{churchName} 사용자 관리</h1>
              <p className="text-sm text-gray-600">교회 관리자를 지정하고 사용자 권한을 관리합니다.</p>
            </div>
          </div>
        </div>

        {/* 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-primary-600" />
              <span className="text-sm text-gray-600">전체 가입자</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-red-600" />
              <span className="text-sm text-gray-600">교회 관리자</span>
            </div>
            <div className="text-2xl font-bold text-gray-900">{adminCount}</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">찬양팀</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'worship_team').length}
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <div className="text-sm text-gray-600 mb-1">일반 성도</div>
            <div className="text-2xl font-bold text-gray-900">
              {users.filter(u => u.role === 'member').length}
            </div>
          </div>
        </div>

        {/* 권한 설명 */}
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
                  const isUpdating = updatingUserId === user.id;

                  return (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.name || ''}
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              <span className="text-primary-600 font-bold">
                                {user.name?.[0] || user.email?.[0] || '?'}
                              </span>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || '이름 없음'}
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
              <p className="text-gray-500">아직 가입한 사용자가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
