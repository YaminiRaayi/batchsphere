import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deleteVendorDocument,
  fetchVendorBusinessUnits,
  fetchVendorDocumentFile,
  fetchVendorDocuments,
  fetchVendors,
  updateVendorApproval,
} from "../../../lib/api";
import type { PageResponse } from "../../../types/grn";
import type { Vendor, VendorCategory, VendorDocument } from "../../../types/vendor";
import { VENDOR_CATEGORY_LABELS } from "../../../types/vendor";
import type { VendorBusinessUnit, VendorDocumentStatus } from "../../../types/vendor-business-unit";
import {
  VENDOR_DOCUMENT_STATUS_LABELS,
  VENDOR_DOCUMENT_TYPE_LABELS,
} from "../../../types/vendor-business-unit";
import { VendorFormDrawer } from "./VendorFormDrawer";

function vendorStatusCls(vendor: Vendor) {
  if (!vendor.isActive) return "bg-slate-100 text-slate-500";
  if (vendor.isApproved) return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

function vendorStatusDot(vendor: Vendor) {
  if (!vendor.isActive) return "bg-red-500";
  if (vendor.isApproved) return "bg-green-500";
  return "bg-amber-400";
}

function vendorStatusLabel(vendor: Vendor) {
  if (!vendor.isActive) return "Suspended";
  if (vendor.isApproved) return "Approved";
  return "Under Review";
}

function initials(name: string) {
  return name.split(" ").slice(0, 3).map((part) => part[0]).join("").toUpperCase().slice(0, 3);
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatMonthYear(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function nextAuditClass(value: string | null) {
  if (!value) return "text-slate-600";
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) return "text-slate-600";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "text-red-600";
  if (diffDays <= 60) return "text-amber-700";
  return "text-green-700";
}

function documentBadge(status: VendorDocumentStatus) {
  if (status === "VALID") return "bg-green-100 text-green-700";
  if (status === "EXPIRING_SOON") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5 text-[12px]">
      {[1, 2, 3, 4, 5].map((value) => (
        <span key={value} className={value <= Math.round(rating) ? "text-amber-400" : "text-slate-200"}>
          ★
        </span>
      ))}
    </span>
  );
}

type TabKey = "ALL" | VendorCategory;

const CATEGORY_TABS: { key: TabKey; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "API_SUPPLIER", label: "API" },
  { key: "EXCIPIENT_SUPPLIER", label: "Excipient" },
  { key: "SOLVENT_SUPPLIER", label: "Solvent" },
  { key: "PACKAGING_SUPPLIER", label: "Packaging" },
  { key: "TESTING_LAB", label: "Testing Lab" },
];

