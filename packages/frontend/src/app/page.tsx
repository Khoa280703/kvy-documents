'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../hooks/use-auth';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) router.replace('/login');
    else if (user.role === 'admin') router.replace('/admin/dashboard');
    else router.replace('/seller/dashboard');
  }, [user, isLoading, router]);

  return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
}
