import { useState, useEffect } from 'react';
import { createFileRoute, useParams, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  ArrowLeft,
  Plus,
  GripVertical,
  Trash2,
  FileText,
  Loader2,
  Search,
  Music2,
  X,
  Save,
  PenTool,
  Calendar,
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import { useSongs } from '@/hooks/useSongs';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import type { SetlistWithItems, SetlistItemWithSong, SongWithSheets } from '@/types/database';
import { MUSIC_KEYS } from '@/types/database';
import toast from 'react-hot-toast';

dayjs.locale('ko');

export const Route = createFileRoute('/worship/setlists/$id/')({
  component: SetlistEditPage,
});

function SortableItem({
  item,
  onKeyChange,
  onNoteChange,
  onCommentChange,
  onRemove,
  isOwner,
}: {
  item: SetlistItemWithSong;
  onKeyChange: (key: string) => void;
  onNoteChange: (note: string) => void;
  onCommentChange: (comment: string) => void;
  onRemove: () => void;
  isOwner: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const availableKeys = item.song.song_sheets.map((s) => s.music_key);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-gray-200 p-4 ${isDragging ? 'shadow-lg opacity-90' : ''}`}
    >
      <div className="flex items-start gap-3">
        <button
          {...attributes}
          {...listeners}
          className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical className="w-5 h-5" />
        </button>

        <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-semibold text-primary-700">{item.position}</span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">{item.song.title}</h3>
          <p className="text-sm text-gray-500 truncate">{item.song.artist || '아티스트 미입력'}</p>

          <div className="flex flex-wrap items-center gap-2 mt-2">
            <select
              value={item.selected_key || ''}
              onChange={(e) => onKeyChange(e.target.value)}
              className="px-2 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">키 선택</option>
              {availableKeys.length > 0 ? (
                availableKeys.map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))
              ) : (
                MUSIC_KEYS.slice(0, 12).map((key) => (
                  <option key={key} value={key}>{key}</option>
                ))
              )}
            </select>

            {item.selected_key && (
              <>
                {item.song.song_sheets
                  .filter((s) => s.music_key === item.selected_key)
                  .map((sheet) => (
                    <a
                      key={sheet.id}
                      href={sheet.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 px-2 py-1 bg-primary-50 text-primary-600 text-sm rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      <FileText className="w-4 h-4" />
                      악보 보기
                    </a>
                  ))}
              </>
            )}
          </div>

          <input
            type="text"
            value={item.note || ''}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder="곡 메모 (예: 인트로 2번 반복)"
            className="mt-2 w-full px-2 py-1 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />

          {isOwner && (
            <textarea
              value={item.comment || ''}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="멘트 (생성자만 보임)"
              rows={2}
              className="mt-2 w-full px-2 py-1 text-sm border border-orange-300 bg-orange-50 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
            />
          )}
        </div>

        <button onClick={onRemove} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function SetlistEditPage() {
  const { id } = useParams({ strict: false });
  const navigate = useNavigate();
  const {
    fetchSetlistById,
    updateSetlist,
    updateSetlistItem,
    removeItemFromSetlist,
    addItemToSetlist,
    reorderSetlistItems,
  } = useSetlists();
  const { songs, fetchSongs } = useSongs();
  const { can, profile } = usePermissions();
  const { loading: authLoading } = useAuth();

  const [setlist, setSetlist] = useState<SetlistWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<SetlistItemWithSong[]>([]);
  const [originalItems, setOriginalItems] = useState<SetlistItemWithSong[]>([]);
  const [itemsToDelete, setItemsToDelete] = useState<string[]>([]);

  // 콘티 기본 정보
  const [date, setDate] = useState('');
  const [serviceType, setServiceType] = useState('');
  const [originalDate, setOriginalDate] = useState('');
  const [originalServiceType, setOriginalServiceType] = useState('');

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adding, setAdding] = useState<string | null>(null);

  const hasSetlistInfoChanges = date !== originalDate || serviceType !== originalServiceType;
  const hasItemsChanges = itemsToDelete.length > 0 || JSON.stringify(items) !== JSON.stringify(originalItems);
  const hasChanges = hasSetlistInfoChanges || hasItemsChanges;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (!id) return;

    // 인증 정보가 완전히 로드될 때까지 대기
    if (authLoading) {
      setLoading(true);
      return;
    }

    // profile이 로드될 때까지 대기 (로그인이 필요한 페이지)
    if (!profile) {
      setLoading(true);
      return;
    }

    const loadSetlist = async () => {
      setLoading(true);
      const data = await fetchSetlistById(id);
      if (data) {
        // created_by가 null이고 편집 권한이 있으면 현재 사용자로 설정
        if (!data.created_by && can.editSetlist && profile.id) {
          try {
            const { error } = await supabase
              .from('setlists')
              .update({ created_by: profile.id })
              .eq('id', id);

            if (!error) {
              data.created_by = profile.id;
            }
          } catch (err) {
            console.error('생성자 설정 실패:', err);
          }
        }

        // 권한 체크 - 편집 권한이 없고 본인이 만든 콘티도 아니면 view 페이지로 리다이렉트
        const isOwner = data.created_by === profile.id;
        if (!can.editSetlist && !isOwner) {
          toast.error('콘티를 편집할 권한이 없습니다.');
          navigate({ to: '/worship/setlists/$id/view', params: { id } });
          setLoading(false);
          return;
        }

        setSetlist(data);
        setItems(data.setlist_items);
        setOriginalItems(JSON.parse(JSON.stringify(data.setlist_items)));
        setItemsToDelete([]);
        setDate(data.date);
        setServiceType(data.service_type);
        setOriginalDate(data.date);
        setOriginalServiceType(data.service_type);
      } else {
        toast.error('콘티를 찾을 수 없습니다.');
        navigate({ to: '/worship/setlists' });
      }
      setLoading(false);
    };

    loadSetlist();
  }, [id, fetchSetlistById, navigate, can.editSetlist, profile, authLoading]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !id) return;

    const oldIndex = items.findIndex((item) => item.id === active.id);
    const newIndex = items.findIndex((item) => item.id === over.id);

    const newItems = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      position: index + 1,
    }));

    setItems(newItems);
  };

  const handleKeyChange = (itemId: string, key: string) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, selected_key: key } : item)));
  };

  const handleNoteChange = (itemId: string, note: string) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, note } : item)));
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, comment } : item)));
  };

  const handleRemoveItem = (itemId: string) => {
    setItemsToDelete((prev) => [...prev, itemId]);
    setItems((prev) => {
      const filtered = prev.filter((item) => item.id !== itemId);
      return filtered.map((item, index) => ({ ...item, position: index + 1 }));
    });
    toast.success('곡이 삭제 예정되었습니다. 저장 시 적용됩니다.');
  };

  const handleSave = async () => {
    if (!id) return;

    setSaving(true);
    try {
      // 콘티 기본 정보 업데이트
      if (hasSetlistInfoChanges) {
        await updateSetlist(id, {
          date,
          service_type: serviceType,
        });
        setOriginalDate(date);
        setOriginalServiceType(serviceType);
      }

      // 삭제할 아이템 처리
      for (const itemId of itemsToDelete) {
        await removeItemFromSetlist(itemId);
      }

      // 아이템 업데이트
      for (const item of items) {
        const original = originalItems.find((o) => o.id === item.id);
        if (original) {
          const keyChanged = item.selected_key !== original.selected_key;
          const noteChanged = item.note !== original.note;
          const commentChanged = item.comment !== original.comment;

          if (keyChanged || noteChanged || commentChanged) {
            await updateSetlistItem(item.id, {
              selected_key: item.selected_key || undefined,
              note: item.note || undefined,
              comment: item.comment || undefined,
            });
          }
        }
      }

      // 순서 변경 처리
      const orderChanged = items.some((item) => {
        const original = originalItems.find((o) => o.id === item.id);
        return original && original.position !== item.position;
      });

      if (orderChanged) {
        await reorderSetlistItems(id, items.map((item) => ({ id: item.id, position: item.position })));
      }

      setOriginalItems(JSON.parse(JSON.stringify(items)));
      setItemsToDelete([]);

      // 저장 후 콘티 정보 다시 불러오기 (updated_at 갱신을 위해)
      const updatedSetlist = await fetchSetlistById(id);
      if (updatedSetlist) {
        setSetlist(updatedSetlist);
      }

      toast.success('저장되었습니다.');
    } catch (error) {
      toast.error('저장 실패');
      console.error('저장 실패:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSong = async (song: SongWithSheets) => {
    if (!id) return;
    setAdding(song.id);

    try {
      const position = items.length + 1;
      const defaultKey = song.song_sheets[0]?.music_key;

      await addItemToSetlist(id, song.id, position, defaultKey);

      const data = await fetchSetlistById(id);
      if (data) {
        setItems(data.setlist_items);
        setOriginalItems(JSON.parse(JSON.stringify(data.setlist_items)));
      }

      toast.success(`"${song.title}"이(가) 추가되었습니다.`);
      setAddModalOpen(false);
      setSearchQuery('');
    } catch (error) {
      toast.error('추가 실패');
    } finally {
      setAdding(null);
    }
  };

  const filteredSongs = songs.filter((song) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return song.title.toLowerCase().includes(query) || song.artist?.toLowerCase().includes(query);
  });

  const formatUpdatedAt = (dateStr: string) => {
    const now = dayjs();
    const updated = dayjs(dateStr);
    const hoursDiff = now.diff(updated, 'hour');

    if (hoursDiff < 24) {
      if (hoursDiff < 1) {
        const minutesDiff = now.diff(updated, 'minute');
        if (minutesDiff < 1) return '방금 전';
        return `${minutesDiff}분 전`;
      }
      return `${hoursDiff}시간 전`;
    }

    return updated.format('YYYY.MM.DD HH:mm');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!setlist) return null;

  return (
    <div className="p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate({ to: '/worship/setlists' })}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="px-2 py-1 text-lg font-bold text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <input
            type="text"
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            placeholder="예배 유형 (예: 주일예배, 수요예배)"
            className="w-full px-2 py-1 text-sm text-gray-700 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => navigate({ to: '/worship/setlists/$id/view', params: { id: id! } })}
            icon={<PenTool className="w-4 h-4" />}
          >
            <span className="hidden sm:inline">송폼</span>
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving} disabled={!hasChanges} icon={<Save className="w-4 h-4" />}>
            저장
          </Button>
        </div>
      </div>

      <button
        onClick={() => {
          fetchSongs();
          setAddModalOpen(true);
        }}
        className="w-full mb-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        곡 추가하기
      </button>

      {items.length === 0 ? (
        <div className="text-center py-12">
          <Music2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">아직 곡이 없습니다.</p>
          <p className="text-sm text-gray-400 mt-1">위 버튼을 눌러 곡을 추가해주세요.</p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {items.map((item) => (
                <SortableItem
                  key={item.id}
                  item={item}
                  onKeyChange={(key) => handleKeyChange(item.id, key)}
                  onNoteChange={(note) => handleNoteChange(item.id, note)}
                  onCommentChange={(comment) => handleCommentChange(item.id, comment)}
                  onRemove={() => handleRemoveItem(item.id)}
                  isOwner={setlist?.created_by === profile?.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal isOpen={addModalOpen} onClose={() => { setAddModalOpen(false); setSearchQuery(''); }} title="곡 추가" size="lg">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="곡명 또는 아티스트 검색..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredSongs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {searchQuery ? '검색 결과가 없습니다.' : '등록된 곡이 없습니다.'}
              </p>
            ) : (
              filteredSongs.map((song) => {
                const isAlreadyAdded = items.some((item) => item.song_id === song.id);
                return (
                  <button
                    key={song.id}
                    onClick={() => !isAlreadyAdded && handleAddSong(song)}
                    disabled={isAlreadyAdded || adding === song.id}
                    className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center gap-3 ${
                      isAlreadyAdded
                        ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50'
                    }`}
                  >
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Music2 className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{song.title}</h4>
                      <p className="text-sm text-gray-500 truncate">{song.artist || '아티스트 미입력'}</p>
                    </div>
                    {song.song_sheets.length > 0 && (
                      <div className="flex items-center gap-1">
                        {song.song_sheets.slice(0, 3).map((sheet) => (
                          <span key={sheet.id} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                            {sheet.music_key}
                          </span>
                        ))}
                        {song.song_sheets.length > 3 && (
                          <span className="text-xs text-gray-400">+{song.song_sheets.length - 3}</span>
                        )}
                      </div>
                    )}
                    {adding === song.id && <Loader2 className="w-5 h-5 text-primary-600 animate-spin" />}
                    {isAlreadyAdded && <span className="text-xs text-gray-400">추가됨</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </Modal>

      {/* 마지막 수정 시간 */}
      <div className="mt-6 pt-4 border-t border-gray-200 text-center text-sm text-gray-400">
        마지막 수정: {formatUpdatedAt(setlist.updated_at)}
      </div>
    </div>
  );
}
