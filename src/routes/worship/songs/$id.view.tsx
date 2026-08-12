import { useState, useEffect } from 'react';
import { createFileRoute, useParams, useNavigate, Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  Music2,
  Edit2,
  Loader2,
  Copy,
  Download,
  ChevronDown,
  ChevronUp,
  Share2,
  Play,
  ChevronRight,
} from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import { useSetlists } from '@/hooks/useSetlists';
import Button from '@/components/Button';
import type { SongWithSheets, Setlist } from '@/types/database';
import toast from 'react-hot-toast';

dayjs.locale('ko');

export const Route = createFileRoute('/worship/songs/$id/view')({
  component: SongViewPage,
});

function SongViewPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { fetchSongById } = useSongs();
  const { fetchSetlistsBySongId } = useSetlists();

  const [song, setSong] = useState<SongWithSheets | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());
  const [relatedSetlists, setRelatedSetlists] = useState<Setlist[]>([]);
  const [activeTab, setActiveTab] = useState<'sheet' | 'lyrics'>('sheet');

  useEffect(() => {
    if (!id) return;

    const loadSong = async () => {
      setLoading(true);
      const data = await fetchSongById(id);
      if (data) {
        setSong(data);
        // 이 곡이 포함된 콘티 목록 조회
        const setlists = await fetchSetlistsBySongId(id);
        setRelatedSetlists(setlists);
      } else {
        toast.error('곡을 찾을 수 없습니다.');
        navigate({ to: '/worship/songs' });
      }
      setLoading(false);
    };

    loadSong();
  }, [id, fetchSongById, fetchSetlistsBySongId, navigate]);

  const copyLyrics = async () => {
    if (!song?.lyrics) return;
    try {
      await navigator.clipboard.writeText(song.lyrics);
      toast.success('가사가 복사되었습니다!');
    } catch {
      toast.error('복사 실패');
    }
  };

  const shareLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('링크가 복사되었습니다!');
    } catch {
      toast.error('링크 복사 실패');
    }
  };

  const downloadSheet = async (fileUrl: string, musicKey: string) => {
    if (!song) return;
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const ext = fileUrl.split('.').pop() || 'png';
      const fileName = `${song.title}_${musicKey}.${ext}`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('악보가 다운로드되었습니다.');
    } catch {
      toast.error('다운로드 실패');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!song) return null;

  // 첫 번째 악보의 키를 Original Key로 표시
  const originalKey = song.song_sheets.length > 0 ? song.song_sheets[0].music_key : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="max-w-7xl mx-auto pt-12 px-8">
        <div className="flex items-start justify-between">
          {/* Title & Meta */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-[28px] font-bold text-gray-900">{song.title}</h1>
              {originalKey && (
                <div className="bg-primary-50 px-2 py-0.5 rounded">
                  <span className="text-[11px] font-semibold text-primary-600">Original: {originalKey}</span>
                </div>
              )}
            </div>
            {song.artist && <p className="text-sm text-gray-500">{song.artist}</p>}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={shareLink}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white"
            >
              <Share2 className="w-4 h-4" />
              공유하기
            </button>
            <Button
              onClick={() => navigate({ to: '/worship/songs/$id/edit', params: { id: song.id } })}
              icon={<Edit2 className="w-4 h-4" />}
            >
              수정
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-6">
          {/* Left Column - Main Content */}
          <div className="flex-1 min-w-0">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-6">
                <button
                  onClick={() => setActiveTab('sheet')}
                  className={`pb-3 px-2 text-base font-bold border-b-2 transition-colors ${
                    activeTab === 'sheet'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  악보
                </button>
                <button
                  onClick={() => setActiveTab('lyrics')}
                  className={`pb-3 px-2 text-base font-medium border-b-2 transition-colors ${
                    activeTab === 'lyrics'
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  가사
                </button>
              </div>
            </div>

            {/* Sheet Tab */}
            {activeTab === 'sheet' && (
              <>
                <h2 className="text-base font-bold text-gray-900 mb-3">악보 목록</h2>
                <div className="space-y-3">
                  {song.song_sheets.map((sheet) => {
                    const isPdf = sheet.file_url?.toLowerCase().endsWith('.pdf');
                    const isImage = !isPdf;
                    const isExpanded = expandedSheets.has(sheet.id);

                    const toggleSheet = () => {
                      setExpandedSheets((prev) => {
                        const next = new Set(prev);
                        if (next.has(sheet.id)) {
                          next.delete(sheet.id);
                        } else {
                          next.add(sheet.id);
                        }
                        return next;
                      });
                    };

                    return (
                      <div key={sheet.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                        <div className="p-4 flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary-50 p-3 rounded-lg">
                              <Music2 className="w-6 h-6 text-primary-600" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{sheet.music_key} 악보</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => downloadSheet(sheet.file_url, sheet.music_key)}
                              icon={<Download className="w-3.5 h-3.5" />}
                            >
                              다운로드
                            </Button>
                            <button
                              onClick={toggleSheet}
                              className="w-6 h-6 flex items-center justify-center"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4.5 h-4.5 text-gray-500" />
                              ) : (
                                <ChevronDown className="w-4.5 h-4.5 text-gray-500" />
                              )}
                            </button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-3">
                            {isPdf ? (
                              <iframe src={sheet.file_url} className="w-full h-[500px]" title={`${song.title} - ${sheet.music_key}`} />
                            ) : isImage ? (
                              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                                <img
                                  src={sheet.file_url}
                                  alt={`${song.title} - ${sheet.music_key}`}
                                  className="w-full h-auto"
                                />
                              </div>
                            ) : null}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Lyrics Preview */}
                <div className="bg-white border border-gray-200 rounded-xl p-5 mt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-base font-bold text-gray-900">가사</h3>
                    {song.lyrics && (
                      <button
                        onClick={copyLyrics}
                        className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        가사 복사
                      </button>
                    )}
                  </div>
                  {song.lyrics ? (
                    <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-snug">{song.lyrics}</pre>
                  ) : (
                    <p className="text-sm text-gray-400">등록된 가사가 없습니다</p>
                  )}
                </div>
              </>
            )}

            {/* Lyrics Tab */}
            {activeTab === 'lyrics' && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-base font-bold text-gray-900">가사</h3>
                  {song.lyrics && (
                    <button
                      onClick={copyLyrics}
                      className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      가사 복사
                    </button>
                  )}
                </div>
                {song.lyrics ? (
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-snug">{song.lyrics}</pre>
                ) : (
                  <p className="text-sm text-gray-400">등록된 가사가 없습니다</p>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="w-[360px] flex-shrink-0 space-y-6">
            {/* Song Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-base font-bold text-gray-900 mb-4">곡 상세 정보</h3>
              <div className="space-y-3 text-xs">
                <div className="flex items-start justify-between">
                  <span className="text-gray-500">등록일</span>
                  <span className="font-semibold text-gray-700">{dayjs(song.created_at).format('YYYY.MM.DD HH:mm:ss')}</span>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-gray-500">최근 수정일</span>
                  <span className="font-semibold text-gray-700">{dayjs(song.updated_at).format('YYYY.MM.DD HH:mm:ss')}</span>
                </div>
              </div>
            </div>

            {/* YouTube */}
            {song.youtube_url && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-3">유튜브</h3>
                <div className="flex items-center gap-2">
                  <a
                    href={song.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Play className="w-4 h-4" />
                    유튜브에서 듣기
                  </a>
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(song.youtube_url || '');
                      toast.success('링크가 복사되었습니다!');
                    }}
                    className="flex items-center gap-2 px-3 py-2 border border-gray-200 bg-white text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    링크 복사
                  </button>
                </div>
              </div>
            )}

            {/* Memo */}
            {song.memo && (
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-base font-bold text-gray-900 mb-3">메모</h3>
                <div className="bg-yellow-100 border border-yellow-300 rounded-xl p-4">
                  <p className="text-xs text-gray-700 leading-relaxed">{song.memo}</p>
                </div>
              </div>
            )}

            {/* Recent Setlists */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-gray-900">최근 사용된 콘티</h3>
                {relatedSetlists.length > 0 && (
                  <div className="bg-primary-50 px-2 py-0.5 rounded-xl">
                    <span className="text-xs font-semibold text-primary-600">총 {relatedSetlists.length}회</span>
                  </div>
                )}
              </div>

              <div className="space-y-2.5">
                {relatedSetlists.length === 0 ? (
                  <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
                    <p className="text-sm text-gray-400">사용된 콘티가 없습니다</p>
                  </div>
                ) : (
                  relatedSetlists.slice(0, 5).map((setlist) => (
                    <Link
                      key={setlist.id}
                      to="/worship/setlists/$id/view"
                      params={{ id: setlist.id }}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900 mb-0.5">{setlist.title || setlist.service_type}</p>
                        <p className="text-xs text-gray-500">{dayjs(setlist.date).format('YYYY.MM.DD')} 예배</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
