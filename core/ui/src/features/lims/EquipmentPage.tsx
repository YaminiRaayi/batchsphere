import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  createEquipment,
  downloadCsvExport,
  fetchEquipmentList,
  fetchEquipmentSummary
} from "../../lib/api";
import type {
  CreateEquipmentRequest,
  EquipmentStatus,
  EquipmentType
} from "../../types/equipment";
import { useAuthStore } from "../../stores/authStore";

const ALL_STATUSES: Array<"ALL" | EquipmentStatus> = [
  "ALL", "ACTIVE", "PENDING_QUALIFICATION", "UNDER_MAINTENANCE", "RETIRED"
];

const ALL_TYPES: Array<"ALL" | EquipmentType> = [
  "ALL", "BALANCE", "HPLC", "GC", "UV_SPECTROPHOTOMETER", "IR_SPECTROPHOTOMETER",
  "DISSOLUTION", "PARTICLE_SIZE", "KF_TITRATOR", "PH_METER", "TOC_ANALYZER",
  "STABILITY_CHAMBER", "REFRIGERATOR", "AUTOCLAVE", "LAB_COMPUTER", "OTHER"
];

const initialForm: CreateEquipmentRequest = {
  name: "",
  equipmentType: "HPLC",
  location: "",
  manufacturer: "",
  model: "",
  serialNumber: "",
  calibrationIntervalMonths: 12,
  responsibleAnalyst: ""
};

