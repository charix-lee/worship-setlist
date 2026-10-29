import { supabase } from './supabase';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

export type PushState =
  | 'unsupported' // 브라우저가 지원 안 함
  | 'ios-needs-install' // 아이폰: 홈 화면에 추가해야 함
  | 'denied' // 사용자가 차단함
  | 'subscribed'
  | 'not-subscribed';

export function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function hasPushApi() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function getRegistration() {
  return navigator.serviceWorker.register('/sw.js').then(() => navigator.serviceWorker.ready);
}

export async function getPushState(): Promise<PushState> {
  if (!hasPushApi()) {
    return isIOS() && !isStandalone() ? 'ios-needs-install' : 'unsupported';
  }
  if (Notification.permission === 'denied') return 'denied';

  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === 'granted' ? 'subscribed' : 'not-subscribed';
}

/** 반드시 버튼 클릭 같은 사용자 동작 안에서 호출해야 함 (iOS 요구사항) */
export async function subscribePush(): Promise<PushState> {
  if (!VAPID_PUBLIC_KEY) throw new Error('VITE_VAPID_PUBLIC_KEY가 설정되지 않았습니다.');

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'not-subscribed';

  const reg = await getRegistration();
  const sub =
    (await reg.pushManager.getSubscription()) ||
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    }));

  const json = sub.toJSON();
  const { error } = await supabase.rpc('save_push_subscription', {
    p_endpoint: sub.endpoint,
    p_p256dh: json.keys?.p256dh,
    p_auth: json.keys?.auth,
    p_user_agent: navigator.userAgent,
  });
  if (error) throw error;

  return 'subscribed';
}

export async function unsubscribePush(): Promise<PushState> {
  const reg = await getRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
    await sub.unsubscribe();
  }
  return 'not-subscribed';
}
