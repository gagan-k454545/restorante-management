'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Bell,
  CheckCircle,
  Clock,
  Utensils,
  AlertTriangle,
  ArrowLeft,
  Check,
  Receipt,
  Sparkles,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

export default function WaiterConsolePage() {
  const [calls, setCalls] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [callsRes, ordersRes] = await Promise.all([
        fetch('/api/staff/calls').then((r) => r.json()),
        fetch('/api/staff/orders').then((r) => r.json()),
      ]);
      if (callsRes.data) setCalls(callsRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error('Failed to load waiter data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleResolveCall = async (callId: string) => {
    try {
      await fetch(`/api/staff/calls/${callId}`, { method: 'PATCH' });
      loadData();
    } catch (err) {
      console.error('Failed to resolve call', err);
    }
  };

  const handleServeOrder = async (orderId: string, version: number) => {
    try {
      await fetch(`/api/staff/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'SERVED', version }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to serve order', err);
    }
  };

  const readyOrders = orders.filter((o) => o.status === 'READY');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-16 font-sans selection:bg-orange-500 selection:text-white">
      {/* Shared Admin Navbar */}
      <AdminNavbar />

      {/* Waiter Sub-bar */}
      <div className="border-b border-slate-800/80 bg-slate-950/80 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            Waiter Service Console
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-wider">
              Dining Floor Live
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Active Service Floor</span>
        </div>
      </div>

      <main className="p-6 space-y-6 max-w-2xl mx-auto">
        {/* Table Assistance & Bill Requests */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-orange-400 flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-400" />
              <span>Guest Assistance Requests ({calls.length})</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">Auto-updates</span>
          </div>

          {calls.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No pending table calls</p>
              <p className="text-xs text-slate-500">All dining tables are attended to.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {calls.map((call) => (
                <div
                  key={call.id}
                  className="rounded-2xl p-4 bg-slate-900 border border-amber-500/50 shadow-lg shadow-amber-500/5 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-black text-base flex-shrink-0">
                      {call.tableLabel || 'T1'}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-2">
                        {call.type === 'BILL' ? (
                          <span className="flex items-center gap-1 text-purple-400">
                            <Receipt className="w-4 h-4" />
                            Bill Settlement Requested
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-amber-400">
                            <Bell className="w-4 h-4" />
                            Waiter Assistance Requested
                          </span>
                        )}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {call.reason || 'Guest pressed call bell from phone'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleResolveCall(call.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center gap-1.5 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Attended</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Ready to Serve Orders */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <Utensils className="w-4 h-4 text-emerald-400" />
              <span>Ready at Kitchen Pass ({readyOrders.length})</span>
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">Plate & Deliver</span>
          </div>

          {readyOrders.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1">
              <Clock className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">No orders awaiting pickup</p>
              <p className="text-xs text-slate-600">Chefs are preparing current tickets.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl p-4 bg-slate-900 border border-emerald-500/40 shadow-lg shadow-emerald-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{ord.tableLabel}</span>
                      <span className="text-xs font-mono text-emerald-400">#{ord.displayNumber}</span>
                    </div>
                    <div className="text-xs text-slate-300">
                      {ord.lines?.map((l: any) => (
                        <span key={l.id} className="mr-2">
                          <strong className="text-white">{l.qty}x</strong> {l.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleServeOrder(ord.id, ord.version)}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center justify-center gap-1.5 flex-shrink-0"
                  >
                    <Check className="w-4 h-4" />
                    <span>Delivered to Table</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}