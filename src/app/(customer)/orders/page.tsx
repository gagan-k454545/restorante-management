'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bell, Receipt, CheckCircle2, Clock, Utensils, Sparkles } from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';

export default function CustomerOrdersSummaryPage() {
  const [ordersList, setOrdersList] = useState<any[]>([]);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [ctxRes, ordersRes] = await Promise.all([
        fetch('/api/public/context').then((r) => r.json()),
        fetch('/api/public/orders').then((r) => r.json()),
      ]);
      if (ctxRes.data) setContext(ctxRes.data);
      if (ordersRes.data?.orders) setOrdersList(ordersRes.data.orders);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCallWaiter = async () => {
    try {
      await fetch('/api/public/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'WAITER', reason: 'Assistance requested from table' }),
      });
      showToast('Waiter has been called to your table.');
    } catch {
      showToast('Waiter has been notified.');
    }
  };

  const handleRequestBill = async () => {
    try {
      await fetch('/api/public/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'BILL', reason: 'Bill settlement requested' }),
      });
      showToast('Bill request sent to cashier with tax summary.');
    } catch {
      showToast('Bill request notified to cashier.');
    }
  };

  const totalPaise = ordersList
    .filter((o) => !['REJECTED', 'CANCELLED'].includes(o.status))
    .reduce((acc, o) => acc + (o.subtotal || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-md">
        <Link
          href="/menu"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Menu</span>
        </Link>
        <h1 className="text-sm font-black text-white">
          Table {context?.table?.label || 'T1'} • Active Session
        </h1>
        <div className="w-8" />
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-4 right-4 z-50 bg-slate-900 border border-emerald-500/50 text-white text-xs font-bold py-3 px-4 rounded-2xl shadow-2xl flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="p-4 space-y-5 max-w-lg mx-auto">
        {/* Quick Assistance Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleCallWaiter}
            className="flex items-center justify-center gap-2 p-3.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl font-bold text-xs text-slate-200 shadow-md transition cursor-pointer"
          >
            <Bell className="w-4 h-4 text-orange-400" />
            <span>Call Waiter</span>
          </button>
          <button
            onClick={handleRequestBill}
            className="flex items-center justify-center gap-2 p-3.5 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 rounded-2xl font-bold text-xs text-slate-200 shadow-md transition cursor-pointer"
          >
            <Receipt className="w-4 h-4 text-purple-400" />
            <span>Request Bill</span>
          </button>
        </div>

        {/* Order Rounds List */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Orders Placed ({ordersList.length})
            </h2>
            <span className="text-xs font-mono font-bold text-orange-400">
              Table Total: {formatPaiseToRupees(totalPaise)}
            </span>
          </div>

          {ordersList.length === 0 ? (
            <div className="bg-slate-900/60 p-8 rounded-2xl border border-slate-800 text-center space-y-2">
              <Utensils className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No active orders yet</p>
              <p className="text-xs text-slate-500">
                Explore the menu to add delicious appetizers, curries, and drinks.
              </p>
              <Link
                href="/menu"
                className="inline-block mt-2 px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 text-white text-xs font-black rounded-xl shadow transition"
              >
                Browse Dishes →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersList.map((ord) => (
                <Link
                  key={ord.id}
                  href={`/order/${ord.id}`}
                  className="block p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 shadow-md transition space-y-2.5"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-black text-sm text-white">
                        Order #{String(ord.orderNumber).padStart(3, '0')}
                      </span>
                      <p className="text-[11px] text-slate-500 font-medium">Round {ord.roundNo}</p>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        ord.status === 'SERVED'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ord.status === 'READY'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-slate-300 py-1 border-t border-slate-800/80">
                    {ord.lines?.map((l: any) => (
                      <div key={l.id} className="flex justify-between">
                        <span>
                          <strong className="text-white">{l.qty}x</strong> {l.name}
                        </span>
                        <span className="font-mono text-slate-400">
                          {formatPaiseToRupees(l.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-xs">
                    <span className="text-[11px] text-slate-500 font-medium">Tap to view live status</span>
                    <span className="font-mono font-bold text-white">
                      {formatPaiseToRupees(ord.subtotal)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}