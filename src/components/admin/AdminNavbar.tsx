'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  ChefHat,
  Bell,
  Receipt,
  LogOut,
  ShieldCheck,
  User,
  Menu,
  X,
  ExternalLink,
} from 'lucide-react';

export function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setCurrentUser(json.data);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    // Navigate to login
    router.push('/login');
  };

  const navItems = [
    {
      label: 'Dashboard & Tables',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      active: pathname === '/admin/dashboard',
    },
    {
      label: 'Kitchen KDS',
      href: '/kitchen',
      icon: ChefHat,
      active: pathname === '/kitchen',
    },
    {
      label: 'Waiter Calls',
      href: '/waiter',
      icon: Bell,
      active: pathname === '/waiter',
    },
    {
      label: 'Reports & GST',
      href: '/admin/reports',
      icon: Receipt,
      active: pathname === '/admin/reports',
    },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand & Portal Badge */}
        <div className="flex items-center gap-6">
          <Link href="/admin/dashboard" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-orange-500/20 group-hover:scale-105 transition">
              SG
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-sm tracking-tight text-white group-hover:text-orange-400 transition">
                  Spice Garden
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 border border-orange-500/30 uppercase tracking-wider">
                  Admin
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Operations Console</p>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 pl-2 border-l border-slate-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    item.active
                      ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${item.active ? 'text-orange-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Controls: Staff user, Live badge, Logout */}
        <div className="hidden sm:flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Live Sync</span>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* User profile */}
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-xs font-bold text-orange-400">
              {currentUser?.name ? currentUser.name[0] : 'S'}
            </div>
            <div className="text-left text-xs">
              <p className="font-bold text-white leading-none">
                {currentUser?.name || 'Staff User'}
              </p>
              <p className="text-[10px] text-slate-400 font-semibold leading-tight pt-0.5">
                {currentUser?.role || 'OWNER'}
              </p>
            </div>
          </div>

          {/* Customer Preview button */}
          <Link
            href="/t/demo"
            target="_blank"
            title="Open Customer Menu in new tab"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-[11px] font-bold border border-slate-700 transition"
          >
            <span>Customer View</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Mobile menu hamburger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/t/demo"
            target="_blank"
            className="text-[10px] px-2 py-1 rounded bg-slate-800 text-orange-400 font-bold border border-slate-700"
          >
            Customer View
          </Link>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg bg-slate-800 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t border-slate-800 bg-slate-900 px-4 py-3 space-y-2 animate-in fade-in">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold ${
                  item.active
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {currentUser?.name || 'Staff User'} ({currentUser?.role || 'OWNER'})
            </span>
            <button
              onClick={handleLogout}
              className="px-3 py-1 bg-slate-800 text-slate-300 rounded font-semibold text-xs"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}