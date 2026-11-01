import { ChevronDown } from 'lucide-react';

interface DefaultSheetSelectProps {
  /** 기본 악보로 고른 키, 빈 문자열이면 첫 번째 악보 */
  value: string;
  onChange: (value: string) => void;
  /** 이 곡에 있는 악보들의 키 (순서대로) */
  sheetKeys: string[];
}

export default function DefaultSheetSelect({ value, onChange, sheetKeys }: DefaultSheetSelectProps) {
  const keys = Array.from(new Set(sheetKeys));
  // 고른 악보가 삭제됐으면 첫 번째 악보로 표시
  const current = keys.includes(value) ? value : '';

  if (keys.length === 0) {
    return (
      <div className="w-full h-10 sm:h-11 px-3 flex items-center border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-500">
        악보를 추가하면 고를 수 있어요
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 sm:h-11 px-3 pr-9 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">첫 번째 악보 ({keys[0]})</option>
        {keys.map((key) => (
          <option key={key} value={key}>
            {key} 악보
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}
