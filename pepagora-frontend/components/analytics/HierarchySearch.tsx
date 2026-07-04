'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import axiosInstance from '@/lib/axiosInstance';

type SearchItem = { _id: string; name: string };

type SearchResults = {
  categories: SearchItem[];
  subCategories: SearchItem[];
  productCategories: SearchItem[];
};

const EMPTY: SearchResults = { categories: [], subCategories: [], productCategories: [] };

type FlatResult = SearchItem & {
  type: 'category' | 'subcategory' | 'product_category';
};

const TYPE_META: Record<
  FlatResult['type'],
  { label: string; badge: string; href: (id: string) => string }
> = {
  category: {
    label: 'Category',
    badge: 'bg-blue-100 text-blue-700',
    href: (id) => `/marketing/view-details/categories/${id}/subcategories`,
  },
  subcategory: {
    label: 'Sub Category',
    badge: 'bg-amber-100 text-amber-700',
    href: (id) => `/marketing/view-details/subcategories/${id}/productcategories`,
  },
  product_category: {
    label: 'Product Category',
    badge: 'bg-purple-100 text-purple-700',
    href: (id) => `/marketing/view-details/productcategories/${id}/products`,
  },
};

export default function HierarchySearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const flatResults = useMemo<FlatResult[]>(
    () => [
      ...results.categories.map((c) => ({ ...c, type: 'category' as const })),
      ...results.subCategories.map((s) => ({ ...s, type: 'subcategory' as const })),
      ...results.productCategories.map((p) => ({ ...p, type: 'product_category' as const })),
    ],
    [results],
  );

  // Debounced fetch
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await axiosInstance.get('/marketing/search', {
          params: { q },
          signal: controller.signal,
        });
        const data = res.data?.data?.data || res.data?.data || EMPTY;
        setResults({
          categories: Array.isArray(data.categories) ? data.categories : [],
          subCategories: Array.isArray(data.subCategories) ? data.subCategories : [],
          productCategories: Array.isArray(data.productCategories) ? data.productCategories : [],
        });
        setActiveIndex(-1);
      } catch {
        // ignore aborted/failed requests
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const goTo = (item: FlatResult) => {
    setOpen(false);
    setQuery('');
    setResults(EMPTY);
    router.push(TYPE_META[item.type].href(item._id));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || flatResults.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % flatResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? flatResults.length - 1 : i - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      goTo(flatResults[activeIndex]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={containerRef} className="relative w-full sm:w-80 md:w-96">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search categories, sub categories, products..."
          className="w-full h-11 pl-10 pr-9 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#E53935]/40 focus:border-[#E53935]"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(EMPTY);
            }}
            className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute right-0 z-30 mt-2 w-full max-h-96 overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-gray-500">
              <span className="w-4 h-4 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
              Searching...
            </div>
          ) : flatResults.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">No results found</div>
          ) : (
            <ul className="py-1">
              {flatResults.map((item, idx) => {
                const meta = TYPE_META[item.type];
                return (
                  <li key={`${item.type}-${item._id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => goTo(item)}
                      className={`flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                        idx === activeIndex ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate text-sm font-medium text-gray-900">{item.name}</span>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.badge}`}>
                        {meta.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
