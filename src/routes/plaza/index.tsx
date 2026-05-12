import { createFileRoute } from '@tanstack/react-router';
import {
  TrendingUp,
  MessageSquare,
  Music2,
  Users,
  ChevronRight,
  Heart,
  Eye,
  Bookmark,
} from 'lucide-react';

export const Route = createFileRoute('/plaza/')({
  component: PlazaPage,
});

// 임시 Mock 데이터
const popularPosts = [
  {
    id: 1,
    category: '자유게시판',
    title: '청년부 수련회 장소 추천받습니다',
    preview: '8월에 청년부 수련회를 계획하고 있는데 50명 정도 수용 가능한...',
    author: '은혜교회 청년',
    likes: 42,
    comments: 18,
    views: 234,
  },
  {
    id: 2,
    category: '찬양 나눔',
    title: '요즘 청년예배에서 자주 부르는 찬양 공유해요',
    preview: '저희 교회는 요즘 "주님은 좋은 분" 이 곡을 자주 부르는데...',
    author: '소망교회 찬양팀',
    likes: 89,
    comments: 45,
    views: 567,
  },
  {
    id: 3,
    category: '고민상담',
    title: '직장생활과 신앙생활 병행이 너무 힘들어요',
    preview: '매일 야근하다보니 수요예배는커녕 주일예배도 힘들고...',
    author: '익명',
    likes: 156,
    comments: 72,
    views: 1243,
  },
];

const trendingSetlists = [
  { id: 1, title: '2024 부활절 콘티', church: '사랑의교회 청년부', saves: 234 },
  { id: 2, title: '여름 수련회 찬양 세트', church: '온누리교회 청년부', saves: 189 },
  { id: 3, title: '새벽기도회 묵상 찬양', church: '소망교회 청년부', saves: 156 },
];

const categories = [
  { id: 'free', name: '자유게시판', icon: MessageSquare, count: 1234 },
  { id: 'praise', name: '찬양 나눔', icon: Music2, count: 567 },
  { id: 'qna', name: '고민상담', icon: Users, count: 890 },
];

function PlazaPage() {
  return (
    <div className="min-h-screen bg-blue-50/30 pb-20">
      {/* 헤더 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 text-white">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold">광장</h1>
          <p className="text-blue-100 mt-1 text-sm">전국 청년들과 함께하는 공간</p>
        </div>

        {/* 카테고리 퀵 링크 */}
        <div className="px-4 pb-4 flex gap-2 overflow-x-auto scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur rounded-full text-sm font-medium whitespace-nowrap hover:bg-white/30 transition-colors"
            >
              <cat.icon className="w-4 h-4" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-6">
        {/* 인기 게시글 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              인기 게시글
            </h2>
            <button className="text-sm text-blue-600 font-medium flex items-center">
              더보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-3">
            {popularPosts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                    {post.category}
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{post.title}</h3>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">{post.preview}</p>
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <span>{post.author}</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5" /> {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5" /> {post.comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> {post.views}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 인기 찬양 콘티 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-blue-600" />
              인기 찬양 콘티
            </h2>
            <button className="text-sm text-blue-600 font-medium flex items-center">
              더보기 <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {trendingSetlists.map((setlist, index) => (
              <div
                key={setlist.id}
                className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-900 truncate">{setlist.title}</h3>
                  <p className="text-xs text-gray-500">{setlist.church}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Bookmark className="w-4 h-4" />
                  {setlist.saves}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 준비 중 안내 */}
        <section className="bg-white rounded-xl p-6 border border-dashed border-blue-200 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">커뮤니티 준비 중</h3>
          <p className="text-sm text-gray-500">
            전국 청년부가 함께하는 광장이 곧 열립니다.<br />
            기대해 주세요!
          </p>
        </section>
      </div>
    </div>
  );
}
