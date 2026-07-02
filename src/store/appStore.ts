import "react-native-get-random-values";
import { v4 as uuidv4 } from "uuid";
import { create } from "zustand";

export interface CartItem {
  skuId: string;
  name: string;
  price: number;
  boxes: number;
}

interface AppState {
  // Device Configuration
  deviceId: string;
  isAdmin: boolean;

  // Active Invoice Session State
  currentShopId: string | null;
  currentShopName: string | null;
  cart: Record<string, CartItem>; // Key: skuId

  // Sync Status Flag
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  setAdminStatus: (status: boolean) => void;
  selectShop: (id: string, name: string) => void;
  clearShopSelection: () => void;

  // Cart Actions
  updateCartQuantity: (
    skuId: string,
    name: string,
    price: number,
    delta: number,
    remainingStock: number,
  ) => void;
  clearCart: () => void;
  resetInvoiceSession: () => void;

  // Sync Actions
  setSyncingStatus: (status: boolean) => void;
  setLastSyncedTime: (time: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Initialize device ID uniquely once per app session (simplifies multi-device tracing)
  deviceId: uuidv4(),
  isAdmin: false,

  currentShopId: null,
  currentShopName: null,
  cart: {},

  isSyncing: false,
  lastSyncedAt: null,

  setAdminStatus: (status) => set({ isAdmin: status }),

  selectShop: (id, name) => set({ currentShopId: id, currentShopName: name }),

  clearShopSelection: () => set({ currentShopId: null, currentShopName: null }),

  updateCartQuantity: (skuId, name, price, delta, remainingStock) =>
    set((state) => {
      const existingItem = state.cart[skuId];
      const currentBoxes = existingItem ? existingItem.boxes : 0;
      const newBoxes = currentBoxes + delta;

      const updatedCart = { ...state.cart };

      // Enforce lower bound (0) and upper bound (available stock in van)
      if (newBoxes <= 0) {
        delete updatedCart[skuId];
      } else if (newBoxes <= remainingStock) {
        updatedCart[skuId] = { skuId, name, price, boxes: newBoxes };
      }

      return { cart: updatedCart };
    }),

  clearCart: () => set({ cart: {} }),

  resetInvoiceSession: () =>
    set({ currentShopId: null, currentShopName: null, cart: {} }),

  setSyncingStatus: (status) => set({ isSyncing: status }),

  setLastSyncedTime: (time) => set({ lastSyncedAt: time }),
}));
