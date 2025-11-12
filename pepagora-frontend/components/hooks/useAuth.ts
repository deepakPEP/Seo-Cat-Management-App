// lib/hooks/useAuth.ts
'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { jwtDecode } from 'jwt-decode';

type TokenPayload = {
  sub: string;
  role: 'admin' | 'category_manager' | 'pepagora_manager';
  iat: number;
  exp: number;
};

export const useAuth = () => {
  const [token, setToken] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');

    if (!storedToken) {
      router.push('/login');
    } else {
      try {
        const decoded: TokenPayload = jwtDecode(storedToken);
        setToken(storedToken);
        setUserRole(decoded.role);
      } catch (err) {
        console.error('Invalid token:', err);
        router.push('/login');
      }
    }
    setLoading(false);
  }, [router]);

  return { token, userRole, loading };
};
