// 예배 하루 전 알림: 내일 예배인 '완료' 콘티를 팀원 모두에게 한 번 더 알린다.
// pg_cron이 매일 저녁 호출한다 (migrations/008_setlist_reminder.sql).
// 필요한 시크릿: CRON_SECRET + VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
// 로그인 없이 cron이 부르므로 --no-verify-jwt 로 배포하고, 대신 CRON_SECRET으로 확인한다.

import { createClient } from 'npm:@supabase/supabase-js@2.105.1';
import { formatDate, getSongTitles, sendToChurch } from '../_shared/push.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** 한국 시간 기준 내일 날짜 (YYYY-MM-DD) */
function tomorrowInKorea() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000);
  now.setUTCDate(now.getUTCDate() + 1);
  return now.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('CRON_SECRET');
  if (!secret || req.headers.get('x-cron-secret') !== secret) {
    return json({ error: 'Unauthorized' }, 401);
  }

  const adminClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const date = tomorrowInKorea();

  // 보낼 콘티를 먼저 '보냄'으로 표시 → 여러 번 호출돼도 한 번만 나간다
  const { data: setlists, error } = await adminClient
    .from('setlists')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('date', date)
    .eq('status', 'published')
    .is('reminder_sent_at', null)
    .select('id, date, service_type, church_id');
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const setlist of setlists ?? []) {
    const titles = await getSongTitles(adminClient, setlist.id);
    const notified = await sendToChurch(adminClient, setlist.church_id, {
      title: `내일 ${formatDate(setlist.date)} ${setlist.service_type}`,
      body: titles.length > 0 ? `콘티: ${titles.join(', ')}` : '내일 예배 콘티를 확인해주세요.',
      url: `/worship/setlists/${setlist.id}/view`,
      tag: `setlist-reminder-${setlist.id}`,
    });
    results.push({ setlistId: setlist.id, notified });
  }

  return json({ date, setlists: results });
});
