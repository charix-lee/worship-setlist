import { useEffect, useState } from 'react';
import { Bell, BellOff, Share, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getPushState, subscribePush, unsubscribePush, type PushState } from '@/lib/push';
import Button from './Button';

const DISMISS_KEY = 'push-banner-dismissed';

/**
 * 콘티 알림 설정 (콘티 등록 + 예배 하루 전).
 * - variant="section": 마이페이지 안의 한 구역 (항상 보임)
 * - variant="banner": 우리 교회 메인 상단 안내 (구독 안 했을 때만, 닫으면 다시 안 보임)
 */
export default function PushNotificationCard({ variant = 'section' }: { variant?: 'section' | 'banner' }) {
  const [state, setState] = useState<PushState | null>(null);
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    getPushState().then(setState).catch(() => setState('unsupported'));
  }, []);

  const handleSubscribe = async () => {
    setBusy(true);
    try {
      const next = await subscribePush();
      setState(next);
      if (next === 'subscribed') toast.success('알림이 켜졌습니다.');
      else if (next === 'denied') toast.error('알림이 차단되어 있습니다. 설정에서 허용해주세요.');
    } catch (err) {
      console.error('알림 구독 실패:', err);
      toast.error('알림 설정에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handleUnsubscribe = async () => {
    setBusy(true);
    try {
      setState(await unsubscribePush());
      toast.success('알림이 꺼졌습니다.');
    } catch {
      toast.error('알림 해제에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, 'true');
    } catch {
      // 저장 못 해도 이번 화면에서는 닫힘
    }
    setDismissed(true);
  };

  if (state === null) return null;

  if (variant === 'banner') {
    if (dismissed || state === 'subscribed' || state === 'unsupported' || state === 'denied') return null;

    return (
      <div className="flex items-start gap-3 rounded-xl border border-primary-200 bg-primary-50 p-3 sm:p-4">
        <Bell className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-600" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">콘티 알림을 받아보세요</p>
          <p className="mt-0.5 text-xs text-gray-600">콘티가 올라올 때, 그리고 예배 하루 전에 알려드려요.</p>
          {state === 'ios-needs-install' ? (
            <p className="mt-0.5 text-xs text-gray-600">
              Safari 하단 <Share className="inline h-3.5 w-3.5 align-text-bottom" /> 공유 →
              &nbsp;"홈 화면에 추가" 후, 홈 화면 아이콘으로 열어주세요.
            </p>
          ) : (
            <Button size="sm" className="mt-2" onClick={handleSubscribe} loading={busy}>
              알림 받기
            </Button>
          )}
        </div>
        <button onClick={dismiss} className="p-1 text-gray-400 hover:text-gray-600" aria-label="닫기">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-gray-200 p-6 lg:p-8">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-primary-100">
            {state === 'subscribed' ? (
              <Bell className="h-5 w-5 text-primary-600" />
            ) : (
              <BellOff className="h-5 w-5 text-gray-500" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900">콘티 알림</h3>
            <p className="text-sm text-gray-600">
              {state === 'subscribed' && '콘티 등록 · 예배 하루 전 알림을 이 기기로 받고 있어요'}
              {state === 'not-subscribed' && '콘티가 올라올 때와 예배 하루 전에 알려드려요'}
              {state === 'denied' && '알림이 차단되어 있어요. 브라우저/기기 설정에서 허용해주세요'}
              {state === 'ios-needs-install' && 'Safari 공유 → "홈 화면에 추가" 후 앱에서 켤 수 있어요'}
              {state === 'unsupported' && '이 브라우저는 알림을 지원하지 않아요'}
            </p>
          </div>
        </div>
        {state === 'subscribed' && (
          <Button variant="secondary" size="sm" className="flex-shrink-0 whitespace-nowrap" onClick={handleUnsubscribe} loading={busy}>
            끄기
          </Button>
        )}
        {state === 'not-subscribed' && (
          <Button size="sm" className="flex-shrink-0 whitespace-nowrap" onClick={handleSubscribe} loading={busy}>
            켜기
          </Button>
        )}
      </div>
    </div>
  );
}
