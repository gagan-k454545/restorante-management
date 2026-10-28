'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/modules/customer/cart.store';
import { formatPaiseToRupees } from '@/lib/money';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export default function CartPage() {
  const router = useRouter();
  const cart = useCartStore();
  const [quote, setQuote] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live estimated quote from pricing module
  useEffect(() => {
    async function fetchQuote() {
      if (cart.items.length === 0) {
        setQuote(null);
        return;
      }

      try {
        const payload = {
          items: cart.items.map((i) => ({
            itemId: i.itemId,
            variantId: i.variantId,
            modifierOptionIds: i.modifierOptionIds,
            qty: i.qty,
          })),
        };

        const res = await fetch('/api/public/cart/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (data.data) {
          setQuote(data.data);
        }
      } catch (err) {
        console.error('Failed to get cart quote', err);
      }
    }

    fetchQuote();
  }, [cart.items]);

  const handlePlaceOrder = async () => {
    if (cart.items.length === 0 || isSubmitting) return;

    if (!navigator.onLine) {
      setErrorMessage('You are currently offline. Please reconnect to place your order.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const idempotencyKey = crypto.randomUUID();

    const orderPayload = {
      items: cart.items.map((i) => ({
        itemId: i.itemId,
        variantId: i.variantId,
        modifierOptionIds: i.modifierOptionIds,
        qty: i.qty,
        note: i.note,
        isAllergyNote: i.isAllergyNote || false,
      })),
      orderNote: cart.orderNote || undefined,
      guestName: cart.guestName || undefined,
      expectedSubtotal: quote?.subtotal,
    };

    try {
      const res = await fetch('/api/public/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(orderPayload),
      });

      const json = await res.json();

      if (!res.ok) {
        if (json.error?.code === 'PRICE_CHANGED') {
          setErrorMessage('Prices have changed. Please review your updated cart total.');
          return;
        }
        if (json.error?.code === 'LIMIT_REACHED' || json.error?.code === 'ITEM_UNAVAILABLE') {
          setErrorMessage(json.error.message);
          return;
        }
        throw new Error(json.error?.message || 'Failed to place order');
      }

      // Clear cart and redirect to order tracking
      cart.clearCart();
      router.push(`/order/${json.data.id}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'Network error while placing order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const addQuickInstruction = (text: string) => {
    const current = cart.orderNote || '';
    if (!current.includes(text)) {
      cart.setOrderNote(current ? `${current}, ${text}` : text);
    }
  };

  if (cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-5 text-slate-100">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <div className="space-y-1.5 max-w-xs">
          <h2 className="text-xl font-black text-white">Your Cart is Empty</h2>
          <p className="text-xs text-slate-400">
            Browse our signature tandoor, curries, and biryanis to add delicious dishes to your order.
          </p>
        </div>
        <Link
          href="/menu"
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-lg shadow-orange-500/25 transition cursor-pointer"
        >
          Explore Delicious Menu →
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-32 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-3">
          <Link
            href="/menu"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-base font-black text-white">Review Your Table Order</h1>
        </div>

        <button
          onClick={() => cart.clearCart()}
          className="text-xs text-slate-500 hover:text-rose-400 font-semibold transition"
        >
          Clear All
        </button>
      </header>

      {/* Error Banner */}
      {errorMessage && (
        <div className="m-4 bg-rose-950/60 border border-rose-800 text-rose-300 text-xs p-3.5 rounded-xl flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Container */}
      <main className="p-4 space-y-4 max-w-xl mx-auto">
        {/* Selected Items Card */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl divide-y divide-slate-800/80 overflow-hidden">
          <div className="p-3.5 bg-slate-950/50 flex items-center justify-between text-xs font-bold text-slate-400">
            <span>Selected Dishes ({cart.items.reduce((a, b) => a + b.qty, 0)})</span>
            <Link href="/menu" className="text-orange-400 hover:underline">
              + Add more items
            </Link>
          </div>

          {cart.items.map((item) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-3">
              <div className="flex-1 space-y-1">
                <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                {item.variantName && (
                  <p className="text-xs text-orange-400 font-medium">{item.variantName}</p>
                )}
                <p className="text-xs font-mono font-bold text-slate-300">
                  {formatPaiseToRupees(item.unitPrice * item.qty)}
                </p>
              </div>

              {/* Quantity Stepper */}
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-orange-500/15 border border-orange-500 rounded-xl overflow-hidden">
                  <button
                    onClick={() => cart.updateQty(item.id, item.qty - 1)}
                    className="px-2.5 py-1.5 text-orange-400 hover:bg-orange-500/20 transition cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-2 text-xs font-black text-white font-mono">{item.qty}</span>
                  <button
                    onClick={() => cart.updateQty(item.id, item.qty + 1)}
                    className="px-2.5 py-1.5 text-orange-400 hover:bg-orange-500/20 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => cart.removeItem(item.id)}
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Special Instructions & Cooking Notes */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
              Kitchen Instructions
            </h3>
            <span className="text-[10px] text-slate-500">Sent directly to chefs</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['Mild Spicy 🌿', 'Extra Spicy 🔥', 'No Onion/Garlic', 'Starters First', 'Less Oil'].map(
              (chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => addQuickInstruction(chip)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 text-[11px] font-semibold border border-slate-700 transition"
                >
                  + {chip}
                </button>
              )
            )}
          </div>

          <textarea
            placeholder="Add any specific cooking instructions or allergy alerts..."
            value={cart.orderNote}
            onChange={(e) => cart.setOrderNote(e.target.value)}
            maxLength={200}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500 resize-none h-18"
          />

          <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
            <h4 className="text-xs font-bold text-slate-400">Guest Name (Optional)</h4>
            <input
              type="text"
              placeholder="Your name for table reference"
              value={cart.guestName}
              onChange={(e) => cart.setGuestName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Estimated Bill Summary */}
        {quote && (
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl space-y-2.5 text-xs text-slate-400">
            <h3 className="font-black text-white uppercase tracking-wider text-xs pb-2 border-b border-slate-800/80 flex items-center justify-between">
              <span>Order Total Summary</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                GST Included
              </span>
            </h3>

            <div className="flex justify-between text-slate-300">
              <span>Item Subtotal</span>
              <span className="font-mono">{formatPaiseToRupees(quote.subtotal)}</span>
            </div>

            {quote.serviceCharge > 0 && (
              <div className="flex justify-between text-slate-300">
                <span>Service Charge</span>
                <span className="font-mono">{formatPaiseToRupees(quote.serviceCharge)}</span>
              </div>
            )}

            <div className="flex justify-between text-purple-400">
              <span>GST Taxes (5.0%)</span>
              <span className="font-mono font-bold">
                {formatPaiseToRupees(quote.cgstTotal + quote.sgstTotal)}
              </span>
            </div>

            {quote.roundOff !== 0 && (
              <div className="flex justify-between text-slate-500">
                <span>Round-off</span>
                <span className="font-mono">
                  {quote.roundOff > 0 ? `+${quote.roundOff}p` : `${quote.roundOff}p`}
                </span>
              </div>
            )}

            <div className="flex justify-between pt-3 border-t border-slate-800 text-base font-black text-white">
              <span>Estimated Payable</span>
              <span className="font-mono text-orange-400">{formatPaiseToRupees(quote.total)}</span>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Pay upon table settlement via UPI, Cash, or Card.
            </p>
          </div>
        )}
      </main>

      {/* Floating Bottom Place Order Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 shadow-2xl z-40">
        <div className="max-w-xl mx-auto">
          <button
            onClick={handlePlaceOrder}
            disabled={isSubmitting}
            className={`w-full py-4 rounded-2xl font-black text-sm text-white shadow-xl shadow-orange-500/25 transition cursor-pointer flex items-center justify-center gap-2 ${
              isSubmitting
                ? 'bg-orange-600/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 active:scale-[0.98]'
            }`}
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Sending to Kitchen...</span>
              </>
            ) : (
              <span>Confirm Order • {quote ? formatPaiseToRupees(quote.total) : '...'} →</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}