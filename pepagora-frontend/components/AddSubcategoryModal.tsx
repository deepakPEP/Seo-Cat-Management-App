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

interface AddSubcategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubcategoryModal({ isOpen, onClose, onSuccess }: AddSubcategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    categoryId: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
    imageUrl: '',
    description: ''
  });
  const [categories, setCategories] = useState<Category[]>([]);
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

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      name: '',
      categoryId: '',
      metaTitle: '',
      metaKeyword: '',
      metaDescription: '',
      imageUrl: '',
      description: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Subcategory name is required');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Please select a category');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        sub_cat_name: formData.name,
        main_cat_id: formData.categoryId,
        metaTitle: formData.metaTitle,
        metaKeyword: formData.metaKeyword,
        metaDescription: formData.metaDescription,
        imageUrl: formData.imageUrl,
        description: formData.description
      };

      const response = await axiosInstance.post('/subcategories', payload);
      if (response.status === 201) {
        toast.success('Subcategory created successfully!');
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating subcategory:', error);
      toast.error(error.response?.data?.message || 'Failed to create subcategory');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <LuPlus className="w-5 h-5 text-white" />
            </div>
            Add New Subcategory
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
                  <label className="block text-sm font-medium text-slate-700">Subcategory Name *</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="Enter subcategory name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Parent Category *</label>
                  <select
                    required
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
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
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Image URL</label>
                <input 
                  value={formData.imageUrl} 
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                  placeholder="https://example.com/image.jpg" 
                />
              </div>
            </div>

            {/* SEO Meta Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">SEO Meta Information</h3>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Meta Title</label>
                <div className="relative">
                  <input 
                    value={formData.metaTitle} 
                    onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })} 
                    placeholder="SEO-optimized title (max 60 characters)" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    maxLength={60}
                  />
                  <div className="absolute right-3 top-3 text-xs text-slate-500">
                    {formData.metaTitle.length}/60
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                <input 
                  value={formData.metaKeyword} 
                  onChange={(e) => setFormData({ ...formData, metaKeyword: e.target.value })} 
                  placeholder="keyword1, keyword2, keyword3" 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                <div className="relative">
                  <textarea 
                    value={formData.metaDescription} 
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })} 
                    placeholder="Compelling description for search engines (150-160 characters)" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                    rows={3}
                    maxLength={160}
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                    {formData.metaDescription.length}/160
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Subcategory Description</h3>
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
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <LuPlus className="w-5 h-5" />
                {loading ? 'Creating...' : 'Create Subcategory'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}