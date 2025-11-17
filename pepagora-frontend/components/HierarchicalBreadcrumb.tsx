'use client';

import { FiChevronRight, FiHome } from 'react-icons/fi';

type FilterSelection = {
  category: { _id: string; name?: string; main_cat_name?: string } | null;
  subcategory: { _id: string; name?: string; sub_cat_name?: string } | null;
  productCategory: { _id: string; name?: string } | null;
};

type Props = {
  selection: FilterSelection;
  onNavigate: (level: 'home' | 'category' | 'subcategory') => void;
};

type Breadcrumb = {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  active: boolean;
};

export default function HierarchicalBreadcrumb({ selection, onNavigate }: Props) {
  const getName = (item: any) => {
    return item?.name || item?.main_cat_name || item?.sub_cat_name || 'Unnamed';
  };

  const breadcrumbs: Breadcrumb[] = [
    {
      label: 'All Categories',
      icon: <FiHome className="w-4 h-4" />,
      onClick: () => onNavigate('home'),
      active: !selection.category
    }
  ];

  if (selection.category) {
    breadcrumbs.push({
      label: getName(selection.category),
      icon: <></>,
      onClick: () => onNavigate('category'),
      active: !selection.subcategory
    });
  }

  if (selection.subcategory) {
    breadcrumbs.push({
      label: getName(selection.subcategory),
      icon: <></>,
      onClick: () => onNavigate('subcategory'),
      active: !selection.productCategory
    });
  }

  if (selection.productCategory) {
    breadcrumbs.push({
      label: getName(selection.productCategory),
      icon: <></>,
      onClick: () => {},
      active: true
    });
  }

  return (
    <nav className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <FiChevronRight className="w-4 h-4 text-gray-400" />}
          <button
            onClick={crumb.onClick}
            disabled={crumb.active}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors duration-200 ${
              crumb.active
                ? 'bg-blue-100 text-blue-900 font-semibold cursor-default'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            {crumb.icon}
            <span className="text-sm">{crumb.label}</span>
          </button>
        </div>
      ))}
    </nav>
  );
}

