'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getPaginationRange } from '@/components/GetPage';
import axiosInstance from '../../lib/axiosInstance';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';

import { MdImageNotSupported } from 'react-icons/md';
import { TbEdit } from 'react-icons/tb';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { LuSave, LuPlus } from 'react-icons/lu';
import { AnimatePresence, motion } from 'framer-motion';
import ReactTextEditor from '@/components/RichTextEditor';

type Subcategory = {
  _id: string;
  name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  mappedParent: string; 
  sub_cat_img_url?: string;
  mappedChildren?: string[];
  uniqueId?: string;
  liveUrl?: string;
  marketSize?: string;
  annualGrowth?: string;
  averageMargin?: string;
  description?: string;
  seoContent?: {
    keywords?: {
      head?: string[];
      long_tail?: string[];
      variants?: string[];
    };
    by_lang?: {
      [key: string]: {
        intro_html?: string;
        faqs?: Array<{
          question?: string;
          answer_html?: string;
        }>;
        llm_text?: string;
        meta?: {
          title?: string;
          description?: string;
        };
        schema?: any;
        links_html?: string;
      };
    };
  };
};
type Category = {
  _id: string;
  main_cat_name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  main_cat_image?: string;
};

type TokenPayload = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

export default function SubcategoriesPage() {
  // Sidebar collapse state for responsive layout
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // DeepSeek API integration
  const DEEPSEEK_API_KEY = 'sk-25f236c2be3a42d49914b903ff908670';
  const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

  // AI loading states
  const [aiLoading, setAiLoading] = useState({
    metaTitle: false,
    metaKeyword: false,
    metaDescription: false,
    description: false,
  });

  // Helper to download response.txt
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

  // Helper to call DeepSeek API for full JSON and fill all fields
  async function rewriteAllWithAI(isEdit: boolean = false) {
    const name = isEdit ? formName : formName;
    if (!name) {
      toast.error('Please enter a subcategory name first.');
      return;
    }
    setAiLoading({ metaTitle: true, metaKeyword: true, metaDescription: true, description: true });
    try {
      const prompt = `USER: Create content for:\n- Page type: Subcategory\n- Name: ${name}\n- Markets: INDIA/GCC COUNTRIES/AFRICA\n- Trust signals: https://www.pepagora.com/en/s/trust\n- Languages: {LANGS}\n\nData sources (use in priority order):\nKeywords: {KEYWORDS_JSON}\n\nOUTPUT (return VALID JSON):\n{\n  "keywords": { "head": ["..."], "long_tail": ["..."], "variants": ["..."] },\n  "by_lang": {\n    "<lang>": {\n      "intro_html": "<h1>{PAGE_NAME}</h1><p>120-180 words covering what it is, key use-cases, core specs. Weave 2-3 head terms + long-tails naturally.</p>",\n      "faqs": [{"question": "?", "answer_html": "<p>2-3 sentences</p>"}], // 5-8 items\n      "llm_text": "50-70 words factual summary",\n      "meta": {"title": "≤60 chars", "description": "150-160 chars"},\n      "schema": {"faqpage_jsonld": {...}, "breadcrumb_jsonld": {...}, "itemlist_or_product_jsonld": {...}},\n      "links_html": "<nav aria-label=\"Related\">...</nav>"\n    }\n  }\n}\n\nRULES: Prefer supplied data. Weave keywords naturally. Clean HTML. Vendor-neutral. One H1 only.`;
      const res = await fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert B2B content strategist for Pepagora.com. Create SEO + LLM-optimized content for a Subcategory page. Write concise, factual, globally readable copy. Use supplied data first; only generalize with industry knowledge if data is missing. Avoid unverified claims.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2048
        }),
      });
      const data = await res.json();
      const aiText = data.choices?.[0]?.message?.content?.trim() || '';
      if (aiText) {
        downloadResponseTxt(aiText);
        try {
          const json = JSON.parse(aiText);
          setFormMetaTitle(json.by_lang?.['<lang>']?.meta?.title || '');
          setFormMetaKeyword((json.keywords?.head || []).join(', '));
          setFormMetaDescription(json.by_lang?.['<lang>']?.meta?.description || '');
          setFormDescription(json.by_lang?.['<lang>']?.intro_html || '');
          toast.success('Fields rewritten with AI!');
        } catch (e) {
          toast.error('AI response is not valid JSON.');
        }
      } else {
        toast.error('AI did not return a result');
      }
    } catch (err) {
      toast.error('AI rewrite failed');
    } finally {
      setAiLoading({ metaTitle: false, metaKeyword: false, metaDescription: false, description: false });
    }
  }
  const router = useRouter();

  // --- data
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // --- pagination & search
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [goToPageInput, setGoToPageInput] = useState<string>('');

  // --- auth/role
  const [userRole, setUserRole] = useState<string | null>(null);
  const isManagerViewOnly = useMemo(() => userRole === 'pepagora_manager', [userRole]);

  // --- modals & editing
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // --- form states
  const [formName, setFormName] = useState('');
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaKeyword, setFormMetaKeyword] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [mappedParent, setMappedParent] = useState<string | null>(null);
  const [formDescription, setFormDescription] = useState('');
  const [formLiveUrl, setFormLiveUrl] = useState('');
  const [formMarketSize, setFormMarketSize] = useState('');
  const [formAnnualGrowth, setFormAnnualGrowth] = useState('');
  const [formAverageMargin, setFormAverageMargin] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);

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


  // fetch sub
  // categories
  const fetchSubcategories = async (pageToFetch = page) => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/subcategories', {
        params: { page: pageToFetch, limit, search: searchQuery || undefined },
      });
      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      console.log(items)
      const pagination = res.data.data.pagination || {};
      setSubcategories(items);
      setTotalPages(pagination.totalPages || 1);
      setTotalItems(pagination.totalItems || items.length || 0);
    } catch (err) {
      console.error(err);
      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('/categories');
      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      setCategories(items);
    } catch (err) {
      console.error(err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchSubcategories(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery]);

  // Create
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axiosInstance.post('/subcategories', {
        name: formName,
        metaTitle: formMetaTitle,
        metaKeyword: formMetaKeyword,
        metaDescription: formMetaDescription,
        sub_cat_img_url: formImageUrl,
        mappedParent: mappedParent,
        description: formDescription,
        liveUrl: formLiveUrl,
        marketSize: formMarketSize,
        annualGrowth: formAnnualGrowth,
        averageMargin: formAverageMargin,
      });
      toast.success('Subcategory created');
      setShowAddModal(false);
      fetchSubcategories(1);
      setPage(1);
    } catch {
      toast.error('Create failed');
    }
  };

  // Generate meta data for all subcategories missing meta info
  const generateMissingMeta = async () => {
    const subcategoriesNeedingMeta = subcategories.filter(s => 
      !s.metaTitle || !s.metaKeyword || !s.metaDescription
    );

    if (subcategoriesNeedingMeta.length === 0) {
      toast.info('All subcategories already have meta data!');
      return;
    }

    const confirmed = window.confirm(
      `Generate meta data for ${subcategoriesNeedingMeta.length} subcategories? This will use AI to create SEO-optimized content.`
    );

    if (!confirmed) return;

    toast.info(`Starting bulk meta generation for ${subcategoriesNeedingMeta.length} subcategories...`);

    let successCount = 0;
    let errorCount = 0;

    for (const subcategory of subcategoriesNeedingMeta) {
      try {
        await generateMetaForSubcategory(subcategory);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        errorCount++;
        console.error(`Failed to generate meta for ${subcategory.name}:`, error);
      }
    }

    toast.success(`✅ Generated meta data for ${successCount} subcategories. ${errorCount > 0 ? `${errorCount} failed.` : ''}`);
    fetchSubcategories(page); // Refresh the data
  };

  // Generate meta data for a specific subcategory
  const generateMetaForSubcategory = async (subcategory: Subcategory) => {
    try {
      const prompt = `Generate SEO meta data for this subcategory:
      Name: ${subcategory.name}
      ${subcategory.liveUrl ? `Live URL: ${subcategory.liveUrl}` : ''}
      ${subcategory.marketSize ? `Market Size: ${subcategory.marketSize}` : ''}
      ${subcategory.annualGrowth ? `Growth Rate: ${subcategory.annualGrowth}` : ''}
      
      Please provide:
      1. Meta Title (max 60 characters)
      2. Meta Keywords (5-8 relevant keywords, comma-separated)
      3. Meta Description (150-160 characters)
      
      Format your response as:
      Meta Title: [title]
      Meta Keywords: [keywords]
      Meta Description: [description]`;

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-25f236c2be3a42d49914b903ff908670',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert SEO content writer. Create compelling, search-optimized meta content for e-commerce subcategories.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512
        }),
      });

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';
      
      if (aiText) {
        // Parse the AI response
        const metaTitleMatch = aiText.match(/Meta Title:\s*(.+)/i);
        const metaKeywordMatch = aiText.match(/Meta Keywords:\s*(.+)/i);
        const metaDescriptionMatch = aiText.match(/Meta Description:\s*(.+)/i);

        const updatedData: any = {};
        if (metaTitleMatch) updatedData.metaTitle = metaTitleMatch[1].trim();
        if (metaKeywordMatch) updatedData.metaKeyword = metaKeywordMatch[1].trim();
        if (metaDescriptionMatch) updatedData.metaDescription = metaDescriptionMatch[1].trim();

        // Update the subcategory with generated meta data
        await axiosInstance.put(`/subcategories/${subcategory._id}`, {
          ...updatedData,
          name: subcategory.name,
          mappedParent: subcategory.mappedParent,
        });

        toast.success(`Meta data generated for ${subcategory.name}!`);
        fetchSubcategories(page); // Refresh the data
      }
    } catch (error) {
      toast.error('Failed to generate meta data');
      console.error('Meta generation error:', error);
    }
  };

  // Start edit
  const startEdit = (s: Subcategory) => {
    setEditingId(s._id);
    setFormName(s.name);
    setFormMetaTitle(s.metaTitle || '');
    setFormMetaKeyword(s.metaKeyword || '');
    setFormMetaDescription(s.metaDescription || '');
    setFormImageUrl(s.sub_cat_img_url || '');
    setMappedParent(s.mappedParent || null);
    setFormDescription(s.description || '');
    setFormLiveUrl(s.liveUrl || '');
    setFormMarketSize(s.marketSize || '');
    setFormAnnualGrowth(s.annualGrowth || '');
    setFormAverageMargin(s.averageMargin || '');
    setShowEditModal(true);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      await axiosInstance.put(`/subcategories/${editingId}`, {
        name: formName,
        metaTitle: formMetaTitle,
        metaKeyword: formMetaKeyword,
        metaDescription: formMetaDescription,
        sub_cat_img_url: formImageUrl,
        mappedParent: mappedParent,
        description: formDescription,
        liveUrl: formLiveUrl,
        marketSize: formMarketSize,
        annualGrowth: formAnnualGrowth,
        averageMargin: formAverageMargin,
      });
      toast.success('Subcategory updated');
      setShowEditModal(false);
      setEditingId(null);
      fetchSubcategories(page);
    } catch {
      toast.error('Update failed');
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await axiosInstance.delete(`/subcategories/${deletingId}`);
      toast.success('Deleted');
      setShowDeleteModal(false);
      setDeletingId(null);
      if (subcategories.length === 1 && page > 1) {
        setPage(page - 1);
        fetchSubcategories(page - 1);
      } else {
        fetchSubcategories(page);
      }
    } catch {
      toast.error('Delete failed');
    }
  };

  const onSearchChange = (v: string) => {
    setSearchQuery(v);
    setPage(1);
  };

  const goToPage = (input: string) => {
    const p = Number(input);
    if (!Number.isFinite(p) || p < 1 || p > totalPages) {
      toast.error(`Page must be between 1 and ${totalPages}`);
      return;
    }
    setPage(p);
    setGoToPageInput('');
    fetchSubcategories(p);
  };
  const Stat = ({ label, value }: { label: string; value: string | number }) => (
    <div className="rounded-2xl border bg-white shadow-sm p-4 min-w-[140px]">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-semibold text-gray-800">{value}</p>
    </div>
  );

  const tooLong = (s?: string) => (s ? s.length > 120 : false);

  // Sidebar collapsed state
  // (Removed duplicate declaration)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-20' : 'ml-72'} p-6 md:p-8`}>
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Enhanced Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Subcategories</h1>
                    <p className="text-slate-600 font-medium">Create, edit and manage product subcategories with SEO optimization</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {!isManagerViewOnly && (
                  <>
                    <button
                      onClick={generateMissingMeta}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-purple-500/25 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      🤖 Generate Missing Meta
                    </button>
                    <button
                      onClick={() => {
                        setFormName('');
                        setFormMetaTitle('');
                        setFormMetaKeyword('');
                        setFormMetaDescription('');
                        setFormImageUrl('');
                        setFormDescription('');
                        setFormLiveUrl('');
                        setFormMarketSize('');
                        setFormAnnualGrowth('');
                        setFormAverageMargin('');
                        setShowAddModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-105"
                    >
                      <LuPlus className="w-5 h-5" />
                      Add Subcategory
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Enhanced Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Subcategories</p>
                  <p className="text-2xl font-bold text-blue-900">{totalItems}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl border border-green-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-green-700">Current Page</p>
                  <p className="text-2xl font-bold text-green-900">{page} of {totalPages}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-2xl border border-emerald-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-700">With Live URLs</p>
                  <p className="text-2xl font-bold text-emerald-900">{subcategories.filter(s => s.liveUrl).length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl border border-orange-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-orange-700">With Market Data</p>
                  <p className="text-2xl font-bold text-orange-900">{subcategories.filter(s => s.marketSize).length}</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-red-700">Missing Meta Data</p>
                  <p className="text-2xl font-bold text-red-900">{subcategories.filter(s => !s.metaTitle || !s.metaKeyword || !s.metaDescription).length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Search & Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            {/* Enhanced Search Bar */}
            <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-6">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <input
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    placeholder="🔍 Search subcategories..."
                    className="w-full pl-12 pr-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
                  />
                </div>
                
                <div className="text-sm text-slate-600 bg-white px-4 py-2 rounded-lg font-medium border border-slate-200">
                  {totalItems} subcategories found
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Image</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Subcategory</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Title</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Keywords</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-900 uppercase tracking-wide">Meta Description</th>
                    {!isManagerViewOnly && <th className="px-6 py-4 text-center text-sm font-semibold text-slate-900 uppercase tracking-wide">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {loading &&
                    Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                  {!loading && subcategories.length === 0 && (
                    <tr>
                      <td colSpan={isManagerViewOnly ? 5 : 6} className="px-6 py-12 text-center">
                        <div className="text-slate-500">
                          <svg className="mx-auto h-12 w-12 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14-7H5a2 2 0 00-2 2v12a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2z" />
                          </svg>
                          <p className="text-lg font-medium">No subcategories found</p>
                          <p className="text-sm">Get started by creating your first subcategory.</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading &&
                    subcategories.map((s) => (
                      <tr key={s._id} className="hover:bg-slate-50/80 transition-colors duration-200">
                        {/* Image */}
                        <td className="px-6 py-4">
                          <div className="flex-shrink-0">
                            {s.sub_cat_img_url ? (
                              <a href={s.sub_cat_img_url} target="_blank" rel="noreferrer">
                                <img 
                                  src={s.sub_cat_img_url} 
                                  alt={s.name} 
                                  className="h-12 w-12 rounded-xl object-cover border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200" 
                                />
                              </a>
                            ) : (
                              <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                <span className="text-white font-semibold text-lg">
                                  {s.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        {/* Name */}
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-semibold text-slate-900">{s.name}</div>
                            <div className="text-sm text-slate-500">
                              {s.mappedChildren?.length || 0} products
                            </div>
                          </div>
                        </td>

                        {/* Meta Title */}
                        <td className="px-6 py-4 max-w-xs">
                          {s.metaTitle ? (
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 max-h-20 overflow-y-auto">
                              <p className="text-sm text-blue-900 font-medium break-words">{s.metaTitle}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No meta title</span>
                          )}
                        </td>

                        {/* Meta Keywords */}
                        <td className="px-6 py-4 max-w-xs">
                          {s.metaKeyword ? (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 max-h-20 overflow-y-auto">
                              <p className="text-sm text-purple-900 break-words">{s.metaKeyword}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No meta keywords</span>
                          )}
                        </td>

                        {/* Meta Description */}
                        <td className="px-6 py-4 max-w-xs">
                          {s.metaDescription ? (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 max-h-20 overflow-y-auto">
                              <p className="text-sm text-green-900 break-words">{s.metaDescription}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">No meta description</span>
                          )}
                        </td>

                        {!isManagerViewOnly && (
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2 flex-wrap">
                              <button
                                onClick={() => startEdit(s)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
                              >
                                <TbEdit className="w-4 h-4" />
                                Edit
                              </button>
                              
                              {(!s.metaTitle || !s.metaKeyword || !s.metaDescription) && (
                                <button
                                  onClick={() => generateMetaForSubcategory(s)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
                                >
                                  🤖 Meta
                                </button>
                              )}
                              
                              <button
                                onClick={() => {
                                  setDeletingId(s._id);
                                  setShowDeleteModal(true);
                                }}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg shadow-sm transition-colors duration-200"
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

            {/* Enhanced Pagination */}
            <div className="bg-slate-50/50 border-t border-slate-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-slate-600">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} subcategories
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => page > 1 && setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {getPaginationRange(page, totalPages, 1).map((p, i) =>
                      p === '...' ? (
                        <span key={i} className="px-2 text-slate-500">…</span>
                      ) : (
                        <button
                          key={i}
                          onClick={() => setPage(Number(p))}
                          className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                            p === page 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {p}
                        </button>
                      )
                    )}
                  </div>
                  
                  <button
                    onClick={() => page < totalPages && setPage(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                  >
                    Next
                  </button>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <input
                      type="number"
                      value={goToPageInput}
                      onChange={(e) => setGoToPageInput(e.target.value)}
                      className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Go to"
                    />
                    <button
                      onClick={() => goToPage(goToPageInput)}
                      className="px-3 py-1 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors duration-200"
                    >
                      Go
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
     
      {/* Modals */}
      <AnimatePresence>
        {showAddModal && (
          <Modal title="Add New Subcategory" onClose={() => setShowAddModal(false)}>
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Subcategory Name" value={formName} onChange={setFormName} required />
                <Input label="Image URL" value={formImageUrl} onChange={setFormImageUrl} />
              </div>
              
              <Input label="Live URL" value={formLiveUrl} onChange={setFormLiveUrl} />
              
              <div className="grid grid-cols-3 gap-4">
                <Input label="Market Size" value={formMarketSize} onChange={setFormMarketSize} />
                <Input label="Annual Growth" value={formAnnualGrowth} onChange={setFormAnnualGrowth} />
                <Input label="Average Margin" value={formAverageMargin} onChange={setFormAverageMargin} />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Parent Category</label>
                <select 
                  name="mappedParent" 
                  required 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.main_cat_name}</option>
                  ))}
                </select>
              </div>
              
              {/* Enhanced Meta Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Meta Information</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Title</label>
                  <div className="relative max-h-20 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <input
                      value={formMetaTitle}
                      onChange={e => setFormMetaTitle(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                      type="text"
                      placeholder="Enter SEO-optimized title (max 60 characters)"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                  <div className="relative max-h-20 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <input
                      value={formMetaKeyword}
                      onChange={e => setFormMetaKeyword(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                      type="text"
                      placeholder="Enter keywords separated by commas"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                  <div className="relative max-h-32 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <textarea
                      value={formMetaDescription}
                      onChange={e => setFormMetaDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-transparent outline-none resize-none text-sm"
                      placeholder="Enter compelling description (150-160 characters)"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <div className="relative max-h-40 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <ReactTextEditor value={formDescription} onChange={setFormDescription} />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => rewriteAllWithAI(false)}
                  className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${Object.values(aiLoading).some(v => v) ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                  disabled={Object.values(aiLoading).some(v => v)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {Object.values(aiLoading).some(v => v) ? 'Rewriting...' : '🤖 Rewrite All with AI'}
                </button>
                <button 
                  type="submit" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <LuPlus className="w-5 h-5" />
                  Create Subcategory
                </button>
              </div>
            </form>
          </Modal>
        )}

        {showEditModal && (
          <Modal title="Edit Subcategory" onClose={() => setShowEditModal(false)}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Subcategory Name" value={formName} onChange={setFormName} />
                <Input label="Image URL" value={formImageUrl} onChange={setFormImageUrl} />
              </div>
              
              <Input label="Live URL" value={formLiveUrl} onChange={setFormLiveUrl} />
              
              <div className="grid grid-cols-3 gap-4">
                <Input label="Market Size" value={formMarketSize} onChange={setFormMarketSize} />
                <Input label="Annual Growth" value={formAnnualGrowth} onChange={setFormAnnualGrowth} />
                <Input label="Average Margin" value={formAverageMargin} onChange={setFormAverageMargin} />
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700">Parent Category</label>
                <select 
                  name="mappedParent" 
                  required 
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>{c.main_cat_name}</option>
                  ))}
                </select>
              </div>
              
              {/* Enhanced Meta Fields */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Meta Information</h3>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Title</label>
                  <div className="relative max-h-20 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <input
                      value={formMetaTitle}
                      onChange={e => setFormMetaTitle(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                      type="text"
                      placeholder="Enter SEO-optimized title (max 60 characters)"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                  <div className="relative max-h-20 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <input
                      value={formMetaKeyword}
                      onChange={e => setFormMetaKeyword(e.target.value)}
                      className="w-full bg-transparent outline-none text-sm"
                      type="text"
                      placeholder="Enter keywords separated by commas"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                  <div className="relative max-h-32 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <textarea
                      value={formMetaDescription}
                      onChange={e => setFormMetaDescription(e.target.value)}
                      rows={3}
                      className="w-full bg-transparent outline-none resize-none text-sm"
                      placeholder="Enter compelling description (150-160 characters)"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700">Description</label>
                  <div className="relative max-h-40 overflow-y-auto border border-slate-300 rounded-xl bg-white shadow-sm p-3">
                    <ReactTextEditor value={formDescription} onChange={setFormDescription} />
                  </div>
                </div>
              </div>
              
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
                  onClick={() => rewriteAllWithAI(true)}
                  className={`inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-200 ${Object.values(aiLoading).some(v => v) ? 'opacity-60 cursor-not-allowed' : 'hover:scale-105'}`}
                  disabled={Object.values(aiLoading).some(v => v)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  {Object.values(aiLoading).some(v => v) ? 'Rewriting...' : '🤖 Rewrite All with AI'}
                </button>
                <button 
                  onClick={saveEdit} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <LuSave className="w-5 h-5" />
                  Save Changes
                </button>
              </div>
            </div>
          </Modal>
        )}

        {showDeleteModal && (
          <Modal title="Delete Subcategory" onClose={() => setShowDeleteModal(false)}>
            <div className="text-center space-y-6">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.314 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Are you sure?</h3>
                <p className="text-slate-600">
                  This action cannot be undone. This will permanently delete the subcategory and remove all associated data.
                </p>
              </div>
              
              <div className="flex justify-center gap-3 pt-4">
                <button 
                  onClick={() => setShowDeleteModal(false)} 
                  className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <RiDeleteBin6Line className="w-5 h-5" />
                  Delete Subcategory
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// Enhanced Modal component with better styling
const Modal = ({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) => (
  <motion.div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    initial={{ opacity: 0 }} 
    animate={{ opacity: 1 }} 
    exit={{ opacity: 0 }}
  >
    <motion.div 
      className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col mx-4"
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Enhanced Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
        <button 
          onClick={onClose} 
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable Body with enhanced styling */}
      <div className="overflow-y-auto p-6 flex-1 bg-white rounded-b-2xl">{children}</div>
    </motion.div>
  </motion.div>
);

// Enhanced Input component
const Input = ({ label, value, onChange, required = false }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <input
      required={required}
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md"
    />
  </div>
);

// Enhanced Textarea component
const Textarea = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-slate-700">{label}</label>
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm resize-none transition-all duration-200 hover:shadow-md"
      rows={4}
    />
  </div>
);

// Enhanced Skeleton Row
const SkeletonRow = () => (
  <tr className="animate-pulse border-t">
    {Array.from({ length: 6 }).map((_, i) => (
      <td key={i} className="px-6 py-4">
        <div className="h-4 bg-slate-200 rounded-lg w-24" />
      </td>
    ))}
  </tr>
);
