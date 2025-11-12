"use client";
import { useState } from "react";
import { TbFilter, TbX, TbRefresh, TbCheck } from "react-icons/tb";

interface FilterSidebarProps {
  categories: { _id: string; main_cat_name: string; subcategories: { _id: string; name: string }[] }[];
  selectedCategories: string[];
  selectedSubcategories: string[];
  setSelectedCategories: (cats: string[]) => void;
  setSelectedSubcategories: (subs: string[]) => void;
  onApply: () => void;
  onReset: () => void;
}

export default function FilterSidebar({
  categories,
  selectedCategories,
  selectedSubcategories,
  setSelectedCategories,
  setSelectedSubcategories,
  onApply,
  onReset,
}: FilterSidebarProps) {
  const [open, setOpen] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  const toggleCategory = (id: string) => {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== id));
    } else {
      setSelectedCategories([...selectedCategories, id]);
    }
  };

  const toggleSubcategory = (id: string) => {
    if (selectedSubcategories.includes(id)) {
      setSelectedSubcategories(selectedSubcategories.filter((s) => s !== id));
    } else {
      setSelectedSubcategories([...selectedSubcategories, id]);
    }
  };

  const toggleCategoryExpansion = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getFilterCount = () => {
    return selectedCategories.length + selectedSubcategories.length;
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const { scrollTop, scrollHeight, clientHeight } = target;
    
    setShowScrollTop(scrollTop > 20);
    setShowScrollBottom(scrollTop < scrollHeight - clientHeight - 20);
  };

  const scrollToTop = () => {
    const scrollContainer = document.querySelector('.filter-scrollbar');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const scrollToBottom = () => {
    const scrollContainer = document.querySelector('.filter-scrollbar');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <>
      {/* Enhanced Filter Button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
      >
        <TbFilter className="w-5 h-5" />
        Filters
        {getFilterCount() > 0 && (
          <span className="bg-white/20 text-white px-2 py-1 rounded-full text-xs font-medium">
            {getFilterCount()}
          </span>
        )}
      </button>

      {/* Enhanced Sidebar with Backdrop */}
      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" 
            onClick={() => setOpen(false)}
          />
          
          {/* Sidebar */}
          <div className="fixed top-0 right-0 w-96 h-full bg-white shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                  <TbFilter className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Filters</h2>
                {getFilterCount() > 0 && (
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                    {getFilterCount()} applied
                  </span>
                )}
              </div>
              <button 
                onClick={() => setOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors duration-200"
              >
                <TbX className="w-5 h-5" />
              </button>
            </div>

            {/* Content - Scrollable */}
            <div className="flex-1 flex flex-col p-6">
              <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-3 mb-4">
                Categories & Subcategories
              </h3>
              
              {/* Scrollable Categories Container */}
              <div 
                className="flex-1 overflow-y-auto pr-2 space-y-4 filter-scrollbar relative" 
                style={{ 
                  maxHeight: 'calc(100vh - 220px)',
                  scrollBehavior: 'smooth'
                }}
                onScroll={handleScroll}
              >
                {/* Scroll to top indicator */}
                {showScrollTop && (
                  <button
                    onClick={scrollToTop}
                    className="sticky top-2 left-full z-10 ml-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 opacity-80 hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                )}
                
                {categories.map((cat) => (
                  <div key={cat._id} className="border border-slate-200 rounded-xl p-4 bg-slate-50/50">
                    {/* Category Header */}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-3 font-medium text-slate-900 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(cat._id)}
                            onChange={() => toggleCategory(cat._id)}
                            className="sr-only"
                          />
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                            selectedCategories.includes(cat._id) 
                              ? 'bg-blue-600 border-blue-600' 
                              : 'border-slate-300 group-hover:border-blue-400'
                          }`}>
                            {selectedCategories.includes(cat._id) && (
                              <TbCheck className="w-3 h-3 text-white" />
                            )}
                          </div>
                        </div>
                        <span className="group-hover:text-blue-600 transition-colors duration-200">
                          {cat.main_cat_name}
                        </span>
                      </label>
                      
                      {cat.subcategories.length > 0 && (
                        <button
                          onClick={() => toggleCategoryExpansion(cat._id)}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors duration-200"
                        >
                          <svg 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              expandedCategories.has(cat._id) ? 'rotate-180' : ''
                            }`} 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      )}
                    </div>

                    {/* Subcategories */}
                    {expandedCategories.has(cat._id) && cat.subcategories.length > 0 && (
                      <div className="mt-3 ml-8 space-y-2 border-l-2 border-slate-200 pl-4">
                        {cat.subcategories.map((sub) => (
                          <label key={sub._id} className="flex items-center gap-3 text-sm cursor-pointer group">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedSubcategories.includes(sub._id)}
                                onChange={() => toggleSubcategory(sub._id)}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                                selectedSubcategories.includes(sub._id) 
                                  ? 'bg-emerald-500 border-emerald-500' 
                                  : 'border-slate-300 group-hover:border-emerald-400'
                              }`}>
                                {selectedSubcategories.includes(sub._id) && (
                                  <TbCheck className="w-2.5 h-2.5 text-white" />
                                )}
                              </div>
                            </div>
                            <span className="text-slate-700 group-hover:text-emerald-600 transition-colors duration-200">
                              {sub.name}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Scroll to bottom indicator */}
                {showScrollBottom && categories.length > 3 && (
                  <button
                    onClick={scrollToBottom}
                    className="sticky bottom-2 left-full z-10 ml-2 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all duration-200 opacity-80 hover:opacity-100"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Scroll indicator */}
              <div className="mt-4 pt-3 border-t border-slate-200">
                <p className="text-xs text-slate-500 text-center flex items-center justify-center gap-2">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                  Scroll to see all {categories.length} categories
                </p>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-6 border-t border-slate-200 bg-slate-50/50">
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    onReset();
                    setOpen(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition-colors duration-200 font-medium"
                >
                  <TbRefresh className="w-4 h-4" />
                  Reset
                </button>
                <button
                  onClick={() => {
                    onApply();
                    setOpen(false);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg hover:scale-105 transition-all duration-200"
                >
                  <TbCheck className="w-4 h-4" />
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
