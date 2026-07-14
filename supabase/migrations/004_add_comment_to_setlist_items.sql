-- Add comment field to setlist_items table
ALTER TABLE setlist_items
ADD COLUMN comment TEXT;

COMMENT ON COLUMN setlist_items.comment IS '생성자만 볼 수 있는 멘트';
