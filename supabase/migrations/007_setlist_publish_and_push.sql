-- =============================================
-- 콘티 완료 상태 + 푸시 알림 구독
-- =============================================

-- 1. 콘티 상태 (draft: 작성 중, published: 완료)
ALTER TABLE public.setlists
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

-- 기존 콘티는 이미 공유된 것으로 간주
UPDATE public.setlists
  SET status = 'published', published_at = COALESCE(published_at, updated_at)
  WHERE status = 'draft';

-- 2. 푸시 구독 정보 (기기/브라우저마다 한 줄)
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 본인 구독만 조회/추가/수정/삭제 (발송은 Edge Function이 service role로 처리)
CREATE POLICY "본인 푸시 구독 조회" ON public.push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "본인 푸시 구독 추가" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "본인 푸시 구독 수정" ON public.push_subscriptions
  FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "본인 푸시 구독 삭제" ON public.push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- 3. 구독 저장 함수
-- 같은 기기(endpoint)에서 다른 계정으로 로그인하면 구독을 현재 사용자로 옮긴다.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  p_endpoint TEXT,
  p_p256dh TEXT,
  p_auth TEXT,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), p_endpoint, p_p256dh, p_auth, p_user_agent)
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(),
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.save_push_subscription(TEXT, TEXT, TEXT, TEXT) TO authenticated;
