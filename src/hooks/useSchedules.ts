import { useState, useEffect, useCallback } from 'react';
import type { Schedule } from '@/types/database';

// 임시 Mock 데이터 (실제 DB 연동 전)
const mockSchedules: Schedule[] = [
  {
    id: '1',
    title: '주일예배 1부',
    description: '본당에서 진행됩니다',
    icon: 'church',
    start_date: '2025-05-04',
    end_date: '2025-05-04',
    start_time: '09:00',
    end_time: '10:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: '주일예배 2부',
    description: '본당에서 진행됩니다',
    icon: 'church',
    start_date: '2025-05-04',
    end_date: '2025-05-04',
    start_time: '11:00',
    end_time: '12:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    title: '어린이주일',
    description: '어린이주일 특별예배',
    icon: 'cake',
    start_date: '2025-05-05',
    end_date: '2025-05-05',
    start_time: null,
    end_time: null,
    is_all_day: true,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '4',
    title: '수요예배',
    description: null,
    icon: 'church',
    start_date: '2025-05-07',
    end_date: '2025-05-07',
    start_time: '19:30',
    end_time: '21:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '5',
    title: '어버이주일',
    description: '부모님 초청 특별예배',
    icon: 'heart',
    start_date: '2025-05-11',
    end_date: '2025-05-11',
    start_time: null,
    end_time: null,
    is_all_day: true,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '6',
    title: '주일예배 1부',
    description: null,
    icon: 'church',
    start_date: '2025-05-11',
    end_date: '2025-05-11',
    start_time: '09:00',
    end_time: '10:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '7',
    title: '주일예배 2부',
    description: null,
    icon: 'church',
    start_date: '2025-05-11',
    end_date: '2025-05-11',
    start_time: '11:00',
    end_time: '12:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '8',
    title: '청년부 성경공부',
    description: '로마서 강해',
    icon: 'book',
    start_date: '2025-05-09',
    end_date: '2025-05-09',
    start_time: '19:30',
    end_time: '21:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '9',
    title: '찬양팀 연습',
    description: '다음주 찬양 연습',
    icon: 'music',
    start_date: '2025-05-10',
    end_date: '2025-05-10',
    start_time: '14:00',
    end_time: '17:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '10',
    title: '수요예배',
    description: null,
    icon: 'church',
    start_date: '2025-05-14',
    end_date: '2025-05-14',
    start_time: '19:30',
    end_time: '21:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '11',
    title: '청년부 수련회',
    description: '속초 수양관에서 1박 2일',
    icon: 'sun',
    start_date: '2025-05-17',
    end_date: '2025-05-18',
    start_time: null,
    end_time: null,
    is_all_day: true,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '12',
    title: '금요기도회',
    description: null,
    icon: 'church',
    start_date: '2025-05-16',
    end_date: '2025-05-16',
    start_time: '20:00',
    end_time: '21:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '13',
    title: '새가족 환영회',
    description: '친교실에서 진행',
    icon: 'users',
    start_date: '2025-05-18',
    end_date: '2025-05-18',
    start_time: '13:00',
    end_time: '14:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '14',
    title: '수요예배',
    description: null,
    icon: 'church',
    start_date: '2025-05-21',
    end_date: '2025-05-21',
    start_time: '19:30',
    end_time: '21:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '15',
    title: '봉사단 정기모임',
    description: '월례 봉사단 회의',
    icon: 'heart',
    start_date: '2025-05-24',
    end_date: '2025-05-24',
    start_time: '10:00',
    end_time: '12:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '16',
    title: '주일예배 1부',
    description: null,
    icon: 'church',
    start_date: '2025-05-25',
    end_date: '2025-05-25',
    start_time: '09:00',
    end_time: '10:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '17',
    title: '주일예배 2부',
    description: null,
    icon: 'church',
    start_date: '2025-05-25',
    end_date: '2025-05-25',
    start_time: '11:00',
    end_time: '12:30',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '18',
    title: '교회 창립기념 행사',
    description: '창립 50주년 기념 행사',
    icon: 'cake',
    start_date: '2025-05-26',
    end_date: '2025-05-28',
    start_time: null,
    end_time: null,
    is_all_day: true,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '19',
    title: '중보기도 모임',
    description: '기도실',
    icon: 'users',
    start_date: '2025-05-27',
    end_date: '2025-05-27',
    start_time: '06:00',
    end_time: '07:00',
    is_all_day: false,
    created_by: 'mock-user',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

let scheduleStorage = [...mockSchedules];

export function useSchedules() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    // TODO: 실제 DB 연동
    await new Promise((resolve) => setTimeout(resolve, 300));
    // 날짜순 정렬
    const sorted = [...scheduleStorage].sort((a, b) => {
      const dateCompare = a.start_date.localeCompare(b.start_date);
      if (dateCompare !== 0) return dateCompare;
      if (a.is_all_day && !b.is_all_day) return -1;
      if (!a.is_all_day && b.is_all_day) return 1;
      return (a.start_time || '').localeCompare(b.start_time || '');
    });
    setSchedules(sorted);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const createSchedule = async (data: Omit<Schedule, 'id' | 'created_by' | 'created_at' | 'updated_at'>) => {
    const newSchedule: Schedule = {
      ...data,
      id: Date.now().toString(),
      created_by: 'mock-user',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    scheduleStorage.push(newSchedule);
    await fetchSchedules();
    return newSchedule;
  };

  const updateSchedule = async (id: string, data: Partial<Schedule>) => {
    const index = scheduleStorage.findIndex((s) => s.id === id);
    if (index !== -1) {
      scheduleStorage[index] = {
        ...scheduleStorage[index],
        ...data,
        updated_at: new Date().toISOString(),
      };
    }
    await fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    scheduleStorage = scheduleStorage.filter((s) => s.id !== id);
    await fetchSchedules();
  };

  return {
    schedules,
    loading,
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
  };
}
