import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string; // unique cart entry key
  itemId: string;
  variantId?: string;
  modifierOptionIds: string[];
  name: string;
  variantName?: string;
  unitPrice: number; // in paise
  qty: number;
  note?: string;
  isAllergyNote?: boolean;
}

interface CartState {
  items: CartItem[];
  orderNote: string;
  guestName: string;
  addItem: (item: Omit<CartItem, 'id'>) => void;
  updateQty: (cartId: string, qty: number) => void;
  removeItem: (cartId: string) => void;
  setOrderNote: (note: string) => void;
  setGuestName: (name: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      orderNote: '',
      guestName: '',
      addItem: (item) => {
        const existing = get().items.find(
          (i) =>
            i.itemId === item.itemId &&
            i.variantId === item.variantId &&
            JSON.stringify(i.modifierOptionIds.sort()) === JSON.stringify(item.modifierOptionIds.sort())
        );

        if (existing) {
          set({
            items: get().items.map((i) =>
              i.id === existing.id ? { ...i, qty: Math.min(20, i.qty + item.qty) } : i
            ),
          });
        } else {
          const newEntry: CartItem = {
            ...item,
            id: `${item.itemId}-${item.variantId || 'base'}-${Date.now()}-${Math.random()}`,
          };
          set({ items: [...get().items, newEntry] });
        }
      },
      updateQty: (cartId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.id !== cartId) });
        } else {
          set({
            items: get().items.map((i) =>
              i.id === cartId ? { ...i, qty: Math.min(20, qty) } : i
            ),
          });
        }
      },
      removeItem: (cartId) => {
        set({ items: get().items.filter((i) => i.id !== cartId) });
      },
      setOrderNote: (note) => set({ orderNote: note }),
      setGuestName: (name) => set({ guestName: name }),
      clearCart: () => set({ items: [], orderNote: '' }),
    }),
    {
      name: 'qr_customer_cart',
    }
  )
);
