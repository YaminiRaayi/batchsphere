import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  downloadCsvExport,
  fetchAlcoaReadinessGaps,
  fetchAlcoaReadinessSummary,
  fetchDueForDisposalRetentionSamples,
  fetchEmBreaches,
  fetchEquipmentSummary,
  fetchExpiringReagentLots,
  fetchExpiringReferenceStandardLots,
  fetchExpiringSoonRetentionSamples,
  fetchQcInvestigationQueue,
  fetchQpBatchReleases,
  fetchRetentionSampleSummary,
  fetchSamplingRequests,
  fetchSamplingSummary,
  fetchStabilityStudies
} from "../../lib/api";
import type { QcInvestigation, SamplingRequest } from "../../types/sampling";
import { useAuthStore } from "../../stores/authStore";

const cardCls = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
const linkCls = "rounded-lg border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50";

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function Kpi({ label, value, to, tone = "teal" }: { label: string; value: number | string; to?: string; tone?: "teal" | "amber" | "red" | "blue" | "slate" }) {
  const toneClass = {
    teal: "border-l-teal-500 text-teal-700",
    amber: "border-l-amber-500 text-amber-700",
    red: "border-l-red-500 text-red-700",
    blue: "border-l-blue-500 text-blue-700",
    slate: "border-l-slate-500 text-slate-700"
  }[tone];
  const body = (
    <div className={`${cardCls} border-l-4 ${toneClass}`}>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </div>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function StatusPill({ value }: { value: string }) {
  const failed = value.includes("OOS") || value.includes("FAIL") || value.includes("REJECT");
  const done = value.includes("COMPLETE") || value.includes("CERTIFIED") || value.includes("CLOSED");
  return (
    <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${failed ? "bg-red-100 text-red-700" : done ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
      {value.split("_").join(" ")}
    </span>
  );
}

function MiniTable<T>({
  rows,
  empty,
  render
}: {
  rows: T[];
  empty: string;
  render: (row: T) => ReactNode;
}) {
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {rows.length ? rows.map(render) : <div className="px-4 py-6 text-sm text-slate-500">{empty}</div>}
    </div>
  );
}

function isWorksheetPending(req: SamplingRequest) {
  const status = req.requestStatus.toUpperCase();
  return status.includes("QC") || status.includes("REVIEW") || status.includes("TEST") || status.includes("RESULT") || status.includes("OOS");
}

function isOpenInvestigation(inv: QcInvestigation) {
  return !inv.closedAt && !["CLOSED", "QA_APPROVED", "RESOLVED"].includes(inv.status.toUpperCase());
}

export function LimsDashboardPage() {
  const samplingSummary = useQuery({ queryKey: ["lims-dashboard", "sampling-summary"], queryFn: fetchSamplingSummary });
  const samplingRequests = useQuery({ queryKey: ["lims-dashboard", "sampling-requests"], queryFn: () => fetchSamplingRequests(0, 8) });
  const equipmentSummary = useQuery({ queryKey: ["lims-dashboard", "equipment-summary"], queryFn: fetchEquipmentSummary });
  const stabilityStudies = useQuery({ queryKey: ["lims-dashboard", "stability"], queryFn: fetchStabilityStudies });
  const emBreaches = useQuery({ queryKey: ["lims-dashboard", "em-breaches"], queryFn: fetchEmBreaches });
  const reagentLots = useQuery({ queryKey: ["lims-dashboard", "reagent-expiry"], queryFn: () => fetchExpiringReagentLots(30) });
  const standardLots = useQuery({ queryKey: ["lims-dashboard", "standard-expiry"], queryFn: () => fetchExpiringReferenceStandardLots(30) });
  const retentionSummary = useQuery({ queryKey: ["lims-dashboard", "retention-summary"], queryFn: fetchRetentionSampleSummary });

  const samplingCounts = samplingSummary.data?.countsByStatus ?? {};
  const openSampling = Object.entries(samplingCounts)
    .filter(([status]) => !status.includes("COMPLETE") && !status.includes("CLOSED"))
    .reduce((sum, [, count]) => sum + count, 0);
  const worksheetPending = (samplingRequests.data?.content ?? []).filter(isWorksheetPending).length;
  const ootStudies = (stabilityStudies.data ?? []).filter((study) => study.hasOotAlert).length;
  const expiringLabLots = (reagentLots.data?.length ?? 0) + (standardLots.data?.length ?? 0);

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="LIMS Dashboard" subtitle="Lab execution queue across sampling, worksheets, stability, EM, equipment, and retained samples." />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Open Sampling" value={openSampling} to="/qc/sampling" tone="teal" />
        <Kpi label="Worksheets Pending" value={worksheetPending} to="/lims/worksheets" tone="blue" />
        <Kpi label="Open EM Breaches" value={emBreaches.data?.length ?? 0} to="/lims/env-monitoring" tone="red" />
        <Kpi label="OOT Studies" value={ootStudies} to="/lims/stability" tone="amber" />
        <Kpi label="Calibration Overdue" value={equipmentSummary.data?.calibrationOverdue ?? 0} to="/lims/equipment" tone="red" />
        <Kpi label="Calibration Due Soon" value={equipmentSummary.data?.calibrationDueSoon ?? 0} to="/lims/equipment" tone="amber" />
        <Kpi label="Lab Lots Expiring" value={expiringLabLots} to="/lims/reagents" tone="amber" />
        <Kpi label="Retention Overdue" value={retentionSummary.data?.overdueDisposal ?? 0} to="/lims/retention-samples" tone="red" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Recent Sampling Requests</h2>
            <Link className={linkCls} to="/qc/sampling">Open Sampling</Link>
          </div>
          <MiniTable
            rows={samplingRequests.data?.content ?? []}
            empty={samplingRequests.isLoading ? "Loading sampling requests..." : "No sampling requests found."}
            render={(req) => (
              <Link key={req.id} to="/qc/sampling" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">Cycle {req.cycleNumber} - {req.grnItemId.slice(0, 8)}</p>
                  <p className="text-xs text-slate-500">Created {new Date(req.createdAt).toLocaleString()}</p>
                </div>
                <StatusPill value={req.requestStatus} />
              </Link>
            )}
          />
        </section>

        <section className={cardCls}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Open EM Breaches</h2>
            <Link className={linkCls} to="/lims/env-monitoring">Open EM</Link>
          </div>
          <MiniTable
            rows={(emBreaches.data ?? []).slice(0, 6)}
            empty={emBreaches.isLoading ? "Loading EM breaches..." : "No open EM breaches."}
            render={(breach) => (
              <Link key={breach.id} to="/lims/env-monitoring" className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50">
                <div>
                  <p className="font-semibold text-slate-800">{breach.pointCode ?? breach.pointName ?? "EM point"}</p>
                  <p className="text-xs text-slate-500">{breach.resultValue} {breach.unit} recorded {new Date(breach.recordedAt).toLocaleString()}</p>
                </div>
                <StatusPill value={breach.actionBreached ? "ACTION_BREACH" : "ALERT_BREACH"} />
              </Link>
            )}
          />
        </section>
      </div>
    </div>
  );
}

export function LimsWorksheetsPage() {
  const requests = useQuery({ queryKey: ["lims-worksheets", "sampling-requests"], queryFn: () => fetchSamplingRequests(0, 100) });
  const rows = useMemo(() => (requests.data?.content ?? []).filter(isWorksheetPending), [requests.data]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <PageHeader title="Worksheets" subtitle="Result-entry queue for QC worksheets. Full result entry remains in Sampling & QC workflow." />
        <Link className={linkCls} to="/qc/sampling">Open Sampling & QC</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Pending Queue" value={rows.length} tone="blue" />
        <Kpi label="OOS / Failed" value={rows.filter((req) => req.requestStatus.includes("OOS") || req.requestStatus.includes("FAIL")).length} tone="red" />
        <Kpi label="QC Review" value={rows.filter((req) => req.requestStatus.includes("REVIEW")).length} tone="amber" />
        <Kpi label="Total Loaded" value={requests.data?.content.length ?? 0} tone="slate" />
      </div>

      <MiniTable
        rows={rows}
        empty={requests.isLoading ? "Loading worksheets..." : "No worksheet queue items found."}
        render={(req) => (
          <Link key={req.id} to="/qc/sampling" className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="font-semibold text-slate-800">Sampling request {req.id.slice(0, 8)}</p>
              <p className="text-xs text-slate-500">GRN item {req.grnItemId.slice(0, 8)} - cycle {req.cycleNumber}</p>
            </div>
            <StatusPill value={req.requestStatus} />
            <span className="text-xs font-semibold text-teal-700">Open worksheet</span>
          </Link>
        )}
      />
    </div>
  );
}

export function LimsOosInvestigationsPage() {
  const user = useAuthStore((state) => state.user);
  const [includeClosed, setIncludeClosed] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [type, setType] = useState<"ALL" | "OOS" | "OOT" | "GENERAL">("ALL");
  const investigations = useQuery({
    queryKey: ["lims-oos", "investigation-queue", includeClosed, mineOnly, type, user?.username],
    queryFn: () => fetchQcInvestigationQueue({
      includeClosed,
      type: type === "ALL" ? undefined : type,
      actor: mineOnly ? user?.username : undefined
    })
  });

  const rows = investigations.data ?? [];
  const open = rows.filter(isOpenInvestigation);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <PageHeader title="OOS Investigations" subtitle="Central queue for OOS/OOT/general QC investigations opened from worksheet results." />
        <Link className={linkCls} to="/qc/sampling">Open Sampling & QC</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", "OOS", "OOT", "GENERAL"] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setType(option)}
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${type === option ? "bg-teal-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
          >
            {option}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setMineOnly((current) => !current)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${mineOnly ? "bg-blue-600 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Mine
        </button>
        <button
          type="button"
          onClick={() => setIncludeClosed((current) => !current)}
          className={`rounded-lg px-3 py-2 text-xs font-semibold ${includeClosed ? "bg-slate-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
        >
          Include closed
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Open Investigations" value={open.length} tone="red" />
        <Kpi label="Phase I" value={open.filter((investigation) => investigation.phase === "PHASE_I").length} tone="amber" />
        <Kpi label="Phase II" value={open.filter((investigation) => investigation.phase === "PHASE_II").length} tone="blue" />
        <Kpi label="Closed Loaded" value={rows.length - open.length} tone="slate" />
      </div>

      <MiniTable
        rows={includeClosed ? rows : open}
        empty={investigations.isLoading ? "Loading investigations..." : "No investigations found."}
        render={(investigation) => (
          <Link key={investigation.id} to="/qc/sampling" className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="font-semibold text-slate-800">{investigation.investigationNumber}</p>
              <p className="text-xs text-slate-500">{investigation.reason} - request {investigation.samplingRequestId.slice(0, 8)}</p>
            </div>
            <StatusPill value={`${investigation.investigationType}_${investigation.phase}`} />
            <StatusPill value={investigation.status} />
          </Link>
        )}
      />
    </div>
  );
}

export function LimsCoaPage() {
  const releases = useQuery({ queryKey: ["lims-coa", "releases"], queryFn: () => fetchQpBatchReleases({}, 0, 50) });
  const rows = releases.data?.content ?? [];
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <PageHeader title="CoA / Lab Certificates" subtitle="Lab certificate queue. QP final release controls remain under QMS Batch Release." />
        <Link className={linkCls} to="/qms/batch-release">Open QP Batch Release</Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Kpi label="Certificates Issued" value={rows.filter((row) => row.coaLocked).length} tone="teal" />
        <Kpi label="Awaiting Analyst Sign" value={rows.filter((row) => !row.analystSignedAt).length} tone="amber" />
        <Kpi label="Awaiting CoA Issue" value={rows.filter((row) => row.analystSignedAt && !row.coaLocked).length} tone="blue" />
        <Kpi label="Loaded Releases" value={rows.length} tone="slate" />
      </div>

      <MiniTable
        rows={rows}
        empty={releases.isLoading ? "Loading certificate queue..." : "No batch releases found."}
        render={(row) => (
          <Link key={row.id} to="/qms/batch-release" className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 md:grid-cols-[1fr_auto_auto] md:items-center">
            <div>
              <p className="font-semibold text-slate-800">{row.productName} - {row.lotNumber}</p>
              <p className="text-xs text-slate-500">{row.coaNumber ?? "CoA not issued"} - release {row.releaseNumber}</p>
            </div>
            <StatusPill value={row.status} />
            <StatusPill value={row.coaLocked ? "COA_LOCKED" : row.analystSignedAt ? "READY_TO_ISSUE" : "ANALYST_SIGN_PENDING"} />
          </Link>
        )}
      />
    </div>
  );
}

export function LimsReportsPage() {
  const reportGroups = [
    {
      title: "QC Worksheet Report",
      route: "/qc/sampling",
      filters: "status, material, GRN, created date",
      exportPath: "/api/sampling-requests?size=10000",
      pdfPathNote: "Open sampling request for lot release PDF."
    },
    {
      title: "CoA / Batch Certificate",
      route: "/lims/coa",
      filters: "release status, CoA locked, analyst sign-off",
      exportPath: "/api/qp-batch-releases?size=10000",
      pdfPathNote: "Open release for CoA preview/reprint/certificate PDF."
    },
    {
      title: "Stability Trend Report",
      route: "/lims/stability",
      filters: "study, due-soon window, OOT flag",
      exportPath: "/api/lims/stability",
      pdfPathNote: "Trend PDF planned from study detail."
    },
    {
      title: "Environmental Monitoring Report",
      route: "/lims/env-monitoring",
      filters: "point, from/to, action breach",
      exportPath: "/api/lims/em-results",
      pdfPathNote: "Trend/breach PDF planned from EM result set."
    },
    {
      title: "Equipment Calibration Report",
      route: "/lims/equipment",
      filters: "status, calibration due, qualification due",
      exportPath: "/api/equipment?size=10000",
      pdfPathNote: "Qualification/calibration evidence on equipment detail."
    },
    {
      title: "Reagent Expiry Report",
      route: "/lims/reagents",
      filters: "expiry window, lot status, supplier",
      exportPath: "/api/lims/reagents/expiring?alertDays=30",
      pdfPathNote: "GMP PDF metadata available on PDF reports; expiry PDF planned."
    },
    {
      title: "Reference Standard Expiry Report",
      route: "/lims/reference-standards",
      filters: "expiry window, lot status, potency",
      exportPath: "/api/lims/reference-standards/expiring?alertDays=30",
      pdfPathNote: "GMP PDF metadata available on PDF reports; expiry PDF planned."
    },
    {
      title: "Retention Disposal Report",
      route: "/lims/retention-samples",
      filters: "status, material, lot",
      exportPath: "/api/retention-samples?size=10000",
      pdfPathNote: "Open retention sample detail for disposal evidence."
    }
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Lab Reports" subtitle="Report hub for GMP lab evidence, trend review, exports, and certificate workflows." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reportGroups.map((report) => (
          <section key={report.title} className={cardCls}>
            <h2 className="font-semibold text-slate-800">{report.title}</h2>
            <p className="mt-2 text-sm text-slate-500">Filters: {report.filters}</p>
            <p className="mt-2 text-xs text-slate-500">{report.pdfPathNote}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link className={linkCls} to={report.route}>Open</Link>
              <button className={linkCls} type="button" onClick={() => void downloadCsvExport(report.exportPath, `${report.title.toLowerCase().split(" ").join("-")}.csv`)}>
                Export CSV
              </button>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function LimsCompliancePage() {
  const readiness = useQuery({ queryKey: ["lims-compliance", "alcoa-readiness"], queryFn: fetchAlcoaReadinessSummary });
  const readinessGaps = useQuery({ queryKey: ["lims-compliance", "alcoa-readiness-gaps"], queryFn: fetchAlcoaReadinessGaps });
  const equipmentSummary = useQuery({ queryKey: ["lims-compliance", "equipment-summary"], queryFn: fetchEquipmentSummary });
  const emBreaches = useQuery({ queryKey: ["lims-compliance", "em-breaches"], queryFn: fetchEmBreaches });
  const stabilityStudies = useQuery({ queryKey: ["lims-compliance", "stability"], queryFn: fetchStabilityStudies });
  const dueRetention = useQuery({ queryKey: ["lims-compliance", "retention-due"], queryFn: fetchDueForDisposalRetentionSamples });
  const expiringRetention = useQuery({ queryKey: ["lims-compliance", "retention-expiring"], queryFn: () => fetchExpiringSoonRetentionSamples(30) });

  const checks = [
    { label: "ALCOA++ score", value: readiness.data?.readinessScore ?? 0, route: "/compliance/alcoa-readiness", tone: "teal" as const },
    { label: "Missing metadata", value: readiness.data?.missingMetadataCount ?? 0, route: "/compliance/alcoa-readiness", tone: "amber" as const },
    { label: "Inactive records", value: readiness.data?.inactiveOrSoftDeletedCount ?? 0, route: "/compliance/alcoa-readiness", tone: "slate" as const },
    { label: "Open investigations", value: readiness.data?.openInvestigations ?? 0, route: "/lims/oos-investigations", tone: "red" as const },
    { label: "Open OOS", value: readiness.data?.openOosInvestigations ?? 0, route: "/lims/oos-investigations", tone: "red" as const },
    { label: "Open OOT", value: readiness.data?.openOotInvestigations ?? 0, route: "/lims/oos-investigations", tone: "amber" as const },
    { label: "Calibration overdue", value: equipmentSummary.data?.calibrationOverdue ?? 0, route: "/lims/equipment", tone: "red" as const },
    { label: "Qualification overdue", value: equipmentSummary.data?.qualificationOverdue ?? 0, route: "/lims/equipment", tone: "red" as const },
    { label: "Open EM breaches", value: emBreaches.data?.length ?? 0, route: "/lims/env-monitoring", tone: "red" as const },
    { label: "Unsigned actions", value: readiness.data?.unsignedCriticalActions ?? 0, route: "/compliance/alcoa-readiness", tone: "red" as const },
    { label: "Audit evidence gaps", value: readiness.data?.auditEventsMissingReasonOrValues ?? 0, route: "/compliance/alcoa-readiness", tone: "amber" as const },
    { label: "OOT stability studies", value: (stabilityStudies.data ?? []).filter((study) => study.hasOotAlert).length, route: "/lims/stability", tone: "amber" as const },
    { label: "Retention due disposal", value: dueRetention.data?.length ?? 0, route: "/lims/retention-samples", tone: "amber" as const },
    { label: "Retention expiring", value: expiringRetention.data?.length ?? 0, route: "/lims/retention-samples", tone: "blue" as const }
  ];

  return (
    <div className="space-y-6 p-6">
      <PageHeader title="Lab Compliance" subtitle="Lab-facing ALCOA++ control center for audit, e-sign, training, calibration, OOS/OOT, and breach evidence." />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {checks.map((check) => <Kpi key={check.label} label={check.label} value={check.value} to={check.route} tone={check.tone} />)}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={cardCls}>
          <h2 className="font-semibold text-slate-800">ALCOA++ Review Links</h2>
          <div className="mt-4 grid gap-2">
            <Link className={linkCls} to="/compliance/alcoa-readiness">Inspection readiness dashboard</Link>
            <Link className={linkCls} to="/lims/worksheets">Worksheet/result integrity</Link>
            <Link className={linkCls} to="/lims/oos-investigations">OOS/OOT investigations</Link>
            <Link className={linkCls} to="/lims/equipment">Calibration/qualification gates</Link>
            <Link className={linkCls} to="/lims/reports">GMP reports</Link>
          </div>
        </section>
        <section className={cardCls}>
          <h2 className="font-semibold text-slate-800">Pending ALCOA++ Product Work</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            <li>Full audit timeline panel on critical detail pages.</li>
            <li>Critical action e-sign matrix completion.</li>
            <li>No-hard-delete verification across remaining GMP paths.</li>
            <li>Per-gap remediation workflow and closure evidence.</li>
          </ul>
        </section>
      </div>

      <section className={cardCls}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-slate-800">Readiness Gap List</h2>
            <p className="mt-1 text-xs text-slate-500">Each row links to source record evidence when route exists.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {readinessGaps.data?.length ?? 0} open gaps
            </span>
            <button className={linkCls} type="button" onClick={() => void downloadCsvExport("/api/compliance/alcoa-readiness/export", "alcoa-readiness.csv")}>
              Export CSV
            </button>
          </div>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-2">Severity</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Entity</th>
                <th className="px-3 py-2">Record</th>
                <th className="px-3 py-2">Owner</th>
                <th className="px-3 py-2">Due / observed</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(readinessGaps.data ?? []).slice(0, 25).map((gap) => (
                <tr key={`${gap.category}-${gap.recordId}`} className="align-top">
                  <td className="px-3 py-3 font-semibold text-slate-800">{gap.severity}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">{gap.category}</div>
                    <div className="text-xs text-slate-500">{gap.status ?? "OPEN"}</div>
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-600">{gap.entityType ?? "-"}</td>
                  <td className="px-3 py-3">
                    <div className="font-medium text-slate-800">{gap.recordCode ?? gap.recordId}</div>
                    <div className="max-w-xs truncate text-xs text-slate-500">{gap.title ?? "Record requires review"}</div>
                  </td>
                  <td className="px-3 py-3 text-slate-600">{gap.owner ?? "Unassigned"}</td>
                  <td className="px-3 py-3 text-slate-600">{gap.dueDate ?? gap.observedAt?.slice(0, 10) ?? "-"}</td>
                  <td className="px-3 py-3">
                    <Link className={linkCls} to={gap.route}>Open</Link>
                  </td>
                </tr>
              ))}
              {readinessGaps.isLoading ? (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={7}>Loading gaps...</td></tr>
              ) : null}
              {!readinessGaps.isLoading && (readinessGaps.data ?? []).length === 0 ? (
                <tr><td className="px-3 py-4 text-slate-500" colSpan={7}>No open ALCOA++ readiness gaps.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
