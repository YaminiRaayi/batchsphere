import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createComplaint, downloadCsvExport, fetchComplaintSummary, fetchComplaints } from "../../lib/api";
import type {
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintSource,
  ComplaintStatus,
  CreateComplaintRequest
} from "../../types/complaint";
import { formatLabel } from "./deviationUi";
import { useAuthStore } from "../../stores/authStore";

const statuses: Array<"ALL" | ComplaintStatus> = ["ALL", "RECEIVED", "UNDER_INVESTIGATION", "PENDING_CLOSURE", "CLOSED", "WITHDRAWN"];
const categories: Array<"ALL" | ComplaintCategory> = ["ALL", "PRODUCT_QUALITY", "ADVERSE_EVENT", "LABELING_ERROR", "PACKAGING_DEFECT", "EFFICACY", "CONTAMINATION", "OTHER"];
const severities: Array<"ALL" | ComplaintSeverity> = ["ALL", "CRITICAL", "MAJOR", "MINOR", "INFORMATIONAL"];
const sources: ComplaintSource[] = ["CUSTOMER", "MARKET", "CLINICAL", "INTERNAL", "DISTRIBUTOR", "REGULATORY_AUTHORITY"];

const initialForm: CreateComplaintRequest = {
  description: "",
  receivedDate: new Date().toISOString().slice(0, 10),
  source: "CUSTOMER",
  category: "PRODUCT_QUALITY",
  severity: "MAJOR",
  productName: "",
  lotNumber: "",
  reportedBy: "",
  initialAssessment: ""
};

