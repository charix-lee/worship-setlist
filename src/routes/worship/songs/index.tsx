import { useState, useMemo } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import {
  Search,
  Plus,
  Music2,
  PlayCircle,
  Edit2,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Type,
} from 'lucide-react';
import { useSongs } from '@/hooks/useSongs';
import SongModal from '@/components/SongModal';
import Button from '@/components/Button';
import LyricsModal from '@/components/LyricsModal';
import type { SongWithSheets } from '@/types/database';
import toast from 'react-hot-toast';

export const Route = createFileRoute('/worship/songs/')({
  component: SongsPage,
});

function SongsPage() {
  const navigate = useNavigate();
  const {
    songs,
    loading,
    fetchSongs,
    createSong,
    updateSong,
    deleteSong,
    addSheet,
    removeSheet,
  } = useSongs();

  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSong, setEditingSong] = useState<SongWithSheets | null>(null);
  const [lyricsModalSong, setLyricsModalSong] = useState<SongWithSheets | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredSongs = useMemo(() => {
    if (!search.trim()) return songs;
    const searchLower = search.toLowerCase();
    return songs.filter(
      (song) =>
        song.title.toLowerCase().includes(searchLower) ||
        song.artist?.toLowerCase().includes(searchLower)
    );
  }, [songs, search]);

  // 페이지네이션
  const totalPages = Math.ceil(filteredSongs.length / ITEMS_PER_PAGE);
  const paginatedSongs = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSongs.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSongs, currentPage]);

  // 검색어 변경 시 첫 페이지로
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    fetchSongs(search.trim() || undefined);
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 곡을 삭제하시겠습니까?\n연결된 악보 파일도 함께 삭제됩니다.`)) {
      return;
    }
    try {
      await deleteSong(id);
      toast.success('곡이 삭제되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const openEditModal = (song: SongWithSheets) => {
    setEditingSong(song);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingSong(null);
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">악보 라이브러리</h1>
        <p className="text-gray-600">찬양팀의 모든 악보를 관리하세요</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="곡명 또는 아티스트로 검색..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <Button
          onClick={() => {
            setEditingSong(null);
            setModalOpen(true);
          }}
          icon={<Plus className="w-5 h-5" />}
          size="lg"
        >
          새 곡 추가
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : filteredSongs.length === 0 ? (
        <div className="text-center py-12">
          <Music2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {search ? '검색 결과가 없습니다.' : '등록된 곡이 없습니다.'}
          </p>
          {!search && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              첫 번째 곡 추가하기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {paginatedSongs.map((song) => (
            <div
              key={song.id}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-primary-300 hover:shadow-md transition-all cursor-pointer"
              onClick={() => navigate({ to: '/worship/songs/$id/view', params: { id: song.id } })}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Music2 className="w-5 h-5 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 break-words">{song.title}</h3>
                    <p className="text-sm text-gray-500 truncate mt-0.5">
                      {song.artist || '아티스트 미입력'}
                    </p>

                    {/* 모바일: 악보 키들 바로 아래 표시 */}
                    {song.song_sheets.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mt-2 sm:hidden" onClick={(e) => e.stopPropagation()}>
                        {song.song_sheets.map((sheet) => (
                          <a
                            key={sheet.id}
                            href={sheet.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-primary-100 hover:text-primary-700 transition-colors"
                          >
                            {sheet.music_key}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 데스크톱: 악보 키들 오른쪽에 표시 */}
                  <div className="hidden sm:flex items-center gap-1 flex-wrap justify-end" onClick={(e) => e.stopPropagation()}>
                    {song.song_sheets.map((sheet) => (
                      <a
                        key={sheet.id}
                        href={sheet.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded hover:bg-primary-100 hover:text-primary-700 transition-colors"
                      >
                        {sheet.music_key}
                      </a>
                    ))}
                  </div>

                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {song.lyrics && (
                      <button
                        onClick={() => setLyricsModalSong(song)}
                        className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                        title="가사"
                      >
                        <Type className="w-4 h-4" />
                      </button>
                    )}
                    {song.youtube_url && (
                      <a
                        href={song.youtube_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                        title="유튜브"
                      >
                        <PlayCircle className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => openEditModal(song)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 transition-colors"
                      title="수정"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(song.id, song.title)}
                      className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {song.memo && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-sm text-gray-500">{song.memo}</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      )}

      <SongModal
        isOpen={modalOpen}
        onClose={closeModal}
        song={editingSong}
        onSave={async (data) => {
          if (editingSong) {
            await updateSong(editingSong.id, data);
            return { id: editingSong.id };
          } else {
            return await createSong(data);
          }
        }}
        onAddSheet={addSheet}
        onRemoveSheet={removeSheet}
      />

      {lyricsModalSong && lyricsModalSong.lyrics && (
        <LyricsModal
          isOpen={!!lyricsModalSong}
          onClose={() => setLyricsModalSong(null)}
          title={lyricsModalSong.title}
          artist={lyricsModalSong.artist}
          lyrics={lyricsModalSong.lyrics}
        />
      )}
    </div>
  );
}
