'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import axiosInstance from '../../../lib/axiosInstance';
import { useAuth } from '@/components/hooks/useAuth';

type Category = {
  _id: string;
  name: string;
};

export default function ViewDetailsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
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
      
      // Response interceptor wraps: {success, timestamp, data: {statusCode, message, data: [categories]}}
      const responseData = categoriesRes.data?.data || {};
      const categoryData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
        ? responseData
        : [];
      setCategories(categoryData);

      // Get counts
      const countsData = countsRes.data?.data?.data || countsRes.data?.data || {};
      setSubcategoriesCount(countsData.subcategoriesCount ?? 0);
      setProductCategoriesCount(countsData.productCategoriesCount ?? 0);
      setProductsCount(countsData.productsCount ?? 0);
    } catch (err) {
      setCategories([]);
      setSubcategoriesCount(0);
      setProductCategoriesCount(0);
      setProductsCount(0);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async () => {
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
    } catch (err) {
      console.error('Error generating report:', err);
      alert('Failed to generate report');
    } finally {
      setGeneratingReport(false);
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
      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'} min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 m-2">Categories</h1>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200/60 p-6 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-500 rounded-xl">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-green-700">Total Categories</p>
                        <p className="text-2xl font-bold text-green-900">{categories.length}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-2xl border border-yellow-200/60 p-6 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-yellow-500 rounded-xl">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-yellow-700">Total SubCategories</p>
                        <p className="text-2xl font-bold text-yellow-900">{subcategoriesCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200/60 p-6 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-purple-500 rounded-xl">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-purple-700">Total Product Categories</p>
                        <p className="text-2xl font-bold text-purple-900">{productCategoriesCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 p-6 shadow-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-500 rounded-xl">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-blue-700">Total Products</p>
                        <p className="text-2xl font-bold text-blue-900">{productsCount.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="p-2 m-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {generatingReport ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 20 20">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Generate Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              {categories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No categories found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {categories.map((category) => (
                    <button
                      key={category._id}
                      onClick={() => router.push(`/marketing/view-details/categories/${category._id}/subcategories`)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                          {category.name}
                        </span>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

