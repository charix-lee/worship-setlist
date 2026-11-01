import { useEffect, useRef, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { isStandalone } from '@/lib/push';

const THRESHOLD = 70; // 이만큼 당기면 새로고침
const MAX_PULL = 110;
const RESISTANCE = 0.5; // 손가락 이동 대비 표시 이동 비율

/** 이 요소 안에서 시작한 터치는 당겨서 새로고침으로 쓰지 않는다 */
function isBlockedTarget(target: EventTarget | null): boolean {
  let el = target instanceof Element ? target : null;
  // 드래그 핸들, 필기 캔버스 등 터치를 직접 쓰는 곳
  if (el?.closest('canvas, .touch-none, [data-no-pull-refresh]')) return true;

  // 안쪽 스크롤 영역이 맨 위가 아니면 그 영역을 스크롤하게 둔다
  while (el && el !== document.body) {
    if (el.scrollTop > 0) return true;
    if (el instanceof HTMLElement && el.style.touchAction === 'none') return true;
    el = el.parentElement;
  }
  return false;
}

/** 모달이나 전체 화면 보기가 열려 있으면 끈다 */
function hasOverlayOpen() {
  return document.querySelector('.fixed.inset-0') !== null;
}

/**
 * 홈 화면에 추가한 앱(standalone)에서 맨 위에서 아래로 당기면 새로고침.
 * 브라우저에는 자체 당겨서 새로고침이 있으므로 앱 모드에서만 켠다.
 */
export default function PullToRefresh() {
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    if (!isStandalone()) return;

    const reset = () => {
      startY.current = null;
      pullRef.current = 0;
      setPull(0);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1 || window.scrollY > 0) return;
      if (hasOverlayOpen() || isBlockedTarget(e.target)) return;
      startY.current = e.touches[0].clientY;
    };

    const onMove = (e: TouchEvent) => {
      if (startY.current === null) return;
      if (e.touches.length !== 1 || window.scrollY > 0) return reset();

      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (pullRef.current > 0) reset();
        return;
      }

      // 당기는 중에는 iOS 바운스 스크롤을 막는다
      if (e.cancelable) e.preventDefault();
      const next = Math.min(dy * RESISTANCE, MAX_PULL);
      pullRef.current = next;
      setPull(next);
    };

    const onEnd = () => {
      if (startY.current === null) return;
      if (pullRef.current >= THRESHOLD) {
        setRefreshing(true);
        setPull(THRESHOLD);
        window.location.reload();
        return;
      }
      reset();
    };

    window.addEventListener('touchstart', onStart, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', reset);
    return () => {
      window.removeEventListener('touchstart', onStart);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', reset);
    };
  }, []);

  if (pull === 0 && !refreshing) return null;

  const ready = pull >= THRESHOLD;
  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[60] flex justify-center"
      style={{
        top: 'env(safe-area-inset-top, 0px)',
        transform: `translateY(${pull - 20}px)`,
      }}
      aria-hidden
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-md ring-1 ring-gray-200 ${
          ready ? 'text-primary-600' : 'text-gray-400'
        }`}
        style={{ opacity: Math.max(progress, 0.3) }}
      >
        <RefreshCw
          className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
        />
      </div>
    </div>
  );
}
