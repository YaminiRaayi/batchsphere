import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createSupplierQualityAgreement,
  fetchDocuments,
  fetchExpiringSupplierQualityAgreements,
  fetchSupplierQualityAgreements,
  fetchSuppliers,
  fetchSuppliersWithoutSqa,
  fetchVendorBusinessUnits,
  updateSupplierQualityAgreement
} from "../../../lib/api";
import type {
  CreateSupplierQualityAgreementRequest,
  SupplierQualityAgreement,
  SupplierQualityAgreementStatus
} from "../../../types/supplier-quality-agreement";
import { SQA_STATUS_LABELS } from "../../../types/supplier-quality-agreement";

const statuses: Array<"ALL" | SupplierQualityAgreementStatus> = [
  "ALL",
  "DRAFT",
  "UNDER_NEGOTIATION",
  "ACTIVE",
  "EXPIRED",
  "TERMINATED"
];

const initialForm: CreateSupplierQualityAgreementRequest = {
  title: "",
  status: "DRAFT",
  gmpResponsibilities: "Supplier will manufacture, store, test, and release supplied material in accordance with approved GMP systems, registered specifications, and agreed change-control procedures.",
  changeNotificationRequirements: "Supplier must notify BatchSphere Quality before any material, process, site, testing method, specification, or regulatory status change that may affect quality or supply.",
  auditRights: "BatchSphere may conduct planned, for-cause, and remote audits of the supplier quality system, manufacturing site, warehouse, and relevant quality records.",
  testingResponsibilities: "Supplier provides certificate of analysis for each lot. BatchSphere QC performs incoming sampling, identity testing, and release testing as required by approved specification and MoA.",
  retentionSampleRequirements: "Supplier and BatchSphere retain representative samples per approved retention policy, product risk, and applicable GMP requirement.",
  agreedAcceptanceCriteria: "Material must meet approved pharmacopoeial, internal specification, packaging, labeling, transport, and documentation requirements."
};

function statusClass(status: SupplierQualityAgreementStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-emerald-100 text-emerald-700";
    case "UNDER_NEGOTIATION":
      return "bg-sky-100 text-sky-700";
    case "EXPIRED":
      return "bg-red-100 text-red-700";
    case "TERMINATED":
      return "bg-slate-200 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
}

function dateText(value?: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en", { year: "numeric", month: "short", day: "2-digit" }).format(new Date(`${value}T00:00:00`));
}

function cleanPayload(form: CreateSupplierQualityAgreementRequest): CreateSupplierQualityAgreementRequest {
  return Object.fromEntries(
    Object.entries(form).map(([key, value]) => [key, typeof value === "string" && value.trim() === "" ? undefined : value])
  ) as CreateSupplierQualityAgreementRequest;
}

