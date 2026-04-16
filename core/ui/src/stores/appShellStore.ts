import { create } from "zustand";
import { persist } from "zustand/middleware";

type CurrentUser = {
  name: string;
  role: string;
  initials: string;
};

type AppShellState = {
  sidebarCollapsed: boolean;
  activeWarehouse: string;
  currentUser: CurrentUser;
  selectedBatchId: string | null;
  setSidebarCollapsed: (value: boolean) => void;
  setActiveWarehouse: (value: string) => void;
  setSelectedBatchId: (value: string | null) => void;
};

export const useAppShellStore = create<AppShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      activeWarehouse: "Hyderabad",
      currentUser: {
        name: "Indu Raghav",
        role: "Operations Admin",
        initials: "IN"
      },
      selectedBatchId: null,
      setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
      setActiveWarehouse: (value) => set({ activeWarehouse: value }),
      setSelectedBatchId: (value) => set({ selectedBatchId: value })
    }),
    {
      name: "batchsphere-app-shell"
    }
  )
);
