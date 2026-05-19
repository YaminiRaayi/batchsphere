import { useState } from "react";
import type { FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  addQualificationRecord,
  createInstrumentLogEntry,
  fetchEquipment,
  fetchEquipmentLogbook,
  fetchQualificationRecords
} from "../../lib/api";
import type {
  CreateQualificationRecordRequest,
  EquipmentStatus,
  QualificationResult,
  QualificationType
} from "../../types/equipment";
import type { CreateInstrumentUsageLogRequest } from "../../types/logbook";
import { useAuthStore } from "../../stores/authStore";

type Tab = "overview" | "qualifications" | "logbook";

const ALL_QUAL_TYPES: QualificationType[] = ["IQ", "OQ", "PQ", "REQUALIFICATION", "CALIBRATION"];
const ALL_RESULTS: QualificationResult[] = ["PASS", "FAIL", "CONDITIONAL_PASS", "PENDING"];

const initialRecordForm: CreateQualificationRecordRequest = {
  qualificationType: "IQ",
  protocolReference: "",
  performedBy: "",
  performedAt: new Date().toISOString().slice(0, 10),
  result: "PENDING",
  deviationNoted: "",
  calibrationCertificateNumber: "",
  username: "",
  password: "",
  signatureMeaning: ""
};

const initialLogForm: CreateInstrumentUsageLogRequest = {
  equipmentId: "",
  purpose: "",
  condition: "NORMAL",
  anomalyDescription: "",
  linkedDeviationId: ""
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

function resultBadgeClass(result: QualificationResult) {
  switch (result) {
    case "PASS":
      return "bg-green-100 text-green-700";
    case "FAIL":
      return "bg-red-100 text-red-700";
    case "CONDITIONAL_PASS":
      return "bg-yellow-100 text-yellow-700";
    case "PENDING":
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

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="text-sm text-slate-700">{value ?? <span className="text-slate-400">—</span>}</span>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</label>
      {children}
    </div>
  );
}

function needsESign(result: QualificationResult, qualType: QualificationType): boolean {
  return (
    (result === "PASS" || result === "CONDITIONAL_PASS") &&
    (qualType === "PQ" || qualType === "REQUALIFICATION")
  );
}

export function EquipmentDetailPage() {
  const { equipmentId } = useParams<{ equipmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canAddRecord =
    authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isAddRecordOpen, setIsAddRecordOpen] = useState(false);
  const [form, setForm] = useState<CreateQualificationRecordRequest>(initialRecordForm);
  const [logForm, setLogForm] = useState<CreateInstrumentUsageLogRequest>(initialLogForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [logError, setLogError] = useState<string | null>(null);

  const { data: equipment, isLoading, error } = useQuery({
    queryKey: ["equipment", equipmentId],
    queryFn: () => fetchEquipment(equipmentId!),
    enabled: !!equipmentId
  });

  const { data: records } = useQuery({
    queryKey: ["equipment-qualifications", equipmentId],
    queryFn: () => fetchQualificationRecords(equipmentId!),
    enabled: !!equipmentId
  });

  const { data: logbook } = useQuery({
    queryKey: ["equipment-logbook", equipmentId],
    queryFn: () => fetchEquipmentLogbook(equipmentId!),
    enabled: !!equipmentId
  });

  const addRecordMutation = useMutation({
    mutationFn: (payload: CreateQualificationRecordRequest) =>
      addQualificationRecord(equipmentId!, payload),
    onSuccess: async () => {
      setIsAddRecordOpen(false);
      setForm(initialRecordForm);
      setFormError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["equipment", equipmentId] }),
        queryClient.invalidateQueries({ queryKey: ["equipment-qualifications", equipmentId] }),
        queryClient.invalidateQueries({ queryKey: ["equipment"] }),
        queryClient.invalidateQueries({ queryKey: ["equipment-summary"] })
      ]);
    },
    onError: (err) =>
      setFormError(err instanceof Error ? err.message : "Failed to add qualification record")
  });

  const addLogMutation = useMutation({
    mutationFn: (payload: CreateInstrumentUsageLogRequest) => createInstrumentLogEntry(payload),
    onSuccess: async () => {
      setLogForm({ ...initialLogForm, equipmentId: equipmentId! });
      setLogError(null);
      await queryClient.invalidateQueries({ queryKey: ["equipment-logbook", equipmentId] });
    },
    onError: (err) => setLogError(err instanceof Error ? err.message : "Failed to save log entry")
  });

  function handleAddRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.protocolReference.trim()) {
      setFormError("Protocol reference is required.");
      return;
    }
    if (!form.performedBy.trim()) {
      setFormError("Performed by is required.");
      return;
    }
    if (needsESign(form.result, form.qualificationType)) {
      if (!form.username?.trim()) {
        setFormError("Username is required for e-signature.");
        return;
      }
      if (!form.password?.trim()) {
        setFormError("Password is required for e-signature.");
        return;
      }
    }
    addRecordMutation.mutate({
      ...form,
      protocolReference: form.protocolReference.trim(),
      performedBy: form.performedBy.trim(),
      reviewedBy: form.reviewedBy?.trim() || undefined,
      deviationNoted: form.deviationNoted?.trim() || undefined,
      calibrationCertificateNumber: form.calibrationCertificateNumber?.trim() || undefined,
      username: form.username?.trim() || undefined,
      password: form.password?.trim() || undefined,
      signatureMeaning: form.signatureMeaning?.trim() || undefined
    });
  }

  function handleAddLog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!logForm.purpose?.trim()) {
      setLogError("Purpose is required.");
      return;
    }
    if (logForm.condition === "ANOMALY" && !logForm.anomalyDescription?.trim()) {
      setLogError("Anomaly description is required.");
      return;
    }
    addLogMutation.mutate({
      ...logForm,
      equipmentId: equipmentId!,
      usedBy: authUser?.username,
      purpose: logForm.purpose?.trim(),
      anomalyDescription: logForm.anomalyDescription?.trim() || undefined,
      linkedDeviationId: logForm.linkedDeviationId?.trim() || undefined
    });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-slate-400">Loading equipment details...</p>
      </div>
    );
  }

  if (error || !equipment) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-sm text-red-500">
          {error instanceof Error ? error.message : "Equipment not found."}
        </p>
      </div>
    );
  }

  const showESignFields = needsESign(form.result, form.qualificationType);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/lims/equipment")}
            className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-800">{equipment.name}</h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusBadgeClass(equipment.status)}`}
              >
                {formatLabel(equipment.status)}
              </span>
            </div>
            <p className="mt-0.5 text-sm font-mono text-cyan-600">{equipment.equipmentId}</p>
          </div>
        </div>
      </div>

      {equipment.calibrationOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          Calibration is overdue. Next calibration was due: {equipment.nextCalibrationDue}
        </div>
      )}

      {equipment.qualificationOverdue && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          Qualification is overdue. Next qualification was due: {equipment.nextQualificationDue}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "qualifications", "logbook"] as Tab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={[
              "px-4 py-2 text-xs font-semibold transition",
              activeTab === tab
                ? "border-b-2 border-cyan-600 text-cyan-700"
                : "text-slate-500 hover:text-slate-700"
            ].join(" ")}
          >
            {tab === "overview" ? "Overview & Specs" : tab === "qualifications" ? "Qualification History" : `Logbook${logbook?.length ? ` (${logbook.length})` : ""}`}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold text-slate-700">Equipment Details</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <InfoRow label="Equipment ID" value={<span className="font-mono">{equipment.equipmentId}</span>} />
            <InfoRow label="Name" value={equipment.name} />
            <InfoRow label="Type" value={formatLabel(equipment.equipmentType)} />
            <InfoRow label="Manufacturer" value={equipment.manufacturer} />
            <InfoRow label="Model" value={equipment.model} />
            <InfoRow label="Serial Number" value={equipment.serialNumber} />
            <InfoRow label="Location" value={equipment.location} />
            <InfoRow label="Status" value={
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusBadgeClass(equipment.status)}`}>
                {formatLabel(equipment.status)}
              </span>
            } />
            <InfoRow label="Responsible Analyst" value={equipment.responsibleAnalyst} />
            <InfoRow label="Installation Date" value={equipment.installationDate} />
            <InfoRow label="Calibration Interval" value={
              equipment.calibrationIntervalMonths
                ? `${equipment.calibrationIntervalMonths} months`
                : undefined
            } />
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Calibration Status</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Last Calibration" value={equipment.lastCalibrationDate} />
              <InfoRow label="Next Calibration Due" value={
                equipment.nextCalibrationDue ? (
                  <span className={equipment.calibrationOverdue ? "font-semibold text-red-600" : undefined}>
                    {equipment.nextCalibrationDue}
                    {equipment.calibrationOverdue && " — OVERDUE"}
                    {!equipment.calibrationOverdue && equipment.daysUntilCalibrationDue !== null && (
                      <span className="ml-1 text-slate-400">
                        ({equipment.daysUntilCalibrationDue} days)
                      </span>
                    )}
                  </span>
                ) : undefined
              } />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Qualification Status</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Last Qualification" value={equipment.lastQualificationDate} />
              <InfoRow label="Next Qualification Due" value={
                equipment.nextQualificationDue ? (
                  <span className={equipment.qualificationOverdue ? "font-semibold text-red-600" : undefined}>
                    {equipment.nextQualificationDue}
                    {equipment.qualificationOverdue && " — OVERDUE"}
                  </span>
                ) : undefined
              } />
            </div>
          </div>

          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Audit</h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Created By" value={equipment.createdBy} />
              <InfoRow label="Created At" value={equipment.createdAt} />
              <InfoRow label="Updated By" value={equipment.updatedBy} />
              <InfoRow label="Updated At" value={equipment.updatedAt} />
            </div>
          </div>
        </div>
      )}

      {activeTab === "qualifications" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700">Qualification History</h2>
            {canAddRecord && (
              <button
                type="button"
                onClick={() => setIsAddRecordOpen(true)}
                className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700"
              >
                Add Record
              </button>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Protocol</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Performed At</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Performed By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Result</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Cert #</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Cert Expiry</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Deviation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!records || records.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-slate-400" colSpan={8}>
                      No qualification records yet.
                    </td>
                  </tr>
                ) : (
                  records.map((rec) => (
                    <tr key={rec.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">
                          {rec.qualificationType}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-700">{rec.protocolReference}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.performedAt}</td>
                      <td className="px-4 py-3 text-slate-600">{rec.performedBy}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${resultBadgeClass(rec.result)}`}
                        >
                          {formatLabel(rec.result)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {rec.calibrationCertificateNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {rec.calibrationCertificateExpiry ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-xs truncate">
                        {rec.deviationNoted ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "logbook" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-700">Logbook</h2>
              <span className="rounded-full bg-cyan-100 px-2.5 py-1 text-[11px] font-semibold text-cyan-700">{logbook?.length ?? 0} entries</span>
            </div>
            <form onSubmit={handleAddLog} className="grid gap-3 lg:grid-cols-[1fr_160px_1fr_140px]">
              <input
                value={logForm.purpose ?? ""}
                onChange={(e) => setLogForm({ ...logForm, purpose: e.target.value })}
                className={fieldClass()}
                placeholder="Purpose"
              />
              <select
                value={logForm.condition}
                onChange={(e) => setLogForm({ ...logForm, condition: e.target.value as CreateInstrumentUsageLogRequest["condition"] })}
                className={fieldClass()}
              >
                <option value="NORMAL">Normal</option>
                <option value="ANOMALY">Anomaly</option>
              </select>
              <input
                value={logForm.anomalyDescription ?? ""}
                onChange={(e) => setLogForm({ ...logForm, anomalyDescription: e.target.value })}
                className={fieldClass()}
                placeholder="Anomaly description"
              />
              <button disabled={addLogMutation.isPending} className="rounded-xl bg-cyan-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60">
                Save Entry
              </button>
            </form>
            {logError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">{logError}</p>}
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date/Time</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Used By</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Purpose</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Condition</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Deviation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!logbook || logbook.length === 0 ? (
                  <tr><td className="px-4 py-10 text-center text-slate-400" colSpan={5}>No logbook entries yet.</td></tr>
                ) : logbook.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-600">{entry.usedAt}</td>
                    <td className="px-4 py-3 text-slate-600">{entry.usedBy}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{entry.purpose ?? "—"}</div>
                      {entry.samplingRequestId && <div className="text-[10px] text-slate-400">auto-logged from worksheet</div>}
                      {entry.anomalyDescription && <div className="mt-1 text-[11px] text-amber-700">{entry.anomalyDescription}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${entry.condition === "ANOMALY" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                        {formatLabel(entry.condition)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {entry.linkedDeviationId ? (
                        <a className="font-semibold text-cyan-700 hover:underline" href={`/qms/deviations/${entry.linkedDeviationId}`}>
                          {entry.linkedDeviationNumber ?? "View Deviation"}
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAddRecordOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Add Qualification Record</h2>
                <p className="text-sm text-slate-500">{equipment.equipmentId} — {equipment.name}</p>
              </div>
              <button
                type="button"
                onClick={() => { setIsAddRecordOpen(false); setFormError(null); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddRecord} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Qualification Type">
                  <select
                    value={form.qualificationType}
                    onChange={(e) =>
                      setForm({ ...form, qualificationType: e.target.value as QualificationType })
                    }
                    className={fieldClass()}
                  >
                    {ALL_QUAL_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Result">
                  <select
                    value={form.result}
                    onChange={(e) =>
                      setForm({ ...form, result: e.target.value as QualificationResult })
                    }
                    className={fieldClass()}
                  >
                    {ALL_RESULTS.map((r) => (
                      <option key={r} value={r}>
                        {formatLabel(r)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Protocol Reference">
                <input
                  value={form.protocolReference}
                  onChange={(e) => setForm({ ...form, protocolReference: e.target.value })}
                  className={fieldClass()}
                  placeholder="e.g. PQ-HPLC-2026-001"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Performed By">
                  <input
                    value={form.performedBy}
                    onChange={(e) => setForm({ ...form, performedBy: e.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. qc.analyst"
                  />
                </Field>
                <Field label="Performed At">
                  <input
                    type="date"
                    value={form.performedAt}
                    onChange={(e) => setForm({ ...form, performedAt: e.target.value })}
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Reviewed By">
                  <input
                    value={form.reviewedBy ?? ""}
                    onChange={(e) => setForm({ ...form, reviewedBy: e.target.value })}
                    className={fieldClass()}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Reviewed At">
                  <input
                    type="date"
                    value={form.reviewedAt ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, reviewedAt: e.target.value || undefined })
                    }
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <Field label="Next Requalification Due">
                <input
                  type="date"
                  value={form.nextRequalificationDue ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, nextRequalificationDue: e.target.value || undefined })
                  }
                  className={fieldClass()}
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Calibration Certificate #">
                  <input
                    value={form.calibrationCertificateNumber ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, calibrationCertificateNumber: e.target.value })
                    }
                    className={fieldClass()}
                    placeholder="Optional"
                  />
                </Field>
                <Field label="Certificate Expiry">
                  <input
                    type="date"
                    value={form.calibrationCertificateExpiry ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        calibrationCertificateExpiry: e.target.value || undefined
                      })
                    }
                    className={fieldClass()}
                  />
                </Field>
              </div>

              <Field label="Deviation Noted">
                <textarea
                  value={form.deviationNoted ?? ""}
                  onChange={(e) => setForm({ ...form, deviationNoted: e.target.value })}
                  className={fieldClass("min-h-16")}
                  placeholder="Describe any deviations observed (optional)"
                />
              </Field>

              {showESignFields && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <p className="text-xs font-semibold text-amber-700">
                    Electronic Signature required for PQ/Requalification approval
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Username">
                      <input
                        value={form.username ?? ""}
                        onChange={(e) => setForm({ ...form, username: e.target.value })}
                        className={fieldClass()}
                        placeholder="Your username"
                        autoComplete="username"
                      />
                    </Field>
                    <Field label="Password">
                      <input
                        type="password"
                        value={form.password ?? ""}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        className={fieldClass()}
                        placeholder="Your password"
                        autoComplete="current-password"
                      />
                    </Field>
                  </div>
                  <Field label="Signature Meaning">
                    <input
                      value={form.signatureMeaning ?? ""}
                      onChange={(e) => setForm({ ...form, signatureMeaning: e.target.value })}
                      className={fieldClass()}
                      placeholder="e.g. I certify this qualification result"
                    />
                  </Field>
                </div>
              )}

              {formError && (
                <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {formError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={addRecordMutation.isPending}
                  className="flex-1 rounded-xl bg-cyan-600 py-2 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-60"
                >
                  {addRecordMutation.isPending ? "Saving..." : "Add Record"}
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddRecordOpen(false); setFormError(null); }}
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
