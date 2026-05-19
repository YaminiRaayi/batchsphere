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
const ComplaintListPage = lazy(() =>
  import("./features/qms/ComplaintListPage").then((module) => ({ default: module.ComplaintListPage }))
);
const ComplaintDetailPage = lazy(() =>
  import("./features/qms/ComplaintDetailPage").then((module) => ({ default: module.ComplaintDetailPage }))
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
const SupplierQualityAgreementsPage = lazy(() => import("./features/master-data/partners/SupplierQualityAgreementsPage"));
const MaterialsPage = lazy(() => import("./features/master-data/materials/MaterialsPage"));
const MaterialCreatePage = lazy(() => import("./features/master-data/materials/MaterialCreatePage"));
const SpecsPage = lazy(() => import("./features/master-data/qc-refs/SpecsPage"));
const MoaPage = lazy(() => import("./features/master-data/qc-refs/MoaPage"));
const SamplingToolsPage = lazy(() => import("./features/master-data/qc-refs/SamplingToolsPage"));
const UserManagementPage = lazy(() =>
  import("./features/admin/UserManagementPage").then((module) => ({ default: module.UserManagementPage }))
);
const SecurityAuditPage = lazy(() =>
  import("./features/admin/SecurityAuditPage")
);
const EmployeeDirectoryPage = lazy(() =>
  import("./features/hrms/EmployeeDirectoryPage").then((module) => ({ default: module.EmployeeDirectoryPage }))
);
const TrainingPage = lazy(() =>
  import("./features/hrms/TrainingPage").then((module) => ({ default: module.TrainingPage }))
);
const EquipmentPage = lazy(() =>
  import("./features/lims/EquipmentPage").then((module) => ({ default: module.EquipmentPage }))
);
const EquipmentDetailPage = lazy(() =>
  import("./features/lims/EquipmentDetailPage").then((module) => ({ default: module.EquipmentDetailPage }))
);
const RetentionSamplePage = lazy(() =>
  import("./features/lims/RetentionSamplePage").then((module) => ({ default: module.RetentionSamplePage }))
);
const RetentionSampleDetailPage = lazy(() =>
  import("./features/lims/RetentionSampleDetailPage").then((module) => ({ default: module.RetentionSampleDetailPage }))
);
const ReagentInventoryPage = lazy(() =>
  import("./features/lims/ReagentInventoryPage").then((module) => ({ default: module.ReagentInventoryPage }))
);
const ReferenceStandardsPage = lazy(() =>
  import("./features/lims/ReferenceStandardsPage").then((module) => ({ default: module.ReferenceStandardsPage }))
);
const StabilityPage = lazy(() =>
  import("./features/lims/StabilityPage").then((module) => ({ default: module.StabilityPage }))
);
const EnvironmentalMonitoringPage = lazy(() =>
  import("./features/lims/EnvironmentalMonitoringPage").then((module) => ({ default: module.EnvironmentalMonitoringPage }))
);
const LogbookPage = lazy(() =>
  import("./features/lims/LogbookPage").then((module) => ({ default: module.LogbookPage }))
);
const LimsDashboardPage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsDashboardPage }))
);
const LimsWorksheetsPage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsWorksheetsPage }))
);
const LimsOosInvestigationsPage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsOosInvestigationsPage }))
);
const LimsCoaPage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsCoaPage }))
);
const LimsReportsPage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsReportsPage }))
);
const LimsCompliancePage = lazy(() =>
  import("./features/lims/LimsNavigationPages").then((module) => ({ default: module.LimsCompliancePage }))
);
const RiskRegisterPage = lazy(() =>
  import("./features/qms/RiskRegisterPage").then((module) => ({ default: module.RiskRegisterPage }))
);
const RiskAssessmentDetailPage = lazy(() =>
  import("./features/qms/RiskAssessmentDetailPage").then((module) => ({ default: module.RiskAssessmentDetailPage }))
);
const ApqrPage = lazy(() =>
  import("./features/qms/ApqrPage").then((module) => ({ default: module.ApqrPage }))
);
const QpBatchReleasePage = lazy(() =>
  import("./features/qms/QpBatchReleasePage").then((module) => ({ default: module.QpBatchReleasePage }))
);
const TraceabilityPage = lazy(() =>
  import("./features/qms/TraceabilityPage").then((module) => ({ default: module.TraceabilityPage }))
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
              { path: "lims/dashboard", element: renderLazyRoute(<LimsDashboardPage />), handle: { breadcrumb: "LIMS Dashboard" } },
              { path: "lims/sampling", element: renderLazyRoute(<SamplingPage />), handle: { breadcrumb: "QC Sampling" } },
              { path: "lims/worksheets", element: renderLazyRoute(<LimsWorksheetsPage />), handle: { breadcrumb: "Worksheets" } },
              { path: "lims/oos-investigations", element: renderLazyRoute(<LimsOosInvestigationsPage />), handle: { breadcrumb: "OOS Investigations" } },
              { path: "lims/specifications", element: renderLazyRoute(<SpecsPage />), handle: { breadcrumb: "Specifications" } },
              { path: "lims/methods", element: renderLazyRoute(<MoaPage />), handle: { breadcrumb: "Methods / MoA" } },
              { path: "lims/sampling-tools", element: renderLazyRoute(<SamplingToolsPage />), handle: { breadcrumb: "Sampling Tools" } },
              { path: "qms/deviations", element: renderLazyRoute(<DeviationListPage />), handle: { breadcrumb: "Deviations" } },
              { path: "qms/deviations/:deviationId", element: renderLazyRoute(<DeviationDetailPage />), handle: { breadcrumb: "Deviation Detail" } },
              { path: "qms/capas", element: renderLazyRoute(<CapaBoardPage />), handle: { breadcrumb: "CAPAs" } },
              { path: "qms/analytics", element: renderLazyRoute(<QmsAnalyticsPage />), handle: { breadcrumb: "QMS Analytics" } },
              { path: "qms/change-controls", element: renderLazyRoute(<ChangeControlPage />), handle: { breadcrumb: "Change Controls" } },
              { path: "qms/complaints", element: renderLazyRoute(<ComplaintListPage />), handle: { breadcrumb: "Complaints" } },
              { path: "qms/complaints/:complaintId", element: renderLazyRoute(<ComplaintDetailPage />), handle: { breadcrumb: "Complaint Detail" } },
              { path: "documents", element: renderLazyRoute(<DocumentsPage />), handle: { breadcrumb: "Documents" } },
              { path: "lims/equipment", element: renderLazyRoute(<EquipmentPage />), handle: { breadcrumb: "Equipment" } },
              { path: "lims/equipment/:equipmentId", element: renderLazyRoute(<EquipmentDetailPage />), handle: { breadcrumb: "Equipment Detail" } },
              { path: "lims/reagents", element: renderLazyRoute(<ReagentInventoryPage />), handle: { breadcrumb: "Reagents" } },
              { path: "lims/reference-standards", element: renderLazyRoute(<ReferenceStandardsPage />), handle: { breadcrumb: "Reference Standards" } },
              { path: "lims/stability", element: renderLazyRoute(<StabilityPage />), handle: { breadcrumb: "Stability" } },
              { path: "lims/stability/:studyId", element: renderLazyRoute(<StabilityPage />), handle: { breadcrumb: "Stability Detail" } },
              { path: "lims/env-monitoring", element: renderLazyRoute(<EnvironmentalMonitoringPage />), handle: { breadcrumb: "Environmental Monitoring" } },
              { path: "lims/logbook", element: renderLazyRoute(<LogbookPage />), handle: { breadcrumb: "Instrument Logbook" } },
              { path: "lims/retention-samples", element: renderLazyRoute(<RetentionSamplePage />), handle: { breadcrumb: "Retention Samples" } },
              { path: "lims/retention-samples/:id", element: renderLazyRoute(<RetentionSampleDetailPage />), handle: { breadcrumb: "Retention Sample Detail" } },
              { path: "lims/coa", element: renderLazyRoute(<LimsCoaPage />), handle: { breadcrumb: "CoA / Lab Certificates" } },
              { path: "lims/reports", element: renderLazyRoute(<LimsReportsPage />), handle: { breadcrumb: "Lab Reports" } },
              { path: "qms/risk-register", element: renderLazyRoute(<RiskRegisterPage />), handle: { breadcrumb: "Risk Register" } },
              { path: "qms/risk-register/:assessmentId", element: renderLazyRoute(<RiskAssessmentDetailPage />), handle: { breadcrumb: "Risk Assessment" } },
              { path: "qms/apqr", element: renderLazyRoute(<ApqrPage />), handle: { breadcrumb: "APQR" } },
              { path: "qms/batch-release", element: renderLazyRoute(<QpBatchReleasePage />), handle: { breadcrumb: "QP Batch Release" } },
              { path: "qms/traceability", element: renderLazyRoute(<TraceabilityPage />), handle: { breadcrumb: "Lot Traceability" } }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "QC_MANAGER"]} />,
            children: [
              { path: "lims/compliance", element: renderLazyRoute(<LimsCompliancePage />), handle: { breadcrumb: "Lab Compliance" } },
              { path: "compliance/alcoa-readiness", element: renderLazyRoute(<LimsCompliancePage />), handle: { breadcrumb: "ALCOA++ Readiness" } }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN", "PROCUREMENT", "QC_MANAGER"]} />,
            children: [
              {
                path: "supplier-quality-agreements",
                element: renderLazyRoute(<SupplierQualityAgreementsPage />),
                handle: { breadcrumb: "Supplier Quality Agreements" }
              }
            ]
          },
          {
            element: <ProtectedRoute allowedRoles={["SUPER_ADMIN"]} />,
            children: [
              { path: "hrms/employees", element: renderLazyRoute(<EmployeeDirectoryPage />), handle: { breadcrumb: "Employees" } },
              { path: "hrms/training", element: renderLazyRoute(<TrainingPage />), handle: { breadcrumb: "Training" } },
              { path: "hrms", element: <Navigate to="/hrms/employees" replace />, handle: { breadcrumb: "HRMS" } },
              { path: "admin/users", element: renderLazyRoute(<UserManagementPage />), handle: { breadcrumb: "User Management" } },
              { path: "admin/security-audit", element: renderLazyRoute(<SecurityAuditPage />), handle: { breadcrumb: "Security Audit" } }
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
