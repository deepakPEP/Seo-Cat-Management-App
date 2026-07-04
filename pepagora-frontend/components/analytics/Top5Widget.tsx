'use client';

import { memo } from 'react';
import { useTop5 } from '@/components/hooks/useTop5';
import type { Top5Level } from '@/lib/analytics/types';
import InlineTierPills from './InlineTierPills';
import { SkeletonTop5 } from './AnalyticsSkeleton';

type Top5WidgetProps = {
  level: Top5Level;
  parentId?: string | null;
  title: string;
  subtitle?: string;
  icon?: 'list' | 'layers' | 'diamond';
  embedded?: boolean;
  onRowClick?: (nodeId: string, level: Top5Level) => void;
};

function WidgetIcon({ type }: { type: 'list' | 'layers' | 'diamond' }) {
  if (type === 'diamond') {
    return (
      <svg className="w-4 h-4 text-gray-500 shrink-0" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 1.5 2 6.5l6 8 6-8L8 1.5Zm0 2.3 3.6 4.5L8 12.8 4.4 8.3 8 3.8Z" />
      </svg>
    );
  }
  if (type === 'layers') {
    return (
      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
      </svg>
    );
  }
  return (
    <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  );
}

function Top5WidgetInner({
  level,
  parentId,
  title,
  subtitle = 'BY LISTINGS',
  icon = 'list',
  embedded = false,
  onRowClick,
}: Top5WidgetProps) {
  const { data, loading, error } = useTop5(level, parentId);

  if (loading) return <SkeletonTop5 embedded={embedded} />;

  if (error) {
    return (
      <div className="py-4 text-red-600 text-sm">{error}</div>
    );
  }

  const maxScore = Math.max(
    ...data.map((r) => r.paidClients + r.freeClients + r.paidProducts + r.freeProducts),
    1,
  );

  const content = (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <WidgetIcon type={icon} />
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title}</h3>
        </div>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-white bg-[#E85D5D] px-2.5 py-1 rounded">
          {subtitle}
        </span>
      </div>

      {data.length === 0 ? (
        <p className="text-sm text-gray-500 py-2">No data available</p>
      ) : (
        <ul className="space-y-0">
          {data.map((row) => {
            const score = row.paidClients + row.freeClients + row.paidProducts + row.freeProducts;
            const barWidth = Math.max(8, Math.round((score / maxScore) * 100));
            const paid = row.paidClients || row.paidProducts;
            const free = row.freeClients || row.freeProducts;

            return (
              <li key={row.nodeId} className="border-b border-gray-100 last:border-b-0">
                <button
                  type="button"
                  onClick={() => onRowClick?.(row.nodeId, level)}
                  className="w-full text-left py-3 group disabled:cursor-default"
                  disabled={!onRowClick}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 font-medium w-4 shrink-0 tabular-nums">
                      {row.rank}
                    </span>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">
                      {row.name}
                    </span>
                    <InlineTierPills paid={paid} free={free} className="shrink-0" />
                    <div className="w-14 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                      <div
                        className="h-full bg-[#E53935] rounded-full"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (embedded) {
    return <div>{content}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {content}
    </div>
  );
}

const Top5Widget = memo(Top5WidgetInner);
export default Top5Widget;
