import { useState, useRef, useEffect } from 'react';
import { FileText, ExternalLink, Trash2, Plus } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';
import type { SongWithSheets } from '../types/database';
import { MUSIC_KEYS } from '../types/database';
import toast from 'react-hot-toast';

// 임시 악보 파일 (새 곡 추가 시 사용)
interface PendingSheet {
  id: string;
  file: File;
  musicKey: string;
}

interface SongModalProps {
  isOpen: boolean;
  onClose: () => void;
  song?: SongWithSheets | null;
  onSave: (data: {
    title: string;
    artist?: string;
    youtube_url?: string;
    lyrics?: string;
    memo?: string;
  }) => Promise<{ id: string }>;
  onAddSheet?: (songId: string, file: File, key: string, songTitle?: string) => Promise<unknown>;
  onRemoveSheet?: (sheetId: string, fileUrl: string) => Promise<void>;
}

export default function SongModal({
  isOpen,
  onClose,
  song,
  onSave,
  onAddSheet,
  onRemoveSheet,
}: SongModalProps) {
  const [title, setTitle] = useState(song?.title || '');
  const [artist, setArtist] = useState(song?.artist || '');
  const [youtubeUrl, setYoutubeUrl] = useState(song?.youtube_url || '');
  const [lyrics, setLyrics] = useState(song?.lyrics || '');
  const [memo, setMemo] = useState(song?.memo || '');
  const [saving, setSaving] = useState(false);

  // 악보 업로드
  const [selectedKey, setSelectedKey] = useState('G');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 추가할 악보 파일 목록
  const [pendingSheets, setPendingSheets] = useState<PendingSheet[]>([]);

  // 기존 악보 목록 (로컬 상태로 관리하여 즉시 반영)
  const [existingSheets, setExistingSheets] = useState(song?.song_sheets || []);

  // 삭제할 악보 목록 (저장 시 실제 삭제)
  const [sheetsToDelete, setSheetsToDelete] = useState<{ id: string; fileUrl: string }[]>([]);

  const isEditing = !!song;

  // 모달이 열릴 때 상태 초기화
  useEffect(() => {
    if (isOpen) {
      setTitle(song?.title || '');
      setArtist(song?.artist || '');
      setYoutubeUrl(song?.youtube_url || '');
      setLyrics(song?.lyrics || '');
      setMemo(song?.memo || '');
      setPendingSheets([]);
      setSheetsToDelete([]);
      setSelectedKey('G');
      setExistingSheets(song?.song_sheets || []);
    }
  }, [isOpen, song]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('곡명을 입력해주세요.');
      return;
    }

    setSaving(true);
    try {
      // 곡 저장
      const savedSong = await onSave({
        title: title.trim(),
        artist: artist.trim() || undefined,
        youtube_url: youtubeUrl.trim() || undefined,
        lyrics: lyrics.trim() || undefined,
        memo: memo.trim() || undefined,
      });

      // 삭제 예정 악보들 삭제
      if (sheetsToDelete.length > 0 && onRemoveSheet) {
        for (const sheet of sheetsToDelete) {
          try {
            await onRemoveSheet(sheet.id, sheet.fileUrl);
          } catch (err) {
            console.error('악보 삭제 실패:', err);
          }
        }
      }

      // 대기 중인 악보 파일들 업로드 (새 곡 추가 및 편집 모드 모두)
      if (pendingSheets.length > 0 && onAddSheet) {
        const songId = isEditing ? song!.id : savedSong.id;
        for (const sheet of pendingSheets) {
          try {
            await onAddSheet(songId, sheet.file, sheet.musicKey, title.trim());
          } catch (err) {
            console.error('악보 업로드 실패:', err);
          }
        }
      }

      toast.success(isEditing ? '곡 정보가 수정되었습니다.' : '새 곡이 추가되었습니다.');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  // 악보 파일 추가 (저장 시 업로드)
  const handleAddPendingSheet = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('image')) {
      toast.error('PDF 또는 이미지 파일만 업로드 가능합니다.');
      return;
    }

    // 같은 키에 이미 파일이 있는지 확인 (대기 목록)
    if (pendingSheets.some((s) => s.musicKey === selectedKey)) {
      toast.error(`${selectedKey} 키 악보가 이미 추가되어 있습니다.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // 편집 모드: 기존 악보와도 중복 체크
    if (isEditing && existingSheets.some((s) => s.music_key === selectedKey)) {
      toast.error(`${selectedKey} 키 악보가 이미 존재합니다.`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingSheets((prev) => [
      ...prev,
      { id: `pending-${Date.now()}`, file, musicKey: selectedKey },
    ]);

    toast.success(`${selectedKey} 키 악보가 추가되었습니다. 저장 시 업로드됩니다.`);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // 임시 파일 제거
  const handleRemovePendingSheet = (id: string) => {
    setPendingSheets((prev) => prev.filter((s) => s.id !== id));
  };

  // 악보 삭제 예약 (저장 시 실제 삭제)
  const handleRemoveSheet = (sheetId: string, fileUrl: string) => {
    // 삭제 예정 목록에 추가
    setSheetsToDelete((prev) => [...prev, { id: sheetId, fileUrl }]);
    // 화면에서 즉시 제거
    setExistingSheets((prev) => prev.filter((s) => s.id !== sheetId));
    toast.success('악보가 삭제 예정되었습니다. 저장 시 적용됩니다.');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? '곡 정보 수정' : '새 곡 추가'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            곡명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 나 무엇과도 주님을 바꾸지 않으리"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            아티스트 / 출처
          </label>
          <input
            type="text"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="예: 어노인팅, Hillsong"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            유튜브 링크
          </label>
          <input
            type="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            가사 <span className="text-xs text-gray-400">(방송팀용)</span>
          </label>
          <textarea
            value={lyrics}
            onChange={(e) => setLyrics(e.target.value)}
            placeholder="가사를 입력하세요... (방송팀이 PPT에 복사하여 사용)"
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none font-mono text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            메모
          </label>
          <textarea
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="곡에 대한 메모를 입력하세요..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
          />
        </div>

        {/* 악보 파일 섹션 */}
        <div className="pt-4 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">악보 파일</h3>

          {/* 편집 모드: 기존 악보 목록 */}
          {isEditing && existingSheets.length > 0 && (
            <div className="space-y-2 mb-4">
              {existingSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg"
                >
                  <FileText className="w-5 h-5 text-gray-400" />
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {sheet.file_name}
                  </span>
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                    {sheet.music_key}
                  </span>
                  <a
                    href={sheet.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-gray-400 hover:text-primary-600"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => handleRemoveSheet(sheet.id, sheet.file_url)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 대기 중인 악보 목록 (저장 시 업로드) */}
          {pendingSheets.length > 0 && (
            <div className="space-y-2 mb-4">
              {pendingSheets.map((sheet) => (
                <div
                  key={sheet.id}
                  className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg"
                >
                  <FileText className="w-5 h-5 text-blue-400" />
                  <span className="flex-1 text-sm text-gray-700 truncate">
                    {sheet.file.name}
                  </span>
                  <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded">
                    {sheet.musicKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemovePendingSheet(sheet.id)}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 악보 추가 UI */}
          <div className="flex gap-2">
            <select
              value={selectedKey}
              onChange={(e) => setSelectedKey(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {MUSIC_KEYS.map((key) => (
                <option key={key} value={key}>
                  {key}
                </option>
              ))}
            </select>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/*"
              onChange={handleAddPendingSheet}
              className="hidden"
              id="sheet-upload"
            />
            <label
              htmlFor="sheet-upload"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-primary-400 hover:text-primary-600 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              악보 파일 추가
            </label>
          </div>

          <p className="mt-2 text-xs text-gray-400">
            여러 키의 악보를 추가할 수 있습니다. 저장 버튼을 누르면 업로드됩니다.
          </p>
        </div>

        {/* 버튼 */}
        <div className="flex gap-3 pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            fullWidth
          >
            취소
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={saving}
            fullWidth
          >
            {isEditing ? '저장' : '추가'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