function statusBadgeClass(status: EquipmentStatus) {
  switch (status) {
    case "ACTIVE":
      return "bg-green-100 text-green-700";
    case "PENDING_QUALIFICATION":
      return "bg-blue-100 text-blue-700";
    case "UNDER_MAINTENANCE":
      return "bg-orange-100 text-orange-700";
    case "RETIRED":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatLabel(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400 ${extra}`;
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

export function EquipmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canCreate =
    authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ALL_STATUSES)[number]>("ALL");
  const [typeFilter, setTypeFilter] = useState<(typeof ALL_TYPES)[number]>("ALL");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateEquipmentRequest>(initialForm);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["equipment"],
    queryFn: () => fetchEquipmentList()
  });

  const { data: summary } = useQuery({
    queryKey: ["equipment-summary"],
    queryFn: fetchEquipmentSummary
  });

  const createMutation = useMutation({
    mutationFn: createEquipment,
    onSuccess: async (equipment) => {
      setIsCreateOpen(false);
      setForm(initialForm);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["equipment"] }),
        queryClient.invalidateQueries({ queryKey: ["equipment-summary"] })
      ]);
      navigate(`/lims/equipment/${equipment.id}`);
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Failed to create equipment")
  });

  const items = data?.content ?? [];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((eq) => {
      const matchesSearch =
        !query ||
        eq.equipmentId.toLowerCase().includes(query) ||
        eq.name.toLowerCase().includes(query) ||
        eq.location.toLowerCase().includes(query) ||
        (eq.serialNumber?.toLowerCase().includes(query) ?? false);
      const matchesStatus = statusFilter === "ALL" || eq.status === statusFilter;
      const matchesType = typeFilter === "ALL" || eq.equipmentType === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [items, search, statusFilter, typeFilter]);

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (!form.location.trim()) {
      setFormError("Location is required.");
      return;
    }
    createMutation.mutate({
      ...form,
      name: form.name.trim(),
      location: form.location.trim(),
      manufacturer: form.manufacturer?.trim() || undefined,
      model: form.model?.trim() || undefined,
      serialNumber: form.serialNumber?.trim() || undefined,
      responsibleAnalyst: form.responsibleAnalyst?.trim() || undefined
    });
  }

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Equipment & Instruments</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            IQ/OQ/PQ qualification tracking and calibration schedule
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void downloadCsvExport("/api/equipment?size=10000", "equipment.csv")}
            className="rounded-xl border border-cyan-200 bg-white px-4 py-2 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
          >
            Export CSV
          </button>
          {canCreate && (
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
            >
              Register Equipment
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          label="Active"
          value={summary?.totalActive ?? 0}
          sub="Fully qualified & active"
          accent="border-l-green-500"
          valueClass="text-green-700"
        />
        <KpiCard
          label="Calibration Due (30d)"
          value={summary?.calibrationDueSoon ?? 0}
          sub="Calibration due within 30 days"
          accent="border-l-amber-500"
          valueClass="text-amber-600"
        />
        <KpiCard
          label="Qualification Due (30d)"
          value={summary?.qualificationDueSoon ?? 0}
          sub="Requalification due within 30 days"
          accent="border-l-blue-500"
          valueClass="text-blue-700"
        />
        <KpiCard
          label="Under Maintenance"
          value={summary?.underMaintenance ?? 0}
          sub="Pending repair or qualification"
          accent="border-l-orange-500"
          valueClass="text-orange-600"
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-72 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
          placeholder="Search ID, name, location, serial..."
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All Statuses" : formatLabel(s)}
            </option>
          ))}
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-400"
        >
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t === "ALL" ? "All Types" : formatLabel(t)}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-xs">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Equipment ID</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Location</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Next Calibration</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Next Qualification</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Analyst</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td className="px-4 py-12 text-center text-slate-400" colSpan={9}>
                  Loading equipment...
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
                  No equipment found.
                </td>
              </tr>
            ) : (
              filtered.map((eq) => {
                const rowClass =
                  eq.calibrationOverdue || eq.qualificationOverdue
                    ? "bg-red-50 hover:bg-red-100 cursor-pointer transition"
                    : eq.daysUntilCalibrationDue !== null && eq.daysUntilCalibrationDue <= 30
                    ? "bg-amber-50 hover:bg-amber-100 cursor-pointer transition"
                    : "cursor-pointer transition hover:bg-slate-50";

                return (
                  <tr
                    key={eq.id}
                    className={rowClass}
                    onClick={() => navigate(`/lims/equipment/${eq.id}`)}
                  >
                    <td className="px-4 py-3 font-mono font-semibold text-cyan-700">
                      {eq.equipmentId}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">{eq.name}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                        {formatLabel(eq.equipmentType)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{eq.location}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(eq.status)}`}
                      >
                        {formatLabel(eq.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {eq.nextCalibrationDue ? (
                        <span
                          className={
                            eq.calibrationOverdue ? "font-semibold text-red-600" : "text-slate-600"
                          }
                        >
                          {eq.nextCalibrationDue}
                          {eq.calibrationOverdue && " (OVERDUE)"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {eq.nextQualificationDue ? (
                        <span
                          className={
                            eq.qualificationOverdue ? "font-semibold text-red-600" : "text-slate-600"
                          }
                        >
                          {eq.nextQualificationDue}
                          {eq.qualificationOverdue && " (OVERDUE)"}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {eq.responsibleAnalyst ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/lims/equipment/${eq.id}`);
                        }}
                        className="font-semibold text-cyan-600 hover:underline"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Register Equipment</h2>
                <p className="text-sm text-slate-500">
                  Add a new instrument or equipment to the qualification register.
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setIsCreateOpen(false); setFormError(null); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <Field label="Name">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className={fieldClass()}
                  placeholder="e.g. HPLC System 1"
                />
              </Field>

              <Field label="Equipment Type">
                <select
                  value={form.equipmentType}
                  onChange={(e) =>
                    setForm({ ...form, equipmentType: e.target.value as EquipmentType })
                  }
                  className={fieldClass()}
                >
                  {ALL_TYPES.filter((t) => t !== "ALL").map((t) => (
                    <option key={t} value={t}>
                      {formatLabel(t)}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Location">
                <input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className={fieldClass()}
                  placeholder="e.g. QC Lab A, Room 204"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Manufacturer">
                  <input
                    value={form.manufacturer ?? ""}
                    onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. Agilent"
                  />
                </Field>
                <Field label="Model">
                  <input
                    value={form.model ?? ""}
                    onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. 1260 Infinity II"
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Serial Number">
                  <input
                    value={form.serialNumber ?? ""}
                    onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className={fieldClass()}
                  />
                </Field>
                <Field label="Installation Date">
                  <input
                    type="date"
                    value={form.installationDate ?? ""}
                    onChange={(e) => setForm({ ...form, installationDate: e.target.value || undefined })}
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Calibration Interval (months)">
                  <input
                    type="number"
                    min={1}
                    value={form.calibrationIntervalMonths ?? 12}
                    onChange={(e) =>
                      setForm({ ...form, calibrationIntervalMonths: Number(e.target.value) })
                    }
                    className={fieldClass()}
                  />
                </Field>
                <Field label="Responsible Analyst">
                  <input
                    value={form.responsibleAnalyst ?? ""}
                    onChange={(e) => setForm({ ...form, responsibleAnalyst: e.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. qc.analyst"
                  />
                </Field>
              </div>

              {formError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-xl bg-cyan-600 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                >
                  {createMutation.isPending ? "Registering..." : "Register Equipment"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsCreateOpen(false); setFormError(null); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
