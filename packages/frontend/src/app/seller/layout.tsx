'use client';
import Link from 'next/link';
import { useAuth } from '../../hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'seller') router.replace('/login');
  }, [user, isLoading, router]);

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  return (
    <div className="min-h-screen">
      <nav className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-lg">Seller Portal</span>
          <div className="flex gap-4 items-center">
            <Link href="/seller/dashboard" className="hover:text-blue-600">Dashboard</Link>
            <Link href="/seller/upload" className="hover:text-blue-600">Upload</Link>
            <button onClick={handleLogout} className="hover:text-red-600">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
