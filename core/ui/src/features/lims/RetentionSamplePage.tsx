import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createRetentionSample,
  downloadCsvExport,
  fetchRetentionSamples,
  fetchRetentionSampleSummary
} from "../../lib/api";
import type { CreateRetentionSampleRequest, RetentionSampleStatus } from "../../types/retention-sample";
import { useAuthStore } from "../../stores/authStore";

const ALL_STATUSES: Array<"ALL" | RetentionSampleStatus> = ["ALL", "STORED", "RETRIEVED", "TESTED", "DISPOSED"];

const initialForm: CreateRetentionSampleRequest = {
  samplingRequestId: "",
  lotNumber: "",
  materialName: "",
  quantity: 0,
  uom: "",
  storageLocation: "",
  storageCondition: "",
  containerDescription: ""
};

function statusBadgeClass(status: RetentionSampleStatus) {
  switch (status) {
    case "STORED": return "bg-green-100 text-green-700";
    case "RETRIEVED": return "bg-blue-100 text-blue-700";
    case "TESTED": return "bg-purple-100 text-purple-700";
    case "DISPOSED": return "bg-slate-100 text-slate-500";
    default: return "bg-slate-100 text-slate-600";
  }
}

function daysColor(days: number, status: RetentionSampleStatus) {
  if (status !== "STORED") return "text-slate-400";
  if (days < 0) return "text-red-600 font-bold";
  if (days <= 30) return "text-red-500";
  if (days <= 60) return "text-amber-500";
  return "text-green-600";
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-teal-400 ${extra}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function KpiCard({ label, value, sub, accent, valueClass }: { label: string; value: number; sub: string; accent: string; valueClass: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accent}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-slate-400">{sub}</p>
    </div>
  );
}

