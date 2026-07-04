'use client';

import { formatCount } from '@/lib/analytics/types';

type InlineTierPillsProps = {
  paid: number;
  free: number;
  className?: string;
};

export default function InlineTierPills({ paid, free, className = '' }: InlineTierPillsProps) {
  return (
    <span className={`inline-flex items-center gap-3 text-sm font-semibold tabular-nums ${className}`}>
      <span className="text-[#1D4ED8]">P {formatCount(paid)}</span>
      <span className="text-[#15803D]">F {formatCount(free)}</span>
    </span>
  );
}
