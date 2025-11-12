'use client';

import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/hooks/useAuth';
import { logoutUser } from '@/lib/api'; 
import { getUserId, clearAuthData } from '@/lib/auth'; 
import { useState } from 'react';
import { FiChevronLeft, FiChevronRight, FiMenu, FiHome, FiLayers, FiGrid, FiBox, FiUserPlus, FiUsers } from 'react-icons/fi';

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function Sidebar({ collapsed, setCollapsed }: SidebarProps) {
  const { userRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const userId = getUserId(); 
      await logoutUser(userId ?? '');
      clearAuthData(); 
      router.push('/login');
    } catch (error: any) {
      alert(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { 
      href: '/dashboard', 
      label: 'Dashboard', 
      icon: <FiHome size={20} />,
      gradient: 'from-blue-500 to-blue-600'
    },
    { 
      href: '/categories', 
      label: 'Categories', 
      icon: <FiLayers size={20} />,
      gradient: 'from-green-500 to-green-600'
    },
    { 
      href: '/subcategories', 
      label: 'Subcategories', 
      icon: <FiGrid size={20} />,
      gradient: 'from-yellow-500 to-yellow-600'
    },
    { 
      href: '/products', 
      label: 'Products', 
      icon: <FiBox size={20} />,
      gradient: 'from-purple-500 to-purple-600'
    },
  ];

  return (
    <aside
      className={`fixed top-0 left-0 h-full z-50 flex flex-col shadow-2xl transition-all duration-300 ${collapsed ? 'w-20' : 'w-72'}`}
      style={{
        background: 'linear-gradient(145deg, #0f172a, #1e293b)',
        borderRight: '1px solid rgba(255, 255, 255, 0.1)'
      }}
    >
      {/* Top: Logo & Toggle */}
      <div className={`flex items-center justify-between p-6 border-b border-white/10 ${collapsed ? 'flex-col space-y-3 p-4' : ''}`}>
        <button
          className="focus:outline-none group"
          onClick={() => router.push('/dashboard')}
        >
          <div className="w-12 h-12 bg-gradient-to-br from-red-500 via-red-600 to-pink-600 rounded-xl flex items-center justify-center cursor-pointer shadow-lg group-hover:shadow-red-500/30 transition-all duration-300 group-hover:scale-105 group-hover:rotate-3">
            <img src="/pepagora_logo.jpeg" alt="Pepagora Logo" className="w-7 h-7 object-contain" />
          </div>
        </button>
        {!collapsed && (
          <div className="flex-1 ml-4">
            <h1 className="text-xl font-bold text-white">Pepagora</h1>
            <p className="text-sm text-slate-400 font-medium">Admin Dashboard</p>
          </div>
        )}
        <button
          className="ml-2 p-2.5 rounded-xl hover:bg-white/10 focus:outline-none transition-all duration-200 text-slate-300 hover:text-white focus:ring-2 focus:ring-blue-500/50"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle sidebar"
        >
          {collapsed ? <FiChevronRight size={20} /> : <FiChevronLeft size={20} />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className={`flex-1 py-8 space-y-2 ${collapsed ? 'px-3' : 'px-6'}`}>
        {navItems.map(({ href, label, icon, gradient }) => {
          const isActive = pathname === href;
          return (
            <button
              key={href}
              className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative overflow-hidden ${
                isActive 
                  ? `bg-gradient-to-r ${gradient} text-white shadow-lg` 
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              onClick={() => collapsed ? setCollapsed(false) : router.push(href)}
              aria-label={label}
            >
              <div className={`${collapsed ? '' : 'mr-4'} flex items-center justify-center relative z-10`}>
                {icon}
              </div>
              {!collapsed && (
                <span className="transition-all duration-200 relative z-10">{label}</span>
              )}
              {!collapsed && isActive && (
                <div className="ml-auto w-2 h-2 bg-white rounded-full relative z-10"></div>
              )}
              {isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-white/10 rounded-xl"></div>
              )}
            </button>
          );
        })}

        {/* Admin Only Section */}
        {userRole === 'admin' && (
          <div className="pt-8 mt-6 border-t border-white/10 space-y-2">
            {!collapsed && (
              <div className="px-4 mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-2"></span>
                  Admin Tools
                </p>
              </div>
            )}
            <button
              className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative overflow-hidden ${
                pathname === '/AdminAccess' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              onClick={() => collapsed ? setCollapsed(false) : router.push('/AdminAccess')}
              aria-label="Add User"
            >
              <div className={`${collapsed ? '' : 'mr-4'} flex items-center justify-center relative z-10`}>
                <FiUserPlus size={20} />
              </div>
              {!collapsed && <span className="relative z-10">Add User</span>}
            </button>
            <button
              className={`w-full flex items-center ${collapsed ? 'justify-center' : ''} px-4 py-3.5 text-sm font-semibold rounded-xl transition-all duration-200 group relative overflow-hidden ${
                pathname === '/viewUser' 
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25' 
                  : 'hover:bg-white/10 text-slate-300 hover:text-white'
              }`}
              onClick={() => collapsed ? setCollapsed(false) : router.push('/viewUser')}
              aria-label="View Users"
            >
              <div className={`${collapsed ? '' : 'mr-4'} flex items-center justify-center relative z-10`}>
                <FiUsers size={20} />
              </div>
              {!collapsed && <span className="relative z-10">View Users</span>}
            </button>
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className={`w-full flex items-center justify-center px-4 py-3.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-red-500/30 hover:scale-105 focus:ring-2 focus:ring-red-500/50 ${collapsed ? 'px-0' : ''}`}
          disabled={loading}
          aria-label="Logout"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {!collapsed && <span className="ml-3">Logout</span>}
            </>
          )}
        </button>
      </div>
    </aside>
  );
}