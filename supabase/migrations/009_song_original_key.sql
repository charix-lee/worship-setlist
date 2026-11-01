-- 곡의 기본 악보를 고를 수 있게 한다 (기본 악보의 키를 저장).
-- 비어 있거나 그 키의 악보가 없으면 첫 번째 악보가 기본이다.
-- 콘티에 곡을 넣을 때 이 악보가 기본으로 선택된다.
ALTER TABLE public.songs
  ADD COLUMN IF NOT EXISTS original_key TEXT;
