// components/LogoutButton.tsx
'use client';

import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/api'; // adjust path
import { getUserId, clearAuthData } from '@/lib/auth'; // Your localStorage utils (if used)
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      const userId = getUserId(); // Function that retrieves userId from localStorage/token

      await logoutUser(userId ?? "");
      clearAuthData(); // Clears localStorage, tokens, etc.
      router.push('/login');
    } catch (error: any) {
      alert(error.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      disabled={loading}
    >
      {loading ? 'Logging out...' : 'Logout'}
    </button>
  );
}