export default function SupplierQualityAgreementsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [editing, setEditing] = useState<SupplierQualityAgreement | null>(null);
  const [form, setForm] = useState<CreateSupplierQualityAgreementRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["supplier-quality-agreements", statusFilter],
    queryFn: () => fetchSupplierQualityAgreements(statusFilter === "ALL" ? {} : { status: statusFilter as SupplierQualityAgreementStatus })
  });
  const { data: suppliers = [] } = useQuery({ queryKey: ["suppliers"], queryFn: fetchSuppliers });
  const { data: vbuData } = useQuery({ queryKey: ["vendor-business-units", "sqa"], queryFn: () => fetchVendorBusinessUnits(0, 500) });
  const { data: documentsData } = useQuery({ queryKey: ["documents", "sqa", "sop"], queryFn: () => fetchDocuments({ type: "SOP", size: 500 }) });
  const { data: expiring = [] } = useQuery({ queryKey: ["supplier-quality-agreements", "expiring"], queryFn: () => fetchExpiringSupplierQualityAgreements(60) });
  const { data: suppliersWithoutSqa = [] } = useQuery({ queryKey: ["suppliers-without-sqa"], queryFn: fetchSuppliersWithoutSqa });

  const agreements = data?.content ?? [];
  const businessUnits = vbuData?.content ?? [];
  const documents = documentsData?.content ?? [];
  const errorMessage = error instanceof Error ? error.message : null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return agreements.filter((agreement) => {
      if (!query) return true;
      return [
        agreement.sqaNumber,
        agreement.title,
        agreement.supplierName,
        agreement.vendorBusinessUnitName
      ].some((value) => value?.toLowerCase().includes(query));
    });
  }, [agreements, search]);

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["supplier-quality-agreements"] }),
      queryClient.invalidateQueries({ queryKey: ["suppliers-without-sqa"] })
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (payload: CreateSupplierQualityAgreementRequest) =>
      editing ? updateSupplierQualityAgreement(editing.id, payload) : createSupplierQualityAgreement(payload),
    onSuccess: async () => {
      setEditing(null);
      setForm(initialForm);
      setFormError(null);
      setShowForm(false);
      await refresh();
    },
    onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : "Failed to save quality agreement")
  });

  function openCreate() {
    setEditing(null);
    setForm(initialForm);
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(agreement: SupplierQualityAgreement) {
    setShowForm(true);
    setEditing(agreement);
    setForm({
      supplierId: agreement.supplierId ?? undefined,
      vendorBusinessUnitId: agreement.vendorBusinessUnitId ?? undefined,
      title: agreement.title,
      effectiveDate: agreement.effectiveDate ?? undefined,
      expiryDate: agreement.expiryDate ?? undefined,
      status: agreement.status,
      sopDocumentId: agreement.sopDocumentId ?? undefined,
      gmpResponsibilities: agreement.gmpResponsibilities ?? undefined,
      changeNotificationRequirements: agreement.changeNotificationRequirements ?? undefined,
      auditRights: agreement.auditRights ?? undefined,
      testingResponsibilities: agreement.testingResponsibilities ?? undefined,
      retentionSampleRequirements: agreement.retentionSampleRequirements ?? undefined,
      agreedAcceptanceCriteria: agreement.agreedAcceptanceCriteria ?? undefined,
      ourSignatory: agreement.ourSignatory ?? undefined,
      ourSignatoryDate: agreement.ourSignatoryDate ?? undefined,
      supplierSignatory: agreement.supplierSignatory ?? undefined,
      supplierSignatoryDate: agreement.supplierSignatoryDate ?? undefined,
      terminatedReason: agreement.terminatedReason ?? undefined
    });
    setFormError(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError("Agreement title is required.");
      return;
    }
    saveMutation.mutate(cleanPayload(form));
  }

  const activeCount = agreements.filter((item) => item.status === "ACTIVE").length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Supplier Quality Agreements</h1>
          <p className="mt-0.5 text-sm text-slate-500">Written GMP responsibility agreements, expiry tracking, and supplier coverage</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-xl bg-orange-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-orange-700"
        >
          New Agreement
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Agreements" value={agreements.length} sub="Active records in scope" accent="border-l-orange-500" valueClass="text-orange-700" />
        <KpiCard label="Active" value={activeCount} sub="Currently effective SQAs" accent="border-l-emerald-500" valueClass="text-emerald-700" />
        <KpiCard label="Expiring Soon" value={expiring.length} sub="Within next 60 days" accent="border-l-amber-500" valueClass="text-amber-700" />
        <KpiCard label="Suppliers Without SQA" value={suppliersWithoutSqa.length} sub="Qualified suppliers needing coverage" accent="border-l-red-500" valueClass="text-red-700" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-80 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-400"
              placeholder="Search SQA #, title, supplier..."
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-orange-400"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "All Statuses" : SQA_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">SQA #</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Supplier / Site</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={5}>Loading quality agreements...</td></tr>
                ) : errorMessage ? (
                  <tr><td className="px-4 py-12 text-center text-red-500" colSpan={5}>{errorMessage}</td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={5}>No supplier quality agreements found.</td></tr>
                ) : filtered.map((agreement) => (
                  <tr key={agreement.id} className="cursor-pointer transition hover:bg-orange-50/50" onClick={() => openEdit(agreement)}>
                    <td className="px-4 py-3 font-semibold text-slate-800">{agreement.sqaNumber}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-700">{agreement.supplierName ?? "Supplier not linked"}</div>
                      <div className="text-[11px] text-slate-400">{agreement.vendorBusinessUnitName ?? "No site selected"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{agreement.title}</td>
                    <td className="px-4 py-3">
                      <div className={agreement.expiringSoon ? "font-semibold text-amber-700" : "text-slate-600"}>{dateText(agreement.expiryDate)}</div>
                      {agreement.daysUntilExpiry !== null ? (
                        <div className="text-[11px] text-slate-400">{agreement.daysUntilExpiry} days</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(agreement.status)}`}>
                        {SQA_STATUS_LABELS[agreement.status]}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {showForm && <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-800">{editing ? "Edit Quality Agreement" : "New Quality Agreement"}</h2>
              <p className="mt-1 text-xs text-slate-500">Capture GMP responsibilities, change notification, audit rights, testing, retention, and acceptance criteria.</p>
            </div>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50">✕</button>
          </div>

          {formError ? <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{formError}</div> : null}

          <Field label="Supplier">
            <select value={form.supplierId ?? ""} onChange={(event) => setForm({ ...form, supplierId: event.target.value || undefined })} className={inputClass}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>{supplier.supplierName} ({supplier.supplierCode})</option>
              ))}
            </select>
          </Field>

          <Field label="Vendor Business Unit">
            <select value={form.vendorBusinessUnitId ?? ""} onChange={(event) => setForm({ ...form, vendorBusinessUnitId: event.target.value || undefined })} className={inputClass}>
              <option value="">Optional site link</option>
              {businessUnits.map((unit) => (
                <option key={unit.id} value={unit.id}>{unit.unitName}{unit.buCode ? ` (${unit.buCode})` : ""}</option>
              ))}
            </select>
          </Field>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={inputClass} placeholder="API supply quality agreement" />
            </Field>
            <Field label="Status">
              <select value={form.status ?? "DRAFT"} onChange={(event) => setForm({ ...form, status: event.target.value as SupplierQualityAgreementStatus })} className={inputClass}>
                {(statuses.filter((status) => status !== "ALL") as SupplierQualityAgreementStatus[]).map((status) => (
                  <option key={status} value={status}>{SQA_STATUS_LABELS[status]}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Effective Date">
              <input type="date" value={form.effectiveDate ?? ""} onChange={(event) => setForm({ ...form, effectiveDate: event.target.value || undefined })} className={inputClass} />
            </Field>
            <Field label="Expiry Date">
              <input type="date" value={form.expiryDate ?? ""} onChange={(event) => setForm({ ...form, expiryDate: event.target.value || undefined })} className={inputClass} />
            </Field>
          </div>

          <Field label="Linked SOP / Agreement Document">
            <select value={form.sopDocumentId ?? ""} onChange={(event) => setForm({ ...form, sopDocumentId: event.target.value || undefined })} className={inputClass}>
              <option value="">Optional document link</option>
              {documents.map((document) => (
                <option key={document.id} value={document.id}>{document.documentNumber} - {document.title}</option>
              ))}
            </select>
          </Field>

          <TextArea label="GMP Responsibilities" value={form.gmpResponsibilities} onChange={(value) => setForm({ ...form, gmpResponsibilities: value })} />
          <TextArea label="Change Notification Requirements" value={form.changeNotificationRequirements} onChange={(value) => setForm({ ...form, changeNotificationRequirements: value })} />
          <TextArea label="Audit Rights" value={form.auditRights} onChange={(value) => setForm({ ...form, auditRights: value })} />
          <TextArea label="Testing Responsibilities" value={form.testingResponsibilities} onChange={(value) => setForm({ ...form, testingResponsibilities: value })} />
          <TextArea label="Retention Sample Requirements" value={form.retentionSampleRequirements} onChange={(value) => setForm({ ...form, retentionSampleRequirements: value })} />
          <TextArea label="Agreed Acceptance Criteria" value={form.agreedAcceptanceCriteria} onChange={(value) => setForm({ ...form, agreedAcceptanceCriteria: value })} />

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Our Signatory">
              <input value={form.ourSignatory ?? ""} onChange={(event) => setForm({ ...form, ourSignatory: event.target.value })} className={inputClass} placeholder="QA Head" />
            </Field>
            <Field label="Our Sign Date">
              <input type="date" value={form.ourSignatoryDate ?? ""} onChange={(event) => setForm({ ...form, ourSignatoryDate: event.target.value || undefined })} className={inputClass} />
            </Field>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Supplier Signatory">
              <input value={form.supplierSignatory ?? ""} onChange={(event) => setForm({ ...form, supplierSignatory: event.target.value })} className={inputClass} placeholder="Supplier QA representative" />
            </Field>
            <Field label="Supplier Sign Date">
              <input type="date" value={form.supplierSignatoryDate ?? ""} onChange={(event) => setForm({ ...form, supplierSignatoryDate: event.target.value || undefined })} className={inputClass} />
            </Field>
          </div>

          {form.status === "TERMINATED" ? (
            <TextArea label="Termination Reason" value={form.terminatedReason} onChange={(value) => setForm({ ...form, terminatedReason: value })} />
          ) : null}

          <div className="flex items-center justify-end gap-2">
            {editing ? (
              <button type="button" onClick={openCreate} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                Clear
              </button>
            ) : null}
            <button type="submit" disabled={saveMutation.isPending} className="rounded-lg bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700 disabled:cursor-wait disabled:opacity-60">
              {saveMutation.isPending ? "Saving..." : editing ? "Update Agreement" : "Create Agreement"}
            </button>
          </div>
        </form>}
      </div>
    </div>
  );
}

const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function KpiCard({ label, value, sub, accent, valueClass }: { label: string; value: number; sub: string; accent: string; valueClass: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <div className="text-xs font-semibold uppercase text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-500">{sub}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return (
    <Field label={label}>
      <textarea
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${inputClass} min-h-20 resize-y`}
      />
    </Field>
  );
}
