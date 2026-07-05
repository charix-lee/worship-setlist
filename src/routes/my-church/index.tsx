import { createFileRoute, Link } from '@tanstack/react-router';
import dayjs from 'dayjs';
import 'dayjs/locale/ko';
import { CalendarDays, ChevronRight, Library, ListMusic, Music, Clock, MapPin } from 'lucide-react';
import { useSetlists } from '@/hooks/useSetlists';
import { useSchedules } from '@/hooks/useSchedules';
import { useMemo } from 'react';

dayjs.locale('ko');

export const Route = createFileRoute('/my-church/')({
  component: MyChurchPage,
});

// 오늘부터 다가오는 일요일 전날(토요일)까지의 범위
function getWeekRangeFromToday(): { start: string; end: string } {
  const today = dayjs();
  const dayOfWeek = today.day(); // 0(일) ~ 6(토)

  let nextSunday;
  if (dayOfWeek === 0) {
    // 오늘이 일요일이면 다음주 일요일
    nextSunday = today.add(7, 'day');
  } else {
    // 월~토요일이면 이번주 일요일
    nextSunday = today.add(7 - dayOfWeek, 'day');
  }

  // 일요일 전날 (토요일)
  const saturday = nextSunday.subtract(1, 'day');

  return {
    start: today.format('YYYY-MM-DD'),
    end: saturday.format('YYYY-MM-DD'),
  };
}

// 날짜 포맷팅
function formatDate(dateStr: string): string {
  return dayjs(dateStr).format('M/D(ddd)');
}

function MyChurchPage() {
  const { setlists, loading: setlistsLoading } = useSetlists();
  const { schedules, loading: schedulesLoading } = useSchedules();

  const weekRange = useMemo(() => getWeekRangeFromToday(), []);

  // 이번 주 콘티 (오늘 ~ 다음 일요일 전날)
  const weekSetlists = useMemo(() => {
    return setlists
      .filter(s => s.date >= weekRange.start && s.date <= weekRange.end)
      .sort((a, b) => a.date.localeCompare(b.date)); // 날짜순 정렬
  }, [setlists, weekRange]);

  // 이번 주 일정 (오늘 ~ 다음 일요일 전날)
  const weekSchedules = useMemo(() => {
    return schedules.filter(s => {
      return s.start_date >= weekRange.start && s.start_date <= weekRange.end;
    }).slice(0, 5); // 최대 5개
  }, [schedules, weekRange]);

  const isLoading = setlistsLoading || schedulesLoading;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="px-4 py-4 space-y-6">

        {/* 이번 주 주일 콘티 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Music className="w-5 h-5 text-primary-600" />
              이번 주 찬양
            </h2>
            <Link
              to="/worship/setlists"
              className="text-sm text-primary-600 font-medium flex items-center"
            >
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500">
              불러오는 중...
            </div>
          ) : weekSetlists.length > 0 ? (
            <div className="space-y-3">
              {weekSetlists.map((setlist) => (
                <Link
                  key={setlist.id}
                  to="/worship/setlists/$id"
                  params={{ id: setlist.id }}
                  className="block bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <ListMusic className="w-5 h-5 text-primary-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">{setlist.title}</h3>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {formatDate(setlist.date)} · {setlist.service_type}
                      </p>
                      {setlist.description && (
                        <p className="text-sm text-gray-400 mt-1 truncate">{setlist.description}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <Link
              to="/worship/setlists"
              className="block bg-white rounded-xl p-6 border border-dashed border-primary-200 text-center hover:border-primary-400 transition-colors"
            >
              <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <ListMusic className="w-5 h-5 text-primary-600" />
              </div>
              <p className="text-sm text-gray-500">
                이번 주 콘티가 없습니다
              </p>
              <p className="text-sm text-primary-600 font-medium mt-1">
                콘티 추가하기 →
              </p>
            </Link>
          )}
        </section>

        {/* 이번 주 일정 */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              이번 주 일정
            </h2>
            <Link
              to="/schedule"
              className="text-sm text-blue-600 font-medium flex items-center"
            >
              전체보기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-500">
              불러오는 중...
            </div>
          ) : weekSchedules.length > 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
              {weekSchedules.map((schedule) => (
                <div key={schedule.id} className="p-4 flex items-center gap-3">
                  <div className="w-12 text-center flex-shrink-0">
                    <div className="text-xs text-gray-500">
                      {dayjs(schedule.start_date).format('M')}월
                    </div>
                    <div className="text-xl font-bold text-gray-900">
                      {dayjs(schedule.start_date).format('D')}
                    </div>
                    <div className="text-xs text-gray-400">
                      {dayjs(schedule.start_date).format('ddd')}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900">{schedule.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      {schedule.is_all_day ? (
                        <span>종일</span>
                      ) : schedule.start_time && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {schedule.start_time.slice(0, 5)}
                          {schedule.end_time && ` - ${schedule.end_time.slice(0, 5)}`}
                        </span>
                      )}
                      {schedule.description && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5" />
                          {schedule.description}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-xl p-6 border border-dashed border-blue-200 text-center">
              <p className="text-sm text-gray-500">이번 주 일정이 없습니다</p>
            </div>
          )}
        </section>

        {/* 빠른 메뉴 */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-3">바로가기</h2>
          <div className="grid grid-cols-3 gap-3">
            <Link
              to="/schedule"
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                <CalendarDays className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">일정</span>
            </Link>
            <Link
              to="/worship/songs"
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Library className="w-5 h-5 text-purple-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">악보</span>
            </Link>
            <Link
              to="/worship/setlists"
              className="flex flex-col items-center gap-2 bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                <ListMusic className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium text-gray-700">콘티</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
