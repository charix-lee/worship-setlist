import { useState, useEffect } from 'react';
import { createFileRoute, useNavigate, Link } from '@tanstack/react-router';
import { Shield, Loader2, Building2, Users, ArrowLeft, Crown } from 'lucide-react';
import { useChurches } from '@/hooks/useChurches';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/super-admin/churches/')({
  component: SuperAdminChurchesPage,
});

interface ChurchWithStats {
  id: string;
  name: string;
  address: string | null;
  denomination: string | null;
  userCount: number;
  adminName: string | null;
  adminId: string | null;
}

function SuperAdminChurchesPage() {
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { churches, loading: churchesLoading } = useChurches();
  const [churchStats, setChurchStats] = useState<ChurchWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // 권한 체크 - super_admin이 아니면 접근 불가
  useEffect(() => {
    if (!authLoading && !profile?.is_super_admin) {
      toast.error('슈퍼 관리자만 접근할 수 있습니다.');
      navigate({ to: '/' });
    }
  }, [profile, authLoading, navigate]);

  // 교회별 통계 가져오기
  useEffect(() => {
    if (churchesLoading || !churches.length) return;

    const fetchStats = async () => {
      setLoading(true);
      const stats: ChurchWithStats[] = [];

      for (const church of churches) {
        // 교회별 사용자 수 조회
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('church_id', church.id);

        // 교회 관리자 조회
        const { data: admin } = await supabase
          .from('profiles')
          .select('id, name')
          .eq('church_id', church.id)
          .eq('role', 'admin')
          .single();

        stats.push({
          id: church.id,
          name: church.name,
          address: church.address,
          denomination: church.denomination,
          userCount: count || 0,
          adminName: admin?.name || null,
          adminId: admin?.id || null,
        });
      }

      setChurchStats(stats);
      setLoading(false);
    };

    fetchStats();
  }, [churches, churchesLoading]);

  if (authLoading || loading || !profile?.is_super_admin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const totalUsers = churchStats.reduce((sum, church) => sum + church.userCount, 0);

  return (
    <div className="p-4 lg:p-6 min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto">
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
            <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">전체 교회 관리</h1>
          </div>
          <p className="text-gray-600">모든 교회와 가입자를 관리합니다.</p>
        </div>

        {/* 전체 통계 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-gray-600">전체 교회</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{churches.length}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Users className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-gray-600">전체 가입자</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{totalUsers}</div>
          </div>
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <Shield className="w-5 h-5 text-primary-600" />
              <span className="text-sm text-gray-600">교회 관리자</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">
              {churchStats.filter(c => c.adminId).length}
            </div>
          </div>
        </div>

        {/* 교회 목록 */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">교회 목록</h2>
          </div>

          <div className="divide-y divide-gray-200">
            {churchStats.map((church) => (
              <div
                key={church.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Building2 className="w-5 h-5 text-primary-600" />
                      <h3 className="text-lg font-semibold text-gray-900">
                        {church.name}
                      </h3>
                    </div>

                    {church.denomination && (
                      <p className="text-sm text-gray-500 mb-1">{church.denomination}</p>
                    )}
                    {church.address && (
                      <p className="text-sm text-gray-500 mb-3">{church.address}</p>
                    )}

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          가입자 <span className="font-semibold text-gray-900">{church.userCount}명</span>
                        </span>
                      </div>
                      {church.adminName ? (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-green-500" />
                          <span className="text-gray-600">
                            관리자: <span className="font-semibold text-gray-900">{church.adminName}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-red-400" />
                          <span className="text-red-600 font-medium">관리자 미지정</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link
                    to="/super-admin/churches/$churchId/users"
                    params={{ churchId: church.id }}
                    className="ml-4 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    사용자 관리
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {churchStats.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">등록된 교회가 없습니다.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
