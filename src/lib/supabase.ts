import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Storage 헬퍼 함수
export const uploadSheetFile = async (
  file: File,
  songId: string,
  musicKey: string,
  songTitle?: string
): Promise<{ publicUrl: string; fileName: string }> => {
  const fileExt = file.name.split('.').pop();
  // Storage 경로: songId/timestamp.ext (고유성 보장)
  const storagePath = `${songId}/${musicKey}_${Date.now()}.${fileExt}`;
  // 표시용 파일명: 제목_코드.ext
  const displayName = songTitle ? `${songTitle}_${musicKey}.${fileExt}` : file.name;

  const { error } = await supabase.storage
    .from('sheets')
    .upload(storagePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('sheets')
    .getPublicUrl(storagePath);

  return { publicUrl: data.publicUrl, fileName: displayName };
};

export const deleteSheetFile = async (fileUrl: string): Promise<void> => {
  // URL에서 파일 경로 추출
  const path = fileUrl.split('/sheets/')[1];
  if (!path) return;

  const { error } = await supabase.storage
    .from('sheets')
    .remove([path]);

  if (error) throw error;
};
