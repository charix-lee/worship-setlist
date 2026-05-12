import { Outlet, createRootRoute, Link, useNavigate, useMatchRoute, useLocation } from '@tanstack/react-router';
import { Toaster } from 'react-hot-toast';
import { Music, Library, ListMusic, LogOut, Menu, X, ChevronDown, Users, User, CalendarDays, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import BottomNavigation from '@/components/BottomNavigation';
import toast from 'react-hot-toast';

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <AuthProvider>
      <LayoutWrapper />
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

// 네비게이션 없이 렌더링할 경로들
const noLayoutPaths = ['/login', '/onboarding'];

// 메인 선택 페이지 (네비게이션 없음)
const isHomePage = (path: string) => path === '/';

// 광장 경로 (사이드바 없이 하단탭만)
const plazaPaths = ['/plaza'];

type NavChildItem = {
  to: '/worship/songs' | '/worship/setlists';
  icon: typeof Library;
  label: string;
};

type NavGroup = {
  type: 'group';
  id: string;
  icon: typeof Users;
  label: string;
  children: NavChildItem[];
};

type NavSingle = {
  type: 'single';
  to: '/schedule';
  icon: typeof CalendarDays;
  label: string;
};

type NavItem = NavGroup | NavSingle;

function LayoutWrapper() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<string[]>(['worship']);
  const { user, profile, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const location = useLocation();

  // 로그인 페이지 등에서는 네비게이션 없이 렌더링
  const isNoLayoutPage = noLayoutPaths.some((path) => location.pathname.startsWith(path));

  // 광장 페이지는 사이드바 없이 하단탭만
  const isPlazaPage = plazaPaths.some((path) => location.pathname.startsWith(path));

  // 인증 및 온보딩 체크
  useEffect(() => {
    if (loading) return;

    // 로그인/온보딩 페이지가 아닌데 로그인 안 된 경우
    if (!user && !isNoLayoutPage) {
      navigate({ to: '/login' });
      return;
    }

    // 로그인 됐는데 온보딩 안 된 경우
    if (user && profile && !profile.is_onboarded && !location.pathname.startsWith('/onboarding')) {
      navigate({ to: '/onboarding' });
      return;
    }
  }, [user, profile, loading, isNoLayoutPage, location.pathname, navigate]);

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (isNoLayoutPage || isHomePage(location.pathname)) {
    return <Outlet />;
  }

  // 로그인 안 된 경우 (리다이렉트 전 빈 화면)
  if (!user) {
    return null;
  }

  // 광장 페이지는 사이드바 없이 탭만
  if (isPlazaPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <main className="pb-16 lg:pb-0 lg:pt-14 min-h-screen">
          <Outlet />
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('로그아웃 되었습니다.');
      navigate({ to: '/login' });
    } catch {
      toast.error('로그아웃 실패');
    }
  };

  const toggleMenu = (id: string) => {
    setOpenMenus((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleMyChurchPage = () => {
    navigate({ to: '/my-church' });
  };

  const navItems: NavItem[] = [
    {
      type: 'single',
      to: '/schedule' as const,
      icon: CalendarDays,
      label: '일정/행사',
    },
    {
      type: 'group',
      id: 'worship',
      icon: Users,
      label: '찬양팀',
      children: [
        { to: '/worship/songs' as const, icon: Library, label: '악보 라이브러리' },
        { to: '/worship/setlists' as const, icon: ListMusic, label: '콘티 목록' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 모바일 헤더 */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 z-40">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2" onClick={handleMyChurchPage}>
          <Music className="w-5 h-5 text-primary-600" />
          <span className="font-semibold text-gray-900">교회</span>
        </div>
        <div className="w-10" />
      </header>

      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-gray-200">
          <div className="flex items-center gap-2 cursor-pointer" onClick={handleMyChurchPage}>
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900">교회</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            if (item.type === 'single') {
              const isActive = matchRoute({ to: item.to, fuzzy: true });
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            }

            const group = item;
            const isOpen = openMenus.includes(group.id);
            const hasActiveChild = group.children.some((child) =>
              matchRoute({ to: child.to, fuzzy: true })
            );

            return (
              <div key={group.id}>
                <button
                  onClick={() => toggleMenu(group.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${hasActiveChild
                      ? 'text-primary-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <group.icon className="w-5 h-5" />
                    {group.label}
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {isOpen && (
                  <div className="mt-1 ml-4 space-y-1">
                    {group.children.map((child) => {
                      const isActive = matchRoute({ to: child.to, fuzzy: true });
                      return (
                        <Link
                          key={child.to}
                          to={child.to}
                          onClick={() => setSidebarOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                        >
                          <child.icon className="w-4 h-4" />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <Link
            to="/mypage"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 mb-3 p-2 -m-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <div className="w-9 h-9 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="프로필"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-5 h-5 text-primary-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.name || '이름 없음'}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </Link>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            로그아웃
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 pt-14 lg:pt-0 pb-16 lg:pb-0 min-h-screen">
        <Outlet />
      </main>

      <BottomNavigation />
    </div>
  );
}
