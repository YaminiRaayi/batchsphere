import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { PageSkeleton } from "./components/PageSkeleton";
import { AppShell } from "./shell/AppShell";

const DashboardPage = lazy(() =>
  import("./features/dashboard/DashboardPage").then((module) => ({ default: module.DashboardPage }))
);
const GrnPage = lazy(() =>
  import("./features/grn/GrnPage").then((module) => ({ default: module.GrnPage }))
);
const InventoryPage = lazy(() =>
  import("./features/inventory/InventoryPage").then((module) => ({ default: module.InventoryPage }))
);
const SamplingPage = lazy(() =>
  import("./features/sampling/SamplingPage").then((module) => ({ default: module.SamplingPage }))
);
const MasterDataLayout = lazy(() => import("./features/master-data/MasterDataLayout"));
const SuppliersPage = lazy(() => import("./features/master-data/partners/SuppliersPage"));
const VendorsPage = lazy(() => import("./features/master-data/partners/VendorsPage"));
const VendorBUsPage = lazy(() => import("./features/master-data/partners/VendorBUsPage"));
const MaterialsPage = lazy(() => import("./features/master-data/materials/MaterialsPage"));
const WarehousePage = lazy(() => import("./features/master-data/locations/WarehousePage"));
const SpecsPage = lazy(() => import("./features/master-data/qc-refs/SpecsPage"));
const MoaPage = lazy(() => import("./features/master-data/qc-refs/MoaPage"));
const SamplingToolsPage = lazy(() => import("./features/master-data/qc-refs/SamplingToolsPage"));

function renderLazyRoute(element: ReactNode) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
    </PageErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    handle: { breadcrumb: "Home" },
    children: [
      { index: true, element: renderLazyRoute(<DashboardPage />), handle: { breadcrumb: "Command Center" } },
      {
        path: "master-data",
        element: renderLazyRoute(<MasterDataLayout />),
        handle: { breadcrumb: "Master Data" },
        children: [
          { index: true, element: <Navigate to="partners/suppliers" replace /> },
          {
            path: "partners",
            handle: { breadcrumb: "Partners" },
            children: [
              { path: "suppliers", element: renderLazyRoute(<SuppliersPage />), handle: { breadcrumb: "Suppliers" } },
              { path: "vendors", element: renderLazyRoute(<VendorsPage />), handle: { breadcrumb: "Vendors" } },
              {
                path: "vendor-business-units",
                element: renderLazyRoute(<VendorBUsPage />),
                handle: { breadcrumb: "Vendor BUs" }
              }
            ]
          },
          {
            path: "materials",
            handle: { breadcrumb: "Materials" },
            children: [
              { path: "materials", element: renderLazyRoute(<MaterialsPage />), handle: { breadcrumb: "Materials" } }
            ]
          },
          {
            path: "locations",
            handle: { breadcrumb: "Locations" },
            children: [
              { path: "warehouse", element: renderLazyRoute(<WarehousePage />), handle: { breadcrumb: "Warehouse" } }
            ]
          },
          {
            path: "qc-refs",
            handle: { breadcrumb: "QC Refs" },
            children: [
              { path: "specs", element: renderLazyRoute(<SpecsPage />), handle: { breadcrumb: "Specs" } },
              { path: "moa", element: renderLazyRoute(<MoaPage />), handle: { breadcrumb: "MoA" } },
              {
                path: "sampling-tools",
                element: renderLazyRoute(<SamplingToolsPage />),
                handle: { breadcrumb: "Sampling Tools" }
              }
            ]
          }
        ]
      },
      { path: "inbound/grn", element: renderLazyRoute(<GrnPage />), handle: { breadcrumb: "Inbound GRN" } },
      { path: "qc/sampling", element: renderLazyRoute(<SamplingPage />), handle: { breadcrumb: "Sampling & QC" } },
      { path: "inventory", element: renderLazyRoute(<InventoryPage />), handle: { breadcrumb: "Inventory" } }
    ]
  }
]);
