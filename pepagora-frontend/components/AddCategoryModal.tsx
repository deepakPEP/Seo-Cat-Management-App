'use client';

import { useState } from 'react';
import { LuPlus, LuX } from 'react-icons/lu';
import { toast } from 'react-toastify';
import axiosInstance from '@/lib/axiosInstance';
import ReactTextEditor from '@/components/RichTextEditor';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCategoryModal({ isOpen, onClose, onSuccess }: AddCategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
    imageUrl: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      name: '',
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
      toast.error('Category name is required');
      return;
    }

    try {
      setLoading(true);
      const payload = {
        main_cat_name: formData.name,
        metaTitle: formData.metaTitle,
        metaKeyword: formData.metaKeyword,
        metaDescription: formData.metaDescription,
        imageUrl: formData.imageUrl,
        description: formData.description
      };

      const response = await axiosInstance.post('/categories', payload);
      if (response.status === 201) {
        toast.success('Category created successfully!');
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      console.error('Error creating category:', error);
      toast.error(error.response?.data?.message || 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleAIRewrite = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a category name first');
      return;
    }

    try {
      setAiLoading(true);
      // You can implement AI rewrite functionality here
      toast.info('AI rewrite feature coming soon!');
    } catch (error) {
      toast.error('AI rewrite failed');
    } finally {
      setAiLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-green-100 rounded-t-2xl">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
              <LuPlus className="w-5 h-5 text-white" />
            </div>
            Add New Category
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
                  <label className="block text-sm font-medium text-slate-700">Category Name *</label>
                  <input 
                    required 
                    value={formData.name} 
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="Enter category name" 
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Image URL</label>
                  <input 
                    value={formData.imageUrl} 
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                    placeholder="https://example.com/image.jpg" 
                  />
                </div>
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
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
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
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                />
                <p className="text-xs text-slate-500">Separate keywords with commas</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                <div className="relative">
                  <textarea 
                    value={formData.metaDescription} 
                    onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })} 
                    placeholder="Compelling description for search engines (150-160 characters)" 
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                    rows={3}
                    maxLength={160}
                  />
                  <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                    {formData.metaDescription.length}/160
                  </div>
                </div>
              </div>
            </div>

            {/* Category Description */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Category Description</h3>
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
                type="button"
                onClick={handleAIRewrite}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${aiLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                disabled={aiLoading}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {aiLoading ? 'Rewriting...' : '🤖 Rewrite All with AI'}
              </button>
              
              <button 
                type="submit" 
                disabled={loading}
                className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${loading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
              >
                <LuPlus className="w-5 h-5" />
                {loading ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}