// 웹 푸시 발송 공통 코드
// 필요한 시크릿: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (예: mailto:you@example.com)

import type { SupabaseClient } from 'npm:@supabase/supabase-js@2.105.1';
import webpush from 'npm:web-push@3.6.7';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

/** 콘티에 담긴 곡 제목 (순서대로) */
export async function getSongTitles(client: SupabaseClient, setlistId: string) {
  const { data: items } = await client
    .from('setlist_items')
    .select('position, song:songs(title)')
    .eq('setlist_id', setlistId)
    .order('position', { ascending: true });
  return (items ?? [])
    .map((i) => (i.song as unknown as { title: string } | null)?.title)
    .filter(Boolean) as string[];
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
}

/**
 * 교회 팀원들에게 푸시를 보낸다. adminClient는 service role 클라이언트여야 한다.
 * 만료된 구독은 지운다. 알림을 받은 사람 수를 돌려준다.
 */
export async function sendToChurch(
  adminClient: SupabaseClient,
  churchId: string,
  payload: PushPayload,
  { excludeUserId }: { excludeUserId?: string } = {},
) {
  let membersQuery = adminClient.from('profiles').select('id').eq('church_id', churchId);
  if (excludeUserId) membersQuery = membersQuery.neq('id', excludeUserId);
  const { data: members } = await membersQuery;
  const memberIds = (members ?? []).map((m) => m.id);
  if (memberIds.length === 0) return 0;

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', memberIds);
  if (!subs || subs.length === 0) return 0;

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const body = JSON.stringify(payload);
  const expired: string[] = [];
  const notifiedUsers = new Set<string>();

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 60 * 60 * 24 },
        );
        notifiedUsers.add(sub.user_id);
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404/410: 사용자가 알림을 끄거나 앱을 지운 구독
        if (statusCode === 404 || statusCode === 410) expired.push(sub.id);
        else console.error('푸시 발송 실패', statusCode, err);
      }
    }),
  );

  if (expired.length > 0) {
    await adminClient.from('push_subscriptions').delete().in('id', expired);
  }

  return notifiedUsers.size;
}
