import { Copy, Check } from 'lucide-react';
import { useState } from 'react';
import Modal from './Modal';
import toast from 'react-hot-toast';

interface LyricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  artist?: string | null;
  lyrics: string;
}

export default function LyricsModal({
  isOpen,
  onClose,
  title,
  artist,
  lyrics,
}: LyricsModalProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(lyrics);
      setCopied(true);
      toast.success('가사가 클립보드에 복사되었습니다!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('복사 실패');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="가사" size="lg">
      <div className="space-y-4">
        {/* 곡 정보 */}
        <div className="pb-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {artist && <p className="text-sm text-gray-500">{artist}</p>}
        </div>

        {/* 복사 버튼 */}
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-primary-600 text-white hover:bg-primary-700'
          }`}
        >
          {copied ? (
            <>
              <Check className="w-5 h-5" />
              복사됨!
            </>
          ) : (
            <>
              <Copy className="w-5 h-5" />
              가사 전체 복사
            </>
          )}
        </button>

        {/* 가사 내용 */}
        <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
            {lyrics}
          </pre>
        </div>

        {/* 안내 */}
        <p className="text-xs text-center text-gray-400">
          복사 버튼을 눌러 PPT나 다른 프로그램에 붙여넣기 하세요
        </p>
      </div>
    </Modal>
  );
}
