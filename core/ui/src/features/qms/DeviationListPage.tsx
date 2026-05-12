import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createDeviation, fetchDeviationSummary, fetchDeviations } from "../../lib/api";
import type {
  CreateDeviationRequest,
  DeviationSeverity,
  DeviationSourceModule,
  DeviationStatus,
  DeviationType
} from "../../types/deviation";
import { formatDateTime, formatLabel, severityClass, statusClass } from "./deviationUi";

const statuses: Array<"ALL" | DeviationStatus> = ["ALL", "OPEN", "UNDER_INVESTIGATION", "CAPA_IN_PROGRESS", "CLOSED", "CANCELLED"];
const severities: Array<"ALL" | DeviationSeverity> = ["ALL", "CRITICAL", "MAJOR", "MINOR"];
const sources: Array<"ALL" | DeviationSourceModule> = ["ALL", "MANUAL", "GRN", "SAMPLING", "INVENTORY", "WAREHOUSE", "BATCH"];
const deviationTypes: DeviationType[] = ["MATERIAL", "PROCESS", "DOCUMENTATION", "EQUIPMENT", "FACILITY", "SAFETY", "OTHER"];

const initialForm: CreateDeviationRequest = {
  title: "",
  description: "",
  deviationType: "PROCESS",
  severity: "MAJOR",
  sourceModule: "MANUAL",
  sourceReference: "",
  department: "QC",
  immediateAction: ""
};

export function DeviationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [severityFilter, setSeverityFilter] = useState<(typeof severities)[number]>("ALL");
  const [sourceFilter, setSourceFilter] = useState<(typeof sources)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateDeviationRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["deviations"],
    queryFn: () => fetchDeviations()
  });
  const { data: summary } = useQuery({
    queryKey: ["deviation-summary"],
    queryFn: fetchDeviationSummary
  });

  const createMutation = useMutation({
    mutationFn: createDeviation,
    onSuccess: async (deviation) => {
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deviations"] }),
        queryClient.invalidateQueries({ queryKey: ["deviation-summary"] })
      ]);
      navigate(`/qms/deviations/${deviation.id}`);
    },
    onError: (mutationError) => setFormError(mutationError instanceof Error ? mutationError.message : "Failed to create deviation")
  });

  const deviations = data?.content ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return deviations.filter((deviation) => {
      const matchesSearch =
        !query ||
        deviation.deviationNumber.toLowerCase().includes(query) ||
        deviation.title.toLowerCase().includes(query) ||
        deviation.sourceReference?.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || deviation.status === statusFilter;
      const matchesSeverity = severityFilter === "ALL" || deviation.severity === severityFilter;
      const matchesSource = sourceFilter === "ALL" || deviation.sourceModule === sourceFilter;
      return matchesSearch && matchesStatus && matchesSeverity && matchesSource;
    });
  }, [deviations, search, severityFilter, sourceFilter, statusFilter]);

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      setFormError("Title and description are required.");
      return;
    }
    createMutation.mutate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      sourceReference: form.sourceReference?.trim() || undefined,
      department: form.department?.trim() || undefined,
      immediateAction: form.immediateAction?.trim() || undefined
    });
  }

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Deviations</h1>
          <p className="mt-0.5 text-sm text-slate-500">Quality deviation register and GxP incident tracking</p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(true)}
          className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700"
        >
          New Deviation
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Open" value={summary?.countsByStatus.OPEN ?? 0} sub="Awaiting investigation" accent="border-l-red-500" valueClass="text-red-600" />
        <KpiCard label="CAPA In Progress" value={summary?.countsByStatus.CAPA_IN_PROGRESS ?? 0} sub="Actions pending" accent="border-l-orange-400" valueClass="text-orange-600" />
        <KpiCard label="Critical Open" value={(summary?.countsBySeverity.CRITICAL ?? 0)} sub="Critical severity records" accent="border-l-red-700" valueClass="text-red-700" />
        <KpiCard label="Closed" value={summary?.countsByStatus.CLOSED ?? 0} sub="Completed investigations" accent="border-l-green-500" valueClass="text-green-600" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          placeholder="Search deviation number or title..."
        />
        <FilterSelect value={statusFilter} options={statuses} onChange={(value) => setStatusFilter(value as typeof statusFilter)} />
        <FilterSelect value={severityFilter} options={severities} onChange={(value) => setSeverityFilter(value as typeof severityFilter)} />
        <FilterSelect value={sourceFilter} options={sources} onChange={(value) => setSourceFilter(value as typeof sourceFilter)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Deviation #</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Severity</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Source</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Detected</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Department</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={9}>Loading deviations...</td></tr>
            ) : errorMessage ? (
              <tr><td className="px-4 py-12 text-center text-red-500" colSpan={9}>{errorMessage}</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="px-4 py-12 text-center text-slate-400" colSpan={9}>No deviations found.</td></tr>
            ) : filtered.map((deviation) => (
              <tr key={deviation.id} className="transition hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-semibold text-blue-700">{deviation.deviationNumber}</td>
                <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-800">{deviation.title}</td>
                <td className="px-4 py-3"><span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">{formatLabel(deviation.deviationType)}</span></td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityClass(deviation.severity)}`}>{deviation.severity}</span></td>
                <td className="px-4 py-3 text-slate-600">{formatLabel(deviation.sourceModule)}{deviation.sourceReference ? ` · ${deviation.sourceReference}` : ""}</td>
                <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(deviation.status)}`}>{formatLabel(deviation.status)}</span></td>
                <td className="px-4 py-3 text-slate-500">{formatDateTime(deviation.detectedAt)}</td>
                <td className="px-4 py-3 text-slate-500">{deviation.department ?? "-"}</td>
                <td className="px-4 py-3 text-right">
                  <button type="button" onClick={() => navigate(`/qms/deviations/${deviation.id}`)} className="font-semibold text-blue-600 hover:underline">View</button>
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
                <h2 className="text-lg font-bold text-slate-800">New Deviation</h2>
                <p className="text-sm text-slate-500">Record a GxP event with containment details.</p>
              </div>
              <button type="button" onClick={() => setIsCreateOpen(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Title"><input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass()} /></Field>
              <Field label="Description"><textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Type"><select value={form.deviationType} onChange={(event) => setForm({ ...form, deviationType: event.target.value as DeviationType })} className={fieldClass()}>{deviationTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></Field>
                <Field label="Severity"><select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as DeviationSeverity })} className={fieldClass()}>{severities.filter((v) => v !== "ALL").map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></Field>
                <Field label="Source"><select value={form.sourceModule} onChange={(event) => setForm({ ...form, sourceModule: event.target.value as DeviationSourceModule })} className={fieldClass()}>{sources.filter((v) => v !== "ALL").map((source) => <option key={source} value={source}>{formatLabel(source)}</option>)}</select></Field>
                <Field label="Department"><input value={form.department ?? ""} onChange={(event) => setForm({ ...form, department: event.target.value })} className={fieldClass()} /></Field>
              </div>
              <Field label="Source reference"><input value={form.sourceReference ?? ""} onChange={(event) => setForm({ ...form, sourceReference: event.target.value })} className={fieldClass()} placeholder="GRN-2026-042 or SR-2026-017" /></Field>
              <Field label="Immediate containment"><textarea value={form.immediateAction ?? ""} onChange={(event) => setForm({ ...form, immediateAction: event.target.value })} className={fieldClass("min-h-20")} /></Field>
              {formError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{formError}</div> : null}
              <button type="submit" disabled={createMutation.isPending} className="w-full rounded-xl bg-rose-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60">
                {createMutation.isPending ? "Creating..." : "Create Deviation"}
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
