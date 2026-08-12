import { useState, useRef } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  ArrowLeft,
  Plus,
  X,
  Upload,
  FileText,
  ChevronDown,
} from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import Button from '@/components/Button';
import { MUSIC_KEYS } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/worship/songs/new')({
  component: NewSongPage,
});

interface SheetFile {
  id: string;
  key: string;
  file: File;
  description: string;
}

function NewSongPage() {
  const navigate = useNavigate();
  const { createSong, addSheet, songs } = useSongs();

  const [saving, setSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [memo, setMemo] = useState('');

  // Sheet files to upload
  const [sheetFiles, setSheetFiles] = useState<SheetFile[]>([]);

  // New sheet form states
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newSheetKey, setNewSheetKey] = useState('C');
  const [newSheetDescription, setNewSheetDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('곡 제목은 필수입니다.');
      return;
    }

    // 중복 체크
    const duplicateSong = songs.find(
      (song) => song.title.toLowerCase() === title.trim().toLowerCase()
    );
    if (duplicateSong) {
      toast.error('이미 등록된 곡 제목입니다.');
      return;
    }

    setSaving(true);
    try {
      // 1. 곡 생성
      const result = await createSong({
        title: title.trim(),
        artist: artist.trim() || null,
        youtube_url: youtubeUrl.trim() || null,
        lyrics: lyrics.trim() || null,
        memo: memo.trim() || null,
      });

      // 2. 악보 파일 업로드
      if (sheetFiles.length > 0) {
        for (const sheet of sheetFiles) {
          await addSheet(result.id, sheet.key, sheet.file);
        }
      }

      toast.success('곡이 등록되었습니다!');
      navigate({ to: '/worship/songs/$id/view', params: { id: result.id } });
    } catch (error) {
      toast.error('저장 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate({ to: '/worship/songs' });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const newSheet: SheetFile = {
      id: Math.random().toString(36).substr(2, 9),
      key: newSheetKey,
      file,
      description: newSheetDescription,
    };

    setSheetFiles([...sheetFiles, newSheet]);
    setShowAddSheet(false);
    setNewSheetKey('C');
    setNewSheetDescription('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('악보가 추가되었습니다.');
  };

  const handleDeleteSheet = (id: string) => {
    setSheetFiles(sheetFiles.filter((s) => s.id !== id));
    toast.success('악보가 제거되었습니다.');
  };

  const originalKey = sheetFiles.length > 0 ? sheetFiles[0].key : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto px-8 py-5">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs mb-4">
            <span className="text-gray-500 font-medium">찬양팀</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-gray-500 font-medium">악보 라이브러리</span>
            <span className="text-gray-400">&gt;</span>
            <span className="text-primary-600 font-semibold">새 곡 추가</span>
          </div>

          {/* Title & Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors bg-white"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <h1 className="text-[28px] font-bold text-gray-900">새 곡 추가</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCancel}
                className="px-4.5 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors bg-white"
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
      <div className="max-w-7xl mx-auto px-8 py-8">
        <div className="flex gap-6">
          {/* Left Column */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-5">기본 정보</h2>

              <div className="space-y-5">
                {/* Song Title */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1.5">
                    곡 제목
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="곡 제목을 입력하세요"
                  />
                </div>

                {/* Artist */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1.5">
                    아티스트 / 작곡가
                  </label>
                  <input
                    type="text"
                    value={artist}
                    onChange={(e) => setArtist(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="아티스트 또는 작곡가"
                  />
                </div>

                {/* Original Key */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1.5">
                    원키 (Original Key)
                  </label>
                  <div className="w-full h-10 px-3 flex items-center justify-between border border-gray-200 rounded-lg bg-gray-50">
                    <span className="text-sm text-gray-900">{originalKey || 'N/A'}</span>
                    <span className="text-xs text-gray-500">(첫 번째 악보 키)</span>
                  </div>
                </div>

                {/* YouTube URL */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    유튜브 링크
                  </label>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://youtube.com/watch?v=xxx"
                  />
                </div>
              </div>
            </div>

            {/* Sheet Management Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-900">
                  등록된 악보 파일 ({sheetFiles.length})
                </h2>
                <button
                  onClick={() => setShowAddSheet(!showAddSheet)}
                  className="flex items-center gap-1 text-xs font-semibold text-primary-600 hover:text-primary-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  새 악보 추가
                </button>
              </div>

              {/* Existing Sheets */}
              {sheetFiles.length > 0 && (
                <div className="space-y-2 mb-4">
                  {sheetFiles.map((sheet) => (
                    <div
                      key={sheet.id}
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3"
                    >
                      <FileText className="w-4.5 h-4.5 text-gray-600 flex-shrink-0" />
                      <p className="flex-1 text-xs font-semibold text-gray-900 truncate">
                        {sheet.file.name}
                      </p>
                      <div className="bg-primary-50 px-1.5 py-0.5 rounded">
                        <span className="text-[11px] font-semibold text-primary-600">
                          {sheet.key}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteSheet(sheet.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Sheet Form */}
              {showAddSheet && (
                <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-4 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <select
                        value={newSheetKey}
                        onChange={(e) => setNewSheetKey(e.target.value)}
                        className="w-24 h-10 px-3 pr-8 border border-gray-200 rounded-lg text-xs font-semibold text-gray-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        {MUSIC_KEYS.map((key) => (
                          <option key={key} value={key}>
                            {key}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                    </div>
                    <input
                      type="text"
                      value={newSheetDescription}
                      onChange={(e) => setNewSheetDescription(e.target.value)}
                      className="flex-1 h-10 px-3 border border-gray-200 rounded-lg text-xs font-medium text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="파일명 (예: 어노인팅 편곡, 단선 멜로디 등)"
                    />
                  </div>

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-white border-2 border-gray-300 border-dashed rounded-lg h-20 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <Upload className="w-4.5 h-4.5 text-gray-600" />
                    <p className="text-xs font-semibold text-gray-700 text-center">
                      파일을 드래그하거나 클릭하여 업로드 (PDF, 이미지 지원)
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3">
                    <button
                      onClick={() => setShowAddSheet(false)}
                      className="text-xs font-semibold text-gray-700 hover:text-gray-900"
                    >
                      취소
                    </button>
                    <Button
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      추가
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Lyrics Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <h2 className="text-base font-bold text-gray-900 mb-4">가사</h2>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                className="w-full min-h-[200px] p-4 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 leading-snug resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="가사를 입력하세요"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="w-[360px] flex-shrink-0">
            {/* Memo Card */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-base font-bold text-gray-900 mb-3">메모</h3>
              <textarea
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="w-full min-h-[120px] p-4 bg-yellow-100 border border-yellow-300 rounded-xl text-xs text-gray-700 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="메모를 입력하세요 (예: 후렴 부분에서 키 전환 시 부드럽게 연결할 것)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
