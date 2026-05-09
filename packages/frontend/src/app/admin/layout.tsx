'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/use-auth';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, FileSearch, ClipboardList } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user || user.role !== 'admin') router.replace('/login');
  }, [user, isLoading, router]);

  const handleLogout = async () => { await logout(); router.replace('/login'); };

  const navItems = [
    { href: '/admin/dashboard', label: 'Pending Reviews', icon: LayoutDashboard },
    { href: '/admin/documents', label: 'All Documents', icon: FileSearch },
    { href: '/admin/audit', label: 'Audit Log', icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Navigation */}
      <nav className="bg-slate-900 text-white sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-500 text-white">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-semibold text-white">Admin Panel</span>
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <button onClick={handleLogout} className="text-sm text-slate-300 hover:text-white cursor-pointer px-3 py-2 transition-colors">
              Sign Out
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <div className="sm:hidden border-t border-slate-700">
          <div className="flex">
            {navItems.map(item => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs cursor-pointer ${
                    isActive ? 'text-blue-400' : 'text-slate-400'
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
