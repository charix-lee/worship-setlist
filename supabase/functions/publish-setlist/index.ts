// 콘티를 '완료' 상태로 바꾸고, 같은 교회 팀원들에게 푸시 알림을 한 번 보낸다.
// 필요한 시크릿: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (예: mailto:you@example.com)

import { createClient } from 'npm:@supabase/supabase-js@2.105.1';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EDIT_ROLES = ['admin', 'worship_team'];
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function formatDate(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 요청한 사용자 권한으로 동작하는 클라이언트 (RLS 적용)
  const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: authHeader } },
  });
  // 팀원 구독 목록 조회용 (RLS 우회)
  const adminClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  let setlistId: string | undefined;
  try {
    ({ setlistId } = await req.json());
  } catch {
    // 아래에서 처리
  }
  if (!setlistId) return json({ error: 'setlistId is required' }, 400);

  // 콘티 조회 (RLS로 본인 교회 콘티만 보임)
  const { data: setlist } = await userClient
    .from('setlists')
    .select('id, date, service_type, status, church_id, created_by')
    .eq('id', setlistId)
    .single();
  if (!setlist) return json({ error: 'Setlist not found' }, 404);

  const { data: me } = await userClient
    .from('profiles')
    .select('name, role')
    .eq('id', user.id)
    .single();
  const canPublish = setlist.created_by === user.id || EDIT_ROLES.includes(me?.role ?? '');
  if (!canPublish) return json({ error: 'Forbidden' }, 403);

  if (setlist.status === 'published') return json({ notified: 0, alreadyPublished: true });

  // draft → published 는 한 번만 성공하므로, 동시에 눌러도 알림은 한 번만 나간다
  const { data: updated, error: updateError } = await userClient
    .from('setlists')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', setlistId)
    .eq('status', 'draft')
    .select('id');
  if (updateError) return json({ error: updateError.message }, 500);
  if (!updated || updated.length === 0) return json({ notified: 0, alreadyPublished: true });

  // 알림 내용
  const { data: items } = await userClient
    .from('setlist_items')
    .select('position, song:songs(title)')
    .eq('setlist_id', setlistId)
    .order('position', { ascending: true });
  const titles = (items ?? [])
    .map((i) => (i.song as unknown as { title: string } | null)?.title)
    .filter(Boolean) as string[];

  const payload = JSON.stringify({
    title: `${formatDate(setlist.date)} ${setlist.service_type} 콘티가 올라왔어요`,
    body: titles.length > 0
      ? `${me?.name ? `${me.name} · ` : ''}${titles.join(', ')}`
      : '콘티를 확인해주세요.',
    url: `/worship/setlists/${setlistId}/view`,
    tag: `setlist-${setlistId}`,
  });

  // 같은 교회 팀원(본인 제외)의 구독
  const { data: members } = await adminClient
    .from('profiles')
    .select('id')
    .eq('church_id', setlist.church_id)
    .neq('id', user.id);
  const memberIds = (members ?? []).map((m) => m.id);
  if (memberIds.length === 0) return json({ notified: 0, alreadyPublished: false });

  const { data: subs } = await adminClient
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', memberIds);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@example.com',
    Deno.env.get('VAPID_PUBLIC_KEY')!,
    Deno.env.get('VAPID_PRIVATE_KEY')!,
  );

  const expired: string[] = [];
  const notifiedUsers = new Set<string>();

  await Promise.all(
    (subs ?? []).map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
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

  return json({ notified: notifiedUsers.size, alreadyPublished: false });
});
