import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createRiskAssessment,
  fetchRiskAssessmentSummary,
  fetchRiskAssessments
} from "../../lib/api";
import type {
  CreateRiskAssessmentRequest,
  RiskAssessmentScope,
  RiskAssessmentStatus
} from "../../types/riskAssessment";
import { formatLabel } from "./deviationUi";
import { useAuthStore } from "../../stores/authStore";

const statuses: Array<"ALL" | RiskAssessmentStatus> = ["ALL", "DRAFT", "UNDER_REVIEW", "ACCEPTED", "CLOSED"];
const scopes: Array<"ALL" | RiskAssessmentScope> = ["ALL", "PROCESS", "PRODUCT", "EQUIPMENT", "SUPPLIER", "SYSTEM", "MATERIAL", "CHANGE_CONTROL", "OTHER"];
const scopeOptions: RiskAssessmentScope[] = ["PROCESS", "PRODUCT", "EQUIPMENT", "SUPPLIER", "SYSTEM", "MATERIAL", "CHANGE_CONTROL", "OTHER"];

const initialForm: CreateRiskAssessmentRequest = {
  title: "",
  scope: "PROCESS",
  methodology: "FMEA",
  scopeEntityType: "",
  scopeEntityDisplay: "",
  nextReviewDate: ""
};

