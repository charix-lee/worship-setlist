import type { SetlistStatus } from '@/types/database';

/** 작성 중인 콘티에만 표시. 완료된 콘티는 배지 없음. */
export default function SetlistStatusBadge({ status }: { status: SetlistStatus }) {
  if (status !== 'draft') return null;

  return (
    <span className="px-2 py-0.5 text-xs font-medium rounded bg-amber-100 text-amber-800 whitespace-nowrap">
      작성 중
    </span>
  );
}
