import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  createVendorBusinessUnitAudit,
  deleteVendorBusinessUnit,
  deleteVendorBusinessUnitDocument,
  fetchVendorBusinessUnitAudits,
  fetchVendorBusinessUnitDocumentFile,
  fetchVendorBusinessUnitDocuments,
  fetchVendorBusinessUnits,
  fetchVendors,
  updateVendorBusinessUnit,
  updateVendorBusinessUnitAudit,
} from "../../../lib/api";
import { useAppShellStore } from "../../../stores/appShellStore";
import type { PageResponse } from "../../../types/grn";
import type { Vendor } from "../../../types/vendor";
import {
  QUAL_STATUS_LABELS,
  SITE_TYPE_LABELS,
  VENDOR_AUDIT_OUTCOME_LABELS,
  VENDOR_AUDIT_STATUS_LABELS,
  VENDOR_AUDIT_TYPE_LABELS,
  VENDOR_DOCUMENT_STATUS_LABELS,
  VENDOR_DOCUMENT_TYPE_LABELS,
  type CreateVendorBusinessUnitAuditRequest,
  type QualificationStatus,
  type VendorAuditOutcome,
  type VendorAuditStatus,
  type VendorAuditType,
  type VendorBusinessUnit,
  type VendorBusinessUnitAudit,
  type VendorBusinessUnitDocument
} from "../../../types/vendor-business-unit";
import { VendorBUFormDrawer } from "./VendorBUFormDrawer";

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

function qualificationBadge(status: QualificationStatus) {
  if (status === "QUALIFIED") return "bg-green-100 text-green-700";
  if (status === "CAPA_PENDING" || status === "AUDIT_SCHEDULED" || status === "AUDIT_IN_PROGRESS") return "bg-amber-100 text-amber-700";
  if (status === "DISQUALIFIED" || status === "SUSPENDED") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-600";
}

