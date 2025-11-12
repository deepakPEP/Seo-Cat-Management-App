'use client';
export const dynamic = "force-dynamic";
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getPaginationRange } from '@/components/GetPage';
import axiosInstance from '../../lib/axiosInstance';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import RichTextEditor from '@/components/RichTextEditor';
import { MdImageNotSupported } from 'react-icons/md';
import { TbEdit } from 'react-icons/tb';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { LuPlus } from 'react-icons/lu';
import { AnimatePresence } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import FilterSidebar from '@/components/FilterSideBar';
import Loader from "@/components/Loader";

type Product = {
  _id: string;
  name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  description?: string;
  mappedParent?: {         // subcategory
    _id: string;
    name: string;
    mappedParent?: {      // category
      _id: string;
      name: string;
    };
  };

};

type Category = {
  _id: string;
  name: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  description?: string;
}
type Subcategory = {
  _id: string;
  name: string;
  mappedParent?: string;

};

type TokenPayload = {
  sub: string;
  role: string;
  iat: number;
  exp: number;
};

function SkeletonRow() {
  return (
    <tr className="border-t">
      <td className="p-3"><div className="h-4 bg-gray-200 rounded w-8" /></td>
      <td className="p-3"><div className="h-10 w-10 bg-gray-200 rounded" /></td>
      <td className="p-3"><div className="h-4 bg-gray-200 rounded w-48" /></td>
      <td className="p-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
      <td className="p-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
      <td className="p-3"><div className="h-4 bg-gray-200 rounded w-80" /></td>
      <td className="p-3" />
    </tr>
  );
}

