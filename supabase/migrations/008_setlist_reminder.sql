-- =============================================
-- 예배 하루 전 콘티 알림
-- 매일 저녁 8시(한국 시간)에 setlist-reminder Edge Function을 호출한다.
--
-- 먼저 Vault에 두 값을 넣어야 한다 (SQL Editor에서 한 번만):
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<CRON_SECRET과 같은 값>', 'cron_secret');
-- =============================================

-- 1. 하루 전 알림을 보냈는지 기록 (중복 발송 방지)
ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- 예배 날짜를 수정하면 다시 알림을 보낼 수 있게 초기화
CREATE OR REPLACE FUNCTION public.reset_setlist_reminder()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.date IS DISTINCT FROM OLD.date THEN
    NEW.reminder_sent_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS setlists_reset_reminder ON public.setlists;
CREATE TRIGGER setlists_reset_reminder
  BEFORE UPDATE OF date ON public.setlists
  FOR EACH ROW EXECUTE FUNCTION public.reset_setlist_reminder();

-- 2. 매일 11:00 UTC (= 20:00 KST) 호출
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('setlist-reminder')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'setlist-reminder');

SELECT cron.schedule(
  'setlist-reminder',
  '0 11 * * *',
  $$
  SELECT net.http_post(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'project_url')
           || '/functions/v1/setlist-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