export default function VendorsPage() {
  const navigate = useNavigate();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [businessUnits, setBusinessUnits] = useState<VendorBusinessUnit[]>([]);
  const [documents, setDocuments] = useState<VendorDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [tabFilter, setTabFilter] = useState<TabKey>("ALL");
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Vendor | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    Promise.all([fetchVendors(0, 100), fetchVendorBusinessUnits(0, 500)])
      .then(([vendorRes, businessUnitRes]: [PageResponse<Vendor>, PageResponse<VendorBusinessUnit>]) => {
        setVendors(vendorRes.content);
        setBusinessUnits(businessUnitRes.content);
        setSelectedVendorId((current) => current ?? vendorRes.content[0]?.id ?? null);
      })
      .catch((error) => {
        setPageError(error instanceof Error ? error.message : "Failed to load vendors");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => vendors.filter((vendor) => {
    const query = search.toLowerCase();
    const matchSearch = !search
      || vendor.vendorName.toLowerCase().includes(query)
      || vendor.vendorCode.toLowerCase().includes(query);
    const matchTab = tabFilter === "ALL" || vendor.vendorCategory === tabFilter;
    return matchSearch && matchTab;
  }), [search, tabFilter, vendors]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelectedVendorId(null);
      return;
    }
    if (!selectedVendorId || !filtered.some((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(filtered[0].id);
    }
  }, [filtered, selectedVendorId]);

  useEffect(() => {
    if (!selectedVendorId) {
      setDocuments([]);
      return;
    }
    setDocsLoading(true);
    void fetchVendorDocuments(selectedVendorId)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
  }, [selectedVendorId]);

  const vendorLocationById = useMemo(() => {
    const map = new Map<string, string>();
    for (const vendor of vendors) {
      const location = [vendor.city, vendor.state, vendor.country].filter(Boolean).join(", ");
      if (location) {
        map.set(vendor.id, location);
      }
    }
    for (const unit of businessUnits) {
      if (!map.has(unit.vendorId)) {
        const location = [unit.city, unit.state, unit.country].filter(Boolean).join(", ");
        if (location) {
          map.set(unit.vendorId, location);
        }
      }
    }
    return map;
  }, [businessUnits, vendors]);

  const siteCountByVendorId = useMemo(() => {
    const counts = new Map<string, number>();
    for (const unit of businessUnits) {
      counts.set(unit.vendorId, (counts.get(unit.vendorId) ?? 0) + 1);
    }
    return counts;
  }, [businessUnits]);

  const selectedVendor = vendors.find((vendor) => vendor.id === selectedVendorId) ?? null;
  const selectedSiteCount = selectedVendor ? siteCountByVendorId.get(selectedVendor.id) ?? 0 : 0;

  const approvedCount = vendors.filter((vendor) => vendor.isApproved && vendor.isActive).length;
  const reviewCount = vendors.filter((vendor) => !vendor.isApproved && vendor.isActive).length;
  const suspendedCount = vendors.filter((vendor) => !vendor.isActive).length;
  const auditsDueCount = vendors.filter((vendor) => {
    if (!vendor.nextAuditDue) return false;
    const due = new Date(vendor.nextAuditDue);
    if (Number.isNaN(due.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays <= 60;
  }).length;

  function openAdd() {
    setEditTarget(null);
    setDrawerOpen(true);
  }

  function openEdit() {
    if (!selectedVendor) return;
    setEditTarget(selectedVendor);
    setDrawerOpen(true);
  }

  function handleSaved(saved: Vendor) {
    setVendors((current) => {
      const exists = current.some((vendor) => vendor.id === saved.id);
      return exists ? current.map((vendor) => vendor.id === saved.id ? saved : vendor) : [saved, ...current];
    });
    setSelectedVendorId(saved.id);
    setDocsLoading(true);
    void fetchVendorDocuments(saved.id)
      .then(setDocuments)
      .catch(() => setDocuments([]))
      .finally(() => setDocsLoading(false));
    setDrawerOpen(false);
  }

  async function handleApprovalChange(approved: boolean) {
    if (!selectedVendor) return;
    setStatusSaving(true);
    setPageError(null);
    try {
      const saved = await updateVendorApproval(selectedVendor.id, {
        approved,
        approvedSince: approved
          ? (selectedVendor.approvedSince ?? new Date().toISOString().slice(0, 10))
          : undefined
      });
      setVendors((current) => current.map((vendor) => vendor.id === saved.id ? saved : vendor));
      const refreshed = await fetchVendors(0, 100);
      setVendors(refreshed.content);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update vendor approval");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleDocumentOpen(document: VendorDocument) {
    if (!selectedVendor) return;
    const blob = await fetchVendorDocumentFile(selectedVendor.id, document.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function handleDocumentDelete(documentId: string) {
    if (!selectedVendor) return;
    await deleteVendorDocument(selectedVendor.id, documentId);
    setDocuments((current) => current.filter((document) => document.id !== documentId));
  }

  const qualificationSteps = selectedVendor ? [
    { number: 1, title: "Vendor Created", date: formatMonthYear(selectedVendor.createdAt), done: true },
    { number: 2, title: "Docs Review", date: documents[0] ? formatMonthYear(documents[0].uploadedAt) : "Pending", done: documents.length > 0 },
    { number: 3, title: "Audit Review", date: formatMonthYear(selectedVendor.lastAuditDate), done: Boolean(selectedVendor.lastAuditDate) },
    { number: 4, title: "QA Approval", date: selectedVendor.isApproved ? formatMonthYear(selectedVendor.approvedSince) : "Pending", done: selectedVendor.isApproved },
  ] : [];

  return (
    <div className="space-y-5 bg-[#fffaf4]">
      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Vendor Management System</h1>
          <p className="mt-0.5 text-sm text-slate-500">Vendor qualification · performance · audit tracking</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
            onClick={openAdd}
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Add Vendor
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-orange-200 bg-white px-4 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {reviewCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-[#fff8e8] px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-amber-800">
            <strong>{reviewCount} vendor re-qualification{reviewCount !== 1 ? "s" : ""} pending</strong>
            {" — scheduled reviews require attention."}
          </span>
          <button type="button" className="ml-auto text-xs font-medium text-amber-700 underline">Review</button>
        </div>
      )}

      <div className="grid grid-cols-5 gap-4">
        {([
          { label: "Total Vendors", value: vendors.length, sub: "Active suppliers", accent: "border-l-orange-500", valCls: "text-slate-800" },
          { label: "Approved", value: approvedCount, sub: "Fully qualified", accent: "border-l-green-400", valCls: "text-green-600" },
          { label: "Under Review", value: reviewCount, sub: reviewCount > 0 ? `${Math.min(reviewCount, 2)} overdue` : "Pending qualification", accent: "border-l-amber-400", valCls: "text-amber-600" },
          { label: "Suspended", value: suspendedCount, sub: "Quality issues", accent: "border-l-red-400", valCls: "text-red-600" },
          { label: "Audits Due", value: auditsDueCount, sub: "Next 60 days", accent: "border-l-blue-400", valCls: "text-blue-600" },
        ] as const).map((kpi) => (
          <div key={kpi.label} className={`rounded-xl border border-orange-200 bg-white p-4 shadow-sm border-l-4 ${kpi.accent}`}>
            <div className="mb-1 text-xs text-slate-500">{kpi.label}</div>
            <div className={`text-2xl font-bold ${kpi.valCls}`}>{kpi.value}</div>
            <div className={`mt-1 text-xs ${kpi.label === "Under Review" && reviewCount > 0 ? "font-medium text-amber-500" : "text-slate-500"}`}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      <div className="space-y-5">
        <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap gap-1">
                {CATEGORY_TABS.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setTabFilter(tab.key)}
                    className={[
                      "rounded-lg px-2.5 py-1 text-[11px] font-medium transition",
                      tabFilter === tab.key ? "bg-orange-600 text-white" : "bg-orange-50 text-orange-800 hover:bg-orange-100"
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="flex w-full items-center gap-2 rounded-lg border border-orange-100 bg-orange-50 px-3 py-1.5">
                <svg className="h-3 w-3 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeWidth="2" d="m21 21-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search vendor, code..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full bg-transparent text-xs text-slate-700 placeholder:text-slate-400 outline-none"
                />
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-16 text-center text-xs text-slate-400">Loading vendors…</div>
          ) : filtered.length === 0 ? (
            <div className="px-4 py-16 text-center text-xs text-slate-400">No vendors found.</div>
          ) : (
            <div className="divide-y divide-[#fff7ed]">
              {filtered.map((vendor) => {
                const siteCount = siteCountByVendorId.get(vendor.id) ?? 0;
                const selected = vendor.id === selectedVendorId;
                return (
                  <button
                    key={vendor.id}
                    type="button"
                    onClick={() => setSelectedVendorId(vendor.id)}
                    className={[
                      "w-full px-4 py-3 text-left transition hover:bg-[#fff7ed]",
                      selected ? "border-l-4 border-l-orange-500 bg-[#ffedd5]" : ""
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[11px] font-bold text-orange-700">
                        {initials(vendor.vendorName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate text-xs font-bold text-slate-800">{vendor.vendorName}</div>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${vendorStatusCls(vendor)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${vendorStatusDot(vendor)}`} />
                            {vendorStatusLabel(vendor)}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-500">
                          {vendor.vendorCategory ? VENDOR_CATEGORY_LABELS[vendor.vendorCategory] : "Uncategorized"}
                          {" · "}
                          {vendorLocationById.get(vendor.id) || "Location pending"}
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1">
                            <StarRating rating={vendor.qaRating ?? (vendor.isApproved ? 4.2 : 3.1)} />
                            <span className="text-[10px] text-slate-400">
                              {(vendor.qaRating ?? (vendor.isApproved ? 4.2 : 3.1)).toFixed(1)}
                            </span>
                          </div>
                          <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold text-orange-700">
                            {siteCount} site{siteCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedVendor ? (
          <div className="space-y-4">
              <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-sm font-bold text-orange-700">
                        {initials(selectedVendor.vendorName)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-bold text-slate-800">{selectedVendor.vendorName}</h2>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${vendorStatusCls(selectedVendor)}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${vendorStatusDot(selectedVendor)}`} />
                            {vendorStatusLabel(selectedVendor)}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          {selectedVendor.vendorCode}
                          {" · "}
                          {selectedVendor.vendorCategory ? VENDOR_CATEGORY_LABELS[selectedVendor.vendorCategory] : "No category"}
                          {" · "}
                          {vendorLocationById.get(selectedVendor.id) || "Location pending"}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={openEdit} className="rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50">
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={statusSaving}
                      onClick={() => void handleApprovalChange(!selectedVendor.isApproved)}
                      className={[
                        "rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                        selectedVendor.isApproved ? "border-amber-200 text-amber-700" : "border-green-200 text-green-700"
                      ].join(" ")}
                    >
                      {statusSaving ? "Saving..." : selectedVendor.isApproved ? "Mark Under Review" : "Approve Vendor"}
                    </button>
                    {selectedSiteCount > 0 ? (
                      <button
                        type="button"
                        onClick={() => navigate(`/master-data/partners/vendor-business-units?vendorId=${selectedVendor.id}`)}
                        className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        Open Sites
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate(`/master-data/partners/vendor-business-units?vendorId=${selectedVendor.id}`)}
                        className="rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700 hover:bg-orange-50"
                      >
                        Add First Site
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Category", value: selectedVendor.vendorCategory ? VENDOR_CATEGORY_LABELS[selectedVendor.vendorCategory] : "—" },
                    { label: "Approved Since", value: formatMonthYear(selectedVendor.approvedSince) },
                    { label: "Last Audit", value: formatMonthYear(selectedVendor.lastAuditDate) },
                    { label: "Next Audit Due", value: formatMonthYear(selectedVendor.nextAuditDue), valueClass: nextAuditClass(selectedVendor.nextAuditDue) },
                    { label: "Linked Sites", value: String(selectedSiteCount) },
                    { label: "Corporate Docs", value: String(documents.length) },
                    { label: "QA Rating", value: selectedVendor.qaRating?.toFixed(1) ?? "—" },
                    { label: "Open CAPAs", value: String(selectedVendor.openCapaCount ?? 0) },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-orange-50 p-3">
                      <div className="mb-0.5 text-[10px] text-slate-500">{item.label}</div>
                      <div className={`text-xs font-bold text-slate-800 ${item.valueClass ?? ""}`}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-orange-50 p-3">
                    <div className="mb-0.5 text-[10px] text-slate-500">Contact Person</div>
                    <div className="text-xs font-bold text-slate-800">{selectedVendor.contactPerson || "—"}</div>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-3">
                    <div className="mb-0.5 text-[10px] text-slate-500">Delivery Score</div>
                    <div className="text-xs font-bold text-slate-800">{selectedVendor.deliveryScore != null ? `${selectedVendor.deliveryScore.toFixed(2)}%` : "—"}</div>
                  </div>
                  <div className="rounded-xl bg-orange-50 p-3">
                    <div className="mb-0.5 text-[10px] text-slate-500">Rejection Rate</div>
                    <div className="text-xs font-bold text-slate-800">{selectedVendor.rejectionRate != null ? `${selectedVendor.rejectionRate.toFixed(2)}%` : "—"}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-700">Qualification Status</div>
                <div className="grid grid-cols-4 gap-3">
                  {qualificationSteps.map((step, index) => (
                    <div key={step.number} className="relative">
                      {index < qualificationSteps.length - 1 ? (
                        <div className="absolute left-[calc(100%-8px)] top-1/2 hidden -translate-y-1/2 text-xl font-bold text-orange-300 lg:block">→</div>
                      ) : null}
                      <div className={`rounded-xl border px-4 py-3 ${step.done ? "border-green-200 bg-[#effcf2]" : "border-orange-100 bg-[#fff8ef]"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${step.done ? "bg-green-500 text-white" : "bg-orange-200 text-orange-700"}`}>
                            {step.number}
                          </div>
                          <div className="min-w-0">
                            <div className={`truncate text-xs font-bold ${step.done ? "text-green-800" : "text-slate-700"}`}>{step.title}</div>
                            <div className="text-[11px] text-slate-500">{step.date}</div>
                          </div>
                          {step.done ? (
                            <div className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">✓</div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-xl border border-orange-100 bg-[#fff8ef] px-4 py-3 text-xs text-slate-600">
                  {selectedSiteCount === 0
                    ? "This vendor does not have a VBU/site yet. Vendor-level approval and document review can still be maintained here until the first site is registered."
                    : "Vendor-level summary stays here, and detailed site qualification continues in the VBU page."}
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                  <div className="mb-3 text-sm font-semibold text-slate-700">Vendor Profile</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Address", value: selectedVendor.corporateAddress ?? "—" },
                      { label: "City / State", value: [selectedVendor.city, selectedVendor.state].filter(Boolean).join(", ") || "—" },
                      { label: "Country / Pincode", value: [selectedVendor.country, selectedVendor.pincode].filter(Boolean).join(" · ") || "—" },
                      { label: "Email", value: selectedVendor.email ?? "—" },
                      { label: "Phone", value: selectedVendor.phone ?? "—" },
                      { label: "Website", value: selectedVendor.website ?? "—" },
                      { label: "GSTIN", value: selectedVendor.gstin ?? "—" },
                      { label: "PAN", value: selectedVendor.pan ?? "—" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl bg-orange-50 p-3">
                        <div className="mb-0.5 text-[10px] text-slate-500">{item.label}</div>
                        <div className="text-xs font-bold text-slate-800">{item.value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
                  <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3">
                    <div className="text-sm font-semibold text-slate-700">Vendor Documents</div>
                    <p className="mt-1 text-[11px] text-slate-500">Corporate-level qualification documents remain visible here even when the vendor has no site records yet.</p>
                  </div>
                  <div className="space-y-2 p-3">
                    {docsLoading ? (
                      <div className="px-2 py-8 text-center text-xs text-slate-400">Loading documents...</div>
                    ) : documents.length === 0 ? (
                      <div className="px-2 py-8 text-center text-xs text-slate-400">
                        No vendor documents uploaded yet. Add them from `Edit Vendor` or while creating the vendor.
                      </div>
                    ) : (
                      documents.map((document) => (
                        <div key={document.id} className="rounded-xl border border-orange-100 bg-orange-50 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="truncate text-xs font-semibold text-slate-800">{document.documentTitle}</div>
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {VENDOR_DOCUMENT_TYPE_LABELS[document.documentType]} · {document.fileName}
                              </div>
                              <div className="mt-1 text-[10px] text-slate-400">
                                Uploaded {formatDate(document.uploadedAt)} · Expiry {formatDate(document.expiryDate)}
                              </div>
                            </div>
                            <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${documentBadge(document.status)}`}>
                              {VENDOR_DOCUMENT_STATUS_LABELS[document.status]}
                            </span>
                          </div>
                          <div className="mt-3 flex gap-2">
                            <button type="button" onClick={() => void handleDocumentOpen(document)} className="rounded-lg border border-orange-200 px-2 py-1 text-[10px] font-semibold text-orange-700">
                              Download
                            </button>
                            <button type="button" onClick={() => void handleDocumentDelete(document.id)} className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600">
                              Delete
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
          </div>
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-white text-sm text-slate-400">
            Select a vendor to view qualification and document details.
          </div>
        )}
      </div>

      <VendorFormDrawer
        open={drawerOpen}
        editTarget={editTarget}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