export default function ProductsPage() {
  const router = useRouter();

  // data
  const [products, setProducts] = useState<Product[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // filter selections
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [filteredSubcategories, setFilteredSubcategories] = useState<Subcategory[]>([]);
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([]);


  // paging & search
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [goToPageInput, setGoToPageInput] = useState<string>('');

  // auth/role
  const [userRole, setUserRole] = useState<string | null>(null);
  const isManagerViewOnly = useMemo(() => userRole === 'pepagora_manager', [userRole]);

  // modals & editing
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // form states (add/edit)
  const [formName, setFormName] = useState('');
  const [formMappedParent, setFormMappedParent] = useState<string | null>(null);
  const [formMetaTitle, setFormMetaTitle] = useState('');
  const [formMetaKeyword, setFormMetaKeyword] = useState('');
  const [formMetaDescription, setFormMetaDescription] = useState('');
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // DeepSeek AI loading state
  const [aiLoading, setAiLoading] = useState(false);

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

  // DeepSeek AI handler for full JSON
  async function handleRewriteAllAI() {
    if (!formName) {
      toast.error('Please enter a product name first.');
      return;
    }
    setAiLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_DEEPSEEK_API_KEY || 'sk-25f236c2be3a42d49914b903ff908670';
      const apiUrl = process.env.NEXT_PUBLIC_DEEPSEEK_URL || 'https://api.deepseek.com/chat/completions';
      const prompt = `USER: Create content for:\n- Page type: Product\n- Name: ${formName}\n- Markets: INDIA/GCC COUNTRIES/AFRICA\n- Trust signals: https://www.pepagora.com/en/s/trust\n- Languages: {LANGS}\n\nData sources (use in priority order):\nKeywords: {KEYWORDS_JSON}\n\nOUTPUT (return VALID JSON):\n{\n  "keywords": { "head": ["..."], "long_tail": ["..."], "variants": ["..."] },\n  "by_lang": {\n    "<lang>": {\n      "intro_html": "<h1>{PAGE_NAME}</h1><p>120-180 words covering what it is, key use-cases, core specs. Weave 2-3 head terms + long-tails naturally.</p>",\n      "faqs": [{"question": "?", "answer_html": "<p>2-3 sentences</p>"}], // 5-8 items\n      "llm_text": "50-70 words factual summary",\n      "meta": {"title": "≤60 chars", "description": "150-160 chars"},\n      "schema": {"faqpage_jsonld": {...}, "breadcrumb_jsonld": {...}, "itemlist_or_product_jsonld": {...}},\n      "links_html": "<nav aria-label=\"Related\">...</nav>"\n    }\n  }\n}\n\nRULES: Prefer supplied data. Weave keywords naturally. Clean HTML. Vendor-neutral. One H1 only.`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: 'You are an expert B2B content strategist for Pepagora.com. Create SEO + LLM-optimized content for a Product page. Write concise, factual, globally readable copy. Use supplied data first; only generalize with industry knowledge if data is missing. Avoid unverified claims.' },
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
      setAiLoading(false);
    }
  }


  // const searchParams = useSearchParams();
    // const [token, setToken] = useState<string | null>(null);
    const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;



  // const categoryId = searchParams.get("category");
  // const subcategoryId = searchParams.get("subcategory");
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [subcategoriesLoading, setSubcategoriesLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);



  // when categories change, update filtered subcategories
  useEffect(() => {
    if (selectedCategories.length === 0) {
      setFilteredSubcategories(subcategories);
    } else {
      setFilteredSubcategories(
        subcategories.filter(s => selectedCategories.includes(s.mappedParent || ''))
      );
    }

    // clear selected subcategories if not in filtered
    setSelectedSubcategories(prev => prev.filter(sid =>
      filteredSubcategories.some(s => s._id === sid)
    ));
  }, [selectedCategories, subcategories]);

  useEffect(() => {
  if (typeof window !== "undefined") {
    // const token = localStorage.getItem("accessToken");
    if (token) {
      try {
        const decoded: TokenPayload = jwtDecode(token);
        setUserRole(decoded.role);
      } catch {
        console.error("Invalid token");
      }
    }
  }
}, []);


  // fetch subcategories for dropdown
  useEffect(()=>{
    const fetchCategories = async () => {
    try {
      setCategoriesLoading(true);   
      const res = await axiosInstance.get('/categories', { params: { limit: 1000 } }); // fetch list for dropdown
      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      setCategories(items);
    } catch (err) {
      console.error('fetchCategories', err);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  }; fetchCategories();
}, []);


useEffect(()=>{
  const fetchSubcategories = async () => {
    try {
      const res = await axiosInstance.get('/subcategories', { params: { limit: 1000 } }); // fetch list for dropdown
      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      setSubcategories(items);
    } catch (err) {
      console.error('fetchSubcategories', err);
      setSubcategories([]);
    }
  };
  fetchSubcategories();

},[])

  // fetch products (server-side search + pagination)
  const fetchProducts = async (pageToFetch = page) => {
    setLoading(true);
    try {
      setProductsLoading(true);
      let endpoint = "/products"; // default
      const params: any = {
        page: pageToFetch,
        limit,
        search: searchQuery || undefined,
      };

      if (selectedCategories.length > 0 || selectedSubcategories.length > 0) {
        endpoint = "/products/filter"; // use filter route
        // if (selectedCategories.length > 0) {
        //   params.categories = selectedCategories.join(",");
        // }
        if (selectedSubcategories.length > 0) {
          params.subcategories = selectedSubcategories.join(",");
        }
      }

      const res = await axiosInstance.get(endpoint, { params });

      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      const pagination = res.data.data.pagination || {};

      console.log("vgbhjn", res.data.data.data);

      setProducts(items);
      setTotalPages(pagination.totalPages || 1);
      setTotalItems(pagination.totalItems || items.length || 0);
    } catch (err) {
      console.error("Error fetching products:", err);
      setProducts([]);
    } finally {
      setLoading(false);
      setProductsLoading(false);

    }
  };

  // Generate meta data for all products missing meta info
  const generateMissingMeta = async () => {
    const productsNeedingMeta = products.filter(p => 
      !p.metaTitle || !p.metaKeyword || !p.metaDescription
    );

    if (productsNeedingMeta.length === 0) {
      toast.info('All products already have meta data!');
      return;
    }

    const confirmed = window.confirm(
      `Generate meta data for ${productsNeedingMeta.length} products? This will use AI to create SEO-optimized content.`
    );

    if (!confirmed) return;

    toast.info(`Starting bulk meta generation for ${productsNeedingMeta.length} products...`);

    let successCount = 0;
    let errorCount = 0;

    for (const product of productsNeedingMeta) {
      try {
        await generateMetaForProduct(product);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error: any) {
        errorCount++;
        console.error(`Failed to generate meta for ${product.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`✅ Generated meta data for ${successCount} products.`);
    }
    if (errorCount > 0) {
      toast.warning(`⚠️ ${errorCount} products failed to generate meta data.`);
    }
    
    fetchProducts(page); // Refresh the data
  };

  // Generate meta data for a specific product
  const generateMetaForProduct = async (product: Product) => {
    try {
      const categoryName = product.mappedParent?.mappedParent?.name || '';
      const subcategoryName = product.mappedParent?.name || '';
      
      const prompt = `Generate SEO meta data for this product:
      Product Name: ${product.name}
      Category: ${categoryName}
      Subcategory: ${subcategoryName}
      ${product.description ? `Description: ${product.description}` : ''}
      
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
            { role: 'system', content: 'You are an expert SEO content writer. Create compelling, search-optimized meta content for e-commerce products.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 512
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const aiText = data.choices?.[0]?.message?.content || '';
      
      if (!aiText) {
        throw new Error('No content returned from AI');
      }

      // Parse the AI response
      const metaTitleMatch = aiText.match(/Meta Title:\s*(.+)/i);
      const metaKeywordMatch = aiText.match(/Meta Keywords:\s*(.+)/i);
      const metaDescriptionMatch = aiText.match(/Meta Description:\s*(.+)/i);

      if (!metaTitleMatch && !metaKeywordMatch && !metaDescriptionMatch) {
        throw new Error('Could not parse AI response');
      }

      const updatedData: any = { 
        name: product.name,
        mappedParent: product.mappedParent?._id
      };
      
      if (metaTitleMatch) updatedData.metaTitle = metaTitleMatch[1].trim();
      if (metaKeywordMatch) updatedData.metaKeyword = metaKeywordMatch[1].trim();
      if (metaDescriptionMatch) updatedData.metaDescription = metaDescriptionMatch[1].trim();

      // Update the product with generated meta data
      console.log('Updating product with data:', updatedData);
      const updateResponse = await axiosInstance.patch(`/products/${product._id}`, updatedData);
      
      if (updateResponse.status !== 200) {
        throw new Error(`Failed to update product: ${updateResponse.status}`);
      }

      toast.success(`Meta data generated for ${product.name}!`);
      fetchProducts(page); // Refresh the data
      
    } catch (error: any) {
      let errorMessage = 'Unknown error occurred';
      
      if (error.response) {
        // The request was made and the server responded with a status code
        console.error('API Error Response:', error.response.data);
        console.error('API Error Status:', error.response.status);
        errorMessage = `API Error (${error.response.status}): ${error.response.data?.message || error.response.statusText}`;
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Network Error:', error.request);
        errorMessage = 'Network error - no response received';
      } else {
        // Something happened in setting up the request
        console.error('Request Setup Error:', error.message);
        errorMessage = error.message || 'Request setup error';
      }
      
      toast.error(`Failed to generate meta data: ${errorMessage}`);
      console.error('Full error object:', error);
    }
  };



  // effects
  useEffect(() => { fetchProducts(page); /* eslint-disable-next-line */ }, [page, searchQuery]);

  // create
  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault?.();
    try {
      setLoading(true);
      await axiosInstance.post('/products', {
        name: formName, // required
        mappedParent: formMappedParent || undefined, // only send if selected
        imageUrl: formImageUrl || undefined,         // only send if not empty
        metaTitle: formMetaTitle || undefined,
        metaKeyword: formMetaKeyword || undefined,
        metaDescription: formMetaDescription || undefined,
        description: formDescription || undefined,
      });

      toast.success('Product created');
      setShowAddModal(false);

      // reset form
      setFormName('');
      setFormMappedParent(''); // <-- use empty string instead of null
      setFormMetaTitle('');
      setFormMetaKeyword('');
      setFormMetaDescription('');
      setFormImageUrl('');
      setFormDescription('');

      // reload
      setPage(1);
      fetchProducts(1);
    } catch (err: any) {
      console.error("Error adding product:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setLoading(false);
    }
  };

  // start edit
  const startEdit = (p: Product) => {
    setEditingId(p._id);
    setFormName(p.name || '');
    setFormMappedParent(
      typeof p.mappedParent === 'string'
        ? p.mappedParent
        : p.mappedParent?._id || null
    );
    setFormMetaTitle(p.metaTitle || '');
    setFormMetaKeyword(p.metaKeyword || '');
    setFormMetaDescription(p.metaDescription || '');
    setFormImageUrl(p.imageUrl || '');
    setFormDescription(p.description || '');
    setShowEditModal(true);
  };

  // save edit
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setLoading(true);

      const payload = {
        name: formName, // Always include name for update
        mappedParent: formMappedParent || undefined,
        imageUrl: formImageUrl || undefined,
        metaTitle: formMetaTitle || undefined,
        metaKeyword: formMetaKeyword || undefined,
        metaDescription: formMetaDescription || undefined,
        description: formDescription || undefined,
      };

      await axiosInstance.patch(`/products/${editingId}`, payload);

      toast.success("Product updated successfully!");
      setShowEditModal(false);
      setEditingId(null);
      fetchProducts(page);
    } catch (err: any) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };


  // delete
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setLoading(true);
      await axiosInstance.delete(`/products/${deletingId}`);
      toast.success('Deleted');
      setShowDeleteModal(false);
      setDeletingId(null);
      // if last item on page was deleted, move back page
      if (products.length === 1 && page > 1) {
        setPage(page - 1);
        fetchProducts(page - 1);
      } else {
        fetchProducts(page);
      }
    } catch {
      toast.error('Delete failed');
    } finally {
      setLoading(false);
    }
  };

  // search handler (server-side)
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
    fetchProducts(p);
  };

  const tooLong = (s?: string) => (s ? s.length > 120 : false);

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />

      <main className={`transition-all duration-300 ${collapsed ? "ml-20" : "ml-72"} p-6 md:p-8`}>
        <div className="mx-auto max-w-7xl space-y-8">
          {/* Enhanced Header */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-8">
            <div className="flex items-center justify-between gap-6 flex-wrap">
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Products</h1>
                    <p className="text-slate-600 font-medium">Manage your product catalog with advanced features</p>
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
                        setFormName(''); setFormMappedParent(null); setFormMetaTitle(''); setFormMetaKeyword(''); setFormMetaDescription(''); setFormImageUrl(''); setFormDescription('');
                        setShowAddModal(true);
                      }}
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:shadow-blue-500/25 transition-all duration-200 hover:scale-105"
                    >
                      <LuPlus className="w-5 h-5" />
                      Add Product
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 p-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-400 transition-all duration-200"
                  />
                </div>
              </div>

              <FilterSidebar
                categories={categories.map(cat => ({
                  _id: cat._id,
                  main_cat_name: cat.name,
                  subcategories: subcategories
                    .filter(sub => sub.mappedParent === cat._id)
                    .map(sub => ({
                      _id: sub._id,
                      name: sub.name,
                    })),
                }))}
                selectedCategories={selectedCategories}
                selectedSubcategories={selectedSubcategories}
                setSelectedCategories={setSelectedCategories}
                setSelectedSubcategories={setSelectedSubcategories}
                onApply={() => fetchProducts(1)} // apply filters
                onReset={() => {
                  setSelectedCategories([]);
                  setSelectedSubcategories([]);
                  fetchProducts(1);
                }}
              />
            </div>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200/60 p-6 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500 rounded-xl">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Products</p>
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
                    {products.filter(p => p.metaTitle && p.metaDescription).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Modern Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">S. NO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Image</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Keywords</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Description</th>
                    {!isManagerViewOnly && <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                  {!loading && products.length === 0 && (
                    <tr>
                      <td colSpan={isManagerViewOnly ? 6 : 7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <p className="text-slate-500 font-medium">No products found</p>
                          <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && products.map((prod, idx) => (
                    <tr key={prod._id} className="hover:bg-slate-50/50 transition-colors duration-200">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4">
                        {prod.imageUrl ? (
                          <a href={prod.imageUrl} target="_blank" rel="noreferrer" className="block">
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.name} 
                              className="h-12 w-12 rounded-xl object-cover shadow-md border border-slate-200 hover:shadow-lg transition-all duration-200" 
                            />
                          </a>
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                            <MdImageNotSupported className="h-6 w-6 text-slate-400" />
                          </div>
                        )}
                      </td>
                   
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-900">{prod.name}</p>
                          {prod.mappedParent && (
                            <p className="text-xs text-slate-500">
                              {prod.mappedParent.mappedParent?.name} → {prod.mappedParent.name}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {prod.metaTitle ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 break-words meta-scrollable meta-title-scrollable">
                              <span className="font-medium">{prod.metaTitle}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No meta title
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {prod.metaKeyword ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 break-words meta-scrollable meta-keywords-scrollable">
                              <span className="font-medium">{prod.metaKeyword}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No keywords
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {prod.metaDescription ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-3 text-xs text-green-900 break-words meta-scrollable meta-description-scrollable">
                              <span className="font-medium">{prod.metaDescription}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No description
                          </span>
                        )}
                      </td>
                      {!isManagerViewOnly && (
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => startEdit(prod)} 
                              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                            >
                              <TbEdit className="w-4 h-4" />
                              Edit
                            </button>
                            {(!prod.metaTitle || !prod.metaKeyword || !prod.metaDescription) && (
                              <button
                                onClick={() => generateMetaForProduct(prod)}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                🤖 AI Meta
                              </button>
                            )}
                            <button 
                              onClick={() => { setDeletingId(prod._id); setShowDeleteModal(true); }} 
                              className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
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

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 border-t bg-white p-3 flex-wrap">
              <p className="text-sm text-gray-600">Page <span className="font-medium">{page}</span> of <span className="font-medium">{totalPages}</span></p>

              <div className="flex items-center gap-2">
                <button onClick={() => page > 1 && setPage(page - 1)} disabled={page === 1} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">Prev</button>

                {getPaginationRange(page, totalPages, 1).map((p, i) =>
                  p === '...' ? <span key={i} className="px-2">…</span> : (
                    <button key={i} onClick={() => setPage(Number(p))} className={`rounded-lg border px-3 py-1.5 text-sm ${p === page ? 'bg-blue-600 text-white' : ''}`}>{p}</button>
                  )
                )}

                <button onClick={() => page < totalPages && setPage(page + 1)} disabled={page === totalPages} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50">Next</button>

                <div className="flex items-center gap-1 ml-2">
                  <input type="number" value={goToPageInput} onChange={(e) => setGoToPageInput(e.target.value)} className="w-16 rounded-lg border px-2 py-1 text-sm" placeholder="Go to" />
                  <button onClick={() => goToPage(goToPageInput)} className="rounded-lg border px-3 py-1.5 text-sm">Go</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ---------- Modals ---------- */}
      <AnimatePresence>
        {/* Enhanced Add Product Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                    <LuPlus className="w-5 h-5 text-white" />
                  </div>
                  Add New Product
                </h2>
                <button 
                  onClick={() => setShowAddModal(false)} 
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
                        <label className="block text-sm font-medium text-slate-700">Product Name *</label>
                        <input 
                          required 
                          value={formName} 
                          onChange={(e) => setFormName(e.target.value)} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          placeholder="Enter product name" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Subcategory *</label>
                        <select 
                          value={formMappedParent ?? ''} 
                          onChange={(e) => setFormMappedParent(e.target.value || null)} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200"
                          required
                        >
                          <option value="">-- Select Subcategory --</option>
                          {subcategories.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Image URL</label>
                      <input 
                        value={formImageUrl} 
                        onChange={(e) => setFormImageUrl(e.target.value)} 
                        placeholder="https://example.com/image.jpg" 
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
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
                          value={formMetaTitle} 
                          onChange={(e) => setFormMetaTitle(e.target.value)} 
                          placeholder="SEO-optimized title (max 60 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          maxLength={60}
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-500">
                          {formMetaTitle.length}/60
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                      <input 
                        value={formMetaKeyword} 
                        onChange={(e) => setFormMetaKeyword(e.target.value)} 
                        placeholder="keyword1, keyword2, keyword3" 
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                      />
                      <p className="text-xs text-slate-500">Separate keywords with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                      <div className="relative">
                        <textarea 
                          value={formMetaDescription} 
                          onChange={(e) => setFormMetaDescription(e.target.value)} 
                          placeholder="Compelling description for search engines (150-160 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                          rows={3}
                          maxLength={160}
                        />
                        <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                          {formMetaDescription.length}/160
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Product Description</h3>
                    <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <RichTextEditor value={formDescription} onChange={setFormDescription} />
                    </div>
                  </div>

                  {/* Action Buttons */}
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
                      onClick={handleRewriteAllAI}
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <LuPlus className="w-5 h-5" />
                      Add Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Edit Product Modal */}
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 rounded-t-2xl">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                    <TbEdit className="w-5 h-5 text-white" />
                  </div>
                  Edit Product
                </h2>
                <button 
                  onClick={() => { setShowEditModal(false); setEditingId(null); }} 
                  className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="overflow-y-auto p-6 flex-1">
                <form onSubmit={(e) => { e.preventDefault(); saveEdit(); }} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Basic Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Product Name *</label>
                        <input 
                          required 
                          value={formName} 
                          onChange={(e) => setFormName(e.target.value)} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          placeholder="Enter product name" 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-700">Subcategory *</label>
                        <select 
                          value={formMappedParent ?? ''} 
                          onChange={(e) => setFormMappedParent(e.target.value || null)} 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all duration-200"
                          required
                        >
                          <option value="">-- Select Subcategory --</option>
                          {subcategories.map(s => (
                            <option key={s._id} value={s._id}>{s.name}</option>
                          ))}
                        </select>
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
                          value={formMetaTitle} 
                          onChange={(e) => setFormMetaTitle(e.target.value)} 
                          placeholder="SEO-optimized title (max 60 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                          maxLength={60}
                        />
                        <div className="absolute right-3 top-3 text-xs text-slate-500">
                          {formMetaTitle.length}/60
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Keywords</label>
                      <input 
                        value={formMetaKeyword} 
                        onChange={(e) => setFormMetaKeyword(e.target.value)} 
                        placeholder="keyword1, keyword2, keyword3" 
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md" 
                      />
                      <p className="text-xs text-slate-500">Separate keywords with commas</p>
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-slate-700">Meta Description</label>
                      <div className="relative">
                        <textarea 
                          value={formMetaDescription} 
                          onChange={(e) => setFormMetaDescription(e.target.value)} 
                          placeholder="Compelling description for search engines (150-160 characters)" 
                          className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:ring-2 focus:ring-emerald-500 focus:border-transparent shadow-sm transition-all duration-200 hover:shadow-md resize-none" 
                          rows={3}
                          maxLength={160}
                        />
                        <div className="absolute right-3 bottom-3 text-xs text-slate-500">
                          {formMetaDescription.length}/160
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Product Description */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2">Product Description</h3>
                    <div className="border border-slate-300 rounded-xl p-4 bg-slate-50/50">
                      <RichTextEditor value={formDescription} onChange={setFormDescription} />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => { setShowEditModal(false); setEditingId(null); }} 
                      className="px-6 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                    >
                      Cancel
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleRewriteAllAI}
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
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                    >
                      <TbEdit className="w-5 h-5" />
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-md text-center">
              <h2 className="text-xl font-semibold mb-4">Confirm Deletion</h2>
              <p className="mb-6">Are you sure you want to delete this product? This action cannot be undone.</p>
              <div className="flex justify-center gap-3">
                <button onClick={() => { setShowDeleteModal(false); setDeletingId(null); }} className="rounded-lg border px-4 py-2">Cancel</button>
                <button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">Delete</button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
