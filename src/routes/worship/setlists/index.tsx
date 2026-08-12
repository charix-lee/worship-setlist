import { useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  Calendar,
  Plus,
  ListMusic,
  Edit2,
  Trash2,
  Loader2,
  FileMusic,
  User,
} from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import { usePermissions } from '@/hooks/usePermissions';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { SERVICE_TYPES } from '@/types/database';
import { getServiceTypeColors } from '@/utils/colors';
import toast from 'react-hot-toast';

dayjs.locale('ko');

export const Route = createFileRoute('/worship/setlists/')({
  component: SetlistsPage,
});

function SetlistsPage() {
  const { setlists, loading, createSetlist, deleteSetlist } = useSetlists();
  const navigate = useNavigate();
  const { can } = usePermissions();

  const [modalOpen, setModalOpen] = useState(false);
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [serviceType, setServiceType] = useState(SERVICE_TYPES[0]);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const title = `${date} ${serviceType}`;
      const setlist = await createSetlist({
        title,
        date,
        service_type: serviceType,
        description: description.trim() || undefined,
      });
      toast.success('콘티가 생성되었습니다.');
      setModalOpen(false);
      navigate({ to: '/worship/setlists/$id', params: { id: setlist.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '생성 실패');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`"${title}" 콘티를 삭제하시겠습니까?`)) return;

    try {
      await deleteSetlist(id);
      toast.success('콘티가 삭제되었습니다.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '삭제 실패');
    }
  };

  const formatDate = (dateStr: string) => {
    return dayjs(dateStr).format('YYYY.MM.DD (ddd)');
  };

  const groupedSetlists = setlists.reduce(
    (acc, setlist) => {
      const month = setlist.date.substring(0, 7);
      if (!acc[month]) acc[month] = [];
      acc[month].push(setlist);
      return acc;
    },
    {} as Record<string, typeof setlists>
  );

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">콘티 목록</h1>
          <p className="text-gray-600">예배별 콘티를 관리하세요</p>
        </div>
        {can.createSetlist && (
          <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-5 h-5" />} size="lg">
            <span className="hidden sm:inline">새 콘티</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        </div>
      ) : setlists.length === 0 ? (
        <div className="text-center py-12">
          <ListMusic className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">등록된 콘티가 없습니다.</p>
          {can.createSetlist && (
            <button
              onClick={() => setModalOpen(true)}
              className="mt-3 text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              첫 번째 콘티 만들기
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedSetlists).map(([month, monthSetlists]) => {
            const [year, monthNum] = month.split('-');
            return (
              <div key={month}>
                <h2 className="text-sm font-medium text-gray-500 mb-3">
                  {year}년 {parseInt(monthNum)}월
                </h2>
              <div className="space-y-3">
                {monthSetlists.map((setlist) => {
                  const colors = getServiceTypeColors(setlist.service_type);
                  return (
                    <div
                      key={setlist.id}
                      className="bg-white rounded-xl border border-gray-200 p-4 hover:border-primary-300 transition-colors cursor-pointer"
                      onClick={() => navigate({ to: '/worship/setlists/$id/view', params: { id: setlist.id } })}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <FileMusic className="w-6 h-6 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-gray-900">{formatDate(setlist.date)}</h3>
                            <span
                              className="px-2 py-0.5 text-xs font-medium rounded"
                              style={{ backgroundColor: colors.bg, color: colors.text }}
                            >
                              {setlist.service_type}
                            </span>
                          </div>
                          {setlist.description && (
                            <p className="text-sm text-gray-500 truncate mb-1">{setlist.description}</p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            {setlist.creator?.name && (
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {setlist.creator.name}
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {dayjs(setlist.created_at).format('YYYY. M. D.')}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          {can.editSetlist && (
                            <button
                              onClick={() => navigate({ to: '/worship/setlists/$id', params: { id: setlist.id } })}
                              className="p-2 text-gray-400 hover:text-primary-600 transition-colors"
                              title="편집"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                          {can.deleteSetlist && (
                            <button
                              onClick={() => handleDelete(setlist.id, setlist.title)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="새 콘티 만들기">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              날짜 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              예배 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              {SERVICE_TYPES.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="콘티에 대한 메모..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setModalOpen(false)} fullWidth>
              취소
            </Button>
            <Button type="submit" loading={saving} fullWidth>
              만들기
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