function complaintSeverityClass(severity: ComplaintSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "MAJOR":
      return "bg-orange-100 text-orange-700";
    case "MINOR":
      return "bg-yellow-100 text-yellow-700";
    case "INFORMATIONAL":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function complaintStatusClass(status: ComplaintStatus) {
  switch (status) {
    case "RECEIVED":
      return "bg-blue-100 text-blue-700";
    case "UNDER_INVESTIGATION":
      return "bg-yellow-100 text-yellow-700";
    case "PENDING_CLOSURE":
      return "bg-orange-100 text-orange-700";
    case "CLOSED":
      return "bg-green-100 text-green-700";
    case "WITHDRAWN":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function ComplaintListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canCreate = authUser?.role === "QC_ANALYST" || authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<(typeof categories)[number]>("ALL");
  const [severityFilter, setSeverityFilter] = useState<(typeof severities)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateComplaintRequest>({ ...initialForm, reportedBy: authUser?.username ?? "" });
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["complaints"],
    queryFn: () => fetchComplaints()
  });
  const { data: summary } = useQuery({
    queryKey: ["complaint-summary"],
    queryFn: fetchComplaintSummary
  });

  const createMutation = useMutation({
    mutationFn: createComplaint,
    onSuccess: async (complaint) => {
      setIsCreateOpen(false);
      setForm({ ...initialForm, reportedBy: authUser?.username ?? "" });
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["complaints"] }),
        queryClient.invalidateQueries({ queryKey: ["complaint-summary"] })
      ]);
      navigate(`/qms/complaints/${complaint.id}`);
    },
    onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : "Failed to create complaint")
  });

  const complaints = data?.content ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return complaints.filter((complaint) => {
      const matchesSearch =
        !query ||
        complaint.complaintNumber.toLowerCase().includes(query) ||
        complaint.productName?.toLowerCase().includes(query) ||
        complaint.lotNumber?.toLowerCase().includes(query) ||
        complaint.reportedBy?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || complaint.status === statusFilter;
      const matchesCategory = categoryFilter === "ALL" || complaint.category === categoryFilter;
      const matchesSeverity = severityFilter === "ALL" || complaint.severity === severityFilter;
      return matchesSearch && matchesStatus && matchesCategory && matchesSeverity;
    });
  }, [complaints, search, statusFilter, categoryFilter, severityFilter]);

  const totalOpen =
    (summary?.countsByStatus.RECEIVED ?? 0) +
    (summary?.countsByStatus.UNDER_INVESTIGATION ?? 0) +
    (summary?.countsByStatus.PENDING_CLOSURE ?? 0);
  const criticalCount = summary?.countsBySeverity.CRITICAL ?? 0;
  const underInvestigation = summary?.countsByStatus.UNDER_INVESTIGATION ?? 0;
  const regulatoryReportable =
    complaints.filter((c) => c.regulatoryReportability === "REPORTABLE" || c.regulatoryReportability === "REPORTED").length;

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.description.trim()) {
      setFormError("Description is required.");
      return;
    }
    createMutation.mutate({
      ...form,
      description: form.description.trim(),
      productName: form.productName?.trim() || undefined,
      lotNumber: form.lotNumber?.trim() || undefined,
      reportedBy: form.reportedBy?.trim() || undefined,
      initialAssessment: form.initialAssessment?.trim() || undefined
    });
  }

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Complaints</h1>
          <p className="mt-0.5 text-sm text-slate-500">Customer and market complaint register — GxP regulated handling</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadCsvExport("/api/complaints?size=10000", "complaints.csv")}
            className="rounded-xl border border-red-200 bg-white px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50"
          >
            Export CSV
          </button>
          {canCreate ? (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
            >
              New Complaint
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Total Open" value={totalOpen} sub="Active complaints" accent="border-l-red-500" valueClass="text-red-600" />
        <KpiCard label="Critical" value={criticalCount} sub="Critical severity" accent="border-l-red-700" valueClass="text-red-700" />
        <KpiCard label="Under Investigation" value={underInvestigation} sub="In active investigation" accent="border-l-yellow-500" valueClass="text-yellow-600" />
        <KpiCard label="Regulatory Reportable" value={regulatoryReportable} sub="Reportable or reported" accent="border-l-purple-500" valueClass="text-purple-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          placeholder="Search complaint #, product, lot, reporter..."
        />
        <FilterSelect value={statusFilter} options={statuses} onChange={(value) => setStatusFilter(value as typeof statusFilter)} />
        <FilterSelect value={categoryFilter} options={categories} onChange={(value) => setCategoryFilter(value as typeof categoryFilter)} />
        <FilterSelect value={severityFilter} options={severities} onChange={(value) => setSeverityFilter(value as typeof severityFilter)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Complaint #</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Category</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Severity</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Product / Lot</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Linked Deviation</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={9}>Loading complaints...</td></tr>
            ) : errorMessage ? (
              <tr><td className="px-4 py-12 text-center text-red-500" colSpan={9}>{errorMessage}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={9}>No complaints found.</td></tr>
            ) : filtered.map((complaint) => (
              <tr
                key={complaint.id}
                className="cursor-pointer transition hover:bg-slate-50"
                onClick={() => navigate(`/qms/complaints/${complaint.id}`)}
              >
                <td className="px-4 py-3 font-mono font-semibold text-red-700">{complaint.complaintNumber}</td>
                <td className="px-4 py-3 text-slate-500">{complaint.receivedDate}</td>
                <td className="px-4 py-3 text-slate-600">{formatLabel(complaint.source)}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{formatLabel(complaint.category)}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${complaintSeverityClass(complaint.severity)}`}>{complaint.severity}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${complaintStatusClass(complaint.status)}`}>{formatLabel(complaint.status)}</span></td>
                <td className="px-4 py-3 text-slate-500">{complaint.productName ?? "-"}{complaint.lotNumber ? ` · ${complaint.lotNumber}` : ""}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-400">{complaint.linkedDeviationId ? complaint.linkedDeviationId.slice(0, 8) + "..." : "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={(e) => { e.stopPropagation(); navigate(`/qms/complaints/${complaint.id}`); }} className="font-semibold text-red-600 hover:underline">View</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Complaint</h2>
                <p className="text-sm text-slate-500">Record a customer or market complaint.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Description">
                <textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Received date">
                  <input type="date" value={form.receivedDate} onChange={(event) => setForm({ ...form, receivedDate: event.target.value })} className={fieldClass()} />
                </Field>
                <Field label="Source">
                  <select value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value as ComplaintSource })} className={fieldClass()}>
                    {sources.map((source) => <option key={source} value={source}>{formatLabel(source)}</option>)}
                  </select>
                </Field>
                <Field label="Category">
                  <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as ComplaintCategory })} className={fieldClass()}>
                    {categories.filter((v) => v !== "ALL").map((cat) => <option key={cat} value={cat}>{formatLabel(cat)}</option>)}
                  </select>
                </Field>
                <Field label="Severity">
                  <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as ComplaintSeverity })} className={fieldClass()}>
                    {severities.filter((v) => v !== "ALL").map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                  </select>
                </Field>
                <Field label="Product name">
                  <input value={form.productName ?? ""} onChange={(event) => setForm({ ...form, productName: event.target.value })} className={fieldClass()} />
                </Field>
                <Field label="Lot number">
                  <input value={form.lotNumber ?? ""} onChange={(event) => setForm({ ...form, lotNumber: event.target.value })} className={fieldClass()} />
                </Field>
              </div>
              <Field label="Reported by">
                <input value={form.reportedBy ?? ""} onChange={(event) => setForm({ ...form, reportedBy: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Initial assessment">
                <textarea value={form.initialAssessment ?? ""} onChange={(event) => setForm({ ...form, initialAssessment: event.target.value })} className={fieldClass("min-h-20")} />
              </Field>
              {formError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{formError}</div> : null}
              <button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl bg-red-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">
                {createMutation.isPending ? "Creating..." : "Create Complaint"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({ label, value, sub, accent, valueClass }: { label: string; value: number; sub: string; accent: string; valueClass: string }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accent}`}>
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function FilterSelect({ value, options, onChange }: { value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none">
      {options.map((option) => <option key={option} value={option}>{formatLabel(option)}</option>)}
    </select>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 ${extra}`;
}
