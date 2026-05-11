import { useState, useEffect } from 'react';
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Music2,
  PlayCircle,
  Edit2,
  FileText,
  Loader2,
  ExternalLink,
  Copy,
  Check,
  User,
  Calendar,
  MessageSquare,
  Download,
} from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import Button from '@/components/Button';
import SongModal from '@/components/SongModal';
import type { SongWithSheets } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/worship/songs/$id/view')({
  component: SongViewPage,
});

function SongViewPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { fetchSongById, updateSong, addSheet, removeSheet } = useSongs();

  const [song, setSong] = useState<SongWithSheets | null>(null);
  const [loading, setLoading] = useState(true);
  const [lyricsCopied, setLyricsCopied] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  useEffect(() => {
    if (!id) return;

    const loadSong = async () => {
      setLoading(true);
      const data = await fetchSongById(id);
      if (data) {
        setSong(data);
      } else {
        toast.error('곡을 찾을 수 없습니다.');
        navigate({ to: '/worship/songs' });
      }
      setLoading(false);
    };

    loadSong();
  }, [id, fetchSongById, navigate]);

  const copyLyrics = async () => {
    if (!song?.lyrics) return;
    try {
      await navigator.clipboard.writeText(song.lyrics);
      setLyricsCopied(true);
      toast.success('가사가 복사되었습니다!');
      setTimeout(() => setLyricsCopied(false), 2000);
    } catch {
      toast.error('복사 실패');
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
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

  const handleSaveEdit = async (data: {
    title?: string;
    artist?: string;
    youtube_url?: string;
    lyrics?: string;
    memo?: string;
  }) => {
    if (!song) return { id: '' };
    await updateSong(song.id, data);
    const updated = await fetchSongById(song.id);
    if (updated) setSong(updated);
    return { id: song.id };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!song) return null;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate({ to: '/worship/songs' })}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">목록으로</span>
          </button>
          <div className="flex items-center gap-2">
            {song.youtube_url && (
              <a
                href={song.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                title="유튜브 영상 보기"
              >
                <PlayCircle className="w-5 h-5" />
              </a>
            )}
            <Button onClick={() => setEditModalOpen(true)} variant="secondary" icon={<Edit2 className="w-4 h-4" />}>
              수정
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 lg:p-8 border-b border-gray-200">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Music2 className="w-8 h-8 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-1">{song.title}</h1>
                {song.artist && (
                  <p className="text-lg text-gray-600 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {song.artist}
                  </p>
                )}
                <p className="text-sm text-gray-400 mt-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {formatDate(song.created_at)}
                </p>
              </div>
            </div>

            {song.memo && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {song.memo}
                </p>
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              악보 ({song.song_sheets.length})
            </h2>

            {song.song_sheets.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">등록된 악보가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-4">
                {song.song_sheets.map((sheet) => {
                  const isPdf = sheet.file_url?.toLowerCase().endsWith('.pdf');
                  const isImage = !isPdf;

                  return (
                    <div key={sheet.id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <span className="font-bold text-primary-700 text-lg">{sheet.music_key}</span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => downloadSheet(sheet.file_url, sheet.music_key)}
                            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600"
                          >
                            <Download className="w-4 h-4" />
                            다운로드
                          </button>
                          <a
                            href={sheet.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700"
                          >
                            <ExternalLink className="w-4 h-4" />
                            새 탭에서 열기
                          </a>
                        </div>
                      </div>

                      <div className="bg-white">
                        {isPdf ? (
                          <iframe src={sheet.file_url} className="w-full h-[500px]" title={`${song.title} - ${sheet.music_key}`} />
                        ) : isImage ? (
                          <img src={sheet.file_url} alt={`${song.title} - ${sheet.music_key}`} className="w-full" />
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="p-6 lg:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">가사</h2>
              {song.lyrics && (
                <button
                  onClick={copyLyrics}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    lyricsCopied ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {lyricsCopied ? (
                    <>
                      <Check className="w-4 h-4" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      가사 복사
                    </>
                  )}
                </button>
              )}
            </div>

            {song.lyrics ? (
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">{song.lyrics}</pre>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-400">등록된 가사가 없습니다</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <SongModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        song={song}
        onSave={handleSaveEdit}
        onAddSheet={addSheet}
        onRemoveSheet={async (sheetId, fileUrl) => {
          await removeSheet(sheetId, fileUrl);
          const updated = await fetchSongById(song.id);
          if (updated) setSong(updated);
        }}
      />
    </div>
  );
}
