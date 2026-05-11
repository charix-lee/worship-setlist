import { useAuth } from '@/contexts/AuthContext';
import { createFileRoute } from '@tanstack/react-router';
import { Church, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/login/')({
  component: LoginPage,
});

function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { signInWithKakao } = useAuth();

  const handleKakaoLogin = async () => {
    setLoading(true);
    try {
      await signInWithKakao();
    } catch (error) {
      const message = error instanceof Error ? error.message : '카카오 로그인에 실패했습니다.';
      toast.error(message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 rounded-2xl mb-4">
            <Church className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">우리 교회 청년부</h1>
          <p className="text-gray-600 mt-1">교회 청년부 관리</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">로그인</h2>
            <p className="text-sm text-gray-500 mt-1">카카오 계정으로 시작하세요</p>
          </div>

          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={loading}
            className="w-full py-3 bg-[#FEE500] text-[#191919] font-medium rounded-lg hover:bg-[#FDD800] focus:ring-4 focus:ring-yellow-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3C6.48 3 2 6.58 2 11c0 2.83 1.89 5.31 4.69 6.72-.16.56-.58 2.03-.67 2.35-.1.38.14.37.3.27.12-.08 1.94-1.32 2.73-1.86.64.09 1.29.14 1.95.14 5.52 0 10-3.58 10-8S17.52 3 12 3z" />
              </svg>
            )}
            {loading ? '로그인 중...' : '카카오로 시작하기'}
          </button>

          <p className="mt-6 text-xs text-center text-gray-500">
            로그인 시 서비스 이용약관에 동의하게 됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
