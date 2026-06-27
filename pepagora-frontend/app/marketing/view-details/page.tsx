'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Sidebar from '@/components/Sidebar';
import axiosInstance from '../../../lib/axiosInstance';
import { useAuth } from '@/components/hooks/useAuth';
import { toast } from 'react-toastify';
import { HomeAnalyticsSection } from '@/components/analytics/HomeAnalyticsSection';

type Category = {
  _id: string;
  name: string;
};

function formatIndianNumber(n: number): string {
  return n.toLocaleString('en-IN');
}

function StatCard({
  label,
  value,
  iconBg,
  children,
}: {
  label: string;
  value: string;
  iconBg: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 min-w-[160px] flex-1">
      <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center mb-3`}>
        {children}
      </div>
      <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900 tabular-nums leading-tight">{value}</p>
    </div>
  );
}

export default function ViewDetailsPage() {
  const { loading: authLoading } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [subcategoriesCount, setSubcategoriesCount] = useState(0);
  const [productCategoriesCount, setProductCategoriesCount] = useState(0);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    if (!authLoading) {
      fetchCategories();
    }
  }, [authLoading]);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const [categoriesRes, countsRes] = await Promise.all([
        axiosInstance.get('/marketing/categories'),
        axiosInstance.get('/marketing/counts/all'),
      ]);

      const responseData = categoriesRes.data?.data || {};
      const categoryData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
          ? responseData
          : [];
      setCategories(categoryData);

      const countsData = countsRes.data?.data?.data || countsRes.data?.data || {};
      setSubcategoriesCount(countsData.subcategoriesCount ?? 0);
      setProductCategoriesCount(countsData.productCategoriesCount ?? 0);
      setProductsCount(countsData.productsCount ?? 0);
    } catch {
      setCategories([]);
      setSubcategoriesCount(0);
      setProductCategoriesCount(0);
      setProductsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
    toast.info('Grab a coffee!! I have a huge data to consolidate. I will let you know once report is available.', {
      position: 'top-right',
      autoClose: 5000,
    });

    setGeneratingReport(true);
    try {
      const response = await axiosInstance.get('/marketing/report/excel', {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'pepagora_hierarchy.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Report Generated', {
        position: 'top-right',
        autoClose: 3000,
      });
    } catch (err) {
      console.error('Error generating report:', err);
      toast.error('Failed to generate report');
    } finally {
      setGeneratingReport(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f6f8]">
        <div className="w-8 h-8 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
      </div>
    );
  }

  const docIcon = (
    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  return (
    <>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div
        className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'} min-h-screen bg-[#f5f6f8]`}
      >
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Categories</h1>

          <div className="flex flex-col xl:flex-row xl:items-stretch gap-4 mb-8">
            <div className="flex flex-wrap gap-3 flex-1">
              <StatCard label="Total Categories" value={String(categories.length)} iconBg="bg-green-500">
                {docIcon}
              </StatCard>
              <StatCard
                label="Total SubCategories"
                value={formatIndianNumber(subcategoriesCount)}
                iconBg="bg-yellow-500"
              >
                {docIcon}
              </StatCard>
              <StatCard
                label="Total Product Categories"
                value={formatIndianNumber(productCategoriesCount)}
                iconBg="bg-purple-500"
              >
                {docIcon}
              </StatCard>
              <StatCard
                label="Total Products"
                value={formatIndianNumber(productsCount)}
                iconBg="bg-blue-500"
              >
                {docIcon}
              </StatCard>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="shrink-0 self-start xl:self-auto xl:min-w-[200px] h-[52px] xl:h-auto xl:min-h-[120px] px-8 bg-[#E53935] hover:bg-[#D32F2F] text-white font-semibold text-base rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            >
              {generatingReport ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate Report'
              )}
            </button>
          </div>

          <HomeAnalyticsSection categories={categories} />
        </div>
      </div>
    </>
  );
}
