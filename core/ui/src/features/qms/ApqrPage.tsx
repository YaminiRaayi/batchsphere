import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveApqr,
  closeApqr,
  compileApqr,
  createApqr,
  downloadCsvExport,
  downloadPdfReport,
  fetchApqrSummary,
  fetchApqrs,
  fetchMaterials,
  updateApqrConclusions
} from "../../lib/api";
import type { Apqr, ApqrStatus, CreateApqrRequest } from "../../types/apqr";
import { formatDateTime, formatLabel } from "./deviationUi";
import { useAuthStore } from "../../stores/authStore";

const statuses: Array<"ALL" | ApqrStatus> = ["ALL", "DRAFT", "UNDER_REVIEW", "APPROVED", "CLOSED"];

const currentYear = new Date().getFullYear();
const initialForm: CreateApqrRequest = {
  productName: "",
  reviewYear: currentYear,
  periodStart: `${currentYear}-01-01`,
  periodEnd: `${currentYear}-12-31`
};

function statusClass(status: ApqrStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-600";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-700";
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "CLOSED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function ApqrPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canWork = authUser?.role === "QC_ANALYST" || authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";
  const canApprove = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateApqrRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [conclusion, setConclusion] = useState({ processInControl: true, trendsIdentified: "", recommendations: "" });
  const [approval, setApproval] = useState({
    username: authUser?.username ?? "",
    password: "",
    reason: "Annual Product Quality Review approved after QA review.",
    meaning: "I approve this Annual Product Quality Review"
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["apqrs", statusFilter],
    queryFn: () => fetchApqrs(statusFilter === "ALL" ? {} : { status: statusFilter as ApqrStatus })
  });
  const { data: summary } = useQuery({ queryKey: ["apqr-summary"], queryFn: fetchApqrSummary });
  const { data: materialsData } = useQuery({ queryKey: ["materials", "apqr"], queryFn: () => fetchMaterials(0, 500) });

  const apqrs = data?.content ?? [];
  const selected = apqrs.find((item) => item.id === selectedId) ?? apqrs[0] ?? null;
  const materials = materialsData?.content ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return apqrs.filter((apqr) => {
      return (
        !query ||
        apqr.apqrNumber.toLowerCase().includes(query) ||
        apqr.productName.toLowerCase().includes(query) ||
        String(apqr.reviewYear).includes(query)
      );
    });
  }, [apqrs, search]);

  const refreshApqr = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["apqrs"] }),
      queryClient.invalidateQueries({ queryKey: ["apqr-summary"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createApqr,
    onSuccess: async (created) => {
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      setSelectedId(created.id);
      await refreshApqr();
    },
    onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : "Failed to create APQR")
  });
  const compileMutation = useMutation({ mutationFn: compileApqr, onSuccess: refreshApqr });
  const conclusionMutation = useMutation({ mutationFn: (apqr: Apqr) => updateApqrConclusions(apqr.id, conclusion), onSuccess: refreshApqr });
  const approveMutation = useMutation({
    mutationFn: (apqr: Apqr) => approveApqr(apqr.id, approval),
    onSuccess: async () => {
      setApproval((current) => ({ ...current, password: "" }));
      await refreshApqr();
    }
  });
  const closeMutation = useMutation({ mutationFn: (apqr: Apqr) => closeApqr(apqr.id), onSuccess: refreshApqr });

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.productName.trim()) {
      setFormError("Product name is required.");
      return;
    }
    createMutation.mutate({
      ...form,
      productName: form.productName.trim(),
      materialId: form.materialId || undefined
    });
  }

  function selectMaterial(materialId: string) {
    const material = materials.find((item) => item.id === materialId);
    setForm({
      ...form,
      materialId: materialId || undefined,
      productName: material ? material.materialName : form.productName
    });
  }

  const total = apqrs.length;
  const underReview = apqrs.filter((item) => item.status === "UNDER_REVIEW").length;
  const approved = apqrs.filter((item) => item.status === "APPROVED" || item.status === "CLOSED").length;
  const totalOos = summary?.reduce((sum, item) => sum + item.oosCount, 0) ?? 0;
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Annual Product Quality Review</h1>
          <p className="mt-0.5 text-sm text-slate-500">APQR compilation, quality trend review, QA approval, and closure</p>
        </div>
        {canWork ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
          >
            New APQR
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="APQR Records" value={total} sub="Active annual reviews" accent="border-l-blue-500" valueClass="text-blue-700" />
        <KpiCard label="Under Review" value={underReview} sub="Compiled and awaiting QA" accent="border-l-yellow-500" valueClass="text-yellow-700" />
        <KpiCard label="Approved / Closed" value={approved} sub="QA approved reviews" accent="border-l-green-500" valueClass="text-green-700" />
        <KpiCard label="OOS Signals" value={totalOos} sub="Compiled APQR OOS count" accent="border-l-red-500" valueClass="text-red-700" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          placeholder="Search APQR #, product, year..."
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-blue-400"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { void downloadCsvExport("/api/apqr", "apqrs.csv"); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">APQR #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Year</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">GRN / Reject</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">OOS / OOT</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Deviation / CAPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={7}>Loading APQR records...</td></tr>
              ) : errorMessage ? (
                <tr><td className="px-4 py-12 text-center text-red-500" colSpan={7}>{errorMessage}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={7}>No APQR records found.</td></tr>
              ) : filtered.map((apqr) => (
                <tr
                  key={apqr.id}
                  onClick={() => {
                    setSelectedId(apqr.id);
                    setConclusion({
                      processInControl: apqr.processInControl ?? true,
                      trendsIdentified: apqr.trendsIdentified ?? "",
                      recommendations: apqr.recommendations ?? ""
                    });
                  }}
                  className={`cursor-pointer transition hover:bg-slate-50 ${selected?.id === apqr.id ? "bg-blue-50/60" : ""}`}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-blue-700">{apqr.apqrNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{apqr.productName}</td>
                  <td className="px-4 py-3 text-slate-500">{apqr.reviewYear}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(apqr.status)}`}>{formatLabel(apqr.status)}</span></td>
                  <td className="px-4 py-3 text-slate-600">{apqr.totalGrnReceived} / {apqr.grnRejectionCount}</td>
                  <td className="px-4 py-3 text-slate-600">{apqr.oosCount} / {apqr.ootCount}</td>
                  <td className="px-4 py-3 text-slate-600">{apqr.deviationCount} / {apqr.openCapaCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <ApqrDetail
              apqr={selected}
              canWork={canWork}
              canApprove={canApprove}
              conclusion={conclusion}
              setConclusion={setConclusion}
              approval={approval}
              setApproval={setApproval}
              onCompile={() => compileMutation.mutate(selected.id)}
              onSaveConclusion={() => conclusionMutation.mutate(selected)}
              onApprove={() => approveMutation.mutate(selected)}
              onClose={() => closeMutation.mutate(selected)}
              busy={compileMutation.isPending || conclusionMutation.isPending || approveMutation.isPending || closeMutation.isPending}
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-400">Select an APQR to review.</div>
          )}
        </aside>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New APQR</h2>
                <p className="text-sm text-slate-500">Create the annual review shell before compiling quality signals.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Material">
                <select value={form.materialId ?? ""} onChange={(event) => selectMaterial(event.target.value)} className={fieldClass()}>
                  <option value="">No material link</option>
                  {materials.map((material) => (
                    <option key={material.id} value={material.id}>
                      {material.materialCode} - {material.materialName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Product name">
                <input value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} className={fieldClass()} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Review year">
                  <input type="number" value={form.reviewYear} onChange={(event) => setForm({ ...form, reviewYear: Number(event.target.value) })} className={fieldClass()} />
                </Field>
                <Field label="Period start">
                  <input type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} className={fieldClass()} />
                </Field>
                <Field label="Period end">
                  <input type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} className={fieldClass()} />
                </Field>
              </div>
              {formError ? <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{formError}</p> : null}
              <button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60">
                {createMutation.isPending ? "Creating..." : "Create APQR"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApqrDetail(props: {
  apqr: Apqr;
  canWork: boolean;
  canApprove: boolean;
  conclusion: { processInControl: boolean; trendsIdentified: string; recommendations: string };
  setConclusion: (value: { processInControl: boolean; trendsIdentified: string; recommendations: string }) => void;
  approval: { username: string; password: string; reason: string; meaning: string };
  setApproval: (value: { username: string; password: string; reason: string; meaning: string }) => void;
  onCompile: () => void;
  onSaveConclusion: () => void;
  onApprove: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const { apqr, canWork, canApprove, conclusion, setConclusion, approval, setApproval, busy } = props;
  const canCompile = canWork && apqr.status === "DRAFT";
  const canEditConclusion = canWork && apqr.status === "UNDER_REVIEW";
  const canSign = canApprove && apqr.status === "UNDER_REVIEW";
  const canClose = canApprove && apqr.status === "APPROVED";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-mono text-sm font-bold text-blue-700">{apqr.apqrNumber}</h2>
          <p className="mt-1 text-base font-bold text-slate-800">{apqr.productName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{apqr.periodStart} to {apqr.periodEnd}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={() => { void downloadPdfReport(`/api/apqr/${apqr.id}/report`, `apqr-${apqr.apqrNumber}.pdf`); }}
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
          >
            Download PDF
          </button>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(apqr.status)}`}>{formatLabel(apqr.status)}</span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Metric label="Batches" value={apqr.totalBatchesManufactured} />
        <Metric label="GRNs" value={apqr.totalGrnReceived} />
        <Metric label="GRN rejects" value={apqr.grnRejectionCount} />
        <Metric label="OOS / OOT" value={`${apqr.oosCount} / ${apqr.ootCount}`} />
        <Metric label="Deviations" value={apqr.deviationCount} />
        <Metric label="Open CAPAs" value={apqr.openCapaCount} />
        <Metric label="Changes" value={apqr.changeControlCount} />
        <Metric label="Complaints" value={apqr.complaintCount} />
      </div>

      <div className="mt-5 space-y-3">
        {canCompile ? (
          <button type="button" onClick={props.onCompile} disabled={busy} className="w-full rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
            Compile APQR Signals
          </button>
        ) : null}

        <div className="rounded-xl border border-slate-200 p-4">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">QA conclusions</div>
          <label className="mb-3 flex items-center gap-2 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={conclusion.processInControl}
              disabled={!canEditConclusion}
              onChange={(event) => setConclusion({ ...conclusion, processInControl: event.target.checked })}
            />
            Process remains in control
          </label>
          <Field label="Trends identified">
            <textarea
              value={conclusion.trendsIdentified}
              disabled={!canEditConclusion}
              onChange={(event) => setConclusion({ ...conclusion, trendsIdentified: event.target.value })}
              className={fieldClass("min-h-20")}
            />
          </Field>
          <Field label="Recommendations">
            <textarea
              value={conclusion.recommendations}
              disabled={!canEditConclusion}
              onChange={(event) => setConclusion({ ...conclusion, recommendations: event.target.value })}
              className={fieldClass("min-h-20")}
            />
          </Field>
          {canEditConclusion ? (
            <button type="button" onClick={props.onSaveConclusion} disabled={busy} className="mt-3 w-full rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-900 disabled:opacity-60">
              Save Conclusions
            </button>
          ) : null}
        </div>

        {canSign ? (
          <div className="rounded-xl border border-green-200 bg-green-50/40 p-4">
            <div className="mb-3 text-xs font-bold uppercase tracking-wide text-green-700">QA approval e-signature</div>
            <div className="grid gap-3">
              <Field label="Username">
                <input value={approval.username} onChange={(event) => setApproval({ ...approval, username: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Password">
                <input type="password" value={approval.password} onChange={(event) => setApproval({ ...approval, password: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Reason">
                <textarea value={approval.reason} onChange={(event) => setApproval({ ...approval, reason: event.target.value })} className={fieldClass("min-h-16")} />
              </Field>
              <button type="button" onClick={props.onApprove} disabled={busy || !approval.password} className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60">
                Approve APQR
              </button>
            </div>
          </div>
        ) : null}

        {canClose ? (
          <button type="button" onClick={props.onClose} disabled={busy} className="w-full rounded-xl bg-blue-700 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-60">
            Close APQR
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid gap-2 text-xs text-slate-500">
        <Meta label="Prepared" value={apqr.preparedBy ? `${apqr.preparedBy} · ${formatDateTime(apqr.preparedAt)}` : "-"} />
        <Meta label="Approved" value={apqr.approvedBy ? `${apqr.approvedBy} · ${formatDateTime(apqr.approvedAt)}` : "-"} />
        <Meta label="Signature" value={apqr.approvalESignatureId ?? "-"} />
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent, valueClass }: { label: string; value: ReactNode; sub: string; accent: string; valueClass: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-lg font-bold text-slate-800">{value}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-slate-600">
      <span className="mb-1 block">{label}</span>
      {children}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
      <span className="font-semibold text-slate-500">{label}</span>
      <span className="min-w-0 break-all text-right text-slate-700">{value}</span>
    </div>
  );
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 ${extra}`;
}
