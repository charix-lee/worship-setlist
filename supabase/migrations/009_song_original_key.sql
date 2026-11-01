-- 곡 원키를 직접 지정할 수 있게 한다.
-- 비어 있으면 화면에서는 첫 번째 악보의 키를 원키로 보여준다.
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS original_key TEXT;
