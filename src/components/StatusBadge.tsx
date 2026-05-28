'use client';

import type { ReleaseStatus } from '@/lib/types';

export const statusConfig: Record<ReleaseStatus, { label: string; classes: string }> = {
  'out-now': { label: 'Out Now', classes: 'bg-green-500/20 text-green-400 border-green-500/30' },
  'this-week': { label: 'This Week', classes: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  'coming-soon': { label: 'Coming Soon', classes: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  'upcoming': { label: 'Upcoming', classes: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export default function StatusBadge({ status }: { status: ReleaseStatus }) {
  const config = statusConfig[status];
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${config.classes}`}>
      {config.label}
    </span>
  );
}
