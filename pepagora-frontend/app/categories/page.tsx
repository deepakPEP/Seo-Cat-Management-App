'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Sidebar from '@/components/Sidebar';
import { getPaginationRange } from '@/components/GetPage';
import axiosInstance from '../../lib/axiosInstance';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import { MdImageNotSupported } from 'react-icons/md';
import { TbEdit } from 'react-icons/tb';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { LuSave, LuPlus } from 'react-icons/lu';
import { motion, AnimatePresence } from 'framer-motion';
import ReactTextEditor from '@/components/RichTextEditor';
import { ListVideo } from 'lucide-react';

// ---- Types ----

type Category = {
  _id: string;
  name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  liveUrl?: string;
  metaChildren?: string[];
  description?: string;
};

type TokenPayload = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

// Helper to download AI response as response.txt
function downloadResponseTxt(content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'response.txt';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CategoriesPage() {
  // Sidebar collapse state for responsive layout
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ---- Data & Auth ----
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);

  // ---- Modal + Selection State ----
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // ---- Create form ----
  const [name, setName] = useState('');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaKeyword, setMetaKeyword] = useState('');
  const [metaDescription, setMetaDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [freeText, setFreeText] = useState('');


  // ---- Edit form ----
  const [editForm, setEditForm] = useState({
    name: '',
    metaTitle: '',
    metaKeyword: '',
    metaDescription: '',
    description: '',
    imageUrl: '',
    liveUrl: ''
  });
  // ---- AI Rewrite Loading State ----
  const [aiLoading, setAiLoading] = useState(false);
  const [aiLoadingCreate, setAiLoadingCreate] = useState(false);
  const [aiFieldLoading, setAiFieldLoading] = useState({ metaTitle: false, metaKeyword: false, metaDescription: false, description: false });
  const [aiFieldLoadingCreate, setAiFieldLoadingCreate] = useState({ metaTitle: false, metaKeyword: false, metaDescription: false, description: false });

  // ---- DeepSeek Full JSON Rewrite Handler (Edit) ----
  const handleAIRewriteEdit = async () => {
    if (!editForm.name) {
      toast.error('Please enter a category name first.');
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `USER: Create content for:\n- Page type: Category\n- Name: ${editForm.name}\n- URL: ${editForm.liveUrl}\n- Markets: INDIA/GCC COUNTRIES/AFRICA\n- Trust signals: https://www.pepagora.com/en/s/trust\n- Languages: {LANGS}\n\nData sources (use in priority order):\nKeywords: {KEYWORDS_JSON}\n\nOUTPUT (return VALID JSON):\n{\n  "keywords": { "head": ["..."], "long_tail": ["..."], "variants": ["..."] },\n  "by_lang": {\n    "<lang>": {\n      "intro_html": "<h1>{PAGE_NAME}</h1><p>120-180 words covering what it is, key use-cases, core specs. Weave 2-3 head terms + long-tails naturally.</p>",\n      "faqs": [{"question": "?", "answer_html": "<p>2-3 sentences</p>"}], // 5-8 items\n      "llm_text": "50-70 words factual summary",\n      "meta": {"title": "≤60 chars", "description": "150-160 chars"},\n      "schema": {"faqpage_jsonld": {...}, "breadcrumb_jsonld": {...}, "itemlist_or_product_jsonld": {...}},\n      "links_html": "<nav aria-label=\"Related\">...</nav>"\n    }\n  }\n}\n\nRULES: Prefer supplied data. Weave keywords naturally. Clean HTML. Vendor-neutral. One H1 only.`;
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert B2B content strategist for Pepagora.com. Create SEO + LLM-optimized content for a Category / subcategory / product category page. Write concise, factual, globally readable copy. Use supplied data first; only generalize with industry knowledge if data is missing. Avoid unverified claims.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048
        },
        {
          headers: {
            'Authorization': `Bearer sk-25f236c2be3a42d49914b903ff908670`,
            'Content-Type': 'application/json'
          }
        }
      );
      const aiText = response.data.choices?.[0]?.message?.content || '';
      if (aiText) {
        downloadResponseTxt(aiText);
        try {
          const json = JSON.parse(aiText);
          // Fill fields from JSON
          setEditForm(prev => ({
            ...prev,
            metaTitle: json.by_lang?.['<lang>']?.meta?.title || prev.metaTitle,
            metaKeyword: (json.keywords?.head || []).join(', '),
            metaDescription: json.by_lang?.['<lang>']?.meta?.description || prev.metaDescription,
            description: json.by_lang?.['<lang>']?.intro_html || prev.description
          }));
          toast.success('Fields rewritten with AI!');
        } catch (e) {
          toast.error('AI response is not valid JSON.');
        }
      }
    } catch (err) {
      toast.error('AI rewrite failed.');
      console.error('AI error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- DeepSeek Full JSON Rewrite Handler (Add) ----
  const handleAIRewriteCreate = async () => {
    if (!name) {
      toast.error('Please enter a category name first.');
      return;
    }
    setAiLoadingCreate(true);
    try {
      const prompt = `USER: Create content for:\n- Page type: Category\n- Name: ${name}\n- URL: ${imageUrl || ''}\n- Markets: INDIA/GCC COUNTRIES/AFRICA\n- Trust signals: https://www.pepagora.com/en/s/trust\n- Languages: {LANGS}\n\nData sources (use in priority order):\nKeywords: {KEYWORDS_JSON}\n\nOUTPUT (return VALID JSON):\n{\n  "keywords": { "head": ["..."], "long_tail": ["..."], "variants": ["..."] },\n  "by_lang": {\n    "<lang>": {\n      "intro_html": "<h1>{PAGE_NAME}</h1><p>120-180 words covering what it is, key use-cases, core specs. Weave 2-3 head terms + long-tails naturally.</p>",\n      "faqs": [{"question": "?", "answer_html": "<p>2-3 sentences</p>"}], // 5-8 items\n      "llm_text": "50-70 words factual summary",\n      "meta": {"title": "≤60 chars", "description": "150-160 chars"},\n      "schema": {"faqpage_jsonld": {...}, "breadcrumb_jsonld": {...}, "itemlist_or_product_jsonld": {...}},\n      "links_html": "<nav aria-label=\"Related\">...</nav>"\n    }\n  }\n}\n\nRULES: Prefer supplied data. Weave keywords naturally. Clean HTML. Vendor-neutral. One H1 only.`;
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert B2B content strategist for Pepagora.com. Create SEO + LLM-optimized content for a Category / subcategory / product category page. Write concise, factual, globally readable copy. Use supplied data first; only generalize with industry knowledge if data is missing. Avoid unverified claims.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048
        },
        {
          headers: {
            'Authorization': `Bearer sk-25f236c2be3a42d49914b903ff908670`,
            'Content-Type': 'application/json'
          }
        }
      );
      const aiText = response.data.choices?.[0]?.message?.content || '';
      if (aiText) {
        downloadResponseTxt(aiText);
        try {
          const json = JSON.parse(aiText);
          setMetaTitle(json.by_lang?.['<lang>']?.meta?.title || metaTitle);
          setMetaKeyword((json.keywords?.head || []).join(', '));
          setMetaDescription(json.by_lang?.['<lang>']?.meta?.description || metaDescription);
          setFreeText(json.by_lang?.['<lang>']?.intro_html || freeText);
          toast.success('Fields rewritten with AI!');
        } catch (e) {
          toast.error('AI response is not valid JSON.');
        }
      }
    } catch (err) {
      toast.error('AI rewrite failed.');
      console.error('AI error:', err);
    } finally {
      setAiLoadingCreate(false);
    }
  };
  // ---- AI Rewrite Handler for Edit ----
  const handleAIRewrite = async () => {
    if (!editForm.name) {
      toast.error('Please enter a category name first.');
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `Rewrite the following category details for SEO.\nCategory Name: ${editForm.name}\nGenerate:\n- Meta Title\n- Meta Keywords\n- Meta Description\n- Description (short paragraph)`;
      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert SEO content writer.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512
        },
        {
          headers: {
            'Authorization': `Bearer sk-25f236c2be3a42d49914b903ff908670`,
            'Content-Type': 'application/json'
          }
        }
      );
      const aiText = response.data.choices?.[0]?.message?.content || '';
      const metaTitleMatch = aiText.match(/Meta Title\s*[:\-]?\s*(.*)/i);
      const metaKeywordMatch = aiText.match(/Meta Keywords?\s*[:\-]?\s*(.*)/i);
      const metaDescriptionMatch = aiText.match(/Meta Description\s*[:\-]?\s*(.*)/i);
      const descriptionMatch = aiText.match(/Description\s*[:\-]?\s*([\s\S]*)/i);
      setEditForm((prev) => ({
        ...prev,
        metaTitle: metaTitleMatch ? metaTitleMatch[1].trim() : prev.metaTitle,
        metaKeyword: metaKeywordMatch ? metaKeywordMatch[1].trim() : prev.metaKeyword,
        metaDescription: metaDescriptionMatch ? metaDescriptionMatch[1].trim() : prev.metaDescription,
        description: descriptionMatch ? descriptionMatch[1].trim() : prev.description
      }));
      toast.success('Fields rewritten with AI!');
    } catch (err) {
      toast.error('AI rewrite failed.');
      console.error('AI error:', err);
    } finally {
      setAiLoading(false);
    }
  };

  // ---- Pagination ----
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(10);

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const decoded: TokenPayload = jwtDecode(token);
          setUserRole(decoded.role);
        } catch (error) {
          console.error("Invalid token", error);
        }
      }
    }
  }, []);


  useEffect(() => {
    fetchCategories(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  // ---- API calls ----
  const fetchCategories = async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/categories', {
        params: { page: currentPage, limit },
      });
      const data = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      setCategories(data);
      console.log(data);
      setTotalPages(res.data.data.pagination.totalPages || 1);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setCategories([]);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate meta data for all categories missing meta info
  const generateMissingMeta = async () => {
    const categoriesNeedingMeta = categories.filter(c => 
      !c.metaTitle || !c.metaKeyword || !c.metaDescription
    );

    if (categoriesNeedingMeta.length === 0) {
      toast.info('All categories already have meta data!');
      return;
    }

    const confirmed = window.confirm(
      `Generate meta data for ${categoriesNeedingMeta.length} categories? This will use AI to create SEO-optimized content.`
    );

    if (!confirmed) return;

    toast.info(`Starting bulk meta generation for ${categoriesNeedingMeta.length} categories...`);

    let successCount = 0;
    let errorCount = 0;

    for (const category of categoriesNeedingMeta) {
      try {
        await generateMetaForCategory(category);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        console.error(`Failed to generate meta for ${category.name}:`, error);
      }
    }

    toast.success(`✅ Generated meta data for ${successCount} categories. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
    fetchCategories(page); // Refresh the data
  };

  // Generate meta data for a specific category
  const generateMetaForCategory = async (category: Category) => {
    try {
      const prompt = `Generate SEO meta data for this category:
      Name: ${category.name}
      ${category.liveUrl ? `Live URL: ${category.liveUrl}` : ''}
      ${category.metaChildren ? `Has ${category.metaChildren.length} subcategories` : ''}
      
      Please provide:
      1. Meta Title (max 60 characters)
      2. Meta Keywords (5-8 relevant keywords, comma-separated)
      3. Meta Description (150-160 characters)
      
      Format your response as:
      Meta Title: [title]
      Meta Keywords: [keywords]
      Meta Description: [description]`;

      const response = await axios.post(
        'https://api.deepseek.com/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert SEO content writer. Create compelling, search-optimized meta content for e-commerce categories.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512
        },
        {
          headers: {
            'Authorization': 'Bearer sk-25f236c2be3a42d49914b903ff908670',
            'Content-Type': 'application/json'
          }
        }
      );

      const aiText = response.data.choices?.[0]?.message?.content || '';
      
      if (aiText) {
        // Parse the AI response
        const metaTitleMatch = aiText.match(/Meta Title:\s*(.+)/i);
        const metaKeywordMatch = aiText.match(/Meta Keywords:\s*(.+)/i);
        const metaDescriptionMatch = aiText.match(/Meta Description:\s*(.+)/i);

        const updatedData: any = { main_cat_name: category.name };
        if (metaTitleMatch) updatedData.metaTitle = metaTitleMatch[1].trim();
        if (metaKeywordMatch) updatedData.metaKeyword = metaKeywordMatch[1].trim();
        if (metaDescriptionMatch) updatedData.metaDescription = metaDescriptionMatch[1].trim();

        // Update the category with generated meta data
        await axiosInstance.put(`/categories/${category._id}`, updatedData);

        toast.success(`Meta data generated for ${category.name}!`);
        fetchCategories(page); // Refresh the data
      }
    } catch (error) {
      toast.error('Failed to generate meta data');
      console.error('Meta generation error:', error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await axiosInstance.delete(`/categories/${id}`);
      if (res.status === 200) {
        toast.success('Category deleted successfully!');
      }
      if (categories.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        fetchCategories(page);
      }
    } catch (err) {
      toast.error('Failed to delete category');
      console.error('Delete failed:', err);
    }
  };

  const openEdit = (cat: Category) => {
    setSelectedCategory(cat);
    setEditForm({
      name: cat.name,
      metaTitle: cat.metaTitle || '',
      metaKeyword: cat.metaKeyword || '',
      metaDescription: cat.metaDescription || '',
      description: cat.description || '',
      imageUrl: cat.imageUrl || '',
      liveUrl: cat.liveUrl || ''
    });
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!selectedCategory) return;
    try {
      const payload = {
        main_cat_name: editForm.name, // Fixed: Use main_cat_name instead of name for backend compatibility
        metaTitle: editForm.metaTitle,
        metaDescription: editForm.metaDescription,
        metaKeyword: editForm.metaKeyword,
        description: editForm.description,
        imageUrl: editForm.imageUrl || '', // Include imageUrl if available
      };
      const res = await axiosInstance.put(`/categories/${selectedCategory._id}`, payload);
      if (res.status === 200) {
        toast.success(`Category ${editForm.name} updated successfully!`);
        setShowEditModal(false);
        setSelectedCategory(null);
        fetchCategories(page);
      } else {
        toast.error('Failed to update category');
      }
    } catch (err) {
      toast.error('Failed to update category');
      console.error('Update failed:', err);
    }
  };

  const resetCreateForm = () => {
    setName('');
    setMetaTitle('');
    setMetaKeyword('');
    setMetaDescription('');
    setImageUrl('');
    setFreeText(''); // Added missing freeText reset
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        main_cat_name: name, // Fixed: backend expects main_cat_name not name
        metaTitle,
        metaDescription,
        metaKeyword,
        imageUrl,
        description: freeText
      };
      const res = await axiosInstance.post('/categories', payload);
      if (res.status === 201) {
        toast.success('Category created successfully!');
        setShowCreateModal(false);
        resetCreateForm();
        fetchCategories(page);
      } else {
        toast.error('Failed to create category');
      }
    } catch (err) {
      console.error('Failed to create category', err);
      toast.error('Failed to create category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isManagerViewOnly = useMemo(() => userRole === 'pepagora_manager', [userRole]);

  // ---- UI helpers ----
  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-2xl border bg-white shadow-sm p-4 min-w-[140px]">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-800">{value}</p>
    </div>
  );

  const HeaderBar = (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Categories</h1>
        <p className="text-gray-500 text-sm">Create, edit and manage your product categories.</p>
      </div>
      <div className="flex gap-2">
        {!isManagerViewOnly && (
          <>
            <button
              onClick={generateMissingMeta}
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-white shadow-sm hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
              disabled={loading}
            >
              🤖 Generate Missing Meta
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <LuPlus className="text-lg" />
              Add Category
            </button>
          </>
        )}
      </div>
    </div>
  );

  const SkeletonRow = () => (
    <tr className="animate-pulse">
      <td className="p-3">
        <div className="h-12 w-12 rounded-lg bg-gray-200" />
      </td>
      {[...Array(4)].map((_, i) => (
        <td key={i} className="p-3">
          <div className="h-4 w-48 rounded bg-gray-200" />
        </td>
      ))}
      {!isManagerViewOnly && (
        <td className="p-3">
          <div className="h-8 w-32 rounded bg-gray-200" />
        </td>
      )}
    </tr>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-green-50/30 to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'} p-6 md:p-8`}>
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Enhanced Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Categories</h1>
                    <p className="text-slate-600 font-medium">Organize and manage your product categories</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isManagerViewOnly && (
                  <>
                    <button
                      onClick={generateMissingMeta}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-green-500/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      🤖 Generate Missing Meta
                    </button>
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-105"
                    >
                      <LuPlus className="w-5 h-5" />
                      Add Category
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
            
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Current Page</p>
                  <p className="text-2xl font-bold text-blue-900">{page} of {totalPages}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-purple-700">With Meta Data</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {categories.filter(c => c.metaTitle && c.metaDescription).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Categories Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Category</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Title</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Keywords</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Description</th>
                    {!isManagerViewOnly && <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading && (
                    <>
                      {Array.from({ length: 6 }).map((_, idx) => (
                        <SkeletonRow key={idx} />
                      ))}
                    </>
                  )}

                  {!loading && categories.length === 0 && (
                    <tr>
                      <td colSpan={isManagerViewOnly ? 5 : 6} className="px-6 py-12 text-center">
                        <div className="text-slate-500">
                          <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                          </svg>
                          <p className="text-lg font-medium">No categories found</p>
                          <p className="text-sm">Get started by creating your first category.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    categories.map((cat, index) => (
                      <tr
                        key={cat._id}
                        className="hover:bg-slate-50/80 transition-colors duration-200"
                      >
                        {/* Image */}
                        <td className="px-6 py-4">
                          <div className="flex-shrink-0">
                            {cat.imageUrl ? (
                              <a href={cat.imageUrl} target="_blank" rel="noopener noreferrer">
                                <img
                                  src={cat.imageUrl}
                                  alt={cat.name}
                                  className="h-14 w-14 rounded-xl object-cover border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
                                />
                              </a>
                            ) : (
                              <div className="h-14 w-14 bg-gradient-to-br from-slate-200 to-slate-300 rounded-xl flex items-center justify-center">
                                <MdImageNotSupported className="h-8 w-8 text-slate-500" />
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-900 text-base">{cat.name}</div>
                            {cat.metaChildren && cat.metaChildren.length > 0 && (
                              <div className="text-sm text-slate-500 mt-1">
                                {cat.metaChildren.length} subcategories
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Meta Title - Enhanced */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-20 overflow-y-auto hover:bg-blue-100 transition-colors duration-200">
                            <p className="text-sm text-blue-900 font-medium break-words">
                              {cat.metaTitle || (
                                <span className="text-slate-400 italic">No meta title</span>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Meta Keywords - Enhanced */}
                        <td className="px-6 py-4 max-w-xs">
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-h-20 overflow-y-auto hover:bg-purple-100 transition-colors duration-200">
                            <p className="text-sm text-purple-900 break-words">
                              {cat.metaKeyword || (
                                <span className="text-slate-400 italic">No meta keywords</span>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Meta Description - Enhanced */}
                        <td className="px-6 py-4 max-w-sm">
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-20 overflow-y-auto hover:bg-green-100 transition-colors duration-200">
                            <p className="text-sm text-green-900 break-words">
                              {cat.metaDescription || (
                                <span className="text-slate-400 italic">No meta description</span>
                              )}
                            </p>
                          </div>
                        </td>

                        {/* Actions - Enhanced */}
                        {!isManagerViewOnly && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => openEdit(cat)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:scale-105"
                              >
                                <TbEdit className="w-4 h-4" />
                                Edit
                              </button>
                              
                              {(!cat.metaTitle || !cat.metaKeyword || !cat.metaDescription) && (
                                <button
                                  onClick={() => generateMetaForCategory(cat)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:scale-105"
                                >
                                  🤖 Meta
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setSelectedCategory(cat);
                                  setShowDeleteModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm transition-all duration-200 hover:scale-105"
                              >
                                <RiDeleteBin6Line className="w-4 h-4" />
                                Delete
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {/* Footer / Pagination */}
            <div className="flex items-center justify-between gap-3 border-t bg-white p-3 flex-wrap">
              <p className="text-sm text-gray-600">Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => page > 1 && setPage(page - 1)}
                  disabled={page === 1}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                {getPaginationRange(page, totalPages, 1).map((p: number | string, idx: number) =>
                  p === '...' ? (
                    <span key={idx} className="px-2 text-gray-500">…</span>
                  ) : (
                    <button
                      key={idx}
                      onClick={() => setPage(Number(p))}
                      className={`rounded-lg border px-3 py-1.5 text-sm ${p === page ? 'bg-blue-600 text-white' : ''}`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  onClick={() => page < totalPages && setPage(page + 1)}
                  disabled={page === totalPages}
                  className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---- Modals ---- */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-green-50 to-green-100 rounded-t-2xl">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-green-600 rounded-lg">
                    <LuPlus className="w-5 h-5 text-white" />
                  </div>
                  Add New Category
                </h2>
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto p-6 flex-1">
                <form onSubmit={handleCreate} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Category Name *</label>
                        <input 
                          required 
                          value={name} 
                          onChange={(e) => setName(e.target.value)} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          placeholder="Enter category name" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Image URL</label>
                        <input 
                          value={imageUrl} 
                          onChange={(e) => setImageUrl(e.target.value)} 
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
                          value={metaTitle} 
                          onChange={(e) => setMetaTitle(e.target.value)} 
                          placeholder="SEO-optimized title (max 60 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          maxLength={60}
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-500">
                          {metaTitle.length}/60
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                      <input 
                        value={metaKeyword} 
                        onChange={(e) => setMetaKeyword(e.target.value)} 
                        placeholder="keyword1, keyword2, keyword3" 
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                      />
                      <p className="text-xs text-slate-500">Separate keywords with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                      <div className="relative">
                        <textarea 
                          value={metaDescription} 
                          onChange={(e) => setMetaDescription(e.target.value)} 
                          placeholder="Compelling description for search engines (150-160 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                          rows={3}
                          maxLength={160}
                        />
                        <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                          {metaDescription.length}/160
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Category Description</h3>
                    <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <ReactTextEditor value={freeText} onChange={setFreeText} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateModal(false)} 
                      className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleAIRewriteCreate}
                      className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${aiLoadingCreate ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                      disabled={aiLoadingCreate}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {aiLoadingCreate ? 'Rewriting...' : '🤖 Rewrite All with AI'}
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
        )}

        {showEditModal && selectedCategory && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col mx-4">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-2xl">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <TbEdit className="w-5 h-5 text-white" />
                  </div>
                  Edit Category
                </h2>
                <button 
                  onClick={() => setShowEditModal(false)} 
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto p-6 flex-1">
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Category Name *</label>
                        <input 
                          required 
                          value={editForm.name} 
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          placeholder="Enter category name" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Image URL</label>
                        <input 
                          value={editForm.imageUrl} 
                          onChange={(e) => setEditForm({ ...editForm, imageUrl: e.target.value })} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
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
                          value={editForm.metaTitle} 
                          onChange={(e) => setEditForm({ ...editForm, metaTitle: e.target.value })} 
                          placeholder="SEO-optimized title (max 60 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          maxLength={60}
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-500">
                          {editForm.metaTitle.length}/60
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                      <input 
                        value={editForm.metaKeyword} 
                        onChange={(e) => setEditForm({ ...editForm, metaKeyword: e.target.value })} 
                        placeholder="keyword1, keyword2, keyword3" 
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                      />
                      <p className="text-xs text-slate-500">Separate keywords with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                      <div className="relative">
                        <textarea 
                          value={editForm.metaDescription} 
                          onChange={(e) => setEditForm({ ...editForm, metaDescription: e.target.value })} 
                          placeholder="Compelling description for search engines (150-160 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                          rows={3}
                          maxLength={160}
                        />
                        <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                          {editForm.metaDescription.length}/160
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Category Description</h3>
                    <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <ReactTextEditor value={editForm.description} onChange={(v) => setEditForm({ ...editForm, description: v })} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setShowEditModal(false)} 
                      className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleAIRewriteEdit}
                      className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${aiLoading ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                      disabled={aiLoading}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      {aiLoading ? 'Rewriting...' : '🤖 Rewrite All with AI'}
                    </button>
                    
                    <button 
                      onClick={saveEdit} 
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 hover:scale-105"
                    >
                      <LuSave className="w-5 h-5" />
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {showDeleteModal && selectedCategory && (
          <Modal onClose={() => setShowDeleteModal(false)} title="Confirm Deletion">
            <p className="text-gray-600">Are you sure you want to delete <span className="font-medium text-gray-900">{selectedCategory.name}</span>? This action cannot be undone.</p>
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowDeleteModal(false)} className="rounded-lg border px-4 py-2">Cancel</button>
              <button
                onClick={async () => {
                  await handleDelete(selectedCategory._id);
                  setShowDeleteModal(false);
                  setSelectedCategory(null);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-white hover:bg-rose-700"
              >
                <RiDeleteBin6Line /> Delete
              </button>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Reusable UI bits ----

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative z-[101] w-full max-w-2xl rounded-2xl border bg-white shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100">✕</button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </motion.div>
    </motion.div>
  );
}


function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-700">{label}{required && <span className="text-rose-600"> *</span>}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
        type="text"
      />
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-gray-700">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full resize-y rounded-xl border px-3 py-2 outline-none focus:ring-2 focus:ring-blue-400"
      />
    </label>
  );
}