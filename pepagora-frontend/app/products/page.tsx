'use client';
export const dynamic = "force-dynamic";
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { getPaginationRange } from '@/components/GetPage';
import axiosInstance from '../../lib/axiosInstance';
import { jwtDecode } from 'jwt-decode';
import { toast } from 'react-toastify';
import RichTextEditor from '@/components/RichTextEditor';
import { TbEdit } from 'react-icons/tb';
import { RiDeleteBin6Line } from 'react-icons/ri';
import { LuPlus } from 'react-icons/lu';
import { AnimatePresence } from 'framer-motion';
import HierarchicalFilterSidebar from '@/components/HierarchicalFilterSidebar';
import HierarchicalBreadcrumb from '@/components/HierarchicalBreadcrumb';
import { FiChevronRight } from 'react-icons/fi';

type Category = {
  _id: string;
  name?: string;
  main_cat_name?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  main_cat_image?: string;
  mappedChildren?: string[];
  description?: string;
};

type Subcategory = {
  _id: string;
  name?: string;
  sub_cat_name?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  mappedParent?: string;
  sub_cat_img_url?: string;
  imageUrl?: string;
  image?: string;
  mappedChildren?: string[];
  description?: string;
};

type ProductCategory = {
  _id: string;
  name?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDescription?: string;
  imageUrl?: string;
  mappedParent?: string;
  description?: string;
};

type FilterSelection = {
  category: Category | null;
  subcategory: Subcategory | null;
  productCategory: ProductCategory | null;
};

