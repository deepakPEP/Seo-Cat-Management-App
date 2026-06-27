'use client';

import { useRouter } from 'next/navigation';

export type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type AnalyticsBreadcrumbProps = {
  segments: BreadcrumbSegment[];
};

export default function AnalyticsBreadcrumb({ segments }: AnalyticsBreadcrumbProps) {
  const router = useRouter();

  return (
    <nav className="flex items-center flex-wrap gap-1 text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
      {segments.map((seg, i) => {
        const isLast = i === segments.length - 1;
        return (
          <span key={`${seg.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-400">/</span>}
            {seg.href && !isLast ? (
              <button
                type="button"
                onClick={() => router.push(seg.href!)}
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
              >
                {seg.label}
              </button>
            ) : (
              <span className={isLast ? 'text-gray-900 font-semibold' : 'text-gray-600'}>
                {seg.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