export function RetentionSamplePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canCreate = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [statusFilter, setStatusFilter] = useState<(typeof ALL_STATUSES)[number]>("ALL");
  const [lotSearch, setLotSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateRetentionSampleRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["retention-samples", statusFilter, lotSearch],
    queryFn: () => fetchRetentionSamples({
      status: statusFilter === "ALL" ? undefined : statusFilter,
      lotNumber: lotSearch || undefined
    })
  });

  const { data: summary } = useQuery({
    queryKey: ["retention-sample-summary"],
    queryFn: fetchRetentionSampleSummary
  });

  const createMutation = useMutation({
    mutationFn: createRetentionSample,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["retention-samples"] });
      queryClient.invalidateQueries({ queryKey: ["retention-sample-summary"] });
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message)
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.samplingRequestId.trim()) { setFormError("Sampling Request ID is required"); return; }
    if (!form.lotNumber.trim()) { setFormError("Lot number is required"); return; }
    if (!form.quantity || form.quantity <= 0) { setFormError("Quantity must be positive"); return; }
    if (!form.uom.trim()) { setFormError("UoM is required"); return; }
    if (!form.storageLocation.trim()) { setFormError("Storage location is required"); return; }
    setFormError(null);
    createMutation.mutate(form);
  }

  const samples = data?.content ?? [];
  const exportPath = `/api/retention-samples?size=10000${statusFilter === "ALL" ? "" : `&status=${statusFilter}`}${lotSearch ? `&lotNumber=${encodeURIComponent(lotSearch)}` : ""}`;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Retention Samples</h1>
          <p className="mt-0.5 text-xs text-slate-500">EU GMP Annex 19 — chain of custody, storage, retrieval &amp; disposal</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadCsvExport(exportPath, "retention-samples.csv")}
            className="rounded-xl border border-teal-200 bg-white px-4 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
          >
            Export CSV
          </button>
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-700"
            >
              + Register Sample
            </button>
          )}
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Total Stored" value={summary?.totalStored ?? 0} sub="currently in storage" accent="border-l-teal-500" valueClass="text-teal-700" />
        <KpiCard label="Expiring ≤30d" value={summary?.expiringIn30Days ?? 0} sub="approaching retention end" accent="border-l-amber-500" valueClass="text-amber-600" />
        <KpiCard label="Overdue Disposal" value={summary?.overdueDisposal ?? 0} sub="past retention date" accent="border-l-red-500" valueClass="text-red-600" />
        <KpiCard label="Retrieved This Month" value={summary?.retrievedThisMonth ?? 0} sub="retrievals recorded" accent="border-l-blue-500" valueClass="text-blue-700" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {ALL_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${statusFilter === s ? "bg-teal-600 text-white" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search lot number…"
          value={lotSearch}
          onChange={(e) => setLotSearch(e.target.value)}
          className="w-52 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-teal-400"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading…</div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-red-500">Failed to load retention samples.</div>
        ) : samples.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No retention samples found.</div>
        ) : (
          <table className="w-full text-xs">
            <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3 text-left">Lot Number</th>
                <th className="px-4 py-3 text-left">Material</th>
                <th className="px-4 py-3 text-left">Storage Location</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3 text-left">Retention Until</th>
                <th className="px-4 py-3 text-right">Days Left</th>
                <th className="px-4 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {samples.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => navigate(`/lims/retention-samples/${s.id}`)}
                  className="cursor-pointer transition-colors hover:bg-teal-50/40"
                >
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700">{s.lotNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{s.materialName ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{s.storageLocation}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s.quantity} {s.uom}</td>
                  <td className="px-4 py-3 text-slate-500">{s.retentionUntil}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${daysColor(s.daysUntilExpiry, s.status)}`}>
                    {s.status === "STORED" ? (s.daysUntilExpiry < 0 ? `${Math.abs(s.daysUntilExpiry)}d overdue` : `${s.daysUntilExpiry}d`) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(s.status)}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create drawer */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/30 backdrop-blur-sm sm:items-center sm:justify-end">
          <div className="h-full w-full max-w-md overflow-y-auto rounded-l-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Register Retention Sample</h2>
              <button onClick={() => { setIsCreateOpen(false); setFormError(null); setForm(initialForm); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Sampling Request ID *">
                <input type="text" required className={fieldClass()} value={form.samplingRequestId}
                  onChange={(e) => setForm({ ...form, samplingRequestId: e.target.value })}
                  placeholder="UUID of linked sampling request" />
              </Field>
              <Field label="Lot Number *">
                <input type="text" required className={fieldClass()} value={form.lotNumber}
                  onChange={(e) => setForm({ ...form, lotNumber: e.target.value })} />
              </Field>
              <Field label="Material Name">
                <input type="text" className={fieldClass()} value={form.materialName ?? ""}
                  onChange={(e) => setForm({ ...form, materialName: e.target.value })} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Quantity *">
                  <input type="number" step="0.0001" min="0.0001" required className={fieldClass()} value={form.quantity || ""}
                    onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) })} />
                </Field>
                <Field label="UoM *">
                  <input type="text" required className={fieldClass()} value={form.uom}
                    onChange={(e) => setForm({ ...form, uom: e.target.value })} placeholder="g, mL, units…" />
                </Field>
              </div>
              <Field label="Storage Location *">
                <input type="text" required className={fieldClass()} value={form.storageLocation}
                  onChange={(e) => setForm({ ...form, storageLocation: e.target.value })} />
              </Field>
              <Field label="Storage Condition">
                <input type="text" className={fieldClass()} value={form.storageCondition ?? ""}
                  onChange={(e) => setForm({ ...form, storageCondition: e.target.value })} placeholder="e.g. 2–8°C" />
              </Field>
              <Field label="Container Description">
                <input type="text" className={fieldClass()} value={form.containerDescription ?? ""}
                  onChange={(e) => setForm({ ...form, containerDescription: e.target.value })} />
              </Field>
              <Field label="Retention Until (optional — defaults to +2 years)">
                <input type="date" className={fieldClass()} value={form.retentionUntil ?? ""}
                  onChange={(e) => setForm({ ...form, retentionUntil: e.target.value || undefined })} />
              </Field>
              {formError && <p className="text-xs text-red-500">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setIsCreateOpen(false); setForm(initialForm); setFormError(null); }}
                  className="flex-1 rounded-xl border border-slate-200 py-2 text-xs text-slate-600 hover:bg-slate-50">
                  Cancel
                </button>
                <button type="submit" disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-teal-600 py-2 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-50">
                  {createMutation.isPending ? "Saving…" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
