'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  UtensilsCrossed,
  Receipt,
  QrCode,
  Bell,
  AlertTriangle,
  Check,
  X,
  ChefHat,
  LogOut,
  TrendingUp,
  Clock,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatPaiseToRupees } from '@/lib/money';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTableForQr, setSelectedTableForQr] = useState<string | null>(null);

  const [tablesList, setTablesList] = useState<any[]>([
    { id: '1', label: 'T1', zone: 'Ground Floor', capacity: 2, status: 'Seated', ordersCount: 2, billTotalPaise: 78000 },
    { id: '2', label: 'T2', zone: 'Ground Floor', capacity: 4, status: 'Free', ordersCount: 0, billTotalPaise: 0 },
    { id: '3', label: 'T3', zone: 'Ground Floor', capacity: 2, status: 'Bill requested', ordersCount: 1, billTotalPaise: 46000 },
    { id: '4', label: 'T4', zone: 'Ground Floor', capacity: 4, status: 'Free', ordersCount: 0, billTotalPaise: 0 },
    { id: '5', label: 'T5', zone: 'Terrace Dining', capacity: 2, status: 'Seated', ordersCount: 1, billTotalPaise: 29000 },
    { id: '6', label: 'T6', zone: 'Terrace Dining', capacity: 4, status: 'Free', ordersCount: 0, billTotalPaise: 0 },
    { id: '7', label: 'T7', zone: 'Terrace Dining', capacity: 2, status: 'Free', ordersCount: 0, billTotalPaise: 0 },
    { id: '8', label: 'T8', zone: 'Terrace Dining', capacity: 4, status: 'Free', ordersCount: 0, billTotalPaise: 0 },
  ]);

  const loadData = async () => {
    try {
      setIsRefreshing(true);
      const [userRes, ordersRes] = await Promise.all([
        fetch('/api/auth/me').then((r) => r.json()),
        fetch('/api/staff/orders').then((r) => r.json()),
      ]);
      if (userRes.data) setCurrentUser(userRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 4000);
    return () => clearInterval(interval);
  }, []);

  const heldOrders = orders.filter((o) => o.status === 'PENDING_CONFIRMATION');
  const activeOrders = orders.filter((o) =>
    ['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(o.status)
  );

  const occupiedCount = tablesList.filter((t) => t.status !== 'Free').length;
  const occupancyPercent = Math.round((occupiedCount / tablesList.length) * 100);
  const totalOpenBillPaise = tablesList.reduce((acc, t) => acc + (t.billTotalPaise || 0), 0);

  const handleConfirmOrder = async (orderId: string, version: number) => {
    try {
      await fetch(`/api/staff/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'PLACED', version }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to confirm order', err);
    }
  };

  const handleRejectOrder = async (orderId: string, version: number) => {
    const reason = prompt('Reason for rejecting order:') || 'Rejected by staff';
    try {
      await fetch(`/api/staff/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: 'REJECTED', reason, version }),
      });
      loadData();
    } catch (err) {
      console.error('Failed to reject order', err);
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
      console.error('Failed to mark served', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {/* Shared Admin Navbar */}
      <AdminNavbar />

      {/* Held Orders Warning Bar */}
      {heldOrders.length > 0 && (
        <section className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 px-6 py-2.5 shadow-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 animate-bounce flex-shrink-0" />
            <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
              {heldOrders.length} New Device Order{heldOrders.length > 1 ? 's' : ''} Awaiting Table Confirmation
            </span>
          </div>
          <div className="flex items-center gap-2">
            {heldOrders.map((hOrd) => (
              <div
                key={hOrd.id}
                className="flex items-center gap-2 bg-slate-950 text-white px-3 py-1 rounded-xl text-xs font-bold shadow"
              >
                <span>{hOrd.tableLabel} ({hOrd.displayNumber})</span>
                <button
                  onClick={() => handleConfirmOrder(hOrd.id, hOrd.version)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded text-[11px] font-bold transition"
                >
                  Confirm
                </button>
                <button
                  onClick={() => handleRejectOrder(hOrd.id, hOrd.version)}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-2 py-0.5 rounded text-[11px] font-bold transition"
                >
                  Reject
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Container */}
      <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* Real-time KPI Stats Bar */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Table Occupancy</span>
              <Users className="w-4 h-4 text-orange-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {occupiedCount} / {tablesList.length} <span className="text-xs font-bold text-slate-400">({occupancyPercent}%)</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1">
              <div
                className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${occupancyPercent}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Live Tickets</span>
              <ChefHat className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {activeOrders.length} <span className="text-xs font-bold text-emerald-400">Active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {activeOrders.filter((o) => o.status === 'READY').length} ready for delivery
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Open Table Bills</span>
              <Receipt className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {formatPaiseToRupees(totalOpenBillPaise)}
            </div>
            <p className="text-[11px] text-slate-400">Estimated unbilled guest orders</p>
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/90 shadow-sm space-y-1">
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-xs font-bold uppercase tracking-wider">Kitchen Health</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div className="text-2xl font-black text-white">Normal</div>
            <p className="text-[11px] text-slate-400">Avg ticket turnaround: 12m</p>
          </div>
        </div>

        {/* Floor Map Section */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800/90 p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Floor Map & Live Tables
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  8 Tables Active
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Tap table card to review guest session, manage seat moves, or prepare invoice
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Available
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" /> Seated
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" /> Bill Requested
              </span>
            </div>
          </div>

          {/* Grid of Tables */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3.5">
            {tablesList.map((t) => {
              const isOccupied = t.status !== 'Free';
              const isBillRequested = t.status === 'Bill requested';

              return (
                <div
                  key={t.label}
                  className={`relative p-4 rounded-2xl border text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-between min-h-[135px] ${
                    isBillRequested
                      ? 'bg-purple-950/40 border-purple-500/80 hover:bg-purple-950/60 shadow-lg shadow-purple-500/10'
                      : isOccupied
                      ? 'bg-amber-950/30 border-amber-500/70 hover:bg-amber-950/50 shadow-lg shadow-amber-500/10'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="w-full flex items-center justify-between text-[10px] text-slate-400 font-bold">
                    <span>{t.capacity}P</span>
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isBillRequested
                          ? 'bg-purple-400 animate-ping'
                          : isOccupied
                          ? 'bg-amber-400'
                          : 'bg-emerald-400'
                      }`}
                    />
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-2xl font-black text-white tracking-tight">{t.label}</span>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {t.status}
                    </p>
                  </div>

                  <div className="w-full pt-1 border-t border-slate-800/60 text-[10px] font-semibold text-slate-300">
                    {t.ordersCount > 0 ? (
                      <span className="text-orange-400 font-bold">{t.ordersCount} orders</span>
                    ) : (
                      <span className="text-slate-500">Ready</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Live Orders Grid */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800/90 p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
            <div>
              <h2 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                Active Kitchen Tickets
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {activeOrders.length} In Progress
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Live stream of tickets actively being prepared in the kitchen
              </p>
            </div>
            <Link
              href="/kitchen"
              className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition"
            >
              <span>Chef KDS Board</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeOrders.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-950/40 border border-dashed border-slate-800 space-y-2">
              <ChefHat className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-bold text-slate-400">No active kitchen orders right now</p>
              <p className="text-xs text-slate-600">
                When diners order from their phone QR code, their tickets appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeOrders.map((ord) => (
                <div
                  key={ord.id}
                  className="rounded-2xl p-4 bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-base text-white">{ord.tableLabel}</span>
                        <span className="text-xs font-mono text-slate-400">{ord.displayNumber}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">Round {ord.roundNo}</p>
                    </div>

                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                        ord.status === 'READY'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : ord.status === 'PREPARING'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {ord.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 py-1 border-y border-slate-800/80 text-xs">
                    {ord.lines?.map((l: any) => (
                      <div key={l.id} className="flex justify-between items-center text-slate-300">
                        <span className="font-medium">
                          <strong className="text-white font-bold">{l.qty}x</strong> {l.name}
                        </span>
                        <span className="font-mono text-slate-400">
                          {formatPaiseToRupees(l.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {ord.status === 'READY' ? (
                    <button
                      onClick={() => handleServeOrder(ord.id, ord.version)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>Mark Delivered to Table</span>
                    </button>
                  ) : (
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Preparing in kitchen...</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
