'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeToken, TokenPayload } from '@/lib/decodeToken';

export const useRoleGuard = (allowedRoles: string[]) => {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/login');
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      router.push('/login');
      return;
    }

    if (!allowedRoles.includes(decoded.role)) {
      router.push('/unauthorized'); // or some restricted page
      return;
    }

    setRole(decoded.role);
    setLoading(false);
  }, [router]);

  return { role, loading };
};
