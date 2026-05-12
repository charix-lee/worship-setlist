import { createFileRoute, Link } from '@tanstack/react-router';
import { Globe, Church, Music } from 'lucide-react';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* 로고/타이틀 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary-500 to-blue-500 rounded-2xl mb-4 shadow-lg">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">청년부</h1>
          <p className="text-gray-500 mt-1">어디로 가시겠어요?</p>
        </div>

        {/* 선택 카드 */}
        <div className="space-y-4">
          {/* 광장 */}
          <Link
            to="/plaza"
            className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                <Globe className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                  광장
                </h2>
                <p className="text-sm text-gray-500">
                  전국 청년들과 함께하는 공간
                </p>
              </div>
              <div className="text-gray-300 group-hover:text-blue-400 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>

          {/* 우리 교회 */}
          <Link
            to="/my-church"
            className="block bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-lg hover:border-primary-200 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center group-hover:bg-primary-500 transition-colors">
                <Church className="w-7 h-7 text-primary-600 group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                  우리 교회
                </h2>
                <p className="text-sm text-gray-500">
                  우리 교회 청년부 관리
                </p>
              </div>
              <div className="text-gray-300 group-hover:text-primary-400 transition-colors">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
