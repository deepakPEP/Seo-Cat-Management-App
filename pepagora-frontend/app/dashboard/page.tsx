'use client';

import { useEffect, useState } from 'react';
// import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { boolean } from 'zod';
import axiosInstance from '../../lib/axiosInstance';
import AddCategoryModal from '@/components/AddCategoryModal';
import AddSubcategoryModal from '@/components/AddSubcategoryModal';
import AddProductModal from '@/components/AddProductModal';

type Category = {
  _id: string;
  main_cat_name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  metaChildren?:string[];
};
type Subategory = {
  _id: string;
  sub_cat_name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  sub_cat_img_url?: string;
  mappedParent:string;
  metaChildren?:string[];
};
type Product = {
  _id: string;
  name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  mappedParent:string;
};

type Dprops = {
  name : string;
}

export default function Dashboard() {
  const [collapsed, setCollapsed] = useState(false);
  const [Loading,setLoading]=useState<boolean>(false)
  const [categories,setCategories]=useState<Category[]>([])
  const [subcategories,setSubcategories]=useState<Subategory[]>([])
  const [products,setProducts]=useState<Product[]>([])
  const [subCategoryCount, setSubCategoryCount] = useState<number>(0);
  const [productCount, setProductCount] = useState<number>(0);

  // Modal states
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  //   const logOut = () => {

  //     localStorage.removeItem('accessToken');
  //     window.location.href = '/login';
  //   }
  const [name, setName] = useState<string | null>(null);
  // const name = localStorage.getItem('userName');
   useEffect(() => {
    if (typeof window !== "undefined") {
      setName(localStorage.getItem("userName"));
    }
  }, []);

// useEffect(()=>{
// },[name])

const fetch = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/categories', {
       
      });  
      const data1 = Array.isArray(res.data.data.data) ? res.data.data.data : [];  
      // console.log(data1)
      setCategories(data1);
    } catch (err) {
      // console.error('Error fetching categories:', err);
      setCategories([]);
    
    } finally {
      setLoading(false);
    }
    try {
      const res = await axiosInstance.get('/subcategories', {
       
      });  
      const data2 = Array.isArray(res.data.data.data) ? res.data.data.data : [];  
      // console.log(data2)
      setSubcategories(data2);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setSubcategories([]);
    
    } finally {
      setLoading(false);
    }
    try {
      const res = await axiosInstance.get('/products', {
       
      });  
      const data3 = Array.isArray(res.data.data.data) ? res.data.data.data : [];  
      // console.log(data3)
      setProducts(data3);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setProducts([]);
    
    } finally {
      setLoading(false);
    }

       try {
  const res = await axiosInstance.get('/subcategories/count');

  // console.log("response", res.data.count);

  const count = res.data.data.count; // fallback to 0 if not present
  console.log("Subcategory Count:", count);

  setSubCategoryCount(count);
} catch (err) {
  console.error('Error fetching subcategory count:', err);
  setSubCategoryCount(0); // reset to 0 on error
} finally {
  setLoading(false);
}
   try {
  const res = await axiosInstance.get('/products/count');

  // console.log("response", res.data.count);

  const count = res.data.data.count; // fallback to 0 if not present
  console.log("Product Count:", count);

  setProductCount(count);
} catch (err) {
  console.error('Error fetching product count:', err);
  setProductCount(0); // reset to 0 on error
} finally {
  setLoading(false);
}
  };
  useEffect(()=>{
    fetch()
  },[])
  const categoriesCount = categories.length;
  const subCategoriesCount = subCategoryCount;
  const productsCount = productCount;
  return (
    <>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      <div className={`transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'} min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100`}>
        {/* Header */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">Welcome back, {name}!</p>
              </div>
              <div className="flex items-center space-x-4">
                <img src="/pepagora-logo-red.png" alt="Pepagora Logo" className="h-12 w-auto" />
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Categories Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Categories</p>
                    <p className="text-3xl font-bold text-gray-900">{categoriesCount}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Subcategories Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">Sub Categories</p>
                    <p className="text-3xl font-bold text-gray-900">{subCategoriesCount}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Active
                  </div>
                </div>
              </div>
            </div>

            {/* Products Card */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-shadow duration-300">
              <div className="p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-3xl font-bold text-gray-900">{productsCount}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm text-green-600">
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Active
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <button 
                onClick={() => setIsCategoryModalOpen(true)}
                className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Add Category</span>
              </button>
              
              <button 
                onClick={() => setIsSubcategoryModalOpen(true)}
                className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Add Subcategory</span>
              </button>
              
              <button 
                onClick={() => setIsProductModalOpen(true)}
                className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors duration-200"
              >
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Add Product</span>
              </button>
              
              <button className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors duration-200">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-sm font-medium text-gray-700">View Reports</span>
              </button>
            </div>
          </div>

          {/* Modal Components */}
          <AddCategoryModal 
            isOpen={isCategoryModalOpen} 
            onClose={() => setIsCategoryModalOpen(false)} 
            onSuccess={() => {
              fetch(); // Refresh data
              setIsCategoryModalOpen(false);
            }} 
          />
          
          <AddSubcategoryModal 
            isOpen={isSubcategoryModalOpen} 
            onClose={() => setIsSubcategoryModalOpen(false)} 
            onSuccess={() => {
              fetch(); // Refresh data
              setIsSubcategoryModalOpen(false);
            }} 
          />
          
          <AddProductModal 
            isOpen={isProductModalOpen} 
            onClose={() => setIsProductModalOpen(false)} 
            onSuccess={() => {
              fetch(); // Refresh data
              setIsProductModalOpen(false);
            }} 
          />
        </div>
      </div>
    </>
  );
}