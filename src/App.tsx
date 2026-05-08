import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
// TODO: 로그인 기능 활성화 시 아래 import 주석 해제
// import ProtectedRoute from './components/ProtectedRoute';
// import LoginPage from './pages/LoginPage';
import SongsPage from './pages/SongsPage';
import SongViewPage from './pages/SongViewPage';
import SetlistsPage from './pages/SetlistsPage';
import SetlistEditPage from './pages/SetlistEditPage';
import SetlistViewPage from './pages/SetlistViewPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* TODO: 로그인 기능 활성화 시 아래 라우트 주석 해제 */}
          {/* <Route path="/login" element={<LoginPage />} /> */}

          {/* 메인 라우트 */}
          <Route element={<Layout />}>
            <Route path="/" element={<Navigate to="/setlists" replace />} />
            <Route path="/songs" element={<SongsPage />} />
            <Route path="/setlists" element={<SetlistsPage />} />
            <Route path="/setlists/:id" element={<SetlistEditPage />} />
          </Route>

          {/* 뷰 페이지 (별도 레이아웃) */}
          <Route path="/songs/:id/view" element={<SongViewPage />} />
          <Route path="/setlists/:id/view" element={<SetlistViewPage />} />

          {/* 404 리다이렉트 */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      {/* 토스트 알림 */}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
        }}
      />
    </AuthProvider>
  );
}
