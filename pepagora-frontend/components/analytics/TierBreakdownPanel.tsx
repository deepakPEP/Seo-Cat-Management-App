'use client';

import { memo, useMemo } from 'react';
import { useBreakdown } from '@/components/hooks/useBreakdown';
import type { NodeType, TierCounts } from '@/lib/analytics/types';
import { SkeletonPanel } from './AnalyticsSkeleton';

type TierBreakdownPanelProps = {
  nodeType: NodeType;
  nodeId: string;
  title?: string;
};

const TIER_BARS: { key: keyof TierCounts; label: string; color: string }[] = [
  { key: 'explore', label: 'Explore', color: '#F59E0B' },
  { key: 'grow', label: 'Grow', color: '#3B82F6' },
  { key: 'scale', label: 'Scale', color: '#22C55E' },
  { key: 'global', label: 'Global', color: '#A855F7' },
  { key: 'free', label: 'Free', color: '#9CA3AF' },
];

function TierBarChart({ label, counts }: { label: string; counts: TierCounts }) {
  const max = useMemo(
    () => Math.max(...TIER_BARS.map((b) => counts[b.key]), 1),
    [counts],
  );

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
        Tier Distribution — {label}
      </h4>
      <div className="flex items-end justify-between gap-3 h-44">
        {TIER_BARS.map((bar) => {
          const value = counts[bar.key];
          const heightPct = (value / max) * 100;
          return (
            <div key={bar.key} className="flex flex-1 flex-col items-center justify-end h-full">
              <span className="text-xs font-semibold text-gray-700 mb-1 tabular-nums">
                {value.toLocaleString()}
              </span>
              <div
                className="w-full rounded-t-md transition-all duration-300"
                style={{
                  height: `${Math.max(heightPct, value > 0 ? 4 : 0)}%`,
                  backgroundColor: bar.color,
                }}
                title={`${bar.label}: ${value.toLocaleString()}`}
              />
              <span className="text-[11px] text-gray-500 mt-2">{bar.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TierRow({
  label,
  total,
  paidTotal,
  explore,
  grow,
  scale,
  global,
  free,
}: {
  label: string;
  total: number;
  paidTotal: number;
  explore: number;
  grow: number;
  scale: number;
  global: number;
  free: number;
}) {
  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">{label}</h4>
      <p className="text-2xl font-bold text-gray-900 mb-4">{total.toLocaleString()} total</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Paid total</span>
          <span className="font-semibold text-emerald-700">{paidTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-500">Explore</span>
          <span>{explore.toLocaleString()}</span>
        </div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-500">Grow</span>
          <span>{grow.toLocaleString()}</span>
        </div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-500">Scale</span>
          <span>{scale.toLocaleString()}</span>
        </div>
        <div className="flex justify-between pl-2">
          <span className="text-gray-500">Global</span>
          <span>{global.toLocaleString()}</span>
        </div>
        <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
          <span className="text-gray-600">Free</span>
          <span className="font-semibold">{free.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

function PaidFreeRatioBar({ label, counts }: { label: string; counts: TierCounts }) {
  const total = counts.paidTotal + counts.free;
  const paidPct = total > 0 ? Math.round((counts.paidTotal / total) * 100) : 0;
  const freePct = total > 0 ? 100 - paidPct : 0;

  return (
    <div className="bg-gray-50 rounded-xl p-5 border border-gray-100">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-3">
        Paid vs. Free {label} Ratio
      </h4>
      <div className="flex h-7 w-full overflow-hidden rounded-full bg-gray-200">
        {paidPct > 0 && (
          <div
            className="flex items-center justify-start pl-3 text-xs font-semibold text-white"
            style={{ width: `${paidPct}%`, backgroundColor: '#DC2626' }}
            title={`Paid: ${counts.paidTotal.toLocaleString()}`}
          >
            Paid {paidPct}%
          </div>
        )}
        {freePct > 0 && (
          <div
            className="flex flex-1 items-center justify-end pr-3 text-xs font-semibold text-white"
            style={{ backgroundColor: '#F97316' }}
            title={`Free: ${counts.free.toLocaleString()}`}
          >
            Free {freePct}%
          </div>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#DC2626' }} />
          Paid: {counts.paidTotal.toLocaleString()} (Grow {counts.grow.toLocaleString()} · Scale{' '}
          {counts.scale.toLocaleString()} · Global {counts.global.toLocaleString()})
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: '#F97316' }} />
          Free: {counts.free.toLocaleString()}
        </span>
      </div>
    </div>
  );
}

function TierBreakdownPanelInner({ nodeType, nodeId, title }: TierBreakdownPanelProps) {
  const { data, loading, error } = useBreakdown(nodeType, nodeId);

  const clientTotal = useMemo(() => {
    if (!data) return 0;
    return data.clients.paidTotal + data.clients.free;
  }, [data]);

  const productTotal = useMemo(() => {
    if (!data) return 0;
    return data.products.paidTotal + data.products.free;
  }, [data]);

  if (loading) return <SkeletonPanel />;

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      {title && (
        <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TierRow
          label="Clients"
          total={clientTotal}
          paidTotal={data.clients.paidTotal}
          explore={data.clients.explore}
          grow={data.clients.grow}
          scale={data.clients.scale}
          global={data.clients.global}
          free={data.clients.free}
        />
        <TierRow
          label="Products Listed"
          total={productTotal}
          paidTotal={data.products.paidTotal}
          explore={data.products.explore}
          grow={data.products.grow}
          scale={data.products.scale}
          global={data.products.global}
          free={data.products.free}
        />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <TierBarChart label="Clients" counts={data.clients} />
        <TierBarChart label="Products Listed" counts={data.products} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <PaidFreeRatioBar label="Client" counts={data.clients} />
        <PaidFreeRatioBar label="Product" counts={data.products} />
      </div>
    </div>
  );
}

const TierBreakdownPanel = memo(TierBreakdownPanelInner);
export default TierBreakdownPanel;
