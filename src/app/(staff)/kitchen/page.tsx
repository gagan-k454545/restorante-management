'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Volume2,
  VolumeX,
  AlertTriangle,
  Check,
  RefreshCw,
  XCircle,
  ArrowLeft,
  Clock,
  RotateCcw,
  ChefHat,
  Sparkles,
} from 'lucide-react';
import { AdminNavbar } from '@/components/admin/AdminNavbar';

interface OrderLine {
  id: string;
  name: string;
  qty: number;
  modifiers: { name: string; price_delta: number }[];
  note?: string;
  isAllergyNote?: boolean;
  status: string;
  voidReason?: string;
}

interface KitchenOrder {
  id: string;
  orderNumber: number;
  displayNumber: string;
  tableLabel: string;
  status: string;
  roundNo: number;
  version: number;
  note?: string;
  placedAt: string;
  lines: OrderLine[];
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'LIVE' | 'RECONNECTING' | 'OFFLINE'>('LIVE');
  const [undoToast, setUndoToast] = useState<{ orderId: string; prevStatus: string; version: number } | null>(null);

  // Load orders
  const loadOrders = async () => {
    try {
      const res = await fetch('/api/staff/orders?status=PLACED,ACCEPTED,PREPARING,READY');
      const json = await res.json();
      if (json.data) {
        setOrders(json.data);
      }
    } catch (err) {
      console.error('Failed to load kitchen orders', err);
    }
  };

  useEffect(() => {
    loadOrders();

    // Heartbeat every 15 seconds
    const heartbeatTimer = setInterval(() => {
      fetch('/api/kds/heartbeat', { method: 'POST' }).catch(() => {});
    }, 15000);

    // SSE connection for realtime updates
    const eventSource = new EventSource('/api/staff/stream');

    eventSource.onopen = () => setConnectionStatus('LIVE');
    eventSource.onerror = () => setConnectionStatus('RECONNECTING');

    eventSource.addEventListener('order.created', () => {
      loadOrders();
    });

    eventSource.addEventListener('order.updated', () => {
      loadOrders();
    });

    // Reconcile safety poll every 3s
    const reconcileTimer = setInterval(() => {
      loadOrders();
    }, 3000);

    return () => {
      clearInterval(heartbeatTimer);
      clearInterval(reconcileTimer);
      eventSource.close();
    };
  }, [soundEnabled]);

