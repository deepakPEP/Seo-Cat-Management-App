"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import axiosInstance from "../../../../../../lib/axiosInstance";
import { useAuth } from "@/components/hooks/useAuth";
import GoogleAnalyticsCard from "@/components/GoogleAnalyticsCard";

type Product = {
  _id: string;
  productName: string;
  liveUrl?: string;
};

type ProductCategory = {
  _id: string;
  name: string;
  liveUrl?: string | null;
};

type Subcategory = {
  _id: string;
  name: string;
};

type Category = {
  _id: string;
  name: string;
};

export default function ProductsPage() {
  const { userRole, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const productCategoryId = params.productCategoryId as string;

  const [collapsed, setCollapsed] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [productCategory, setProductCategory] =
    useState<ProductCategory | null>(null);
  const [subcategory, setSubcategory] = useState<Subcategory | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  useEffect(() => {
    if (productCategoryId) {
      fetchData();
    }
  }, [productCategoryId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const productsRes = await axiosInstance.get(
        `/marketing/productcategories/${productCategoryId}/products`
      );
      // Response interceptor wraps: {success, timestamp, data: {statusCode, message, data: [...], category: {...}, subcategory: {...}, productCategory: {...}}}
      const responseData = productsRes.data?.data || {};
      const actualData = responseData?.data || responseData;
      
      // Products array is in responseData.data
      const productData = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(actualData)
        ? actualData
        : [];
      setProducts(productData);

      // Category, subcategory, and productCategory are at the same level as data
      if (responseData?.productCategory) {
        setProductCategory(responseData.productCategory);
      }
      if (responseData?.subcategory) {
        setSubcategory(responseData.subcategory);
      }
      if (responseData?.category) {
        setCategory(responseData.category);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setProducts([]);
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

  const pathSegments = [
    category?.name,
    subcategory?.name,
    productCategory?.name,
  ].filter(Boolean) as string[];
  const path = pathSegments.length > 0 ? `${pathSegments.join("/")}/` : "";

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
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                <button
                  onClick={() => router.push("/marketing/view-details")}
                  className="hover:text-blue-600"
                >
                  Categories
                </button>
                {category && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() =>
                        router.push(
                          `/marketing/view-details/categories/${category._id}/subcategories`
                        )
                      }
                      className="hover:text-blue-600"
                    >
                      {category.name}
                    </button>
                  </>
                )}
                {subcategory && (
                  <>
                    <span>/</span>
                    <button
                      onClick={() =>
                        router.push(
                          `/marketing/view-details/subcategories/${subcategory._id}/productcategories`
                        )
                      }
                      className="hover:text-blue-600"
                    >
                      {subcategory.name}
                    </button>
                  </>
                )}
                {productCategory && (
                  <>
                    <span>/</span>
                    <span className="text-gray-900">
                      {productCategory.name}
                    </span>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 m-2">
                    Product Category :- {productCategory?.name}
                  </h1>
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
                          Total Products
                        </p>
                        <p className="text-2xl font-bold text-green-900">
                          {products.length}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4">
                    {productCategory?.liveUrl ? (
                      <GoogleAnalyticsCard
                        pageUrl={`https://www.pepagora.com/pc/${productCategory.liveUrl}`}
                        pageType="productcategory"
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
                            <p className="text-sm text-orange-600 mt-1">No liveUrl configured for this product category</p>
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

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            <div className="p-6">
              {products.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No products found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h1 className="text-2xl font-bold text-gray-900 m-2 text-center underline">Products</h1>
                  {products.map((product) => (
                    <div
                      key={product._id}
                      className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:bg-gray-50 hover:cursor-pointer transition-all duration-200"
                    >
                      {product.liveUrl ? (
                        <a 
                          href={`https://www.pepagora.com/en/p/${product.liveUrl}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-lg font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {product.productName}
                        </a>
                      ) : (
                        <span className="text-lg font-medium text-gray-900">
                          {product.productName}
                        </span>
                      )}
                    </div>
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
