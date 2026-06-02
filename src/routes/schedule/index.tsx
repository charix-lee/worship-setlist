import { useState } from 'react';
import { createFileRoute } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import {
  Plus,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Church,
  BookOpen,
  Users,
  Heart,
  Music,
  Cake,
  Megaphone,
  CalendarDays,
  Gift,
  Sun,
  GraduationCap,
  Baby,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useSchedules } from '@/hooks/useSchedules';
import Modal from '@/components/Modal';
import Button from '@/components/Button';
import { SCHEDULE_ICONS, type Schedule } from '@/types/database';
import toast from 'react-hot-toast';

dayjs.locale('ko');

export const Route = createFileRoute('/schedule/')({
  component: SchedulePage,
});

// 아이콘 컴포넌트 매핑
const iconComponents: Record<string, typeof Church> = {
  Church,
  BookOpen,
  Users,
  Heart,
  Music,
  Cake,
  Megaphone,
  CalendarDays,
  Gift,
  Sun,
  GraduationCap,
  Baby,
};

function getIconComponent(iconId: string) {
  const iconInfo = SCHEDULE_ICONS.find((i) => i.id === iconId);
  if (iconInfo) {
    return iconComponents[iconInfo.icon] || CalendarDays;
  }
  return CalendarDays;
}

