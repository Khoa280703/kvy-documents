'use client';
import Link from 'next/link';
import { useAuth } from '../../hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'admin') router.replace('/login');
  }, [user, isLoading, router]);

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  return (
    <div className="min-h-screen">
      <nav className="bg-gray-800 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-lg">Admin Panel</span>
          <div className="flex gap-4 items-center">
            <Link href="/admin/dashboard" className="hover:text-gray-300">Pending Reviews</Link>
            <Link href="/admin/audit" className="hover:text-gray-300">Audit Log</Link>
            <button onClick={handleLogout} className="hover:text-red-400">Logout</button>
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
