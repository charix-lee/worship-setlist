import { ChevronDown } from 'lucide-react';
import { MUSIC_KEYS } from '@/types/database';

interface OriginalKeySelectProps {
  /** 직접 지정한 원키, 빈 문자열이면 자동 (첫 번째 악보 키) */
  value: string;
  onChange: (value: string) => void;
  /** 자동일 때 쓰일 첫 번째 악보 키 */
  autoKey: string | null;
}

export default function OriginalKeySelect({ value, onChange, autoKey }: OriginalKeySelectProps) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 sm:h-11 px-3 pr-9 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <option value="">
          {autoKey ? `자동 · 첫 번째 악보 키 (${autoKey})` : '자동 · 첫 번째 악보 키'}
        </option>
        {MUSIC_KEYS.map((key) => (
          <option key={key} value={key}>
            {key}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
    </div>
  );
}
