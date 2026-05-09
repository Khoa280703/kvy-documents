'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, LayoutDashboard, Upload } from 'lucide-react';

export default function SellerLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'seller') router.replace('/login');
  }, [user, isLoading, router]);

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const navItems = [
    { href: '/seller/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/seller/upload', label: 'Upload', icon: Upload },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
                <Shield className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-900">Seller Portal</span>
            </div>

            {/* Nav Links */}
            <div className="hidden sm:flex items-center gap-1">
              {navItems.map(item => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                      isActive
                        ? 'bg-blue-50 text-blue-700'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <button onClick={handleLogout} className="text-sm text-slate-500 hover:text-slate-700 cursor-pointer px-3 py-2">
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="sm:hidden border-t border-slate-200">
          <div className="flex">
            {navItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs cursor-pointer ${
                    isActive ? 'text-blue-600' : 'text-slate-500'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
