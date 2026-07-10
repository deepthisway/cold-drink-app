import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface CartItem {
  skuId: string;
  name: string;
  price: number;
  boxes: number;
}

interface AppState {
  // Device Configuration
  deviceId: string;
  setDeviceId: (id: string) => void;
  isAdmin: boolean;
  printerAddress: string | null;
  setPrinterAddress: (address: string) => void;

  // Active Invoice Session State
  currentShopId: string | null;
  currentShopName: string | null;
  cart: Record<string, CartItem>;

  // Sync Status Flag
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  setAdminStatus: (status: boolean) => void;
  selectShop: (id: string, name: string) => void;
  clearShopSelection: () => void;

  updateCartQuantity: (
    skuId: string,
    name: string,
    price: number,
    delta: number,
    remainingStock: number,
  ) => void;
  clearCart: () => void;
  resetInvoiceSession: () => void;

  setSyncingStatus: (status: boolean) => void;
  setLastSyncedTime: (time: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      deviceId: "unassigned",
      setDeviceId: (id) => set({ deviceId: id }),

      isAdmin: false,
      printerAddress: null,
      setPrinterAddress: (address) => set({ printerAddress: address }),
      currentShopId: null,
      currentShopName: null,
      cart: {},

      isSyncing: false,
      lastSyncedAt: null,

      setAdminStatus: (status) => set({ isAdmin: status }),

      selectShop: (id, name) =>
        set({ currentShopId: id, currentShopName: name }),

      clearShopSelection: () =>
        set({ currentShopId: null, currentShopName: null }),

      updateCartQuantity: (skuId, name, price, delta, remainingStock) =>
        set((state) => {
          const existingItem = state.cart[skuId];
          const currentBoxes = existingItem ? existingItem.boxes : 0;
          const newBoxes = currentBoxes + delta;

          const updatedCart = { ...state.cart };

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
    }),
    {
      name: "cold-drink-app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      // Sirf printerAddress hi disk pe permanently save karo.
      // Baaki (cart, currentShopId, deviceId) har session fresh honi chahiye.
      partialize: (state) =>
        ({
          printerAddress: state.printerAddress,
        }) as AppState,
    },
  ),
);