function statusClass(status: RiskAssessmentStatus) {
  switch (status) {
    case "DRAFT":
      return "bg-slate-100 text-slate-600";
    case "UNDER_REVIEW":
      return "bg-yellow-100 text-yellow-700";
    case "ACCEPTED":
      return "bg-green-100 text-green-700";
    case "CLOSED":
      return "bg-blue-100 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function RiskRegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canCreate =
    authUser?.role === "QC_ANALYST" ||
    authUser?.role === "QC_MANAGER" ||
    authUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof statuses)[number]>("ALL");
  const [scopeFilter, setScopeFilter] = useState<(typeof scopes)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateRiskAssessmentRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["risk-assessments"],
    queryFn: () => fetchRiskAssessments()
  });

  const { data: summary } = useQuery({
    queryKey: ["risk-assessment-summary"],
    queryFn: fetchRiskAssessmentSummary
  });

  const createMutation = useMutation({
    mutationFn: createRiskAssessment,
    onSuccess: async (ra) => {
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["risk-assessments"] }),
        queryClient.invalidateQueries({ queryKey: ["risk-assessment-summary"] })
      ]);
      navigate(`/qms/risk-register/${ra.id}`);
    },
    onError: (mutationError) =>
      setFormError(mutationError instanceof Error ? mutationError.message : "Failed to create risk assessment")
  });

  const assessments = data?.content ?? [];
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return assessments.filter((ra) => {
      const matchesSearch =
        !query ||
        ra.assessmentNumber.toLowerCase().includes(query) ||
        ra.title.toLowerCase().includes(query);
      const matchesStatus = statusFilter === "ALL" || ra.status === statusFilter;
      const matchesScope = scopeFilter === "ALL" || ra.scope === scopeFilter;
      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [assessments, search, statusFilter, scopeFilter]);

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    createMutation.mutate({
      title: form.title.trim(),
      scope: form.scope,
      methodology: form.methodology?.trim() || "FMEA",
      scopeEntityType: form.scopeEntityType?.trim() || undefined,
      scopeEntityDisplay: form.scopeEntityDisplay?.trim() || undefined,
      nextReviewDate: form.nextReviewDate || undefined
    });
  }

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Risk Register</h1>
          <p className="mt-0.5 text-sm text-slate-500">ICH Q9 Quality Risk Management — FMEA and Risk Register</p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-purple-700"
          >
            New Assessment
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Total Assessments"
          value={summary?.total ?? 0}
          sub="Active risk assessments"
          accent="border-l-purple-500"
          valueClass="text-purple-700"
        />
        <KpiCard
          label="High RPN"
          value={summary?.highRpnCount ?? 0}
          sub="Assessments with RPN ≥ 50"
          accent="border-l-red-500"
          valueClass="text-red-600"
        />
        <KpiCard
          label="Critical Items"
          value={summary?.criticalItems ?? 0}
          sub="Items with severity = 5"
          accent="border-l-red-700"
          valueClass="text-red-700"
        />
        <KpiCard
          label="Pending Acceptance"
          value={summary?.pendingAcceptance ?? 0}
          sub="Status = Under Review"
          accent="border-l-yellow-500"
          valueClass="text-yellow-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-purple-400"
          placeholder="Search assessment #, title..."
        />
        <FilterSelect
          value={statusFilter}
          options={statuses}
          onChange={(value) => setStatusFilter(value as typeof statusFilter)}
        />
        <FilterSelect
          value={scopeFilter}
          options={scopes}
          onChange={(value) => setScopeFilter(value as typeof scopeFilter)}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">RA Number</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Title</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Scope</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">High RPN Items</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Critical Items</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Prepared By</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={9}>
                  Loading risk assessments...
                </td>
              </tr>
            ) : errorMessage ? (
              <tr>
                <td className="px-4 py-12 text-center text-red-500" colSpan={9}>
                  {errorMessage}
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={9}>
                  No risk assessments found.
                </td>
              </tr>
            ) : (
              filtered.map((ra) => (
                <tr
                  key={ra.id}
                  className="cursor-pointer transition hover:bg-slate-50"
                  onClick={() => navigate(`/qms/risk-register/${ra.id}`)}
                >
                  <td className="px-4 py-3 font-mono font-semibold text-purple-700">{ra.assessmentNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{ra.title}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                      {formatLabel(ra.scope)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(ra.status)}`}>
                      {formatLabel(ra.status)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {ra.highRpnItemsCount > 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                        {ra.highRpnItemsCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {ra.criticalItemsCount > 0 ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-800">
                        {ra.criticalItemsCount}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{ra.preparedBy}</td>
                  <td className="px-4 py-3 text-slate-400">{ra.createdAt.slice(0, 10)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/qms/risk-register/${ra.id}`);
                      }}
                      className="font-semibold text-purple-600 hover:underline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Risk Assessment</h2>
                <p className="text-sm text-slate-500">Create an ICH Q9 FMEA risk assessment.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setFormError(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Title">
                <input
                  value={form.title}
                  onChange={(event) => setForm({ ...form, title: event.target.value })}
                  className={fieldClass()}
                  placeholder="e.g. API Manufacturing Risk Assessment"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Scope">
                  <select
                    value={form.scope}
                    onChange={(event) => setForm({ ...form, scope: event.target.value as RiskAssessmentScope })}
                    className={fieldClass()}
                  >
                    {scopeOptions.map((s) => (
                      <option key={s} value={s}>
                        {formatLabel(s)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Methodology">
                  <input
                    value={form.methodology ?? ""}
                    onChange={(event) => setForm({ ...form, methodology: event.target.value })}
                    className={fieldClass()}
                    placeholder="FMEA"
                  />
                </Field>
                <Field label="Scope entity type">
                  <input
                    value={form.scopeEntityType ?? ""}
                    onChange={(event) => setForm({ ...form, scopeEntityType: event.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. Material, Equipment"
                  />
                </Field>
                <Field label="Scope entity display">
                  <input
                    value={form.scopeEntityDisplay ?? ""}
                    onChange={(event) => setForm({ ...form, scopeEntityDisplay: event.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. Granulation Line 3"
                  />
                </Field>
                <Field label="Next review date">
                  <input
                    type="date"
                    value={form.nextReviewDate ?? ""}
                    onChange={(event) => setForm({ ...form, nextReviewDate: event.target.value })}
                    className={fieldClass()}
                  />
                </Field>
              </div>
              {formError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {formError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="w-full rounded-xl bg-purple-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {createMutation.isPending ? "Creating..." : "Create Risk Assessment"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
  valueClass
}: {
  label: string;
  value: number;
  sub: string;
  accent: string;
  valueClass: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accent}`}>
      <div className="mb-1 text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
      <div className="mt-1 text-xs text-slate-400">{sub}</div>
    </div>
  );
}

function FilterSelect({
  value,
  options,
  onChange
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {formatLabel(option)}
        </option>
      ))}
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
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-400 ${extra}`;
}
