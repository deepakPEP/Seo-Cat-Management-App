'use client';

import { useState } from 'react';
import Sidebar from "@/components/Sidebar";
import UserManagement from "@/components/UserManagement";

export default function ViewUserPage() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <div className={`flex-1 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-80'}`}>
        <div className="p-6">
          <UserManagement />
        </div>
      </div>
    </div>
  );
}
