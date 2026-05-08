// TODO: 나중에 로그인 기능 활성화 시 아래 주석 해제
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../contexts/AuthContext';
// import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  // TODO: 로그인 기능 활성화 시 아래 코드로 교체
  // const { user, loading } = useAuth();
  //
  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
  //     </div>
  //   );
  // }
  //
  // if (!user) {
  //   return <Navigate to="/login" replace />;
  // }

  return <>{children}</>;
}
