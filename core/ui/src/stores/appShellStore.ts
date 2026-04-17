import { create } from "zustand";
import { persist } from "zustand/middleware";

type CurrentUser = {
  name: string;
  role: string;
  initials: string;
};

const DEFAULT_CURRENT_USER: CurrentUser = {
  name: "Indu Raghav",
  role: "Operations Admin",
  initials: "IN"
};

type AppShellState = {
  sidebarCollapsed: boolean;
  activeWarehouse: string;
  currentUser: CurrentUser;
  selectedBatchId: string | null;
  setSidebarCollapsed: (value: boolean) => void;
  setActiveWarehouse: (value: string) => void;
  setSelectedBatchId: (value: string | null) => void;
  setCurrentUser: (value: CurrentUser) => void;
  resetCurrentUser: () => void;
};

export const useAppShellStore = create<AppShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeWarehouse: "Hyderabad",
      currentUser: DEFAULT_CURRENT_USER,
      selectedBatchId: null,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setActiveWarehouse: (value) => set({ activeWarehouse: value }),
      setSelectedBatchId: (value) => set({ selectedBatchId: value }),
      setCurrentUser: (value) => set({ currentUser: value }),
      resetCurrentUser: () => set({ currentUser: DEFAULT_CURRENT_USER })
    }),
    {
      name: "batchsphere-app-shell"
    }
  )
);
