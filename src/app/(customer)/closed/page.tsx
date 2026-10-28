'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { QrCode, AlertCircle, ArrowLeft, Utensils } from 'lucide-react';

function ClosedContent() {
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  let title = 'Table Ordering Unavailable';
  let message = 'This QR code is not valid anymore. Please ask our service staff for assistance.';

  if (reason === 'invalid_qr') {
    title = 'Invalid Table QR Code';
    message = 'This QR code is not recognized or has been regenerated. Please rescan the physical table QR stand or ask your waiter.';
  } else if (reason === 'session_closed') {
    title = 'Table Session Settled';
    message = "This table's dining session and bill have been completed. Please scan the QR code again to start a new dining round.";
  } else if (reason === 'restaurant_closed') {
    title = 'Kitchen Currently Closed';
    message = 'Our kitchen is currently closed for dine-in orders. Please check our opening hours.';
  }

  return (
    <div className="max-w-md w-full bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5 text-slate-100">
      <div className="w-16 h-16 mx-auto rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 shadow-lg shadow-orange-500/10">
        <QrCode className="w-8 h-8" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-xl font-black text-white tracking-tight">{title}</h1>
        <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">{message}</p>
      </div>

      <div className="pt-4 border-t border-slate-800 flex flex-col gap-2">
        <Link
          href="/t/demo"
          className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs rounded-xl shadow-lg shadow-orange-500/20 transition"
        >
          Simulate Table 1 QR Scan →
        </Link>
        <Link
          href="/"
          className="w-full py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-300 font-semibold text-xs rounded-xl transition"
        >
          Return to Home
        </Link>
      </div>

      <p className="text-[10px] text-slate-600 pt-1">
        Spice Garden Dine-In • Realtime QR Hospitality OS
      </p>
    </div>
  );
}

export default function ClosedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-orange-500 selection:text-white">
      <Suspense fallback={<div className="text-xs text-slate-500">Loading details...</div>}>
        <ClosedContent />
      </Suspense>
    </div>
  );
}