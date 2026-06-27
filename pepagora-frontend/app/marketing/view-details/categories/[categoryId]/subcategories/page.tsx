"use client";

import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import axiosInstance from "../../../../../../lib/axiosInstance";
import { useAuth } from "@/components/hooks/useAuth";
import GoogleAnalyticsCard from "@/components/GoogleAnalyticsCard";
import AnalyticsBreadcrumb from "@/components/analytics/AnalyticsBreadcrumb";
import AnalyticsErrorBoundary from "@/components/analytics/AnalyticsErrorBoundary";
import InlineTierPills from "@/components/analytics/InlineTierPills";
import { SkeletonPanel, SkeletonTop5 } from "@/components/analytics/AnalyticsSkeleton";
import { useListCounts } from "@/components/hooks/useListCounts";
import type { Top5Level } from "@/lib/analytics/types";

const TierBreakdownPanel = lazy(() => import("@/components/analytics/TierBreakdownPanel"));
const Top5Widget = lazy(() => import("@/components/analytics/Top5Widget"));

type Subcategory = {
  _id: string;
  name: string;
};

type Category = {
  _id: string;
  name: string;
  liveUrl?: string | null;
};

export default function SubcategoriesPage() {
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const categoryId = params.categoryId as string;
  const { dataMap } = useListCounts("subcategory", categoryId);

  const handleTop5Click = useCallback(
    (nodeId: string, level: Top5Level) => {
      if (level === "subcategory") {
        router.push(`/marketing/view-details/subcategories/${nodeId}/productcategories`);
      }
    },
    [router],
  );

  const [collapsed, setCollapsed] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [productCategoriesCount, setProductCategoriesCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  useEffect(() => {
    if (categoryId) {
      fetchData();
    }
  }, [categoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch subcategories and counts in parallel
      const [subcategoriesRes, countsRes] = await Promise.all([
        axiosInstance.get(`/marketing/categories/${categoryId}/subcategories`),
        axiosInstance.get(`/marketing/categories/${categoryId}/counts`),
      ]);
      
      // Response interceptor wraps the data
      const responseData = subcategoriesRes.data?.data || subcategoriesRes.data;
      const subData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
        ? responseData
        : [];
      setSubcategories(subData);
      if (responseData?.category) {
        setCategory(responseData.category);
      }

      // Get counts
      const countsData = countsRes.data?.data?.data || countsRes.data?.data || {};
      setProductCategoriesCount(countsData.productCategoriesCount ?? 0);
      setProductsCount(countsData.productsCount ?? 0);
    } catch (err) {
      setSubcategories([]);
      setProductCategoriesCount(0);
      setProductsCount(0);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`transition-all duration-300 ${
          collapsed ? "ml-20" : "ml-80"
        } min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100`}
      >
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <AnalyticsBreadcrumb
                segments={[
                  { label: "Categories", href: "/marketing/view-details" },
                  { label: category?.name || "Category" },
                ]}
              />
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 m-2">
                    Category :- {category?.name}
                  </h1>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200/60 p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-green-500 rounded-xl">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-green-700">
                            Total SubCategories
                          </p>
                          <p className="text-2xl font-bold text-green-900">
                            {subcategories.length}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200/60 p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-purple-500 rounded-xl">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-purple-700">
                            Total Product Categories
                          </p>
                          <p className="text-2xl font-bold text-purple-900">
                            {productCategoriesCount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 p-6 shadow-lg">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-xl">
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-blue-700">
                            Total Products
                          </p>
                          <p className="text-2xl font-bold text-blue-900">
                            {productsCount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    {category?.liveUrl ? (
                      <GoogleAnalyticsCard
                        pageUrl={`https://www.pepagora.com/c/${category.liveUrl}`}
                        pageType="category"
                      />
                    ) : (
                      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200/60 p-6 shadow-lg">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-orange-500 rounded-xl">
                            <svg
                              className="w-6 h-6 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                              />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-orange-700">Google Analytics</p>
                            <p className="text-sm text-orange-600 mt-1">No liveUrl configured for this category</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <AnalyticsErrorBoundary>
            <Suspense fallback={<SkeletonPanel />}>
              <TierBreakdownPanel
                nodeType="category"
                nodeId={categoryId}
                title={`Client & Product Breakdown — ${category?.name ?? ""}`}
              />
            </Suspense>
            <Suspense fallback={<SkeletonTop5 />}>
              <Top5Widget
                level="subcategory"
                parentId={categoryId}
                title="Top 5 SubCategories"
                onRowClick={handleTop5Click}
              />
            </Suspense>
          </AnalyticsErrorBoundary>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              {subcategories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No subcategories found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900 m-2 text-center underline">Sub Categories</h1>
                  {subcategories.map((subcategory) => {
                    const stats = dataMap.get(subcategory._id);
                    return (
                    <button
                      key={subcategory._id}
                      onClick={() =>
                        router.push(
                          `/marketing/view-details/subcategories/${subcategory._id}/productcategories`
                        )
                      }
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 hover:cursor-pointer transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                          {subcategory.name}
                        </span>
                        <div className="flex items-center gap-3">
                          {stats && (
                            <InlineTierPills
                              paid={stats.paidClients}
                              free={stats.freeClients}
                            />
                          )}
                        <svg
                          className="w-5 h-5 text-gray-400 group-hover:text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        </div>
                      </div>
                    </button>
                  );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
