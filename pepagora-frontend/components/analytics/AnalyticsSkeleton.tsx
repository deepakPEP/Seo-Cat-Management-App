'use client';

export function SkeletonPanel() {
  return (
    <div className="animate-pulse bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
      <div className="h-6 bg-gray-200 rounded w-1/3" />
      <div className="grid grid-cols-2 gap-4">
        <div className="h-32 bg-gray-100 rounded-xl" />
        <div className="h-32 bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}

export function SkeletonTop5({ embedded = false }: { embedded?: boolean }) {
  const inner = (
    <div className="animate-pulse space-y-3">
      <div className="h-5 bg-gray-200 rounded w-1/2" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-10 bg-gray-100 rounded" />
      ))}
    </div>
  );

  if (embedded) return inner;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {inner}
    </div>
  );
}
