'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import axiosInstance from '../../../../../../lib/axiosInstance';
import { useAuth } from '@/components/hooks/useAuth';

type ProductCategory = {
  _id: string;
  name: string;
};

type Subcategory = {
  _id: string;
  name: string;
};

type Category = {
  _id: string;
  name: string;
};

export default function ProductCategoriesPage() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const subcategoryId = params.subcategoryId as string;
  
  const [collapsed, setCollapsed] = useState(false);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && userRole !== 'marketing_team') {
      router.push('/dashboard');
    }
  }, [userRole, authLoading, router]);

  useEffect(() => {
    if (userRole === 'marketing_team' && subcategoryId) {
      fetchData();
    }
  }, [userRole, subcategoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const productCategoriesRes = await axiosInstance.get(`/marketing/subcategories/${subcategoryId}/productcategories`);
      // Response interceptor wraps the data
      const responseData = productCategoriesRes.data?.data || productCategoriesRes.data;
      const productCategoryData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
        ? responseData
        : [];
      setProductCategories(productCategoryData);

      if (responseData?.subcategory) {
        setSubcategory(responseData.subcategory);
      }
      if (responseData?.category) {
        setCategory(responseData.category);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setProductCategories([]);
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

  const path = category && subcategory ? `${category.name}/${subcategory.name}/` : '';

  return (
    <>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'} min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="py-6">
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <button onClick={() => router.push('/marketing/view-details')} className="hover:text-blue-600">
                  Categories
                </button>
                {category && (
                  <>
                    <span>/</span>
                    <button 
                      onClick={() => router.push(`/marketing/view-details/categories/${category._id}/subcategories`)} 
                      className="hover:text-blue-600"
                    >
                      {category.name}
                    </button>
                  </>
                )}
                {subcategory && (
                  <>
                    <span>/</span>
                    <span className="text-gray-900">{subcategory.name}</span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Product Categories</h1>
                  <p className="mt-1 text-sm text-gray-600">
                    {path && `Path: ${path}`} • {productCategories.length} product categories
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              {productCategories.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No product categories found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {productCategories.map((productCategory) => (
                    <button
                      key={productCategory._id}
                      onClick={() => router.push(`/marketing/view-details/productcategories/${productCategory._id}/products`)}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-medium text-gray-900 group-hover:text-blue-600">
                          {productCategory.name}
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