  const handleTransition = async (orderId: string, to: string, version: number) => {
    try {
      const res = await fetch(`/api/staff/orders/${orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, version }),
      });

      if (res.ok) {
        const order = orders.find((o) => o.id === orderId);
        if (order) {
          setUndoToast({ orderId, prevStatus: order.status, version: version + 1 });
          setTimeout(() => setUndoToast(null), 60000); // 60s undo window
        }
        loadOrders();
      }
    } catch (err) {
      console.error('Transition error', err);
    }
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    try {
      await fetch(`/api/staff/orders/${undoToast.orderId}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: undoToast.prevStatus, version: undoToast.version }),
      });
      setUndoToast(null);
      loadOrders();
    } catch (err) {
      console.error('Undo error', err);
    }
  };

  // Group orders into 3 KDS columns
  const newOrders = orders.filter((o) => ['PLACED', 'ACCEPTED'].includes(o.status));
  const inPrepOrders = orders.filter((o) => o.status === 'PREPARING');
  const readyOrders = orders.filter((o) => o.status === 'READY');

  const getTimerMinutes = (placedAt: string) => {
    const diffMs = Date.now() - new Date(placedAt).getTime();
    return Math.floor(diffMs / 60000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none selection:bg-orange-500">
      {/* Shared Admin Navbar */}
      <AdminNavbar />

      {/* KDS Control Sub-bar */}
      <div className="border-b border-slate-800 bg-slate-950/90 px-6 py-2.5 flex items-center justify-between sticky top-16 z-30">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <ChefHat className="w-4 h-4" />
          </div>
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            Chef Station Ticket Pipeline
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              {orders.length} Active Tickets
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection Pill */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              connectionStatus === 'LIVE'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === 'LIVE' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
              }`}
            />
            <span>{connectionStatus}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              soundEnabled
                ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Undo Toast */}
      {undoToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-orange-500/50 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-slide-up">
          <span className="text-xs font-semibold">Order status updated.</span>
          <button
            onClick={handleUndo}
            className="px-3 py-1 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
        </div>
      )}

      {/* 3-Column KDS Ticket Board */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-x-auto">
        {/* Column 1: NEW / ACCEPTED */}
        <div className="flex flex-col space-y-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              New Tickets ({newOrders.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">Tap Start to Prep</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {newOrders.map((ord) => {
              const minutes = getTimerMinutes(ord.placedAt);
              const isLate = minutes >= 15;
              const isWarning = minutes >= 8;

              return (
                <div
                  key={ord.id}
                  className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 shadow-lg ${
                    isLate
                      ? 'bg-rose-950/40 border-rose-500 shadow-rose-950/50'
                      : isWarning
                      ? 'bg-amber-950/30 border-amber-500/70 shadow-amber-950/40'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="text-2xl font-black text-white">{ord.tableLabel}</span>
                      <p className="text-xs text-slate-400 font-mono">#{ord.displayNumber}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-xs font-mono font-bold flex items-center gap-1 ${
                          isLate ? 'text-rose-400 animate-pulse' : isWarning ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {minutes}m ago
                      </span>
                      <span className="text-[10px] text-slate-500">Round {ord.roundNo}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-1">
                    {ord.lines.map((l) => (
                      <div key={l.id} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-amber-400 text-base">{l.qty}x</span>
                          <span className="font-bold text-white">{l.name}</span>
                        </div>
                        {l.note && (
                          <p className="text-xs text-amber-300/90 pl-6 italic">Note: {l.note}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleTransition(ord.id, 'PREPARING', ord.version)}
                    className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-slate-950 font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <span>Start Preparing</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: IN PREP */}
        <div className="flex flex-col space-y-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-blue-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
              In Preparation ({inPrepOrders.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">Cooking at station</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {inPrepOrders.map((ord) => {
              const minutes = getTimerMinutes(ord.placedAt);
              const isLate = minutes >= 15;

              return (
                <div
                  key={ord.id}
                  className={`rounded-2xl p-4 border transition flex flex-col justify-between space-y-3 shadow-lg ${
                    isLate
                      ? 'bg-rose-950/40 border-rose-500 shadow-rose-950/50'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between border-b border-slate-800/80 pb-2">
                    <div>
                      <span className="text-2xl font-black text-white">{ord.tableLabel}</span>
                      <p className="text-xs text-slate-400 font-mono">#{ord.displayNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-mono font-bold text-blue-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {minutes}m prep
                      </span>
                      <span className="text-[10px] text-slate-500">Round {ord.roundNo}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 py-1">
                    {ord.lines.map((l) => (
                      <div key={l.id} className="text-sm">
                        <div className="flex items-baseline gap-2">
                          <span className="font-black text-blue-400 text-base">{l.qty}x</span>
                          <span className="font-bold text-white">{l.name}</span>
                        </div>
                        {l.note && (
                          <p className="text-xs text-amber-300/90 pl-6 italic">Note: {l.note}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleTransition(ord.id, 'READY', ord.version)}
                    className="w-full h-14 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                  >
                    <span>Mark Ready for Pickup</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 3: READY */}
        <div className="flex flex-col space-y-3 bg-slate-900/50 rounded-2xl p-4 border border-slate-800/80">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              Ready for Service ({readyOrders.length})
            </h2>
            <span className="text-[10px] text-slate-500 font-bold">Pass Counter</span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {readyOrders.map((ord) => (
              <div
                key={ord.id}
                className="rounded-2xl p-4 border bg-emerald-950/20 border-emerald-500/40 transition flex flex-col justify-between space-y-3 shadow-lg"
              >
                <div className="flex items-start justify-between border-b border-emerald-900/60 pb-2">
                  <div>
                    <span className="text-2xl font-black text-white">{ord.tableLabel}</span>
                    <p className="text-xs text-emerald-400 font-mono">#{ord.displayNumber}</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Plated & Ready
                  </span>
                </div>

                <div className="space-y-1.5 py-1">
                  {ord.lines.map((l) => (
                    <div key={l.id} className="text-sm flex items-baseline gap-2">
                      <span className="font-black text-emerald-400">{l.qty}x</span>
                      <span className="font-semibold text-slate-200">{l.name}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => handleTransition(ord.id, 'SERVED', ord.version)}
                  className="w-full h-14 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg transition active:scale-95 cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
                >
                  <Check className="w-5 h-5" />
                  <span>Picked Up by Waiter</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}