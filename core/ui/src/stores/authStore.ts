import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "../types/auth";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string;
  user: AuthUser | null;
  isAuthenticated: boolean;
  setSession: (payload: {
    accessToken: string;
    refreshToken?: string | null;
    tokenType?: string;
    user: AuthUser;
  }) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      tokenType: "Bearer",
      user: null,
      isAuthenticated: false,
      setSession: ({ accessToken, refreshToken, tokenType = "Bearer", user }) =>
        set((state) => ({
          accessToken,
          refreshToken: refreshToken ?? state.refreshToken,
          tokenType,
          user,
          isAuthenticated: true
        })),
      clearSession: () =>
        set({
          accessToken: null,
          refreshToken: null,
          tokenType: "Bearer",
          user: null,
          isAuthenticated: false
        })
    }),
    {
      name: "batchsphere-auth"
    }
  )
);