// Helper to extract JSON from AI response (handles markdown code blocks)
function extractJSON(text: string): any {
  try {
    // First try direct parse
    return JSON.parse(text);
  } catch {
    // Try to extract from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    // Try to find JSON object directly
    const jsonObjMatch = text.match(/\{[\s\S]*\}/);
    if (jsonObjMatch) {
      return JSON.parse(jsonObjMatch[0]);
    }
    throw new Error('No valid JSON found');
  }
}

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
  // Sidebar collapse state
  const [collapsed, setCollapsed] = useState(false);

  // ---- Hierarchical Filter State ----
  const [filterSelection, setFilterSelection] = useState<FilterSelection>({
    category: null,
    subcategory: null,
    productCategory: null,
  });
  const [displayItems, setDisplayItems] = useState<any[]>([]);

  // data
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [productCategories, setProductCategories] = useState<ProductCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // paging & search
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(10);
  const [totalPages, setTotalPages] = useState<number>(1);
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

  const token = typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  // ---- Helper Functions ----
  const getCurrentLevel = () => {
    if (filterSelection.productCategory) return 'productCategory';
    if (filterSelection.subcategory) return 'subcategory';
    if (filterSelection.category) return 'category';
    return 'all';
  };

  const getName = (item: any) => {
    return item?.name || item?.main_cat_name || item?.sub_cat_name || 'Unnamed';
  };

  const getImageUrl = (item: any) => {
    return item?.imageUrl || item?.image || item?.main_cat_image || item?.sub_cat_img_url || '';
  };

  const handleFilterChange = (selection: FilterSelection) => {
    setFilterSelection(selection);
  };

  const handleBreadcrumbNavigate = (level: 'home' | 'category' | 'subcategory') => {
    if (level === 'home') {
      setFilterSelection({ category: null, subcategory: null, productCategory: null });
    } else if (level === 'category') {
      setFilterSelection({ ...filterSelection, subcategory: null, productCategory: null });
    } else if (level === 'subcategory') {
      setFilterSelection({ ...filterSelection, productCategory: null });
    }
  };

  const handleRowClick = async (item: any) => {
    const currentLevel = getCurrentLevel();
    
    if (currentLevel === 'all') {
      // Clicking a category - fetch its subcategories
      setFilterSelection({ category: item, subcategory: null, productCategory: null });
    } else if (currentLevel === 'category') {
      // Clicking a subcategory - fetch its product categories
      setFilterSelection({ ...filterSelection, subcategory: item, productCategory: null });
    } else if (currentLevel === 'subcategory') {
      // Clicking a product category - just select it
      setFilterSelection({ ...filterSelection, productCategory: item });
    }
  };


  // DeepSeek AI handler for full JSON
  async function handleRewriteAllAI() {
    if (!formName) {
      toast.error('Please enter a product name first.');
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `USER: Create content for:\n- Page type: Product\n- Name: ${formName}\n- Markets: INDIA/GCC COUNTRIES/AFRICA\n- Trust signals: https://www.pepagora.com/en/s/trust\n- Languages: {LANGS}\n\nData sources (use in priority order):\nKeywords: {KEYWORDS_JSON}\n\nOUTPUT (return VALID JSON):\n{\n  "keywords": { "head": ["..."], "long_tail": ["..."], "variants": ["..."] },\n  "by_lang": {\n    "<lang>": {\n      "intro_html": "<h1>{PAGE_NAME}</h1><p>120-180 words covering what it is, key use-cases, core specs. Weave 2-3 head terms + long-tails naturally.</p>",\n      "faqs": [{"question": "?", "answer_html": "<p>2-3 sentences</p>"}], // 5-8 items\n      "llm_text": "50-70 words factual summary",\n      "meta": {"title": "≤60 chars", "description": "150-160 chars"},\n      "schema": {"faqpage_jsonld": {...}, "breadcrumb_jsonld": {...}, "itemlist_or_product_jsonld": {...}},\n      "links_html": "<nav aria-label=\"Related\">...</nav>"\n    }\n  }\n}\n\nRULES: Prefer supplied data. Weave keywords naturally. Clean HTML. Vendor-neutral. One H1 only.`;
      
      const res = await axiosInstance.post('/ai/deepseek', {
        prompt,
        pageType: 'Product',
      });
      
      // ResponseInterceptor wraps: { success, timestamp, data: { statusCode, message, data: { content } } }
      const aiText = res.data?.data?.data?.content || '';
      
      if (aiText) {
        try {
          const json = extractJSON(aiText);
          
          // Get the first available language or use 'en' as default
          const langKeys = json.by_lang ? Object.keys(json.by_lang) : [];
          const langKey = langKeys.includes('en') ? 'en' : (langKeys[0] || '<lang>');
          const langData = json.by_lang?.[langKey] || json.by_lang?.['<lang>'] || {};
          
          setFormMetaTitle(langData.meta?.title || '');
          setFormMetaKeyword((json.keywords?.head || []).join(', '));
          setFormMetaDescription(langData.meta?.description || '');
          setFormDescription(langData.intro_html || '');
          
          toast.success('Fields rewritten with AI!');
        } catch (error) {
          toast.error('AI response is not valid JSON.');
        }
      } else {
        toast.error('AI did not return a result');
      }
    } catch (error: any) {
      // Extract error message from nested response structure
      const errorMessage = 
        error.response?.data?.data?.message || 
        error.response?.data?.message || 
        error.message || 
        'AI rewrite failed';
      toast.error(errorMessage);
    } finally {
      setAiLoading(false);
    }
  }



  // Fetch subcategories when category is selected (hierarchical filter)
  useEffect(() => {
    const fetchSubcategoriesByCategory = async () => {
      if (!filterSelection.category) {
        setSubcategories([]);
        return;
      }
      try {
        const res = await axiosInstance.get(`/categories/${filterSelection.category._id}/subcategories`);
        const responseData = res.data?.data || res.data;
        const subcategoriesData = responseData?.data || responseData;
        setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
      } catch {
        console.error('Error fetching subcategories');
        setSubcategories([]);
      }
    };
    fetchSubcategoriesByCategory();
  }, [filterSelection.category]);

  // Fetch product categories when subcategory is selected (hierarchical filter)
  useEffect(() => {
    const fetchProductCategoriesBySubcategory = async () => {
      if (!filterSelection.subcategory) {
        setProductCategories([]);
        return;
      }
      try {
        const res = await axiosInstance.get(`/subcategories/${filterSelection.subcategory._id}/productcategories`);
        let data = [];
        if (res.data?.data?.data) {
          data = res.data.data.data;
        } else if (Array.isArray(res.data?.data)) {
          data = res.data.data;
        } else if (Array.isArray(res.data)) {
          data = res.data;
        }
        setProductCategories(Array.isArray(data) ? data : []);
      } catch {
        console.error('Error fetching product categories');
        setProductCategories([]);
      }
    };
    fetchProductCategoriesBySubcategory();
  }, [filterSelection.subcategory]);

  // Update displayItems based on filter selection
  useEffect(() => {
    const currentLevel = () => {
      if (filterSelection.productCategory) return 'productCategory';
      if (filterSelection.subcategory) return 'subcategory';
      if (filterSelection.category) return 'category';
      return 'all';
    };
    
    const level = currentLevel();
    
    if (level === 'productCategory') {
      setDisplayItems(productCategories);
    } else if (level === 'subcategory') {
      setDisplayItems(productCategories);
    } else if (level === 'category') {
      setDisplayItems(subcategories);
    } else {
      setDisplayItems(categories);
    }
  }, [filterSelection, categories, subcategories, productCategories]);

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


  // fetch categories for dropdown
  useEffect(()=>{
    const fetchCategories = async () => {
    try {
      const res = await axiosInstance.get('/categories', { params: { limit: 1000 } });
      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      setCategories(items);
    } catch (err) {
      console.error('fetchCategories', err);
      setCategories([]);
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
      const endpoint = "/productcategories";
      const params: any = {
        page: pageToFetch,
        limit,
        search: searchQuery || undefined,
      };

      const res = await axiosInstance.get(endpoint, { params });

      const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
      const pagination = res.data.data.pagination || {};

      setProductCategories(items);
      setTotalPages(pagination.totalPages || 1);
    } catch (err) {
      console.error("Error fetching product categories:", err);
      setProductCategories([]);
    } finally {
      setLoading(false);
    }
  };

  // Generate meta data for all products missing meta info
  const generateMissingMeta = async () => {
    const productsNeedingMeta = productCategories.filter(p => 
      !p.metaTitle || !p.metaKeyword || !p.metaDescription
    );

    if (productsNeedingMeta.length === 0) {
      toast.info('All product categories already have meta data!');
      return;
    }

    const confirmed = window.confirm(
      `Generate meta data for ${productsNeedingMeta.length} product categories? This will use AI to create SEO-optimized content.`
    );

    if (!confirmed) return;

    toast.info(`Starting bulk meta generation for ${productsNeedingMeta.length} product categories...`);

    let successCount = 0;
    let errorCount = 0;

    for (const productCategory of productsNeedingMeta) {
      try {
        await generateMetaForProduct(productCategory);
        successCount++;
        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error: any) {
        errorCount++;
        console.error(`Failed to generate meta for ${productCategory.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`✅ Generated meta data for ${successCount} product categories.`);
    }
    if (errorCount > 0) {
      toast.warning(`⚠️ ${errorCount} product categories failed to generate meta data.`);
    }
    
    fetchProducts(page); // Refresh the data
  };

  // Generate meta data for a specific product
  const generateMetaForProduct = async (item: any) => {
    try {
      const categoryName = filterSelection.category?.name || filterSelection.category?.main_cat_name || '';
      const subcategoryName = filterSelection.subcategory?.name || filterSelection.subcategory?.sub_cat_name || '';
      const itemName = getName(item);
      
      const prompt = `Generate SEO meta data for this product:
      Product Name: ${itemName}
      Category: ${categoryName}
      Subcategory: ${subcategoryName}
      ${item.description ? `Description: ${item.description}` : ''}
      
      Please provide:
      1. Meta Title (max 60 characters)
      2. Meta Keywords (5-8 relevant keywords, comma-separated)
      3. Meta Description (150-160 characters)
      
      Format your response as:
      Meta Title: [title]
      Meta Keywords: [keywords]
      Meta Description: [description]`;

      const res = await axiosInstance.post('/ai/deepseek', {
        prompt,
        pageType: 'Product',
      });

      // ResponseInterceptor wraps: { success, timestamp, data: { statusCode, message, data: { content } } }
      const aiText = res.data?.data?.data?.content || '';
      
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
        name: itemName
      };
      
      if (metaTitleMatch) updatedData.metaTitle = metaTitleMatch[1].trim();
      if (metaKeywordMatch) updatedData.metaKeyword = metaKeywordMatch[1].trim();
      if (metaDescriptionMatch) updatedData.metaDescription = metaDescriptionMatch[1].trim();

      // Update the product with generated meta data
      console.log('Updating product with data:', updatedData);
      const updateResponse = await axiosInstance.patch(`/productcategories/${item._id}`, updatedData);
      
      if (updateResponse.status !== 200) {
        throw new Error(`Failed to update product: ${updateResponse.status}`);
      }
      
      toast.success(`Meta data generated for ${itemName}!`);
      
      // Refresh the appropriate list
      if (filterSelection.subcategory) {
        const res = await axiosInstance.get(`/subcategories/${filterSelection.subcategory._id}/productcategories`);
        const data = res.data?.data?.data || res.data?.data || res.data;
        setProductCategories(Array.isArray(data) ? data : []);
      } else {
        fetchProducts(page);
      }
      
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
      await axiosInstance.post('/productcategories', {
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

  // start edit - Dynamic for all levels
  const startEdit = (item: any) => {
    setEditingId(item._id);
    setFormName(getName(item));
    setFormMappedParent(
      typeof item.mappedParent === 'string'
        ? item.mappedParent
        : item.mappedParent?._id || null
    );
    setFormMetaTitle(item.metaTitle || '');
    setFormMetaKeyword(item.metaKeyword || '');
    setFormMetaDescription(item.metaDescription || '');
    setFormImageUrl(getImageUrl(item));
    setFormDescription(item.description || '');
    setShowEditModal(true);
  };

  // save edit - Dynamic for all levels (matching categories page logic)
  const saveEdit = async () => {
    if (!editingId) return;
    try {
      setLoading(true);
      const currentLevel = getCurrentLevel();
      let endpoint = '';
      let payload: any = {};
      let httpMethod: 'put' | 'patch' = 'put';
      let successMsg = '';

      if (currentLevel === 'productCategory') {
        // Editing a product category
        endpoint = `/productcategories/${editingId}`;
        httpMethod = 'patch';
        payload = {
          name: formName,
          metaTitle: formMetaTitle,
          metaDescription: formMetaDescription,
          metaKeyword: formMetaKeyword,
          description: formDescription,
          imageUrl: formImageUrl || '',
        };
        successMsg = `Product category ${formName} updated successfully!`;
      } else if (currentLevel === 'subcategory') {
        // Editing a subcategory
        endpoint = `/subcategories/${editingId}`;
        payload = {
          name: formName,
          metaTitle: formMetaTitle,
          metaDescription: formMetaDescription,
          metaKeyword: formMetaKeyword,
          description: formDescription,
          sub_cat_img_url: formImageUrl || '',
          mappedParent: formMappedParent,
        };
        successMsg = `Subcategory ${formName} updated successfully!`;
      } else {
        // Editing a category
        endpoint = `/categories/${editingId}`;
        payload = {
          main_cat_name: formName,
          metaTitle: formMetaTitle,
          metaDescription: formMetaDescription,
          metaKeyword: formMetaKeyword,
          description: formDescription,
          imageUrl: formImageUrl || '',
        };
        successMsg = `Category ${formName} updated successfully!`;
      }

      const res = httpMethod === 'patch' 
        ? await axiosInstance.patch(endpoint, payload)
        : await axiosInstance.put(endpoint, payload);
        
      if (res.status === 200 || res.status === 201) {
        toast.success(successMsg);
        setShowEditModal(false);
        setEditingId(null);
        
        // Update local state immediately to reflect changes in UI
        if (currentLevel === 'productCategory') {
          setProductCategories(prev => prev.map(item => 
            item._id === editingId 
              ? { ...item, ...payload, _id: item._id }
              : item
          ));
        } else if (currentLevel === 'subcategory') {
          setSubcategories(prev => prev.map(item => 
            item._id === editingId 
              ? { ...item, ...payload, _id: item._id }
              : item
          ));
        } else {
          setCategories(prev => prev.map(item => 
            item._id === editingId 
              ? { ...item, ...payload, _id: item._id }
              : item
          ));
        }
      } else {
        toast.error('Failed to update');
      }
    } catch (err: any) {
      console.error("Update failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoading(false);
    }
  };


  // delete - Dynamic for all levels (matching categories page logic)
  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      setLoading(true);
      const currentLevel = getCurrentLevel();
      let endpoint = '';
      let successMsg = '';

      if (currentLevel === 'productCategory' || (filterSelection.subcategory && !filterSelection.productCategory)) {
        endpoint = `/productcategories/${deletingId}`;
        successMsg = 'Product category deleted successfully!';
      } else if (currentLevel === 'subcategory' || (filterSelection.category && !filterSelection.subcategory)) {
        endpoint = `/subcategories/${deletingId}`;
        successMsg = 'Subcategory deleted successfully!';
      } else {
        endpoint = `/categories/${deletingId}`;
        successMsg = 'Category deleted successfully!';
      }

      const res = await axiosInstance.delete(endpoint);
      if (res.status === 200) {
        toast.success(successMsg);
      }
      
      setShowDeleteModal(false);
      setDeletingId(null);
      
      // Refresh the appropriate list (matching delete type detection logic)
      if (currentLevel === 'productCategory' || (filterSelection.subcategory && !filterSelection.productCategory)) {
        // Refreshing product categories
        if (filterSelection.subcategory) {
          const res = await axiosInstance.get(`/subcategories/${filterSelection.subcategory._id}/productcategories`);
          const data = res.data?.data?.data || res.data?.data || res.data;
          setProductCategories(Array.isArray(data) ? data : []);
        }
      } else if (currentLevel === 'subcategory' || (filterSelection.category && !filterSelection.subcategory)) {
        // Refreshing subcategories
        if (filterSelection.category) {
          const res = await axiosInstance.get(`/categories/${filterSelection.category._id}/subcategories`);
          const responseData = res.data?.data || res.data;
          const subcategoriesData = responseData?.data || responseData;
          setSubcategories(Array.isArray(subcategoriesData) ? subcategoriesData : []);
        }
      } else {
        // Refreshing categories
        const res = await axiosInstance.get('/categories', { params: { limit: 1000 } });
        const items = Array.isArray(res.data.data.data) ? res.data.data.data : [];
        setCategories(items);
      }
    } catch (err) {
      toast.error('Delete failed');
      console.error('Delete failed:', err);
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
                    <h1 className="text-3xl font-bold text-slate-900">
                      {getCurrentLevel() === 'productCategory' ? 'Product Categories' :
                       getCurrentLevel() === 'subcategory' ? 'Product Categories' :
                       getCurrentLevel() === 'category' ? 'Subcategories' : 'Categories'}
                    </h1>
                    <p className="text-slate-600 font-medium">Manage your hierarchical data with advanced features</p>
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
                      Add Product Category
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Hierarchical Filter and Breadcrumb */}
          <HierarchicalFilterSidebar
            onFilterChange={handleFilterChange}
            currentSelection={filterSelection}
          />

          <HierarchicalBreadcrumb
            selection={filterSelection}
            onNavigate={handleBreadcrumbNavigate}
          />

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
                  <p className="text-sm font-medium text-blue-700">
                    {getCurrentLevel() === 'productCategory' ? 'Total Product Categories' :
                     getCurrentLevel() === 'subcategory' || getCurrentLevel() === 'category' ? 'Total Subcategories' : 'Total Categories'}
                  </p>
                  <p className="text-2xl font-bold text-blue-900">{displayItems.length}</p>
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
                    {productCategories.filter(p => p.metaTitle && p.metaDescription).length}
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
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {getCurrentLevel() === 'productCategory' ? 'Product Category' :
                       getCurrentLevel() === 'subcategory' || getCurrentLevel() === 'category' ? 'Subcategory' : 'Category'}
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Title</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Keywords</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Meta Description</th>
                    {!isManagerViewOnly && <th className="px-6 py-4 text-center text-xs font-semibold text-slate-700 uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200">
                  {loading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}

                  {!loading && displayItems.length === 0 && (
                    <tr>
                      <td colSpan={isManagerViewOnly ? 6 : 7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                          <p className="text-slate-500 font-medium">No items found</p>
                          <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
                        </div>
                      </td>
                    </tr>
                  )}

                  {!loading && displayItems.map((item, idx) => (
                    <tr 
                      key={item._id} 
                      onClick={() => handleRowClick(item)}
                      className="hover:bg-slate-50/50 transition-colors duration-200 cursor-pointer">
                      <td className="px-6 py-4 text-sm font-medium text-slate-900" onClick={(e) => e.stopPropagation()}>{(page - 1) * limit + idx + 1}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {getImageUrl(item) ? (
                          <a href={getImageUrl(item)} target="_blank" rel="noreferrer" className="block">
                            <img 
                              src={getImageUrl(item)} 
                              alt={getName(item)} 
                              className="h-12 w-12 rounded-xl object-cover shadow-md border border-slate-200 hover:shadow-lg transition-all duration-200" 
                            />
                          </a>
                        ) : (
                          <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center">
                            <span className="text-slate-600 font-semibold text-lg">{getName(item).charAt(0).toUpperCase()}</span>
                          </div>
                        )}
                      </td>
                   
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="space-y-1">
                            <p className="font-semibold text-slate-900">{getName(item)}</p>
                            {item.mappedChildren && item.mappedChildren.length > 0 && (
                              <div className="text-sm text-slate-500 mt-1">
                                {item.mappedChildren.length} {getCurrentLevel() === 'all' ? 'subcategories' : 'items'}
                              </div>
                            )}
                          </div>
                          {getCurrentLevel() !== 'productCategory' && (
                            <FiChevronRight className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {item.metaTitle ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 break-words meta-scrollable meta-title-scrollable">
                              <span className="font-medium">{item.metaTitle}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No meta title
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {item.metaKeyword ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 break-words meta-scrollable meta-keywords-scrollable">
                              <span className="font-medium">{item.metaKeyword}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No keywords
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        {item.metaDescription ? (
                          <div className="max-w-xs">
                            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-3 text-xs text-green-900 break-words meta-scrollable meta-description-scrollable">
                              <span className="font-medium">{item.metaDescription}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-500">
                            No description
                          </span>
                        )}
                      </td>
                      {!isManagerViewOnly && (
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={(e) => { e.stopPropagation(); startEdit(item); }} 
                              className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                            >
                              <TbEdit className="w-4 h-4" />
                              Edit
                            </button>
                            {(!item.metaTitle || !item.metaKeyword || !item.metaDescription) && getCurrentLevel() === 'all' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); generateMetaForProduct(item); }}
                                className="inline-flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                                🤖 AI Meta
                              </button>
                            )}
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeletingId(item._id); setShowDeleteModal(true); }} 
                              className="inline-flex items-center gap-2 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105"
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
