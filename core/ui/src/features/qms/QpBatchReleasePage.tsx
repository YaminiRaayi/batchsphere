import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  analystSignCoa,
  certifyQpBatchRelease,
  createQpBatchRelease,
  downloadCsvExport,
  downloadPdfReport,
  fetchMaterials,
  fetchQpBatchCertificate,
  fetchQpBatchReleases,
  issueCoa,
  rejectQpBatchRelease
} from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type {
  AnalystSignCoaRequest,
  BatchCertificate,
  BatchReleaseStatus,
  CertifyBatchRequest,
  CreateQpBatchReleaseRequest,
  IssueCoaRequest,
  QpBatchRelease
} from "../../types/qp-batch-release";
import { formatDateTime, formatLabel } from "./deviationUi";

const statuses: Array<"ALL" | BatchReleaseStatus> = ["ALL", "PENDING_QP_REVIEW", "UNDER_REVIEW", "CERTIFIED", "REJECTED", "ON_HOLD"];

const initialForm: CreateQpBatchReleaseRequest = {
  lotNumber: "",
  productName: ""
};

function statusClass(status: BatchReleaseStatus) {
  switch (status) {
    case "CERTIFIED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "ON_HOLD":
      return "bg-orange-100 text-orange-700";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function QpBatchReleasePage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canCreate = authUser?.role === "QC_ANALYST" || authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";
  const canCertify = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateQpBatchReleaseRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [certificate, setCertificate] = useState<BatchCertificate | null>(null);
  const [analystCoaSig, setAnalystCoaSig] = useState<AnalystSignCoaRequest>({ username: authUser?.username ?? "", password: "" });
  const [issueCoaReq, setIssueCoaReq] = useState<IssueCoaRequest>({ username: authUser?.username ?? "", password: "" });
  const [coaError, setCoaError] = useState<string | null>(null);
  const [certification, setCertification] = useState<CertifyBatchRequest>({
    username: authUser?.username ?? "",
    password: "",
    qpName: authUser?.username ?? "",
    reason: "QP certification completed after Annex 16 checklist review.",
    meaning: "I certify this batch for release according to EU GMP Annex 16",
    certificationStatement: "Certified for release after review of QC disposition, investigations, deviations, and batch documentation."
  });

  const { data, isLoading, error } = useQuery({
    queryKey: ["qp-batch-releases", statusFilter],
    queryFn: () => fetchQpBatchReleases(statusFilter === "ALL" ? {} : { status: statusFilter as BatchReleaseStatus })
  });
  const { data: materialsData } = useQuery({ queryKey: ["materials", "batch-release"], queryFn: () => fetchMaterials(0, 500) });

  const releases = data?.content ?? [];
  const selected = releases.find((item) => item.id === selectedId) ?? releases[0] ?? null;
  const materials = materialsData?.content ?? [];
  const errorMessage = error instanceof Error ? error.message : null;

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return releases.filter((release) => {
      return (
        !query ||
        release.releaseNumber.toLowerCase().includes(query) ||
        release.lotNumber.toLowerCase().includes(query) ||
        release.productName.toLowerCase().includes(query)
      );
    });
  }, [releases, search]);

  const kpis = useMemo(() => {
    const now = new Date();
    return {
      pending: releases.filter((item) => item.status === "PENDING_QP_REVIEW" || item.status === "UNDER_REVIEW").length,
      certifiedMonth: releases.filter((item) => {
        if (item.status !== "CERTIFIED" || !item.certifiedAt) return false;
        const certifiedAt = new Date(item.certifiedAt);
        return certifiedAt.getFullYear() === now.getFullYear() && certifiedAt.getMonth() === now.getMonth();
      }).length,
      rejected: releases.filter((item) => item.status === "REJECTED").length,
      onHold: releases.filter((item) => item.status === "ON_HOLD").length
    };
  }, [releases]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["qp-batch-releases"] });
  };

  const createMutation = useMutation({
    mutationFn: createQpBatchRelease,
    onSuccess: async (created) => {
      setSelectedId(created.id);
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      await refresh();
    },
    onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : "Failed to create batch release")
  });
  const certifyMutation = useMutation({
    mutationFn: (release: QpBatchRelease) => certifyQpBatchRelease(release.id, certification),
    onSuccess: async () => {
      setCertification((current) => ({ ...current, password: "" }));
      setCertificate(null);
      await refresh();
    }
  });
  const rejectMutation = useMutation({
    mutationFn: (release: QpBatchRelease) => rejectQpBatchRelease(release.id, { reason: rejectReason }),
    onSuccess: async () => {
      setRejectReason("");
      setCertificate(null);
      await refresh();
    }
  });
  const certificateMutation = useMutation({
    mutationFn: (release: QpBatchRelease) => fetchQpBatchCertificate(release.id),
    onSuccess: setCertificate
  });
  const analystSignMutation = useMutation({
    mutationFn: (release: QpBatchRelease) => analystSignCoa(release.id, analystCoaSig),
    onSuccess: async () => { setAnalystCoaSig((prev) => ({ ...prev, password: "" })); setCoaError(null); await refresh(); },
    onError: (err) => setCoaError(err instanceof Error ? err.message : "Analyst sign failed")
  });
  const issueCoaMutation = useMutation({
    mutationFn: (release: QpBatchRelease) => issueCoa(release.id, issueCoaReq),
    onSuccess: async () => { setIssueCoaReq((prev) => ({ ...prev, password: "" })); setCoaError(null); await refresh(); },
    onError: (err) => setCoaError(err instanceof Error ? err.message : "Issue CoA failed")
  });

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.lotNumber.trim() || !form.productName.trim()) {
      setFormError("Lot number and product name are required.");
      return;
    }
    createMutation.mutate({
      ...form,
      lotNumber: form.lotNumber.trim(),
      productName: form.productName.trim(),
      materialId: form.materialId || undefined,
      grnId: form.grnId || undefined,
      batchUom: form.batchUom || undefined
    });
  }

  function selectMaterial(materialId: string) {
    const material = materials.find((item) => item.id === materialId);
    setForm((current) => ({
      ...current,
      materialId: materialId || undefined,
      productName: material ? material.materialName : current.productName,
      batchUom: material ? material.uom : current.batchUom
    }));
  }

  const checklistReady = selected ? checklistItems(selected).every((item) => item.pass) : false;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">QP Batch Release</h1>
          <p className="mt-0.5 text-sm text-slate-500">Annex 16 batch certification, checklist gating, and certificate review</p>
        </div>
        {canCreate ? (
          <button type="button" onClick={() => setIsCreateOpen(true)} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-800">
            New Release
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Pending Review" value={kpis.pending} sub="Awaiting QP decision" accent="border-l-yellow-500" valueClass="text-yellow-700" />
        <KpiCard label="Certified This Month" value={kpis.certifiedMonth} sub="Released batches" accent="border-l-green-500" valueClass="text-green-700" />
        <KpiCard label="Rejected" value={kpis.rejected} sub="QP release rejected" accent="border-l-red-500" valueClass="text-red-700" />
        <KpiCard label="On Hold" value={kpis.onHold} sub="Release blocked" accent="border-l-orange-500" valueClass="text-orange-700" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-teal-500"
          placeholder="Search release, lot, product..."
        />
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 outline-none focus:border-teal-500"
        >
          {statuses.map((status) => (
            <option key={status} value={status}>{formatLabel(status)}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => { void downloadCsvExport("/api/qp-batch-releases", "qp-batch-releases.csv"); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Export CSV
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_430px]">
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-xs">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Release #</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Lot</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Product</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Mfg / Expiry</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={5}>Loading batch releases...</td></tr>
              ) : errorMessage ? (
                <tr><td className="px-4 py-12 text-center text-red-500" colSpan={5}>{errorMessage}</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={5}>No batch releases found.</td></tr>
              ) : filtered.map((release) => (
                <tr key={release.id} onClick={() => { setSelectedId(release.id); setCertificate(null); }} className={`cursor-pointer transition hover:bg-slate-50 ${selected?.id === release.id ? "bg-teal-50/60" : ""}`}>
                  <td className="px-4 py-3 font-mono font-semibold text-teal-700">{release.releaseNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{release.lotNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{release.productName}</td>
                  <td className="px-4 py-3 text-slate-500">{release.manufactureDate ?? "-"} / {release.expiryDate ?? "-"}</td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(release.status)}`}>{formatLabel(release.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <aside className="space-y-4">
          {selected ? (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-semibold text-teal-700">{selected.releaseNumber}</p>
                    <h2 className="mt-1 text-lg font-bold text-slate-800">{selected.productName}</h2>
                    <p className="text-xs text-slate-500">Lot {selected.lotNumber}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(selected.status)}`}>{formatLabel(selected.status)}</span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                  <Info label="Batch size" value={selected.batchSize ? `${selected.batchSize} ${selected.batchUom ?? ""}` : "-"} />
                  <Info label="Created" value={formatDateTime(selected.createdAt)} />
                  <Info label="Certified" value={selected.certifiedAt ? formatDateTime(selected.certifiedAt) : "-"} />
                  <Info label="E-signature" value={selected.certificationESignatureId ?? "-"} />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800">Annex 16 Checklist</h3>
                <div className="mt-3 space-y-2">
                  {checklistItems(selected).map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-xs">
                      <span className="font-medium text-slate-700">{item.label}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {item.pass ? "PASS" : "BLOCKED"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-800">QP Certification</h3>
                <div className="mt-3 space-y-3">
                  <input value={certification.qpName ?? ""} onChange={(event) => setCertification({ ...certification, qpName: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500" placeholder="QP name" />
                  <input value={certification.username} onChange={(event) => setCertification({ ...certification, username: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500" placeholder="Signer username" />
                  <input type="password" value={certification.password} onChange={(event) => setCertification({ ...certification, password: event.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500" placeholder="E-signature password" />
                  <textarea value={certification.certificationStatement ?? ""} onChange={(event) => setCertification({ ...certification, certificationStatement: event.target.value })} className="min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-teal-500" />
                  {certifyMutation.error ? <p className="text-xs font-semibold text-red-600">{certifyMutation.error instanceof Error ? certifyMutation.error.message : "Certification failed"}</p> : null}
                  <button type="button" disabled={!canCertify || !checklistReady || selected.status === "CERTIFIED" || certifyMutation.isPending} onClick={() => certifyMutation.mutate(selected)} className="w-full rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                    Certify Batch
                  </button>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-bold text-slate-800">Batch Certificate</h3>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => certificateMutation.mutate(selected)} className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => { void downloadPdfReport(`/api/qp-batch-releases/${selected.id}/certificate/pdf`, `batch-certificate-${selected.releaseNumber}.pdf`); }}
                      className="rounded-lg border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                    >
                      Download PDF
                    </button>
                  </div>
                </div>
                {certificate ? <CertificatePanel certificate={certificate} /> : <p className="mt-3 text-xs text-slate-500">Certificate data is available after selecting View.</p>}
              </section>

              {selected.status === "CERTIFIED" ? (
                <section className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Certificate of Analysis (CoA)</h3>
                  {selected.coaLocked ? (
                    <div className="mt-3 space-y-1 rounded-lg border border-green-100 bg-green-50 p-3 text-xs">
                      <p className="font-mono font-bold text-green-700">{selected.coaNumber}</p>
                      <p><span className="font-semibold text-slate-600">Analyst signed:</span> {selected.analystSignedBy ?? "—"} {selected.analystSignedAt ? `· ${formatDateTime(selected.analystSignedAt)}` : ""}</p>
                      <p><span className="font-semibold text-slate-600">Issued by:</span> {selected.coaIssuedBy ?? "—"} {selected.coaIssuedAt ? `· ${formatDateTime(selected.coaIssuedAt)}` : ""}</p>
                      <button
                        type="button"
                        onClick={() => { void downloadPdfReport(`/api/qp-batch-releases/${selected.id}/coa/pdf`, `${selected.coaNumber ?? "coa"}.pdf`); }}
                        className="mt-2 rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        Download CoA PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => { void downloadPdfReport(`/api/qp-batch-releases/${selected.id}/coa/reprint`, `${selected.coaNumber ?? "coa"}-reprint.pdf`); }}
                        className="ml-2 mt-2 rounded-lg border border-amber-200 px-3 py-1.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Reprint
                      </button>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-3">
                      <button
                        type="button"
                        onClick={() => { void downloadPdfReport(`/api/qp-batch-releases/${selected.id}/coa/preview`, `coa-preview-${selected.releaseNumber}.pdf`); }}
                        className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50"
                      >
                        Preview PDF
                      </button>
                      {!selected.analystSignedBy ? (
                        <div className="rounded-lg border border-violet-100 bg-violet-50 p-3">
                          <p className="mb-2 text-[11px] font-semibold text-violet-700">Step 1 — Analyst E-Signature</p>
                          <input value={analystCoaSig.password} onChange={(e) => setAnalystCoaSig((prev) => ({ ...prev, password: e.target.value }))} type="password" placeholder="Password" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-violet-400" />
                          {coaError ? <p className="mt-1 text-[11px] text-red-600">{coaError}</p> : null}
                          <button type="button" disabled={!analystCoaSig.password || analystSignMutation.isPending} onClick={() => analystSignMutation.mutate(selected)} className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-violet-700 disabled:bg-slate-300">
                            Sign as Analyst
                          </button>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500">Step 1 complete — Analyst signed by <strong>{selected.analystSignedBy}</strong></p>
                      )}
                      {selected.analystSignedBy && canCertify ? (
                        <div className="rounded-lg border border-teal-100 bg-teal-50 p-3">
                          <p className="mb-2 text-[11px] font-semibold text-teal-700">Step 2 — Manager Issues CoA</p>
                          <input value={issueCoaReq.password} onChange={(e) => setIssueCoaReq((prev) => ({ ...prev, password: e.target.value }))} type="password" placeholder="Password" className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs outline-none focus:border-teal-400" />
                          {coaError ? <p className="mt-1 text-[11px] text-red-600">{coaError}</p> : null}
                          <button type="button" disabled={!issueCoaReq.password || issueCoaMutation.isPending} onClick={() => issueCoaMutation.mutate(selected)} className="mt-2 w-full rounded-lg bg-teal-700 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300">
                            Issue CoA
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}

              {selected.status !== "CERTIFIED" ? (
                <section className="rounded-xl border border-red-100 bg-white p-4 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800">Reject Release</h3>
                  <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className="mt-3 min-h-16 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-red-400" placeholder="Rejection reason" />
                  {rejectMutation.error ? <p className="mt-2 text-xs font-semibold text-red-600">{rejectMutation.error instanceof Error ? rejectMutation.error.message : "Reject failed"}</p> : null}
                  <button type="button" disabled={!rejectReason.trim() || rejectMutation.isPending} onClick={() => rejectMutation.mutate(selected)} className="mt-3 w-full rounded-xl border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300">
                    Reject Batch
                  </button>
                </section>
              ) : null}
            </>
          ) : (
            <section className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">Select a batch release to review.</section>
          )}
        </aside>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <form onSubmit={handleCreate} className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New QP Batch Release</h2>
                <p className="text-xs text-slate-500">Checklist values are populated from QC, OOS, deviation, and GRN records.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100">Close</button>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-600">Material
                <select value={form.materialId ?? ""} onChange={(event) => selectMaterial(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500">
                  <option value="">Manual product</option>
                  {materials.map((material) => <option key={material.id} value={material.id}>{material.materialName}</option>)}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-600">Lot number
                <input value={form.lotNumber} onChange={(event) => setForm({ ...form, lotNumber: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
              <label className="text-xs font-semibold text-slate-600 md:col-span-2">Product name
                <input value={form.productName} onChange={(event) => setForm({ ...form, productName: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
              <label className="text-xs font-semibold text-slate-600">GRN ID
                <input value={form.grnId ?? ""} onChange={(event) => setForm({ ...form, grnId: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Batch size
                <input type="number" step="0.0001" value={form.batchSize ?? ""} onChange={(event) => setForm({ ...form, batchSize: event.target.value ? Number(event.target.value) : undefined })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Manufacture date
                <input type="date" value={form.manufactureDate ?? ""} onChange={(event) => setForm({ ...form, manufactureDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
              <label className="text-xs font-semibold text-slate-600">Expiry date
                <input type="date" value={form.expiryDate ?? ""} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-normal outline-none focus:border-teal-500" />
              </label>
            </div>
            {formError ? <p className="mt-3 text-xs font-semibold text-red-600">{formError}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
              <button type="submit" disabled={createMutation.isPending} className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:bg-slate-300">Create Release</button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function checklistItems(release: QpBatchRelease) {
  return [
    { label: "QC disposition confirmed", pass: release.qcDispositionConfirmed },
    { label: "OOS investigations closed", pass: release.oosInvestigationsClosed },
    { label: "No open critical deviations", pass: release.noOpenCriticalDeviations },
    { label: "Documents complete", pass: release.documentsComplete }
  ];
}

function KpiCard({ label, value, sub, accent, valueClass }: { label: string; value: number; sub: string; accent: string; valueClass: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 border-l-4 bg-white p-4 shadow-sm ${accent}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xs font-medium text-slate-700">{value}</p>
    </div>
  );
}

function CertificatePanel({ certificate }: { certificate: BatchCertificate }) {
  return (
    <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-3 text-xs text-slate-700">
      <p className="font-mono font-semibold text-slate-800">{certificate.releaseNumber}</p>
      <p><span className="font-semibold">Product:</span> {certificate.productName}</p>
      <p><span className="font-semibold">Lot:</span> {certificate.lotNumber}</p>
      <p><span className="font-semibold">QP:</span> {certificate.qpName ?? "-"}</p>
      <p><span className="font-semibold">Certified:</span> {certificate.certifiedAt ? formatDateTime(certificate.certifiedAt) : "-"}</p>
      <p><span className="font-semibold">Statement:</span> {certificate.certificationStatement ?? "-"}</p>
      <p><span className="font-semibold">E-signature:</span> {certificate.eSignatureId ?? "-"}</p>
    </div>
  );
}
