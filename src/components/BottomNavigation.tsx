import { Link, useLocation } from '@tanstack/react-router';
import { Globe, Church } from 'lucide-react';

const tabs = [
  {
    to: '/plaza',
    icon: Globe,
    label: '광장',
    activeColor: 'text-blue-600',
    activeBg: 'bg-blue-50',
    bgColor: 'bg-blue-600',
    hoverBg: 'hover:bg-blue-700',
  },
  {
    to: '/my-church',
    icon: Church,
    label: '우리 교회',
    activeColor: 'text-primary-600',
    activeBg: 'bg-primary-50',
    bgColor: 'bg-primary-600',
    hoverBg: 'hover:bg-primary-700',
  },
] as const;

export default function BottomNavigation() {
  const location = useLocation();

  const isPlaza = location.pathname.startsWith('/plaza');

  const isActive = (path: string) => {
    if (path === '/plaza') {
      return isPlaza;
    }
    return !isPlaza;
  };

  // 현재 페이지가 아닌 다른 탭 (플로팅 버튼용)
  const otherTab = isPlaza ? tabs[1] : tabs[0];

  return (
    <>
      {/* 모바일: 하단 탭 */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 lg:hidden">
        <div className="flex">
          {tabs.map((tab) => {
            const active = isActive(tab.to);
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`flex-1 flex flex-col items-center justify-center py-2 transition-colors ${
                  active ? tab.activeColor : 'text-gray-500'
                }`}
              >
                <div className={`p-1.5 rounded-xl ${active ? tab.activeBg : ''}`}>
                  <tab.icon className="w-6 h-6" />
                </div>
                <span className="text-xs font-medium mt-0.5">{tab.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 데스크톱: 플로팅 버튼 (다른 영역으로 이동) */}
      <Link
        to={otherTab.to}
        className={`hidden lg:flex fixed bottom-6 right-6 items-center gap-2 px-4 py-3 ${otherTab.bgColor} ${otherTab.hoverBg} text-white rounded-full shadow-lg hover:shadow-xl transition-all z-50`}
      >
        <otherTab.icon className="w-5 h-5" />
        <span className="font-medium">{otherTab.label}</span>
      </Link>
    </>
  );
}
