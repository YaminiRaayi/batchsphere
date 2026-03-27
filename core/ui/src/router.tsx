import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { DashboardPage } from "./features/dashboard/DashboardPage";
import { GrnPage } from "./features/grn/GrnPage";
import { InventoryPage } from "./features/inventory/InventoryPage";
import { MasterDataPage } from "./features/master-data/MasterDataPage";
import { SamplingPage } from "./features/sampling/SamplingPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "master-data", element: <MasterDataPage /> },
      { path: "inbound/grn", element: <GrnPage /> },
      { path: "qc/sampling", element: <SamplingPage /> },
      { path: "inventory", element: <InventoryPage /> }
    ]
  }
]);