function SchedulePage() {
  const { schedules, loading, createSchedule, updateSchedule, deleteSchedule } = useSchedules();

  const [currentDate, setCurrentDate] = useState(dayjs());
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('calendar');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const resetForm = () => {
    const today = selectedDate || dayjs().format('YYYY-MM-DD');
    setTitle('');
    setDescription('');
    setIcon('calendar');
    setStartDate(today);
    setEndDate(today);
    setStartTime('09:00');
    setEndTime('10:00');
    setIsAllDay(false);
    setIsEditing(false);
  };

  const openCreateModal = (dateStr?: string) => {
    resetForm();
    if (dateStr) {
      setStartDate(dateStr);
      setEndDate(dateStr);
    }
    setModalOpen(true);
  };

  const openEditModal = (schedule: Schedule) => {
    setTitle(schedule.title);
    setDescription(schedule.description || '');
    setIcon(schedule.icon);
    setStartDate(schedule.start_date);
    setEndDate(schedule.end_date);
    setStartTime(schedule.start_time || '09:00');
    setEndTime(schedule.end_time || '10:00');
    setIsAllDay(schedule.is_all_day);
    setSelectedSchedule(schedule);
    setIsEditing(true);
    setDetailModalOpen(false);
    setModalOpen(true);
  };

  const openDetailModal = (schedule: Schedule) => {
    setSelectedSchedule(schedule);
    setDetailModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('제목을 입력해주세요.');
      return;
    }
    if (startDate > endDate) {
      toast.error('종료일은 시작일 이후여야 합니다.');
      return;
    }

    setSaving(true);
    try {
      const data = {
        title: title.trim(),
        description: description.trim() || null,
        icon,
        start_date: startDate,
        end_date: endDate,
        start_time: isAllDay ? null : startTime,
        end_time: isAllDay ? null : endTime,
        is_all_day: isAllDay,
      };

      if (isEditing && selectedSchedule) {
        await updateSchedule(selectedSchedule.id, data);
        toast.success('일정이 수정되었습니다.');
      } else {
        await createSchedule(data);
        toast.success('일정이 추가되었습니다.');
      }
      setModalOpen(false);
      resetForm();
    } catch {
      toast.error('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (schedule: Schedule) => {
    if (!confirm(`"${schedule.title}" 일정을 삭제하시겠습니까?`)) return;

    try {
      await deleteSchedule(schedule.id);
      toast.success('일정이 삭제되었습니다.');
      setDetailModalOpen(false);
    } catch {
      toast.error('삭제에 실패했습니다.');
    }
  };

  // 캘린더 관련 함수들
  const year = currentDate.year();
  const month = currentDate.month();

  const firstDayOfMonth = currentDate.startOf('month');
  const firstDayWeekday = firstDayOfMonth.day();
  const daysInMonth = currentDate.daysInMonth();

  const prevMonth = () => {
    setCurrentDate(currentDate.subtract(1, 'month'));
  };

  const nextMonth = () => {
    setCurrentDate(currentDate.add(1, 'month'));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  const formatDateKey = (y: number, m: number, d: number) => {
    return dayjs().year(y).month(m).date(d).format('YYYY-MM-DD');
  };

  const formatTime = (schedule: Schedule) => {
    if (schedule.is_all_day) return '하루종일';
    return schedule.start_time || '';
  };

  const formatDateRange = (schedule: Schedule) => {
    const start = dayjs(schedule.start_date);
    const end = dayjs(schedule.end_date);

    if (schedule.start_date === schedule.end_date) {
      return start.format('YYYY년 M월 D일 (ddd)');
    }
    return `${start.format('M월 D일 (ddd)')} - ${end.format('M월 D일 (ddd)')}`;
  };

  const isToday = (y: number, m: number, d: number) => {
    const today = dayjs();
    return today.year() === y && today.month() === m && today.date() === d;
  };

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  // 캘린더 날짜 배열 생성 (주 단위로 그룹화)
  const calendarWeeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = [];

  for (let i = 0; i < firstDayWeekday; i++) {
    currentWeek.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    currentWeek.push(d);
    if (currentWeek.length === 7) {
      calendarWeeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    calendarWeeks.push(currentWeek);
  }

  // 특정 주에서 멀티데이 이벤트의 시작 위치와 span 계산
  const getMultiDayEventsForWeek = (weekDays: (number | null)[]) => {
    const weekStartDate = weekDays.find((d) => d !== null);
    const weekEndDate = [...weekDays].reverse().find((d) => d !== null);

    if (!weekStartDate || !weekEndDate) return [];

    const weekStartStr = formatDateKey(year, month, weekStartDate);
    const weekEndStr = formatDateKey(year, month, weekEndDate);

    // 멀티데이 이벤트만 필터링 (이 주와 겹치는 것들)
    const multiDayEvents = schedules.filter((s) => {
      if (s.start_date === s.end_date) return false;
      return s.start_date <= weekEndStr && s.end_date >= weekStartStr;
    });

    return multiDayEvents.map((schedule) => {
      // 이 주에서의 시작 열 계산
      let startCol = 0;
      for (let i = 0; i < 7; i++) {
        const day = weekDays[i];
        if (day !== null) {
          const dateStr = formatDateKey(year, month, day);
          if (dateStr >= schedule.start_date) {
            startCol = i;
            break;
          }
        }
        startCol = i;
      }

      // 이 주에서의 종료 열 계산
      let endCol = 6;
      for (let i = 6; i >= 0; i--) {
        const day = weekDays[i];
        if (day !== null) {
          const dateStr = formatDateKey(year, month, day);
          if (dateStr <= schedule.end_date) {
            endCol = i;
            break;
          }
        }
      }

      // 실제 시작일이 이 주 이전인지 확인 (왼쪽 라운드 처리용)
      const eventStartDay = weekDays[startCol];
      const isStartInThisWeek = eventStartDay !== null &&
        formatDateKey(year, month, eventStartDay) === schedule.start_date;

      // 실제 종료일이 이 주 이후인지 확인 (오른쪽 라운드 처리용)
      const eventEndDay = weekDays[endCol];
      const isEndInThisWeek = eventEndDay !== null &&
        formatDateKey(year, month, eventEndDay) === schedule.end_date;

      return {
        schedule,
        startCol,
        endCol,
        span: endCol - startCol + 1,
        isStartInThisWeek,
        isEndInThisWeek,
      };
    });
  };

  // 특정 날짜의 단일 일정만 가져오기
  const getSingleDaySchedulesForDate = (dateStr: string) => {
    return schedules.filter((s) => s.start_date === s.end_date && s.start_date === dateStr);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">일정/행사</h1>
          <p className="text-gray-600">교회 일정과 행사를 관리하세요</p>
        </div>
        <Button onClick={() => openCreateModal()} icon={<Plus className="w-5 h-5" />} size="lg">
          <span className="hidden sm:inline">일정 추가</span>
        </Button>
      </div>

      {/* 캘린더 */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* 캘린더 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 ml-2">
              {year}년 {month + 1}월
            </h2>
          </div>
          <button
            onClick={goToToday}
            className="px-3 py-1.5 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
          >
            오늘
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-gray-200">
          {weekDays.map((day, idx) => (
            <div
              key={day}
              className={`py-3 text-center text-sm font-medium ${
                idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 캘린더 그리드 */}
        <div>
          {calendarWeeks.map((week, weekIndex) => {
            const multiDayEvents = getMultiDayEventsForWeek(week);

            return (
              <div key={weekIndex} className="relative">
                {/* 날짜 셀 그리드 */}
                <div className="grid grid-cols-7">
                  {week.map((day, dayIndex) => {
                    if (day === null) {
                      return (
                        <div
                          key={`empty-${weekIndex}-${dayIndex}`}
                          className="min-h-28 bg-gray-50 border-b border-r border-gray-100"
                        />
                      );
                    }

                    const dateStr = formatDateKey(year, month, day);
                    const singleDaySchedules = getSingleDaySchedulesForDate(dateStr);
                    const isTodayCell = isToday(year, month, day);

                    return (
                      <div
                        key={dateStr}
                        className={`min-h-28 border-b border-r border-gray-100 p-1 cursor-pointer hover:bg-gray-50/50 transition-colors ${
                          isTodayCell ? 'bg-primary-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedDate(dateStr);
                          openCreateModal(dateStr);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full ${
                              isTodayCell
                                ? 'bg-primary-600 text-white'
                                : dayIndex === 0
                                ? 'text-red-500'
                                : dayIndex === 6
                                ? 'text-blue-500'
                                : 'text-gray-700'
                            }`}
                          >
                            {day}
                          </span>
                        </div>
                        {/* 멀티데이 이벤트 공간 확보 */}
                        <div style={{ height: `${Math.max(multiDayEvents.length * 24, 0)}px` }} />
                        {/* 단일 일정 */}
                        <div className="space-y-1">
                          {singleDaySchedules.slice(0, 2).map((schedule) => {
                            const IconComp = getIconComponent(schedule.icon);
                            return (
                              <div
                                key={schedule.id}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openDetailModal(schedule);
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs truncate bg-primary-100 text-primary-700 hover:opacity-80 transition-colors"
                              >
                                <IconComp className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{schedule.title}</span>
                              </div>
                            );
                          })}
                          {singleDaySchedules.length > 2 && (
                            <div className="text-xs text-gray-500 px-1.5">
                              +{singleDaySchedules.length - 2}개 더
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 멀티데이 이벤트 바들 (절대 위치) */}
                <div className="absolute top-0 left-0 right-0 pointer-events-none">
                  {multiDayEvents.map((event, eventIndex) => {
                    const IconComp = getIconComponent(event.schedule.icon);
                    const leftPercent = (event.startCol / 7) * 100;
                    const widthPercent = (event.span / 7) * 100;
                    // 날짜 숫자(28px) + padding(4px) + 여백(4px) = 36px 아래에서 시작
                    const topOffset = 36 + eventIndex * 24;

                    return (
                      <div
                        key={`${event.schedule.id}-${weekIndex}`}
                        className="absolute pointer-events-auto"
                        style={{
                          left: `calc(${leftPercent}% + 4px)`,
                          width: `calc(${widthPercent}% - 8px)`,
                          top: `${topOffset}px`,
                        }}
                      >
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(event.schedule);
                          }}
                          className={`flex items-center gap-1 px-2 py-1 text-xs text-white bg-green-600 hover:bg-green-700 cursor-pointer transition-colors truncate ${
                            event.isStartInThisWeek && event.isEndInThisWeek
                              ? 'rounded-lg'
                              : event.isStartInThisWeek
                              ? 'rounded-l-lg rounded-r-none'
                              : event.isEndInThisWeek
                              ? 'rounded-r-lg rounded-l-none'
                              : 'rounded-none'
                          }`}
                        >
                          {event.isStartInThisWeek && (
                            <>
                              <IconComp className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate font-medium">{event.schedule.title}</span>
                            </>
                          )}
                          {!event.isStartInThisWeek && (
                            <span className="truncate font-medium">{event.schedule.title}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 일정 상세 모달 */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="일정 상세"
      >
        {selectedSchedule && (
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center flex-shrink-0">
                {(() => {
                  const IconComp = getIconComponent(selectedSchedule.icon);
                  return <IconComp className="w-6 h-6 text-primary-600" />;
                })()}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{selectedSchedule.title}</h3>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <CalendarDays className="w-4 h-4" />
                  {formatDateRange(selectedSchedule)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Clock className="w-4 h-4" />
                  {formatTime(selectedSchedule)}
                  {!selectedSchedule.is_all_day && selectedSchedule.end_time && (
                    <span> - {selectedSchedule.end_time}</span>
                  )}
                </div>
              </div>
            </div>

            {selectedSchedule.description && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedSchedule.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="secondary"
                onClick={() => openEditModal(selectedSchedule)}
                icon={<Edit2 className="w-4 h-4" />}
                fullWidth
              >
                수정
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleDelete(selectedSchedule)}
                icon={<Trash2 className="w-4 h-4" />}
                className="text-red-600 hover:bg-red-50"
                fullWidth
              >
                삭제
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 일정 추가/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={isEditing ? '일정 수정' : '일정 추가'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 아이콘 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">아이콘</label>
            <div className="grid grid-cols-6 gap-2">
              {SCHEDULE_ICONS.map((item) => {
                const IconComp = iconComponents[item.icon];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setIcon(item.id)}
                    className={`p-3 rounded-lg border-2 transition-colors flex flex-col items-center gap-1 ${
                      icon === item.id
                        ? 'border-primary-500 bg-primary-50 text-primary-600'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                    title={item.label}
                  >
                    <IconComp className="w-5 h-5" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          {/* 날짜 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                시작일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                종료일 <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* 하루종일 체크박스 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAllDay"
              checked={isAllDay}
              onChange={(e) => setIsAllDay(e.target.checked)}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <label htmlFor="isAllDay" className="text-sm font-medium text-gray-700">
              하루종일
            </label>
          </div>

          {/* 시간 선택 (하루종일이 아닐 때만) */}
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">시작 시간</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">종료 시간</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          )}

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">설명 (선택)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정에 대한 설명..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
            />
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
              fullWidth
            >
              취소
            </Button>
            <Button type="submit" loading={saving} fullWidth>
              {isEditing ? '수정' : '추가'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
