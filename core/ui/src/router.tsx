import { lazy, Suspense, type ReactNode } from "react";
import { Navigate, createBrowserRouter } from "react-router-dom";
import { PageErrorBoundary } from "./components/PageErrorBoundary";
import { PageSkeleton } from "./components/PageSkeleton";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./shell/AppShell";

const LoginPage = lazy(() =>
  import("./features/auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
const AccessDeniedPage = lazy(() =>
  import("./features/auth/AccessDeniedPage").then((module) => ({ default: module.AccessDeniedPage }))
);
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
const DeviationListPage = lazy(() =>
  import("./features/qms/DeviationListPage").then((module) => ({ default: module.DeviationListPage }))
);
const DeviationDetailPage = lazy(() =>
  import("./features/qms/DeviationDetailPage").then((module) => ({ default: module.DeviationDetailPage }))
);
const CapaBoardPage = lazy(() =>
  import("./features/qms/CapaBoardPage").then((module) => ({ default: module.CapaBoardPage }))
);
const QmsAnalyticsPage = lazy(() =>
  import("./features/qms/QmsAnalyticsPage").then((module) => ({ default: module.QmsAnalyticsPage }))
);
const ChangeControlPage = lazy(() =>
  import("./features/qms/ChangeControlPage").then((module) => ({ default: module.ChangeControlPage }))
);
const DocumentsPage = lazy(() =>
  import("./features/documents/DocumentsPage").then((module) => ({ default: module.DocumentsPage }))
);
const WarehousePage = lazy(() =>
  import("./features/warehouse/WarehousePage").then((module) => ({ default: module.WarehousePage }))
);
const MasterDataLayout = lazy(() => import("./features/master-data/MasterDataLayout"));
const SuppliersPage = lazy(() => import("./features/master-data/partners/SuppliersPage"));
const VendorsPage = lazy(() => import("./features/master-data/partners/VendorsPage"));
const VendorBUsPage = lazy(() => import("./features/master-data/partners/VendorBUsPage"));
const MaterialsPage = lazy(() => import("./features/master-data/materials/MaterialsPage"));
const MaterialCreatePage = lazy(() => import("./features/master-data/materials/MaterialCreatePage"));
const SpecsPage = lazy(() => import("./features/master-data/qc-refs/SpecsPage"));
const MoaPage = lazy(() => import("./features/master-data/qc-refs/MoaPage"));
const SamplingToolsPage = lazy(() => import("./features/master-data/qc-refs/SamplingToolsPage"));
const UserManagementPage = lazy(() =>
  import("./features/admin/UserManagementPage").then((module) => ({ default: module.UserManagementPage }))
);
const EmployeeDirectoryPage = lazy(() =>
  import("./features/hrms/EmployeeDirectoryPage").then((module) => ({ default: module.EmployeeDirectoryPage }))
);
const TrainingPage = lazy(() =>
  import("./features/hrms/TrainingPage").then((module) => ({ default: module.TrainingPage }))
);

function renderLazyRoute(element: ReactNode) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>{element}</Suspense>
    </PageErrorBoundary>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    element: renderLazyRoute(<LoginPage />)
  },
  {
    path: "/forbidden",
    element: renderLazyRoute(<AccessDeniedPage />)
  },
  {
    element: <ProtectedRoute />,
    children: [
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
              {
                element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "PROCUREMENT"]} />,
                path: "partners",
                handle: { breadcrumb: "Partners" },
                children: [
                  { path: "suppliers", element: renderLazyRoute(<SuppliersPage />), handle: { breadcrumb: "Suppliers" } },
                  { path: "vendors", element: renderLazyRoute(<VendorsPage />), handle: { breadcrumb: "Vendors" } },
                  { path: "vendors/:vendorId", element: renderLazyRoute(<VendorsPage />), handle: { breadcrumb: "Vendor Details" } },
                  {
                    path: "vendor-business-units",
                    element: renderLazyRoute(<VendorBUsPage />),
                    handle: { breadcrumb: "Vendor BUs" }
                  }
                ]
              },
              {
                element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER", "PROCUREMENT"]} />,
                path: "materials",
                handle: { breadcrumb: "Materials" },
                children: [
                  { path: "materials", element: renderLazyRoute(<MaterialsPage />), handle: { breadcrumb: "Materials" } },
                  {
                    element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER"]} />,
                    children: [
                      { path: "new", element: renderLazyRoute(<MaterialCreatePage />), handle: { breadcrumb: "New Material" } }
                    ]
                  }
                ]
              },
              {
                element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_OP", "QC_ANALYST", "QC_MANAGER"]} />,
                path: "locations",
                handle: { breadcrumb: "Locations" },
                children: [
                  { path: "warehouse", element: renderLazyRoute(<WarehousePage />), handle: { breadcrumb: "Warehouse" } }
                ]
              },
              {
                element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER", "PROCUREMENT"]} />,
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
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "WAREHOUSE_OP"]} />,
            children: [
              { path: "inbound/grn", element: renderLazyRoute(<GrnPage />), handle: { breadcrumb: "Inbound GRN" } },
              { path: "inventory", element: renderLazyRoute(<InventoryPage />), handle: { breadcrumb: "Inventory" } },
              { path: "warehouse", element: renderLazyRoute(<WarehousePage />), handle: { breadcrumb: "Warehouse" } }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER"]} />,
            children: [
              { path: "qc/sampling", element: renderLazyRoute(<SamplingPage />), handle: { breadcrumb: "Sampling & QC" } },
              { path: "qms/deviations", element: renderLazyRoute(<DeviationListPage />), handle: { breadcrumb: "Deviations" } },
              { path: "qms/deviations/:deviationId", element: renderLazyRoute(<DeviationDetailPage />), handle: { breadcrumb: "Deviation Detail" } },
              { path: "qms/capas", element: renderLazyRoute(<CapaBoardPage />), handle: { breadcrumb: "CAPAs" } },
              { path: "qms/analytics", element: renderLazyRoute(<QmsAnalyticsPage />), handle: { breadcrumb: "QMS Analytics" } },
              { path: "qms/change-controls", element: renderLazyRoute(<ChangeControlPage />), handle: { breadcrumb: "Change Controls" } },
              { path: "documents", element: renderLazyRoute(<DocumentsPage />), handle: { breadcrumb: "Documents" } }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />,
            children: [
              { path: "hrms/employees", element: renderLazyRoute(<EmployeeDirectoryPage />), handle: { breadcrumb: "Employees" } },
              { path: "hrms/training", element: renderLazyRoute(<TrainingPage />), handle: { breadcrumb: "Training" } },
              { path: "hrms", element: <Navigate to="/hrms/employees" replace />, handle: { breadcrumb: "HRMS" } },
              { path: "admin/users", element: renderLazyRoute(<UserManagementPage />), handle: { breadcrumb: "User Management" } }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "PROCUREMENT"]} />,
            children: [
              {
                path: "vendor-qualifications",
                element: <Navigate to="/master-data/partners/vendors" replace />,
                handle: { breadcrumb: "Vendor Management" }
              }
            ]
          }
        ]
      }
    ]
  }
]);
