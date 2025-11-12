'use client';

import { useState, useEffect } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import { toast } from 'react-toastify';
import axiosInstance from '@/lib/axiosInstance';
import ReactTextEditor from '@/components/RichTextEditor';

interface Category {
  _id: string;
  main_cat_name: string;
}

interface Subcategory {
  _id: string;
  sub_cat_name: string;
  main_cat_id: string;
}

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddProductModal({ isOpen, onClose, onSuccess }: AddProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    subcategoryId: '',
    price: '',
    originalPrice: '',
    description: '',
    imageUrl: '',
    brand: '',
    availability: 'in_stock',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await axiosInstance.get('/categories');
      const categoryData = response.data?.data?.data || response.data?.data || [];
      setCategories(categoryData);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchSubcategories = async () => {
    try {
      const response = await axiosInstance.get('/subcategories');
      const subcategoryData = response.data?.data?.data || response.data?.data || [];
      setSubcategories(subcategoryData);
    } catch (error) {
      console.error('Error fetching subcategories:', error);
      toast.error('Failed to load subcategories');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchSubcategories();
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.categoryId) {
      const filtered = subcategories.filter(sub => sub.main_cat_id === formData.categoryId);
      setFilteredSubcategories(filtered);
      setFormData(prev => ({ ...prev, subcategoryId: '' })); // Reset subcategory when category changes
    } else {
      setFilteredSubcategories([]);
    }
  }, [formData.categoryId, subcategories]);

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      subcategoryId: '',
      price: '',
      originalPrice: '',
      description: '',
      imageUrl: '',
      brand: '',
      availability: 'in_stock',
      metaTitle: '',
      metaKeyword: '',
      metaDescription: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }
    if (!formData.subcategoryId) {
      toast.error('Please select a subcategory');
      return;
    }
    if (!formData.price) {
      toast.error('Price is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        product_name: formData.name,
        main_cat_id: formData.categoryId,
        sub_cat_id: formData.subcategoryId,
        price: parseFloat(formData.price),
        original_price: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        description: formData.description,
        imageUrl: formData.imageUrl,
        brand: formData.brand,
        availability: formData.availability,
        metaTitle: formData.metaTitle,
        metaKeyword: formData.metaKeyword,
        metaDescription: formData.metaDescription
      };

      const response = await axiosInstance.post('/products', payload);
      if (response.status === 201) {
        toast.success('Product created successfully!');
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-purple-100 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
              <LuPlus className="w-5 h-5 text-white" />
            </div>
            Add New Product
          </h2>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="overflow-y-auto p-6 flex-1">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Product Name *</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="Enter product name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Brand</label>
                  <input 
                    value={formData.brand} 
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="Enter brand name" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
                    disabled={categoriesLoading}
                  >
                    <option value="">
                      {categoriesLoading ? 'Loading categories...' : 'Select a category'}
                    </option>
                    {categories.map((category) => (
                      <option key={category._id} value={category._id}>
                        {category.main_cat_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Subcategory *</label>
                  <select
                    required
                    value={formData.subcategoryId}
                    onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
                    disabled={!formData.categoryId || filteredSubcategories.length === 0}
                  >
                    <option value="">
                      {!formData.categoryId 
                        ? 'Select category first' 
                        : filteredSubcategories.length === 0 
                        ? 'No subcategories available' 
                        : 'Select a subcategory'}
                    </option>
                    {filteredSubcategories.map((subcategory) => (
                      <option key={subcategory._id} value={subcategory._id}>
                        {subcategory.sub_cat_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Pricing & Availability</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Price *</label>
                  <input 
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price} 
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="0.00" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Original Price</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.originalPrice} 
                    onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="0.00" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Availability</label>
                  <select
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
                  >
                    <option value="in_stock">In Stock</option>
                    <option value="out_of_stock">Out of Stock</option>
                    <option value="limited_stock">Limited Stock</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Image URL</label>
                <input 
                  value={formData.imageUrl} 
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                  placeholder="https://example.com/product-image.jpg" 
                />
              </div>
            </div>

            {/* SEO Meta Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">SEO Meta Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Title</label>
                  <input 
                    value={formData.metaTitle} 
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })} 
                    placeholder="SEO-optimized title" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    maxLength={60}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                  <input 
                    value={formData.metaKeyword} 
                    onChange={(e) => setFormData({ ...formData, metaKeyword: e.target.value })} 
                    placeholder="keyword1, keyword2, keyword3" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                <textarea 
                  value={formData.metaDescription} 
                  onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })} 
                  placeholder="Product description for search engines" 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                  rows={2}
                  maxLength={160}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Product Description</h3>
              <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                <ReactTextEditor 
                  value={formData.description} 
                  onChange={(value) => setFormData({ ...formData, description: value })} 
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
              <button 
                type="button" 
                onClick={onClose} 
                className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
              >
                Cancel
              </button>
              
              <button 
                type="submit" 
                disabled={loading || categoriesLoading}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <LuPlus className="w-5 h-5" />
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
