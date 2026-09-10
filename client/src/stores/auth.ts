import { create } from "zustand";

export type AuthUser = { id: string; email: string; displayName: string; createdAt?: string };

interface AuthState {
  user: AuthUser | null;
  setUser: (u: AuthUser | null) => void;
  loading: boolean;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  loading: true,
  setLoading: (loading) => set({ loading }),
}));
