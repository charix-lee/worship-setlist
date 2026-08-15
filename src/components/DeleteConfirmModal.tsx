import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  warningMessage: string;
  warningList?: string[];
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  warningMessage,
  warningList,
}: DeleteConfirmModalProps) {
  const hasWarningList = warningList && warningList.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div className="flex-1">
            {hasWarningList ? (
              <>
                <p className="text-sm text-gray-700 mb-3">
                  <span className="font-semibold">"{itemName}"</span> {warningMessage}
                </p>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                  <ul className="space-y-1">
                    {warningList.map((item, index) => (
                      <li key={index} className="text-sm text-red-800 flex items-start gap-2">
                        <span className="text-red-600 flex-shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="text-sm text-gray-700 font-medium">
                  그래도 삭제하시겠습니까?
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  삭제 시 콘티에서 해당 악보를 사용할 수 없게 됩니다.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-2">
                  <span className="font-semibold">"{itemName}"</span> {warningMessage}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <Button onClick={onConfirm} className="bg-red-600 hover:bg-red-700">
            삭제
          </Button>
        </div>
      </div>
    </Modal>
  );
}
