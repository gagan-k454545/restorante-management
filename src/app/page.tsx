import Link from 'next/link';
import {
  QrCode,
  ChefHat,
  LayoutDashboard,
  Utensils,
  Receipt,
  Bell,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-orange-500 selection:text-white">
      {/* Background ambient glow effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-gradient-to-b from-orange-600/20 via-amber-600/10 to-transparent blur-3xl opacity-70" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[300px] bg-gradient-to-t from-purple-900/15 to-transparent blur-3xl opacity-60" />
      </div>

      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 backdrop-blur-md bg-slate-950/60 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-orange-500/25 ring-1 ring-white/20">
              SG
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-tight text-white flex items-center gap-1.5">
                Spice Garden <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">SaaS OS</span>
              </span>
              <p className="text-[10px] text-slate-400 font-medium">Realtime Dine-In Table Ordering System</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>System Operational</span>
            </div>
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800/90 hover:bg-slate-750 text-slate-200 border border-slate-700/80 hover:border-slate-600 transition shadow-sm"
            >
              Staff Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full space-y-12">
        <div className="text-center space-y-4 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Built for Modern High-Volume Indian Restaurants</span>
            <span className="text-slate-600">•</span>
            <span className="text-orange-400 font-semibold">Zero-Friction QR</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            The Complete Dine-In <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-400 bg-clip-text text-transparent">
              QR Ordering & Kitchen OS
            </span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Experience lightning-fast table ordering, live kitchen ticket board, waiter alerts, and statutory GST invoicing—all synchronized in real-time.
          </p>
        </div>

        {/* Action Surfaces Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 1. Customer Experience */}
          <Link
            href="/t/demo"
            className="group relative rounded-2xl p-6 bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 hover:border-orange-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center group-hover:scale-105 transition">
                <Utensils className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white group-hover:text-orange-400 transition">
                    Customer Experience
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    Table 1
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Simulate a diner scanning Table 1 QR. Browse 30+ dishes, customize spice levels & family portions, add to cart, and place orders.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-orange-400">
              <span>Launch Table 1 Menu</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* 2. Kitchen Display System (KDS) */}
          <Link
            href="/kitchen"
            className="group relative rounded-2xl p-6 bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/5 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
                <ChefHat className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white group-hover:text-emerald-400 transition">
                    Kitchen Display (KDS)
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Real-time 3-column ticket pipeline for kitchen chefs (NEW ➔ IN PREP ➔ READY) with live warn/late timers, ticket audio chime, and 60s undo.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-emerald-400">
              <span>Open Kitchen Monitor</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>

          {/* 3. Admin & Staff Console */}
          <Link
            href="/admin/dashboard"
            className="group relative rounded-2xl p-6 bg-gradient-to-b from-slate-900/90 to-slate-900/40 border border-slate-800 hover:border-purple-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
                <LayoutDashboard className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-white group-hover:text-purple-400 transition">
                    Admin & Management
                  </h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    Full Control
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Live table floor map (T1–T8), held order approval queue, billing sessions, discounts with manager PINs, table moves, and walk-out write-offs.
                </p>
              </div>
            </div>

            <div className="pt-6 mt-4 border-t border-slate-800/80 flex items-center justify-between text-xs font-semibold text-purple-400">
              <span>Open Admin Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition" />
            </div>
          </Link>
        </div>

        {/* Secondary Modules Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link
            href="/waiter"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">Waiter Console</h4>
              <p className="text-[11px] text-slate-400">Live service bell & bill alerts</p>
            </div>
          </Link>

          <Link
            href="/admin/reports"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">Reports & GST</h4>
              <p className="text-[11px] text-slate-400">Statutory GSTR-1 & revenue</p>
            </div>
          </Link>

          <Link
            href="/api/ready"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">Readiness Probe</h4>
              <p className="text-[11px] text-slate-400">Database & engine health</p>
            </div>
          </Link>

          <Link
            href="/login"
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 hover:bg-slate-900 transition flex items-center gap-3.5"
          >
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-xs text-white">Staff Credentials</h4>
              <p className="text-[11px] text-slate-400">Argon2 role authorization</p>
            </div>
          </Link>
        </div>

        {/* Demo Credentials Card */}
        <div className="rounded-2xl p-5 bg-gradient-to-r from-slate-900/80 via-slate-900/50 to-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="text-xs font-bold text-white flex items-center gap-2 justify-center sm:justify-start">
              <Zap className="w-4 h-4 text-amber-400" />
              Pre-Configured Demo Credentials
            </h4>
            <p className="text-[11px] text-slate-400">
              Sign into staff surfaces using <span className="text-slate-200 font-mono">owner@spicegarden.com</span> with password <span className="text-slate-200 font-mono">Password123!</span> (Manager PIN: <span className="text-slate-200 font-mono">123456</span>)
            </p>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20 transition flex-shrink-0"
          >
            Sign In with 1-Click →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Spice Garden Hospitality LLP • Enterprise Dine-In SaaS</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/api/health" className="hover:text-slate-300 transition">Health</Link>
            <span>•</span>
            <Link href="/api/ready" className="hover:text-slate-300 transition">Database</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-300 transition">Staff Portal</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
