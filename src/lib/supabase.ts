import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 이미지 하단에 여백 추가 (100px 고정)
const addBottomPadding = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // 이미지 파일이 아니면 그대로 반환
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.onload = () => {
        const padding = 100; // 하단 여백 100px
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height + padding;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // 흰색 배경으로 채우기
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 원본 이미지 그리기
        ctx.drawImage(img, 0, 0);

        // Canvas를 Blob으로 변환 후 File 생성
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob'));
            return;
          }
          const newFile = new File([blob], file.name, { type: file.type });
          resolve(newFile);
        }, file.type);
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };

    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

// Storage 헬퍼 함수
export const uploadSheetFile = async (
  file: File,
  songId: string,
  musicKey: string,
  songTitle?: string
): Promise<{ publicUrl: string; fileName: string }> => {
  // 이미지인 경우 하단에 100px 여백 추가
  const processedFile = await addBottomPadding(file);

  const fileExt = file.name.split('.').pop();
  // Storage 경로: songId/timestamp.ext (고유성 보장)
  const storagePath = `${songId}/${musicKey}_${Date.now()}.${fileExt}`;
  // 표시용 파일명: 제목_코드.ext
  const displayName = songTitle ? `${songTitle}_${musicKey}.${fileExt}` : file.name;

  const { error } = await supabase.storage
    .from('sheets')
    .upload(storagePath, processedFile);

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
