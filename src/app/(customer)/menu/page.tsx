'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useCartStore } from '@/modules/customer/cart.store';
import { formatPaiseToRupees } from '@/lib/money';
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  AlertCircle,
  Utensils,
  Check,
  Bell,
  Clock,
  Sparkles,
  ArrowRight,
  X,
} from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  isVeg: boolean;
  tags: string[];
  availability: string;
  remainingPortions: number | null;
  prepTimeMinutes?: number;
  variants: { id: string; name: string; price: number }[];
  modifierGroups: {
    id: string;
    name: string;
    minSelect: number;
    maxSelect: number;
    options: { id: string; name: string; priceDelta: number }[];
  }[];
}

interface Category {
  id: string;
  name: string;
  items: MenuItem[];
}

export default function MenuPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [context, setContext] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [selectedItemForModal, setSelectedItemForModal] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [waiterCalled, setWaiterCalled] = useState(false);

  // Modal variant and modifier selections
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);

  const cart = useCartStore();
  const cartItemCount = cart.items.reduce((acc, i) => acc + i.qty, 0);
  const cartEstimatedTotal = cart.items.reduce((acc, i) => acc + i.unitPrice * i.qty, 0);

  useEffect(() => {
    async function loadData() {
      try {
        const [contextRes, menuRes] = await Promise.all([
          fetch('/api/public/context').then((r) => r.json()),
          fetch('/api/public/menu').then((r) => r.json()),
        ]);
        if (contextRes.data) setContext(contextRes.data);
        if (menuRes.data) {
          setCategories(menuRes.data);
          if (menuRes.data.length > 0) setActiveCategory(menuRes.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load menu data', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();

    // Setup SSE listener for live menu updates
    const eventSource = new EventSource('/api/public/stream');
    eventSource.addEventListener('menu.updated', () => {
      fetch('/api/public/menu')
        .then((r) => r.json())
        .then((d) => {
          if (d.data) setCategories(d.data);
        });
    });

    return () => {
      eventSource.close();
    };
  }, []);

  const handleCallWaiter = async () => {
    try {
      await fetch('/api/public/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'WAITER', reason: 'Assistance requested from table' }),
      });
      setWaiterCalled(true);
      setTimeout(() => setWaiterCalled(false), 8000);
    } catch (err) {
      console.error('Failed to call waiter', err);
    }
  };

  const openItemModal = (item: MenuItem) => {
    setSelectedItemForModal(item);
    setSelectedVariantId(item.variants.length > 0 ? item.variants[0].id : null);
    setSelectedModifierIds([]);
  };

  const handleAddFromModal = () => {
    if (!selectedItemForModal) return;

    let price = selectedItemForModal.basePrice;
    let variantName: string | undefined;

    if (selectedVariantId) {
      const v = selectedItemForModal.variants.find((vr) => vr.id === selectedVariantId);
      if (v) {
        price = v.price;
        variantName = v.name;
      }
    }

    for (const modId of selectedModifierIds) {
      for (const grp of selectedItemForModal.modifierGroups) {
        const opt = grp.options.find((o) => o.id === modId);
        if (opt) price += opt.priceDelta;
      }
    }

    cart.addItem({
      itemId: selectedItemForModal.id,
      variantId: selectedVariantId || undefined,
      modifierOptionIds: selectedModifierIds,
      name: selectedItemForModal.name,
      variantName,
      unitPrice: price,
      qty: 1,
    });

    setSelectedItemForModal(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4 text-slate-100">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-slate-400">Loading dining menu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 pb-28 text-slate-100 font-sans selection:bg-orange-500 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-orange-500/20">
              SG
            </div>
            <div>
              <h1 className="text-base font-black text-white leading-tight">
                {context?.restaurant?.name || 'Spice Garden Dine-In'}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.2 rounded-full">
                  Table {context?.table?.label || 'T1'}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Dine-In Menu</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCallWaiter}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-sm ${
                waiterCalled
                  ? 'bg-emerald-500/15 border border-emerald-500 text-emerald-400'
                  : 'bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${waiterCalled ? 'text-emerald-400' : 'text-orange-400'}`} />
              <span>{waiterCalled ? 'Waiter Called ✓' : 'Call Waiter'}</span>
            </button>

            <Link
              href="/orders"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 text-xs font-bold rounded-full border border-slate-800 transition"
            >
              <Utensils className="w-3.5 h-3.5 text-orange-400" />
              <span>Orders</span>
            </Link>
          </div>
        </div>

        {/* Search & Veg Filter */}
        <div className="mt-3 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search dishes, curries, biryanis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-500 pl-9 pr-3 py-2 text-xs rounded-xl focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          <button
            onClick={() => setVegOnly(!vegOnly)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition ${
              vegOnly
                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300'
            }`}
          >
            <span className="w-3.5 h-3.5 rounded border border-emerald-500 flex items-center justify-center p-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </span>
            <span>Veg Only</span>
          </button>
        </div>

        {/* Category Horizontal Chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => {
                setActiveCategory(cat.id);
                document.getElementById(`category-${cat.id}`)?.scrollIntoView({ behavior: 'smooth' });
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition border ${
                activeCategory === cat.id
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/20'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </header>

      {/* Allergies Notice */}
      <div className="bg-amber-950/40 border-b border-amber-900/50 px-4 py-2 text-[11px] text-amber-300 flex items-center gap-2">
        <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
        <span>Please notify staff of any food allergies or special dietary preferences.</span>
      </div>

      {/* Menu Categories & Items */}
      <main className="p-4 space-y-6 max-w-2xl mx-auto">
        {categories.map((cat) => {
          const filteredItems = cat.items.filter((it) => {
            if (vegOnly && !it.isVeg) return false;
            if (searchQuery && !it.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
          });

          if (filteredItems.length === 0) return null;

          return (
            <section key={cat.id} id={`category-${cat.id}`} className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-orange-500" />
                  {cat.name}
                </h2>
                <span className="text-[11px] font-bold text-slate-500 font-mono">
                  {filteredItems.length} items
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {filteredItems.map((item) => {
                  const isAvailable = item.availability === 'AVAILABLE';
                  const hasCustomizations = item.variants.length > 0 || item.modifierGroups.length > 0;
                  const cartItem = cart.items.find((i) => i.itemId === item.id);

                  return (
                    <div
                      key={item.id}
                      className={`p-4 rounded-2xl border transition-all duration-200 flex gap-4 ${
                        !isAvailable
                          ? 'opacity-50 bg-slate-900/40 border-slate-900'
                          : 'bg-slate-900/80 border-slate-800/90 hover:border-slate-700/80 shadow-md'
                      }`}
                    >
                      {/* Left: Veg badge, name, description, price */}
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-2">
                          {/* Official Indian Veg / Non-Veg Icon */}
                          <div
                            className={`w-4 h-4 border rounded flex items-center justify-center p-0.5 flex-shrink-0 ${
                              item.isVeg
                                ? 'border-emerald-500'
                                : 'border-rose-500'
                            }`}
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${
                                item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                            />
                          </div>

                          <h3 className="font-bold text-sm text-white leading-tight">
                            {item.name}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-2.5 pt-1">
                          <span className="font-black text-sm text-white">
                            {formatPaiseToRupees(item.basePrice)}
                          </span>

                          {item.prepTimeMinutes && (
                            <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                              <Clock className="w-3 h-3 text-slate-500" />
                              {item.prepTimeMinutes}m
                            </span>
                          )}

                          {item.remainingPortions !== null && item.remainingPortions <= 5 && (
                            <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full font-bold">
                              Only {item.remainingPortions} left
                            </span>
                          )}

                          {!isAvailable && (
                            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">
                              Sold Out
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right: Add / Customize / Stepper Button */}
                      <div className="flex flex-col items-end justify-center flex-shrink-0">
                        {!isAvailable ? (
                          <span className="px-3 py-1.5 bg-slate-800 text-slate-500 text-xs font-bold rounded-xl">
                            Sold Out
                          </span>
                        ) : hasCustomizations ? (
                          <button
                            onClick={() => openItemModal(item)}
                            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer flex flex-col items-center"
                          >
                            <span>ADD</span>
                            <span className="text-[9px] font-normal opacity-90">Customisable</span>
                          </button>
                        ) : cartItem ? (
                          <div className="flex items-center bg-orange-500/15 border border-orange-500 rounded-xl overflow-hidden">
                            <button
                              onClick={() => cart.updateQty(cartItem.id, cartItem.qty - 1)}
                              className="px-2.5 py-1.5 text-orange-400 hover:bg-orange-500/20 transition cursor-pointer"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="px-2 text-xs font-black text-white font-mono">
                              {cartItem.qty}
                            </span>
                            <button
                              onClick={() => cart.updateQty(cartItem.id, cartItem.qty + 1)}
                              className="px-2.5 py-1.5 text-orange-400 hover:bg-orange-500/20 transition cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() =>
                              cart.addItem({
                                itemId: item.id,
                                modifierOptionIds: [],
                                name: item.name,
                                unitPrice: item.basePrice,
                                qty: 1,
                              })
                            }
                            className="px-5 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-black rounded-xl shadow-md shadow-orange-500/20 transition cursor-pointer"
                          >
                            ADD +
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </main>

      {/* Customization Modal */}
      {selectedItemForModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in">
          <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl p-6 space-y-5 max-h-[85vh] overflow-y-auto text-slate-100 shadow-2xl">
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black text-white">{selectedItemForModal.name}</h3>
                <p className="text-xs text-slate-400">Select portion size and customizations</p>
              </div>
              <button
                onClick={() => setSelectedItemForModal(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Portion Variants */}
            {selectedItemForModal.variants.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  Portion Size
                </h4>
                <div className="space-y-2">
                  {selectedItemForModal.variants.map((v) => (
                    <label
                      key={v.id}
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                        selectedVariantId === v.id
                          ? 'border-orange-500 bg-orange-500/10 font-bold text-white shadow-sm'
                          : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-950'
                      }`}
                    >
                      <span>{v.name}</span>
                      <span className="font-mono text-white">{formatPaiseToRupees(v.price)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Modifier Groups (e.g. Spice Level) */}
            {selectedItemForModal.modifierGroups.map((grp) => (
              <div key={grp.id} className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                  {grp.name}
                </h4>
                <div className="space-y-2">
                  {grp.options.map((opt) => {
                    const isSelected = selectedModifierIds.includes(opt.id);
                    return (
                      <label
                        key={opt.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedModifierIds(selectedModifierIds.filter((id) => id !== opt.id));
                          } else {
                            if (grp.maxSelect === 1) {
                              const otherGroupOptionIds = grp.options.map((o) => o.id);
                              setSelectedModifierIds([
                                ...selectedModifierIds.filter((id) => !otherGroupOptionIds.includes(id)),
                                opt.id,
                              ]);
                            } else {
                              setSelectedModifierIds([...selectedModifierIds, opt.id]);
                            }
                          }
                        }}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition ${
                          isSelected
                            ? 'border-orange-500 bg-orange-500/10 font-bold text-white shadow-sm'
                            : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:bg-slate-950'
                        }`}
                      >
                        <span>{opt.name}</span>
                        <span className="font-mono text-slate-300">
                          {opt.priceDelta > 0 ? `+${formatPaiseToRupees(opt.priceDelta)}` : 'Free'}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}

            <button
              onClick={handleAddFromModal}
              className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-sm rounded-xl shadow-lg shadow-orange-500/25 transition cursor-pointer"
            >
              Add to Order
            </button>
          </div>
        </div>
      )}

      {/* Floating Glassmorphic Cart Bar */}
      {cartItemCount > 0 && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-lg mx-auto">
          <Link
            href="/cart"
            className="flex items-center justify-between w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-5 py-3.5 rounded-2xl font-black text-sm shadow-2xl shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 border border-white/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="leading-tight block">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-[11px] font-normal opacity-90">View items in cart</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-base">{formatPaiseToRupees(cartEstimatedTotal)}</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}