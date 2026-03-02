import { create } from "zustand";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean; // true while checking SecureStore at boot
  setAuthenticated: (val: boolean) => void;
  setLoading: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: true,
  setAuthenticated: (val) => set({ isAuthenticated: val }),
  setLoading: (val) => set({ isLoading: val }),
}));