function documentBadge(status: VendorBusinessUnitDocument["status"]) {
  if (status === "VALID") return "bg-green-100 text-green-700";
  if (status === "EXPIRING_SOON") return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

function qualificationStepState(step: number, status: QualificationStatus) {
  const order: QualificationStatus[] = [
    "NOT_STARTED",
    "APPLICATION_SUBMITTED",
    "DOCUMENT_REVIEW",
    "AUDIT_SCHEDULED",
    "AUDIT_IN_PROGRESS",
    "CAPA_PENDING",
    "QUALIFIED",
    "RE_QUALIFICATION_DUE",
    "SUSPENDED",
    "DISQUALIFIED"
  ];
  const rank = order.indexOf(status);
  if (step === 1) return rank >= order.indexOf("APPLICATION_SUBMITTED") || rank >= order.indexOf("DOCUMENT_REVIEW");
  if (step === 2) return rank >= order.indexOf("DOCUMENT_REVIEW");
  if (step === 3) return rank >= order.indexOf("AUDIT_SCHEDULED");
  return status === "QUALIFIED" || status === "RE_QUALIFICATION_DUE";
}

type AuditFormProps = {
  open: boolean;
  currentUser: string;
  editTarget: VendorBusinessUnitAudit | null;
  onClose: () => void;
  onSubmit: (payload: CreateVendorBusinessUnitAuditRequest) => Promise<void>;
};

function AuditFormModal({ open, currentUser, editTarget, onClose, onSubmit }: AuditFormProps) {
  const [form, setForm] = useState<CreateVendorBusinessUnitAuditRequest>({
    auditType: "INITIAL_QUALIFICATION",
    scheduledDate: "",
    auditedBy: currentUser,
    status: "SCHEDULED",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (editTarget) {
      setForm({
        auditType: editTarget.auditType,
        scheduledDate: editTarget.scheduledDate,
        completedDate: editTarget.completedDate ?? undefined,
        auditedBy: editTarget.auditedBy,
        status: editTarget.status,
        outcome: editTarget.outcome ?? undefined,
        observationCount: editTarget.observationCount ?? undefined,
        criticalObservationCount: editTarget.criticalObservationCount ?? undefined,
        notes: editTarget.notes ?? ""
      });
    } else {
      setForm({
        auditType: "INITIAL_QUALIFICATION",
        scheduledDate: "",
        auditedBy: currentUser,
        status: "SCHEDULED",
        notes: ""
      });
    }
    setSaving(false);
    setError(null);
  }, [open, editTarget, currentUser]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form.scheduledDate || !form.auditedBy.trim()) {
      setError("Scheduled date and auditor are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        ...form,
        auditedBy: form.auditedBy.trim(),
        notes: form.notes?.trim() || undefined
      });
      onClose();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "Failed to save audit");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const baseInput = "w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-50 flex w-[420px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">{editTarget ? "Update Audit" : "Schedule Audit"}</h2>
            <p className="mt-0.5 text-xs text-slate-500">Site-level qualification audit</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">✕</button>
        </div>
        <form id="audit-form" onSubmit={handleSubmit} className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{error}</div>}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Audit Type</label>
            <select
              value={form.auditType}
              onChange={(e) => setForm((current) => ({ ...current, auditType: e.target.value as VendorAuditType }))}
              className={baseInput}
            >
              {(Object.keys(VENDOR_AUDIT_TYPE_LABELS) as VendorAuditType[]).map((key) => (
                <option key={key} value={key}>{VENDOR_AUDIT_TYPE_LABELS[key]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Scheduled Date</label>
              <input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => setForm((current) => ({ ...current, scheduledDate: e.target.value }))}
                className={baseInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Completed Date</label>
              <input
                type="date"
                value={form.completedDate ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, completedDate: e.target.value || undefined }))}
                className={baseInput}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Audited By</label>
            <input
              type="text"
              value={form.auditedBy}
              onChange={(e) => setForm((current) => ({ ...current, auditedBy: e.target.value }))}
              className={baseInput}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Status</label>
              <select
                value={form.status ?? "SCHEDULED"}
                onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as VendorAuditStatus }))}
                className={baseInput}
              >
                {(Object.keys(VENDOR_AUDIT_STATUS_LABELS) as VendorAuditStatus[]).map((key) => (
                  <option key={key} value={key}>{VENDOR_AUDIT_STATUS_LABELS[key]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Outcome</label>
              <select
                value={form.outcome ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, outcome: (e.target.value || undefined) as VendorAuditOutcome | undefined }))}
                className={baseInput}
              >
                <option value="">Pending</option>
                {(Object.keys(VENDOR_AUDIT_OUTCOME_LABELS) as VendorAuditOutcome[]).map((key) => (
                  <option key={key} value={key}>{VENDOR_AUDIT_OUTCOME_LABELS[key]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Observations</label>
              <input
                type="number"
                min="0"
                value={form.observationCount ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, observationCount: e.target.value ? Number(e.target.value) : undefined }))}
                className={baseInput}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">Critical</label>
              <input
                type="number"
                min="0"
                value={form.criticalObservationCount ?? ""}
                onChange={(e) => setForm((current) => ({ ...current, criticalObservationCount: e.target.value ? Number(e.target.value) : undefined }))}
                className={baseInput}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-700">Notes</label>
            <textarea
              value={form.notes ?? ""}
              onChange={(e) => setForm((current) => ({ ...current, notes: e.target.value }))}
              rows={4}
              className={baseInput}
            />
          </div>
        </form>
        <div className="flex items-center justify-end gap-2 border-t border-orange-100 px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">Cancel</button>
          <button
            type="submit"
            form="audit-form"
            disabled={saving}
            className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : editTarget ? "Update Audit" : "Schedule Audit"}
          </button>
        </div>
      </div>
    </>
  );
}

