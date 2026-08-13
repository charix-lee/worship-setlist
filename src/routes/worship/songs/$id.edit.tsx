import { useState, useEffect, useRef } from 'react';
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Plus,
  X,
  Upload,
  FileText,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import Button from '@/components/Button';
import type { SongWithSheets } from '@/types/database';
import { MUSIC_KEYS } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/worship/songs/$id/edit')({
  component: EditSongPage,
});

function EditSongPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const { fetchSongById, updateSong, addSheet, removeSheet, songs } = useSongs();

  const [song, setSong] = useState<SongWithSheets | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [memo, setMemo] = useState('');

  // New sheet form states
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newSheetKey, setNewSheetKey] = useState('C');
  const [newSheetDescription, setNewSheetDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;

    const loadSong = async () => {
      setLoading(true);
      const data = await fetchSongById(id);
      if (data) {
        setSong(data);
        setTitle(data.title);
        setArtist(data.artist || '');
        setYoutubeUrl(data.youtube_url || '');
        setLyrics(data.lyrics || '');
        setMemo(data.memo || '');
      } else {
        toast.error('곡을 찾을 수 없습니다.');
        navigate({ to: '/worship/songs' });
      }
      setLoading(false);
    };

    loadSong();
  }, [id, fetchSongById, navigate]);

  const handleSave = async () => {
    if (!song || !title.trim()) {
      toast.error('곡 제목은 필수입니다.');
      return;
    }

    // 중복 체크 (자기 자신 제외)
    const duplicateSong = songs.find(
      (s) => s.id !== song.id && s.title.toLowerCase() === title.trim().toLowerCase()
    );
    if (duplicateSong) {
      toast.error('이미 등록된 곡 제목입니다.');
      return;
    }

    setSaving(true);
    try {
      await updateSong(song.id, {
        title: title.trim(),
        artist: artist.trim() || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        memo: memo.trim() || undefined,
      });
      toast.success('저장되었습니다!');
      navigate({ to: '/worship/songs/$id/view', params: { id: song.id } });
    } catch (error) {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/worship/songs/$id/view', params: { id: id || '' } });
  };

  const handleDeleteSheet = async (sheetId: string, fileUrl: string) => {
    if (!song) return;
    try {
      await removeSheet(sheetId, fileUrl);
      const updated = await fetchSongById(song.id);
      if (updated) setSong(updated);
      toast.success('악보가 삭제되었습니다.');
    } catch {
      toast.error('삭제 실패');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!song) return;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await addSheet(song.id, file, newSheetKey);
      const updated = await fetchSongById(song.id);
      if (updated) setSong(updated);
      toast.success('악보가 추가되었습니다!');
      setShowAddSheet(false);
      setNewSheetKey('C');
      setNewSheetDescription('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      toast.error('업로드 실패');
    } finally {
      setUploading(false);
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

  const originalKey = song.song_sheets.length > 0 ? song.song_sheets[0].music_key : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-[11px] sm:text-xs mb-3 sm:mb-4 overflow-x-auto">
            <span className="text-gray-500 font-medium whitespace-nowrap">찬양팀</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-500 font-medium whitespace-nowrap">악보 라이브러리</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-500 font-medium whitespace-nowrap">{song.title}</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-primary-600 font-semibold whitespace-nowrap">수정</span>
          </div>

          {/* Title & Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleCancel}
                className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
              </button>
              <h1 className="text-[20px] sm:text-[24px] lg:text-[28px] font-bold text-gray-900">곡 정보 수정</h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleCancel}
                className="px-4 sm:px-5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors bg-white"
              >
                취소
              </button>
              <Button onClick={handleSave} loading={saving} disabled={saving}>
                저장하기
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">
          {/* Basic Info Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-4 sm:mb-5">기본 정보</h2>

            <div className="space-y-4 sm:space-y-5">
              {/* Song Title */}
              <div>
                <label className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5">
                  곡 제목
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full h-10 sm:h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="곡 제목을 입력하세요"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5">
                  아티스트 / 작곡가
                </label>
                <input
                  type="text"
                  value={artist}
                  onChange={(e) => setArtist(e.target.value)}
                  className="w-full h-10 sm:h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="아티스트 또는 작곡가"
                />
              </div>

              {/* Original Key */}
              <div>
                <label className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5">
                  원키 (Original Key)
                </label>
                <div className="w-full h-10 sm:h-11 px-3 flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50">
                  <span className="text-sm text-gray-900">{originalKey || 'N/A'}</span>
                  <span className="text-[11px] sm:text-xs text-gray-500">(첫 번째 악보 키)</span>
                </div>
              </div>

              {/* YouTube URL */}
              <div>
                <label className="text-[11px] sm:text-xs font-semibold text-gray-700 mb-1.5 block">
                  유튜브 링크
                </label>
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="w-full h-10 sm:h-11 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="https://youtube.com/watch?v=xxx"
                />
              </div>
            </div>
          </div>

          {/* Memo Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-5">
            <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-3">메모</h3>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="w-full min-h-[100px] sm:min-h-[120px] p-3 sm:p-4 bg-yellow-100 border border-yellow-300 rounded-xl text-[11px] sm:text-xs text-gray-700 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="메모를 입력하세요 (예: 후렴 부분에서 키 전환 시 부드럽게 연결할 것)"
            />
          </div>

          {/* Sheet Management Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-5">
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                등록된 악보 파일 ({song.song_sheets.length})
              </h2>
              <button
                onClick={() => setShowAddSheet(!showAddSheet)}
                className="flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary-600 hover:text-primary-700"
              >
                <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span className="hidden sm:inline">새 악보 추가</span>
                <span className="sm:hidden">추가</span>
              </button>
            </div>

            {/* Existing Sheets */}
            {song.song_sheets.length > 0 && (
              <div className="space-y-2 mb-4">
                {song.song_sheets.map((sheet) => (
                  <div
                    key={sheet.id}
                    className="bg-gray-50 border border-gray-200 rounded-lg px-2.5 sm:px-3 py-2 flex items-center gap-2 sm:gap-3"
                  >
                    <FileText className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600 flex-shrink-0" />
                    <p className="flex-1 text-[11px] sm:text-xs font-semibold text-gray-900 truncate">
                      {sheet.file_name}
                    </p>
                    <div className="bg-primary-50 px-1.5 py-0.5 rounded flex-shrink-0">
                      <span className="text-[10px] sm:text-[11px] font-semibold text-primary-600">
                        {sheet.music_key}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteSheet(sheet.id, sheet.file_url)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors flex-shrink-0"
                    >
                      <X className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Sheet Form */}
            {showAddSheet && (
              <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="relative">
                    <select
                      value={newSheetKey}
                      onChange={(e) => setNewSheetKey(e.target.value)}
                      className="w-20 sm:w-24 h-10 px-2 sm:px-3 pr-7 sm:pr-8 border border-gray-200 rounded-lg text-[11px] sm:text-xs font-semibold text-gray-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      {MUSIC_KEYS.map((key) => (
                        <option key={key} value={key}>
                          {key}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 text-gray-500 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    value={newSheetDescription}
                    onChange={(e) => setNewSheetDescription(e.target.value)}
                    className="flex-1 h-10 px-2.5 sm:px-3 border border-gray-200 rounded-lg text-[11px] sm:text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="파일명 (예: 어노인팅 편곡)"
                  />
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-white border-2 border-gray-300 border-dashed rounded-lg h-20 sm:h-24 flex flex-col items-center justify-center gap-1 sm:gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-gray-600" />
                  <p className="text-[11px] sm:text-xs font-semibold text-gray-700 text-center px-4">
                    파일을 클릭하여 업로드<br className="sm:hidden" />
                    <span className="hidden sm:inline"> (PDF, 이미지 지원)</span>
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 sm:gap-3">
                  <button
                    onClick={() => setShowAddSheet(false)}
                    className="text-[11px] sm:text-xs font-semibold text-gray-700 hover:text-gray-900 px-2"
                  >
                    취소
                  </button>
                  <Button
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    loading={uploading}
                    disabled={uploading}
                  >
                    추가
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Lyrics Card */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6">
            <h2 className="text-sm sm:text-base font-bold text-gray-900 mb-3 sm:mb-4">가사</h2>
            <textarea
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              className="w-full min-h-[160px] sm:min-h-[200px] p-3 sm:p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 leading-snug resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="가사를 입력하세요"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
