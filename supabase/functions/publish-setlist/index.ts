// 콘티를 '완료' 상태로 바꾸고, 같은 교회 팀원들에게 푸시 알림을 한 번 보낸다.
// 필요한 시크릿: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (예: mailto:you@example.com)

import { createClient } from 'npm:@supabase/supabase-js@2.105.1';
import { formatDate, getSongTitles, sendToChurch } from '../_shared/push.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const EDIT_ROLES = ['admin', 'worship_team'];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

  const titles = await getSongTitles(userClient, setlistId);
  const notified = await sendToChurch(
    adminClient,
    setlist.church_id,
    {
      title: `${formatDate(setlist.date)} ${setlist.service_type} 콘티가 올라왔어요`,
      body: titles.length > 0
        ? `${me?.name ? `${me.name} · ` : ''}${titles.join(', ')}`
        : '콘티를 확인해주세요.',
      url: `/worship/setlists/${setlistId}/view`,
      tag: `setlist-${setlistId}`,
    },
    { excludeUserId: user.id },
  );

  return json({ notified, alreadyPublished: false });
});
