import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: number;
  name: string;
  price: number;
  quantity: number;
}

export interface CurrentUser {
  id: number;
  name: string;
  username: string;
  role: string;
}

export interface ActiveShift {
  id: number;
  periodId: number;
  userId: number;
  cashDrawerId: number;
  openingCash: number;
  startTime: string;
}

export interface ActivePeriod {
  id: number;
  date: string;
  startTime: string;
}

interface PosStore {
  // Auth
  currentUser: CurrentUser | null;
  setCurrentUser: (user: CurrentUser | null) => void;

  // Period
  activePeriod: ActivePeriod | null;
  setActivePeriod: (period: ActivePeriod | null) => void;

  // Shift
  activeShift: ActiveShift | null;
  setActiveShift: (shift: ActiveShift | null) => void;

  // Cart
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;

  // UI
  activeCategory: number | null;
  setActiveCategory: (id: number | null) => void;
}

export const usePosStore = create<PosStore>()(
  persist(
    (set) => ({
      currentUser: null,
      setCurrentUser: (user) => set({ currentUser: user }),

      activePeriod: null,
      setActivePeriod: (period) => set({ activePeriod: period }),

      activeShift: null,
      setActiveShift: (shift) => set({ activeShift: shift }),

      cart: [],
      addToCart: (item) =>
        set((state) => {
          const existing = state.cart.find((c) => c.productId === item.productId);
          if (existing) {
            return {
              cart: state.cart.map((c) =>
                c.productId === item.productId
                  ? { ...c, quantity: c.quantity + 1 }
                  : c
              ),
            };
          }
          return { cart: [...state.cart, { ...item, quantity: 1 }] };
        }),
      removeFromCart: (productId) =>
        set((state) => ({ cart: state.cart.filter((c) => c.productId !== productId) })),
      updateQuantity: (productId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { cart: state.cart.filter((c) => c.productId !== productId) };
          }
          return {
            cart: state.cart.map((c) =>
              c.productId === productId ? { ...c, quantity } : c
            ),
          };
        }),
      clearCart: () => set({ cart: [] }),

      activeCategory: null,
      setActiveCategory: (id) => set({ activeCategory: id }),
    }),
    {
      name: 'pos-storage',
    }
  )
);
