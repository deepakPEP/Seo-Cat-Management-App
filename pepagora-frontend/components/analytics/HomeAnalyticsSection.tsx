'use client';

import { lazy, Suspense, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { Top5Level } from '@/lib/analytics/types';
import { useListCounts } from '@/components/hooks/useListCounts';
import AnalyticsErrorBoundary from './AnalyticsErrorBoundary';
import { SkeletonTop5 } from './AnalyticsSkeleton';
import InlineTierPills from './InlineTierPills';

const Top5Widget = lazy(() => import('./Top5Widget'));

type HomeAnalyticsSectionProps = {
  categories: { _id: string; name: string }[];
};

export function HomeAnalyticsSection({ categories }: HomeAnalyticsSectionProps) {
  const router = useRouter();
  const { dataMap } = useListCounts('category');

  const handleRowClick = useCallback(
    (nodeId: string, level: Top5Level) => {
      if (level === 'category') {
        router.push(`/marketing/view-details/categories/${nodeId}/subcategories`);
      } else if (level === 'subcategory') {
        router.push(`/marketing/view-details/subcategories/${nodeId}/productcategories`);
      } else if (level === 'product_category') {
        router.push(`/marketing/view-details/productcategories/${nodeId}/products`);
      }
    },
    [router],
  );

  return (
    <AnalyticsErrorBoundary>
      <section className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
          Analytics Overview — New
        </p>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 pt-5 pb-2">
            <Suspense fallback={<SkeletonTop5 embedded />}>
              <Top5Widget
                level="category"
                title="Top 5 Categories"
                icon="list"
                embedded
                onRowClick={handleRowClick}
              />
            </Suspense>
          </div>

          <div className="border-t border-gray-200 mx-5" />

          <div className="px-5 pt-4 pb-2">
            <Suspense fallback={<SkeletonTop5 embedded />}>
              <Top5Widget
                level="subcategory"
                title="Top 5 SubCategories"
                icon="layers"
                embedded
                onRowClick={handleRowClick}
              />
            </Suspense>
          </div>

          <div className="border-t border-gray-200 mx-5" />

          <div className="px-5 pt-4 pb-5">
            <Suspense fallback={<SkeletonTop5 embedded />}>
              <Top5Widget
                level="product_category"
                title="Top 5 Product Categories"
                icon="diamond"
                embedded
                onRowClick={handleRowClick}
              />
            </Suspense>
          </div>
        </div>
      </section>

      <section>
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-3">
          Categories — Updated Rows
        </p>

        {categories.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 text-center py-12">
            <p className="text-gray-500 text-sm">No categories found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => {
              const stats = dataMap.get(category._id);
              return (
                <CategoryRow
                  key={category._id}
                  category={category}
                  paid={stats?.paidClients ?? 0}
                  free={stats?.freeClients ?? 0}
                  onNavigate={() =>
                    router.push(
                      `/marketing/view-details/categories/${category._id}/subcategories`,
                    )
                  }
                />
              );
            })}
          </div>
        )}
      </section>
    </AnalyticsErrorBoundary>
  );
}

function CategoryRow({
  category,
  paid,
  free,
  onNavigate,
}: {
  category: { _id: string; name: string };
  paid: number;
  free: number;
  onNavigate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onNavigate}
      className="w-full text-left bg-white rounded-xl border border-gray-200 px-5 py-4 hover:border-gray-300 transition-colors group"
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-gray-900 truncate">
          {category.name}
        </span>
        <div className="flex items-center gap-4 shrink-0">
          <InlineTierPills paid={paid} free={free} />
          <svg
            className="w-4 h-4 text-gray-300 group-hover:text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </button>
  );
}
