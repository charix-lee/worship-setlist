import { Copy, Download, Loader2, Send } from 'lucide-react';
import Modal from './Modal';
import toast from 'react-hot-toast';

interface KakaoShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
  files: File[];
  preparing: boolean;
}

export default function KakaoShareModal({
  isOpen,
  onClose,
  text,
  files,
  preparing,
}: KakaoShareModalProps) {
  // 파일 공유 지원 여부 (모바일 Safari/Chrome 등)
  const canShareFiles =
    typeof navigator !== 'undefined' &&
    !!navigator.canShare &&
    files.length > 0 &&
    navigator.canShare({ files });

  const copyText = async (silent = false) => {
    try {
      await navigator.clipboard.writeText(text);
      if (!silent) toast.success('콘티 리스트가 복사되었습니다!');
    } catch {
      if (!silent) toast.error('복사 실패');
    }
  };

  const handleShare = async () => {
    // 카카오톡이 사진과 함께 온 텍스트를 무시하는 경우가 있어 미리 클립보드에 복사
    await copyText(true);

    try {
      if (canShareFiles) {
        await navigator.share({ files, text });
      } else if (navigator.share) {
        await navigator.share({ text });
      } else {
        toast.success('콘티 리스트가 복사되었습니다! 카톡방에 붙여넣기 해주세요.');
        return;
      }
      toast.success('텍스트가 누락됐다면 카톡방에 붙여넣기 해주세요.');
      onClose();
    } catch (error) {
      if ((error as Error).name === 'AbortError') return;
      console.error('공유 실패:', error);
      toast.error('공유에 실패했습니다.');
    }
  };

  const downloadImages = () => {
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    toast.success('이미지가 다운로드되었습니다.');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="카톡으로 보내기" size="lg">
      <div className="space-y-4">
        <pre className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-[13px] text-gray-800 whitespace-pre-wrap break-all font-sans max-h-[40vh] overflow-y-auto">
          {text}
        </pre>

        <div className="flex items-center gap-2 text-[13px] text-gray-500">
          {preparing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              악보 사진 준비 중...
            </>
          ) : (
            <span>악보 사진 {files.length}장</span>
          )}
        </div>

        {!preparing && !canShareFiles && files.length > 0 && (
          <p className="text-[12px] text-gray-400">
            이 기기에서는 사진을 바로 공유할 수 없어요. 텍스트를 복사하고 사진을 다운로드해서 보내주세요.
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleShare}
            disabled={preparing}
            className="w-full py-3 bg-[#FEE500] text-[#191919] font-semibold rounded-lg hover:bg-[#FDD800] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {canShareFiles ? '사진과 함께 공유하기' : '공유하기'}
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => copyText()}
              className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5"
            >
              <Copy className="w-4 h-4" />
              텍스트 복사
            </button>
            {!canShareFiles && files.length > 0 && (
              <button
                onClick={downloadImages}
                disabled={preparing}
                className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                사진 다운로드
              </button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}
