'use client';

import { useAuth } from '@/components/hooks/useAuth';
import SignupPage from '../signup/page';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import UserManagement from '@/components/UserManagement';

export default function AdminAccess() {
  const { userRole, loading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && userRole !== 'admin') {
      router.push('/unauthorized');
    }
  }, [userRole, loading, router]);

  if (loading) return <p className="text-center mt-10">Checking access...</p>;
  if (userRole !== 'admin') return null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'}`}>
        <div className="p-6 max-w-4xl mx-auto">
          <SignupPage />
          {/* <UserManagement /> View, Update, Delete */}
        </div>
      </div>
    </div>
  );
}
