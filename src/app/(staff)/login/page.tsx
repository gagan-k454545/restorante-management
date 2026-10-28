'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, Mail, AlertCircle, ArrowLeft, ShieldCheck, Sparkles, UserCheck, ChefHat, Bell } from 'lucide-react';

export default function StaffLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('owner@spicegarden.com');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    setPassword('Password123!');
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Invalid email or password');
      }

      if (json.data?.user?.role === 'KITCHEN') {
        router.push('/kitchen');
      } else if (json.data?.user?.role === 'WAITER') {
        router.push('/waiter');
      } else {
        router.push('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-4 sm:p-6 text-slate-100 selection:bg-orange-500 selection:text-white relative overflow-hidden">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-gradient-to-tr from-orange-600/15 via-purple-600/10 to-transparent blur-3xl opacity-80" />
      </div>

      {/* Top Brand Nav */}
      <div className="max-w-md w-full mx-auto flex items-center justify-between pt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition px-2.5 py-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Secure Staff Gateway</span>
        </div>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md mx-auto my-auto">
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-2xl shadow-black/60 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-600 mx-auto flex items-center justify-center text-white font-black text-xl shadow-lg shadow-orange-500/25 ring-1 ring-white/20">
              SG
            </div>
            <h1 className="text-xl font-black tracking-tight text-white">Staff Management Portal</h1>
            <p className="text-xs text-slate-400">
              Authorized access for restaurant management, kitchen display, and floor service.
            </p>
          </div>

          {/* Quick Demo Role Switcher */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Quick Role Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setDemoRole('owner@spicegarden.com')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1 ${
                  email === 'owner@spicegarden.com'
                    ? 'bg-orange-500/15 border-orange-500 text-orange-400 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <UserCheck className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Owner/Admin</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('kitchen@spicegarden.com')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1 ${
                  email === 'kitchen@spicegarden.com'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <ChefHat className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Kitchen KDS</span>
              </button>

              <button
                type="button"
                onClick={() => setDemoRole('waiter@spicegarden.com')}
                className={`px-2.5 py-2 rounded-xl text-xs font-semibold border transition flex flex-col items-center gap-1 ${
                  email === 'waiter@spicegarden.com'
                    ? 'bg-purple-500/15 border-purple-500 text-purple-400 shadow-sm'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <Bell className="w-4 h-4" />
                <span className="text-[11px] leading-tight">Waiter Service</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-rose-950/60 border border-rose-800 p-3.5 rounded-xl text-xs text-rose-300 flex items-center gap-2.5 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-300">Staff Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-600 transition"
                  placeholder="name@spicegarden.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-300">Password</label>
                <span className="text-[10px] text-slate-500">Argon2id Hash Protected</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 placeholder-slate-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-orange-500/25 transition disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <span>Sign In to Dashboard →</span>
              )}
            </button>
          </form>

          <div className="pt-3 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Manager Approval PIN: <span className="font-mono text-slate-300 font-bold">123456</span>
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-500 py-3">
        Protected by role-based HTTP-only JWT & audit logging
      </div>
    </div>
  );
}
