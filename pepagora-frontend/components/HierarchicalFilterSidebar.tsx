'use client';

import { useState, useEffect, useRef } from 'react';
import axiosInstance from '@/lib/axiosInstance';
import { FiChevronDown, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';

type Category = {
  _id: string;
  name?: string;
  main_cat_name?: string;
  mappedChildren?: string[];
};

type Subcategory = {
  _id: string;
  name?: string;
  sub_cat_name?: string;
  imageUrl?: string;
  image?: string;
  mappedParent?: string;
  mappedChildren?: string[];
};

type ProductCategory = {
  _id: string;
  name?: string;
  mappedParent?: string;
};

type FilterSelection = {
  category: Category | null;
  subcategory: Subcategory | null;
  productCategory: ProductCategory | null;
};

type Props = {
  onFilterChange: (selection: any) => void;
  currentSelection: any;
};

export default function HierarchicalFilterSidebar({ onFilterChange, currentSelection }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subcategoryOpen, setSubcategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  
  const categoryRef = useRef<HTMLDivElement>(null);
  const subcategoryRef = useRef<HTMLDivElement>(null);
  const productRef = useRef<HTMLDivElement>(null);
  
  const [loading, setLoading] = useState({ categories: false, subcategories: false, products: false });

  // Fetch all categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch subcategories when category is selected
  useEffect(() => {
    if (currentSelection.category) {
      fetchSubcategories(currentSelection.category._id);
    } else {
      setSubcategories([]);
      setProductCategories([]);
    }
  }, [currentSelection.category]);

  // Fetch products when subcategory is selected
  useEffect(() => {
    if (currentSelection.subcategory) {
      fetchProductCategories(currentSelection.subcategory._id);
    } else {
      setProductCategories([]);
    }
  }, [currentSelection.subcategory]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setCategoryOpen(false);
      }
      if (subcategoryRef.current && !subcategoryRef.current.contains(event.target as Node)) {
        setSubcategoryOpen(false);
      }
      if (productRef.current && !productRef.current.contains(event.target as Node)) {
        setProductOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchCategories = async () => {
    setLoading(prev => ({ ...prev, categories: true }));
    try {
      const res = await axiosInstance.get('/categories', {
        params: { page: 1, limit: 1000 }
      });
      const data = res.data?.data?.data || [];
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(prev => ({ ...prev, categories: false }));
    }
  };

  const fetchSubcategories = async (categoryId: string) => {
    setLoading(prev => ({ ...prev, subcategories: true }));
    try {
      // Use marketing-style hierarchical endpoint
      const res = await axiosInstance.get(`/categories/${categoryId}/subcategories`);
      
      // The ResponseInterceptor wraps as: {success, timestamp, data: {statusCode, message, data: [...], category: {...}}}
      // So the actual subcategories array is at res.data.data.data
      const responseData = res.data?.data || res.data;
      const subcategoriesData = responseData?.data || responseData;
      
      setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Failed to load subcategories');
      setSubcategories([]);
    } finally {
      setLoading(prev => ({ ...prev, subcategories: false }));
    }
  };

  const fetchProductCategories = async (subcategoryId: string) => {
    setLoading(prev => ({ ...prev, products: true }));
    try {
      // Use marketing-style hierarchical endpoint
      const res = await axiosInstance.get(`/subcategories/${subcategoryId}/productcategories`);
      
      // Handle response with interceptor wrapping
      let data = [];
      if (res.data?.data?.data) {
        data = res.data.data.data; // Interceptor + controller wrapper
      } else if (Array.isArray(res.data?.data)) {
        data = res.data.data; // Interceptor wrapper only
      } else if (Array.isArray(res.data)) {
        data = res.data; // No wrapper
      }
      
      setProductCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching product categories:', error);
      toast.error('Failed to load product categories');
      setProductCategories([]);
    } finally {
      setLoading(prev => ({ ...prev, products: false }));
    }
  };

  const handleCategorySelect = (category: Category) => {
    onFilterChange({
      category,
      subcategory: null,
      productCategory: null
    });
  };

  const handleSubcategorySelect = (subcategory: Subcategory) => {
    onFilterChange({
      category: currentSelection.category,
      subcategory,
      productCategory: null
    });
  };

  const handleProductSelect = (product: ProductCategory) => {
    onFilterChange({
      category: currentSelection.category,
      subcategory: currentSelection.subcategory,
      productCategory: product
    });
  };

  const clearFilters = () => {
    onFilterChange({
      category: null,
      subcategory: null,
      productCategory: null
    });
    setSubcategories([]);
    setProductCategories([]);
  };

  const getName = (item: any) => {
    return item.name || item.main_cat_name || item.sub_cat_name || 'Unnamed';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-700">Filter by:</span>
        </div>

        <div className="flex items-center gap-3 flex-1 flex-wrap">
          {/* Category Dropdown */}
          <div className="relative" ref={categoryRef}>
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
            >
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
              <span>{currentSelection.category ? getName(currentSelection.category) : 'Select Category'}</span>
              <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${categoryOpen ? 'rotate-180' : ''}`} />
            </button>

            {categoryOpen && (
              <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-hidden flex flex-col">
                <div className="p-2 border-b border-gray-200 bg-gray-50">
                  <input
                    type="text"
                    placeholder="Search categories..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={() => {
                      // Add search logic if needed
                    }}
                  />
                </div>
                <div className="overflow-y-auto flex-1">
                  {loading.categories ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                      <p className="mt-2 text-sm">Loading...</p>
                    </div>
                  ) : categories.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">No categories found</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {categories.map((cat) => (
                        <button
                          key={cat._id}
                          onClick={() => {
                            handleCategorySelect(cat);
                            setCategoryOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors duration-150 ${
                            currentSelection.category?._id === cat._id
                              ? 'bg-blue-100 text-blue-900 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{getName(cat)}</span>
                            {cat.mappedChildren && cat.mappedChildren.length > 0 && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                {cat.mappedChildren.length}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Subcategory Dropdown */}
          {currentSelection.category && (
            <div className="relative" ref={subcategoryRef}>
              <button
                onClick={() => setSubcategoryOpen(!subcategoryOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
                <span>{currentSelection.subcategory ? getName(currentSelection.subcategory) : 'Select Subcategory'}</span>
                <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${subcategoryOpen ? 'rotate-180' : ''}`} />
              </button>

              {subcategoryOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {loading.subcategories ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                      <p className="mt-2 text-sm">Loading...</p>
                    </div>
                  ) : subcategories.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">No subcategories found</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {subcategories.map((sub) => (
                        <button
                          key={sub._id}
                          onClick={() => {
                            handleSubcategorySelect(sub);
                            setSubcategoryOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-green-50 transition-colors duration-150 ${
                            currentSelection.subcategory?._id === sub._id
                              ? 'bg-green-100 text-green-900 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm">{getName(sub)}</span>
                            {sub.mappedChildren && sub.mappedChildren.length > 0 && (
                              <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
                                {sub.mappedChildren.length}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Product Category Dropdown */}
          {currentSelection.subcategory && (
            <div className="relative" ref={productRef}>
              <button
                onClick={() => setProductOpen(!productOpen)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg text-sm font-medium text-gray-700 transition-colors duration-200"
              >
                <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>{currentSelection.productCategory ? getName(currentSelection.productCategory) : 'Select Product'}</span>
                <FiChevronDown className={`w-4 h-4 transition-transform duration-200 ${productOpen ? 'rotate-180' : ''}`} />
              </button>

              {productOpen && (
                <div className="absolute top-full left-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 max-h-96 overflow-y-auto">
                  {loading.products ? (
                    <div className="p-4 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                      <p className="mt-2 text-sm">Loading...</p>
                    </div>
                  ) : productCategories.length === 0 ? (
                    <p className="p-4 text-center text-gray-500 text-sm">No product categories found</p>
                  ) : (
                    <div className="divide-y divide-gray-100">
                      {productCategories.map((prod) => (
                        <button
                          key={prod._id}
                          onClick={() => {
                            handleProductSelect(prod);
                            setProductOpen(false);
                          }}
                          className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors duration-150 ${
                            currentSelection.productCategory?._id === prod._id
                              ? 'bg-purple-100 text-purple-900 font-medium'
                              : 'text-gray-700'
                          }`}
                        >
                          <span className="text-sm">{getName(prod)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Clear Filters Button */}
        {(currentSelection.category || currentSelection.subcategory || currentSelection.productCategory) && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-sm font-medium text-red-700 transition-colors duration-200"
          >
            <FiX className="w-4 h-4" />
            Clear All
          </button>
        )}
      </div>
    </div>
  );
}