export default function VendorBUsPage() {
  const VENDOR_GROUPS_PER_PAGE = 6;
  const currentUser = useAppShellStore((state) => state.currentUser.name);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [businessUnits, setBusinessUnits] = useState<VendorBusinessUnit[]>([]);
  const [documents, setDocuments] = useState<VendorBusinessUnitDocument[]>([]);
  const [audits, setAudits] = useState<VendorBusinessUnitAudit[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedVendorId, setSelectedVendorId] = useState<string | "ALL">(searchParams.get("vendorId") ?? "ALL");
  const [hierarchyPage, setHierarchyPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [docsLoading, setDocsLoading] = useState(false);
  const [auditsLoading, setAuditsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<VendorBusinessUnit | null>(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [editAuditTarget, setEditAuditTarget] = useState<VendorBusinessUnitAudit | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [createVendorId, setCreateVendorId] = useState<string | null>(null);
  const [statusSaving, setStatusSaving] = useState(false);

  async function loadBusinessUnits(nextSelectedId?: string | null) {
    setLoading(true);
    setPageError(null);
    try {
      const [vendorsResponse, businessUnitsResponse] = await Promise.all([
        fetchVendors(0, 200),
        fetchVendorBusinessUnits(0, 200)
      ]);
      setVendors(vendorsResponse.content);
      setBusinessUnits(businessUnitsResponse.content);
      const firstForVendor = selectedVendorId !== "ALL"
        ? businessUnitsResponse.content.find((unit) => unit.vendorId === selectedVendorId)?.id
        : null;
      const selected = nextSelectedId
        ?? firstForVendor
        ?? selectedId
        ?? businessUnitsResponse.content[0]?.id
        ?? null;
      setSelectedId(selected);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to load vendor business units");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBusinessUnits();
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setDocuments([]);
      setAudits([]);
      return;
    }

    void loadBusinessUnitDocuments(selectedId);
    setAuditsLoading(true);
    void fetchVendorBusinessUnitAudits(selectedId)
      .then(setAudits)
      .catch(() => setAudits([]))
      .finally(() => setAuditsLoading(false));
  }, [selectedId]);

  const vendorById = useMemo(
    () => new Map(vendors.map((vendor) => [vendor.id, vendor])),
    [vendors]
  );

  const filtered = businessUnits.filter((businessUnit) => {
    const vendorName = vendorById.get(businessUnit.vendorId)?.vendorName ?? "";
    const query = search.toLowerCase();
    const matchesVendor = selectedVendorId === "ALL" || businessUnit.vendorId === selectedVendorId;
    return matchesVendor && (
      !query
      || businessUnit.unitName.toLowerCase().includes(query)
      || (businessUnit.buCode ?? "").toLowerCase().includes(query)
      || vendorName.toLowerCase().includes(query)
    );
  });

  const groupedBusinessUnits = vendors
    .map((vendor) => ({
      vendor,
      units: filtered.filter((businessUnit) => businessUnit.vendorId === vendor.id)
    }))
    .filter((group) => group.units.length > 0);
  const hierarchyPageCount = Math.max(1, Math.ceil(groupedBusinessUnits.length / VENDOR_GROUPS_PER_PAGE));
  const pagedGroupedBusinessUnits = groupedBusinessUnits.slice(
    (hierarchyPage - 1) * VENDOR_GROUPS_PER_PAGE,
    hierarchyPage * VENDOR_GROUPS_PER_PAGE
  );

  const selected = businessUnits.find((businessUnit) => businessUnit.id === selectedId) ?? null;
  const selectedVendor = selected ? vendorById.get(selected.vendorId) ?? null : null;
  const latestAudit = audits[0] ?? null;
  const dueAuditsCount = businessUnits.filter((businessUnit) => {
    if (!businessUnit.nextRequalificationDue) return false;
    const dueDate = new Date(businessUnit.nextRequalificationDue);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate.getTime() - today.getTime() <= 1000 * 60 * 60 * 24 * 60;
  }).length;
  const expiringDocsCount = documents.filter((document) => document.status === "EXPIRING_SOON" || document.status === "EXPIRED").length;

  useEffect(() => {
    setHierarchyPage(1);
  }, [selectedVendorId, search]);

  useEffect(() => {
    if (selectedVendorId === "ALL") {
      return;
    }
    if (selected && selected.vendorId !== selectedVendorId) {
      setSelectedId(null);
    }
  }, [selectedVendorId, selected]);

  useEffect(() => {
    setHierarchyPage((current) => Math.min(current, hierarchyPageCount));
  }, [hierarchyPageCount]);

  async function loadBusinessUnitDocuments(id: string) {
    setDocsLoading(true);
    try {
      const items = await fetchVendorBusinessUnitDocuments(id);
      setDocuments(items);
    } catch {
      setDocuments([]);
    } finally {
      setDocsLoading(false);
    }
  }

  async function refreshSelectedSite(id: string) {
    setSelectedId(id);
    await loadBusinessUnits(id);
    await loadBusinessUnitDocuments(id);
    setAuditsLoading(true);
    try {
      const refreshedAudits = await fetchVendorBusinessUnitAudits(id);
      setAudits(refreshedAudits);
    } catch {
      setAudits([]);
    } finally {
      setAuditsLoading(false);
    }
  }

  async function handleDocumentOpen(document: VendorBusinessUnitDocument) {
    if (!selectedId) return;
    const blob = await fetchVendorBusinessUnitDocumentFile(selectedId, document.id);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }

  async function handleDocumentDelete(documentId: string) {
    if (!selectedId) return;
    await deleteVendorBusinessUnitDocument(selectedId, documentId);
    setDocuments((current) => current.filter((document) => document.id !== documentId));
  }

  async function handleAuditSubmit(payload: CreateVendorBusinessUnitAuditRequest) {
    if (!selectedId) return;
    const saved = editAuditTarget
      ? await updateVendorBusinessUnitAudit(selectedId, editAuditTarget.id, payload)
      : await createVendorBusinessUnitAudit(selectedId, payload);
    setAudits((current) => {
      const exists = current.some((audit) => audit.id === saved.id);
      return exists
        ? current.map((audit) => audit.id === saved.id ? saved : audit)
        : [saved, ...current];
    });
    await loadBusinessUnits(selectedId);
    const refreshedAudits = await fetchVendorBusinessUnitAudits(selectedId);
    setAudits(refreshedAudits);
    setEditAuditTarget(null);
  }

  function openNewSite() {
    const targetVendorId =
      selectedVendorId !== "ALL"
        ? selectedVendorId
        : selected?.vendorId ?? vendors[0]?.id ?? null;
    if (!targetVendorId) {
      setPageError("Create a vendor before adding a site.");
      return;
    }
    setCreateVendorId(targetVendorId);
    setEditTarget(null);
    setDrawerOpen(true);
  }

  function openEditSite() {
    if (!selected) return;
    setCreateVendorId(selected.vendorId);
    setEditTarget(selected);
    setDrawerOpen(true);
  }

  async function handleDeactivate() {
    if (!selected) return;
    await deleteVendorBusinessUnit(selected.id);
    await loadBusinessUnits();
  }

  function buildBusinessUnitUpdatePayload(
    businessUnit: VendorBusinessUnit,
    qualificationStatus: QualificationStatus
  ) {
    return {
      unitName: businessUnit.unitName,
      buCode: businessUnit.buCode ?? undefined,
      siteType: businessUnit.siteType ?? undefined,
      address: businessUnit.address ?? undefined,
      city: businessUnit.city ?? undefined,
      state: businessUnit.state ?? undefined,
      country: businessUnit.country ?? undefined,
      pincode: businessUnit.pincode ?? undefined,
      siteContactPerson: businessUnit.siteContactPerson ?? undefined,
      siteEmail: businessUnit.siteEmail ?? undefined,
      sitePhone: businessUnit.sitePhone ?? undefined,
      drugLicenseNumber: businessUnit.drugLicenseNumber ?? undefined,
      drugLicenseExpiry: businessUnit.drugLicenseExpiry ?? undefined,
      gmpCertBody: businessUnit.gmpCertBody ?? undefined,
      gmpCertNumber: businessUnit.gmpCertNumber ?? undefined,
      gmpCertExpiry: businessUnit.gmpCertExpiry ?? undefined,
      isWhoGmpCertified: businessUnit.isWhoGmpCertified,
      isUsfda: businessUnit.isUsfda,
      isEuGmp: businessUnit.isEuGmp,
      qualificationStatus,
      qualifiedDate: qualificationStatus === "QUALIFIED"
        ? (businessUnit.qualifiedDate ?? new Date().toISOString().slice(0, 10))
        : businessUnit.qualifiedDate ?? undefined,
      nextRequalificationDue: qualificationStatus === "QUALIFIED" && !businessUnit.nextRequalificationDue
        ? new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toISOString().slice(0, 10)
        : businessUnit.nextRequalificationDue ?? undefined,
      lastAuditDate: businessUnit.lastAuditDate ?? undefined,
      qaRating: businessUnit.qaRating ?? undefined,
      deliveryScore: businessUnit.deliveryScore ?? undefined,
      rejectionRate: businessUnit.rejectionRate ?? undefined,
      openCapaCount: businessUnit.openCapaCount ?? undefined,
      updatedBy: currentUser
    };
  }

  async function handleQualificationChange(nextStatus: QualificationStatus) {
    if (!selected) return;
    setStatusSaving(true);
    setPageError(null);
    try {
      const saved = await updateVendorBusinessUnit(
        selected.vendorId,
        selected.id,
        buildBusinessUnitUpdatePayload(selected, nextStatus)
      );
      setBusinessUnits((current) => current.map((item) => item.id === saved.id ? saved : item));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Failed to update site qualification");
    } finally {
      setStatusSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/master-data/partners/vendors")}
            className="mb-2 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-orange-700"
          >
            <span aria-hidden="true">←</span>
            Back to Vendors
          </button>
          <h1 className="text-xl font-bold text-slate-800">Vendor Business Units</h1>
          <p className="mt-0.5 text-sm text-slate-500">Corporate vendor → manufacturing site hierarchy for qualification, compliance documents, and audit history</p>
        </div>
        <button
          type="button"
          onClick={openNewSite}
          className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700"
        >
          Add Site
        </button>
      </div>

      {pageError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{pageError}</div>
      )}

      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Total Sites</div>
          <div className="mt-1 text-2xl font-bold text-slate-800">{businessUnits.length}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Qualified</div>
          <div className="mt-1 text-2xl font-bold text-green-600">{businessUnits.filter((item) => item.qualificationStatus === "QUALIFIED").length}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Audits Due</div>
          <div className="mt-1 text-2xl font-bold text-amber-600">{dueAuditsCount}</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-white p-4 shadow-sm">
          <div className="text-xs text-slate-500">Docs Needing Action</div>
          <div className="mt-1 text-2xl font-bold text-red-600">{expiringDocsCount}</div>
        </div>
      </div>

      <div>
        {selected ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-orange-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">
                    {selectedVendor?.vendorName ?? "Vendor"}
                  </div>
                  <h2 className="mt-1 text-lg font-bold text-slate-800">{selected.unitName}</h2>
                  <p className="text-xs text-slate-500">
                    {selected.buCode ?? "No BU code"} · {selected.siteType ? SITE_TYPE_LABELS[selected.siteType] : "No site type"}
                    {selectedVendor ? ` · Parent vendor ${selectedVendor.vendorCode}` : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={openEditSite} className="rounded-xl border border-orange-200 px-3 py-1.5 text-xs font-semibold text-orange-700">Edit</button>
                  <button
                    type="button"
                    disabled={statusSaving}
                    onClick={() => void handleQualificationChange(selected.isApproved ? "CAPA_PENDING" : "QUALIFIED")}
                    className={[
                      "rounded-xl border px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
                      selected.isApproved
                        ? "border-amber-200 text-amber-700"
                        : "border-green-200 text-green-700"
                    ].join(" ")}
                  >
                    {statusSaving ? "Saving..." : selected.isApproved ? "Mark Pending" : "Approve Site"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditAuditTarget(null);
                      setAuditModalOpen(true);
                    }}
                    className="rounded-xl border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700"
                  >
                    Schedule Audit
                  </button>
                  <button type="button" onClick={() => void handleDeactivate()} className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">Deactivate</button>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Qualification", value: QUAL_STATUS_LABELS[selected.qualificationStatus] },
                  { label: "Qualified Date", value: formatMonthYear(selected.qualifiedDate) },
                  { label: "Next Requalification", value: formatMonthYear(selected.nextRequalificationDue) },
                  { label: "Last Audit", value: formatMonthYear(selected.lastAuditDate) },
                  { label: "WHO GMP", value: selected.isWhoGmpCertified ? "Yes" : "No" },
                  { label: "USFDA", value: selected.isUsfda ? "Yes" : "No" },
                  { label: "EU GMP", value: selected.isEuGmp ? "Yes" : "No" },
                  { label: "Open CAPAs", value: String(selected.openCapaCount ?? 0) }
                ].map((item) => (
                  <div key={item.label} className="rounded-xl bg-orange-50 p-3">
                    <div className="mb-0.5 text-[10px] text-slate-500">{item.label}</div>
                    <div className="text-xs font-bold text-slate-800">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-orange-50 p-3">
                  <div className="mb-0.5 text-[10px] text-slate-500">QA Rating</div>
                  <div className="text-xs font-bold text-slate-800">{selected.qaRating?.toFixed(1) ?? "—"}</div>
                </div>
                <div className="rounded-xl bg-orange-50 p-3">
                  <div className="mb-0.5 text-[10px] text-slate-500">Delivery Score</div>
                  <div className="text-xs font-bold text-slate-800">{selected.deliveryScore != null ? `${selected.deliveryScore.toFixed(2)}%` : "—"}</div>
                </div>
                <div className="rounded-xl bg-orange-50 p-3">
                  <div className="mb-0.5 text-[10px] text-slate-500">Rejection Rate</div>
                  <div className="text-xs font-bold text-slate-800">{selected.rejectionRate != null ? `${selected.rejectionRate.toFixed(2)}%` : "—"}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-700">Site Profile</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Address", value: selected.address ?? "—" },
                    { label: "City / State", value: [selected.city, selected.state].filter(Boolean).join(", ") || "—" },
                    { label: "Country / Pincode", value: [selected.country, selected.pincode].filter(Boolean).join(" · ") || "—" },
                    { label: "Site Contact", value: selected.siteContactPerson ?? "—" },
                    { label: "Site Email", value: selected.siteEmail ?? "—" },
                    { label: "Site Phone", value: selected.sitePhone ?? "—" },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-orange-50 p-3">
                      <div className="mb-0.5 text-[10px] text-slate-500">{item.label}</div>
                      <div className="text-xs font-bold text-slate-800">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-slate-700">Regulatory & GMP</div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Drug License", value: selected.drugLicenseNumber ?? "—" },
                    { label: "License Expiry", value: formatMonthYear(selected.drugLicenseExpiry) },
                    { label: "GMP Certifying Body", value: selected.gmpCertBody ?? "—" },
                    { label: "GMP Certificate No.", value: selected.gmpCertNumber ?? "—" },
                    { label: "GMP Certificate Expiry", value: formatMonthYear(selected.gmpCertExpiry) },
                    {
                      label: "Certifications",
                      value: [
                        selected.isWhoGmpCertified ? "WHO-GMP" : null,
                        selected.isUsfda ? "USFDA" : null,
                        selected.isEuGmp ? "EU-GMP" : null
                      ].filter(Boolean).join(", ") || "—"
                    },
                  ].map((item) => (
                    <div key={item.label} className="rounded-xl bg-orange-50 p-3">
                      <div className="mb-0.5 text-[10px] text-slate-500">{item.label}</div>
                      <div className="text-xs font-bold text-slate-800">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-orange-200 bg-white p-4 shadow-sm">
              <div className="mb-3 text-sm font-semibold text-slate-700">Qualification Status</div>
              <div className="grid grid-cols-4 gap-3">
                {[
                  {
                    number: 1,
                    title: "Vendor Application",
                    date: formatMonthYear(selected.createdAt),
                    done: qualificationStepState(1, selected.qualificationStatus)
                  },
                  {
                    number: 2,
                    title: "Doc Review",
                    date: formatMonthYear(selected.updatedAt ?? selected.createdAt),
                    done: qualificationStepState(2, selected.qualificationStatus)
                  },
                  {
                    number: 3,
                    title: "Site Audit",
                    date: formatMonthYear(latestAudit?.completedDate ?? latestAudit?.scheduledDate ?? selected.lastAuditDate),
                    done: qualificationStepState(3, selected.qualificationStatus)
                  },
                  {
                    number: 4,
                    title: "QA Approved",
                    date: selected.isApproved ? "Active" : "Pending",
                    done: qualificationStepState(4, selected.qualificationStatus)
                  }
                ].map((step, index, steps) => (
                  <div key={step.number} className="relative">
                    {index < steps.length - 1 ? (
                      <div className="absolute left-[calc(100%-8px)] top-1/2 hidden -translate-y-1/2 text-xl font-bold text-orange-300 lg:block">
                        →
                      </div>
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
                          <div className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                            ✓
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 rounded-xl border border-orange-100 bg-[#fff8ef] px-4 py-3 text-xs text-slate-600">
                Current status: <span className="font-semibold text-slate-800">{QUAL_STATUS_LABELS[selected.qualificationStatus]}</span>.
                {selected.isApproved
                  ? " Site approval is active for procurement and quality workflows."
                  : " Site approval is still pending and should be completed after document review and audit closure."}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
                <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3">
                  <div className="text-sm font-semibold text-slate-700">Compliance Documents</div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Add or edit site documents from the site form. Download and delete are available here.
                  </p>
                </div>
                <div className="space-y-2 p-3">
                  {docsLoading ? (
                    <div className="px-2 py-8 text-center text-xs text-slate-400">Loading documents...</div>
                  ) : documents.length === 0 ? (
                    <div className="px-2 py-8 text-center text-xs text-slate-400">
                      No documents uploaded for this site yet. Add them from `Edit Site` or while creating the site.
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
                          <button type="button" onClick={() => void handleDocumentOpen(document)} className="rounded-lg border border-orange-200 px-2 py-1 text-[10px] font-semibold text-orange-700">Download</button>
                          <button type="button" onClick={() => void handleDocumentDelete(document.id)} className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-semibold text-red-600">Delete</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
                <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 to-white px-4 py-3">
                  <span className="text-sm font-semibold text-slate-700">Audit History</span>
                </div>
                <div className="p-3">
                  {auditsLoading ? (
                    <div className="px-2 py-8 text-center text-xs text-slate-400">Loading audits...</div>
                  ) : audits.length === 0 ? (
                    <div className="px-2 py-8 text-center text-xs text-slate-400">
                      No audits recorded for this site yet. Use `Schedule Audit` to create the first audit entry.
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-orange-50 text-left text-[10px] uppercase text-slate-500">
                          <th className="px-2 py-2">Type</th>
                          <th className="px-2 py-2">Date</th>
                          <th className="px-2 py-2">Status</th>
                          <th className="px-2 py-2">Outcome</th>
                          <th className="px-2 py-2">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {audits.map((audit) => (
                          <tr key={audit.id} className="border-b border-orange-50">
                            <td className="px-2 py-2 text-slate-700">{VENDOR_AUDIT_TYPE_LABELS[audit.auditType]}</td>
                            <td className="px-2 py-2 text-slate-600">{formatDate(audit.completedDate ?? audit.scheduledDate)}</td>
                            <td className="px-2 py-2 text-slate-600">{VENDOR_AUDIT_STATUS_LABELS[audit.status]}</td>
                            <td className="px-2 py-2 text-slate-600">{audit.outcome ? VENDOR_AUDIT_OUTCOME_LABELS[audit.outcome] : "Pending"}</td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditAuditTarget(audit);
                                  setAuditModalOpen(true);
                                }}
                                className="rounded-lg border border-orange-200 px-2 py-1 text-[10px] font-semibold text-orange-700"
                              >
                                Edit
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-orange-200 bg-white text-sm text-slate-400">
            Select a site to view qualification details
          </div>
        )}
      </div>

      {selected && (
        <VendorBUFormDrawer
          open={drawerOpen}
          vendorId={editTarget ? selected.vendorId : (createVendorId ?? selected.vendorId)}
          editTarget={editTarget}
          onClose={() => {
            setDrawerOpen(false);
            setCreateVendorId(null);
          }}
          onSaved={(saved) => {
            setBusinessUnits((current) => {
              const existing = current.some((item) => item.id === saved.id);
              return existing ? current.map((item) => item.id === saved.id ? saved : item) : [saved, ...current];
            });
            setDrawerOpen(false);
            setCreateVendorId(null);
            void refreshSelectedSite(saved.id);
          }}
        />
      )}

      {!selected && vendors[0] && (
        <VendorBUFormDrawer
          open={drawerOpen}
          vendorId={createVendorId ?? (selectedVendorId !== "ALL" ? selectedVendorId : vendors[0].id)}
          editTarget={editTarget}
          onClose={() => {
            setDrawerOpen(false);
            setCreateVendorId(null);
          }}
          onSaved={(saved) => {
            setBusinessUnits((current) => [saved, ...current]);
            setDrawerOpen(false);
            setCreateVendorId(null);
            void refreshSelectedSite(saved.id);
          }}
        />
      )}

      <AuditFormModal
        open={auditModalOpen}
        currentUser={currentUser}
        editTarget={editAuditTarget}
        onClose={() => {
          setAuditModalOpen(false);
          setEditAuditTarget(null);
        }}
        onSubmit={handleAuditSubmit}
      />
    </div>
  );
}
