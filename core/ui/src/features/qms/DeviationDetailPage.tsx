import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  createCapa,
  fetchAuditEvents,
  fetchCapas,
  fetchDeviation,
  fetchESignatures,
  updateCapaStatus,
  updateDeviation,
  updateDeviationStatus
} from "../../lib/api";
import type { CapaStatus, CreateCapaRequest } from "../../types/capa";
import type { DeviationSeverity, DeviationStatus, DeviationType, UpdateDeviationRequest } from "../../types/deviation";
import { formatDateTime, formatLabel, severityClass, statusClass } from "./deviationUi";

const deviationTypes: DeviationType[] = ["MATERIAL", "PROCESS", "DOCUMENTATION", "EQUIPMENT", "FACILITY", "SAFETY", "OTHER"];
const severities: DeviationSeverity[] = ["CRITICAL", "MAJOR", "MINOR"];
const statusFlow: DeviationStatus[] = ["UNDER_INVESTIGATION", "CAPA_IN_PROGRESS", "CLOSED", "CANCELLED"];
const capaStatusFlow: CapaStatus[] = ["IN_PROGRESS", "COMPLETED", "EFFECTIVENESS_CHECK", "CLOSED", "CANCELLED"];

export function DeviationDetailPage() {
  const { deviationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<UpdateDeviationRequest | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<DeviationStatus>("UNDER_INVESTIGATION");
  const [statusReason, setStatusReason] = useState("");
  const [closureSummary, setClosureSummary] = useState("");
  const [signatureUsername, setSignatureUsername] = useState("admin");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [capaForm, setCapaForm] = useState<Omit<CreateCapaRequest, "deviationId">>({
    title: "",
    description: "",
    severity: "MAJOR",
    owner: "qc.manager",
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    correctiveAction: "",
    preventiveAction: "",
    effectivenessCheck: ""
  });
  const [capaClosurePassword, setCapaClosurePassword] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: deviation, isLoading, error } = useQuery({
    queryKey: ["deviation", deviationId],
    queryFn: () => fetchDeviation(deviationId as string),
    enabled: Boolean(deviationId)
  });

  const { data: auditEvents } = useQuery({
    queryKey: ["audit-events", "QMS_DEVIATION", deviationId],
    queryFn: () => fetchAuditEvents("QMS_DEVIATION", deviationId as string),
    enabled: Boolean(deviationId)
  });

  const { data: signatures } = useQuery({
    queryKey: ["e-signatures", "QMS_DEVIATION", deviationId],
    queryFn: () => fetchESignatures("QMS_DEVIATION", deviationId as string),
    enabled: Boolean(deviationId)
  });

  const { data: capaPage } = useQuery({
    queryKey: ["capas", deviationId],
    queryFn: () => fetchCapas(deviationId as string),
    enabled: Boolean(deviationId)
  });

  useEffect(() => {
    if (deviation) {
      setForm({
        title: deviation.title,
        description: deviation.description,
        deviationType: deviation.deviationType,
        severity: deviation.severity,
        department: deviation.department ?? "",
        immediateAction: deviation.immediateAction ?? "",
        investigationSummary: deviation.investigationSummary ?? "",
        rootCause: deviation.rootCause ?? "",
        impactAssessment: deviation.impactAssessment ?? ""
      });
      setSelectedStatus(deviation.status === "OPEN" ? "UNDER_INVESTIGATION" : deviation.status);
      setClosureSummary(deviation.closureSummary ?? "");
    }
  }, [deviation]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateDeviationRequest) => updateDeviation(deviationId as string, payload),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["deviation", deviationId] });
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update deviation")
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      updateDeviationStatus(deviationId as string, {
        status: selectedStatus,
        reason: statusReason.trim() || undefined,
        closureSummary: selectedStatus === "CLOSED" ? closureSummary.trim() : undefined,
        username: selectedStatus === "CLOSED" ? signatureUsername.trim() : undefined,
        password: selectedStatus === "CLOSED" ? signaturePassword : undefined,
        meaning: selectedStatus === "CLOSED" ? "I approve this deviation closure" : undefined
      }),
    onSuccess: async () => {
      setActionError(null);
      setSignaturePassword("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["deviation", deviationId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events", "QMS_DEVIATION", deviationId] }),
        queryClient.invalidateQueries({ queryKey: ["e-signatures", "QMS_DEVIATION", deviationId] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update status")
  });

  const createCapaMutation = useMutation({
    mutationFn: () => createCapa({
      deviationId: deviationId as string,
      ...capaForm,
      title: capaForm.title.trim(),
      description: capaForm.description?.trim() || undefined,
      owner: capaForm.owner.trim(),
      correctiveAction: capaForm.correctiveAction.trim(),
      preventiveAction: capaForm.preventiveAction?.trim() || undefined,
      effectivenessCheck: capaForm.effectivenessCheck?.trim() || undefined
    }),
    onSuccess: async () => {
      setActionError(null);
      setCapaForm({
        title: "",
        description: "",
        severity: "MAJOR",
        owner: "qc.manager",
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        correctiveAction: "",
        preventiveAction: "",
        effectivenessCheck: ""
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["capas", deviationId] }),
        queryClient.invalidateQueries({ queryKey: ["deviation", deviationId] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to create CAPA")
  });

  const capaStatusMutation = useMutation({
    mutationFn: ({ capaId, status }: { capaId: string; status: CapaStatus }) => updateCapaStatus(capaId, {
      status,
      reason: statusReason.trim() || undefined,
      completionSummary: closureSummary.trim() || undefined,
      username: status === "CLOSED" ? signatureUsername.trim() : undefined,
      password: status === "CLOSED" ? capaClosurePassword : undefined,
      meaning: status === "CLOSED" ? "I approve CAPA closure" : undefined
    }),
    onSuccess: async () => {
      setActionError(null);
      setCapaClosurePassword("");
      await queryClient.invalidateQueries({ queryKey: ["capas", deviationId] });
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update CAPA status")
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form) return;
    updateMutation.mutate({
      ...form,
      title: form.title.trim(),
      description: form.description.trim(),
      department: form.department?.trim() || undefined,
      immediateAction: form.immediateAction?.trim() || undefined,
      investigationSummary: form.investigationSummary?.trim() || undefined,
      rootCause: form.rootCause?.trim() || undefined,
      impactAssessment: form.impactAssessment?.trim() || undefined
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading deviation...</div>;
  }
  if (error || !deviation || !form) {
    return <div className="p-6 text-sm text-red-500">{error instanceof Error ? error.message : "Deviation not found"}</div>;
  }

  const isClosed = deviation.status === "CLOSED" || deviation.status === "CANCELLED";
  const capas = capaPage?.content ?? [];

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate("/qms/deviations")} className="mb-2 text-xs font-semibold text-blue-600 hover:underline">Back to deviations</button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{deviation.deviationNumber}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${severityClass(deviation.severity)}`}>{deviation.severity}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(deviation.status)}`}>{formatLabel(deviation.status)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{deviation.title}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-xs text-slate-500">
          <div className="font-semibold text-slate-700">{formatLabel(deviation.sourceModule)}</div>
          <div>{deviation.sourceReference ?? "No source reference"}</div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Title"><input disabled={isClosed} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className={fieldClass()} /></Field>
            <Field label="Department"><input disabled={isClosed} value={form.department ?? ""} onChange={(event) => setForm({ ...form, department: event.target.value })} className={fieldClass()} /></Field>
            <Field label="Type"><select disabled={isClosed} value={form.deviationType} onChange={(event) => setForm({ ...form, deviationType: event.target.value as DeviationType })} className={fieldClass()}>{deviationTypes.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></Field>
            <Field label="Severity"><select disabled={isClosed} value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value as DeviationSeverity })} className={fieldClass()}>{severities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></Field>
          </div>

          <Field label="Description"><textarea disabled={isClosed} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className={fieldClass("min-h-24")} /></Field>
          <Field label="Immediate containment"><textarea disabled={isClosed} value={form.immediateAction ?? ""} onChange={(event) => setForm({ ...form, immediateAction: event.target.value })} className={fieldClass("min-h-20")} /></Field>

          <div className="grid gap-4 lg:grid-cols-3">
            <Field label="Investigation summary"><textarea disabled={isClosed} value={form.investigationSummary ?? ""} onChange={(event) => setForm({ ...form, investigationSummary: event.target.value })} className={fieldClass("min-h-32")} /></Field>
            <Field label="Root cause"><textarea disabled={isClosed} value={form.rootCause ?? ""} onChange={(event) => setForm({ ...form, rootCause: event.target.value })} className={fieldClass("min-h-32")} /></Field>
            <Field label="Impact assessment"><textarea disabled={isClosed} value={form.impactAssessment ?? ""} onChange={(event) => setForm({ ...form, impactAssessment: event.target.value })} className={fieldClass("min-h-32")} /></Field>
          </div>

          {actionError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{actionError}</div> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={isClosed || updateMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
              {updateMutation.isPending ? "Saving..." : "Save Investigation"}
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Linked CAPAs</h2>
                <p className="text-xs text-slate-500">Corrective and preventive actions for this deviation</p>
              </div>
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{capas.length}</span>
            </div>
            <div className="mt-4 space-y-3">
              {capas.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No CAPAs linked yet.</div> : null}
              {capas.map((capa) => (
                <div key={capa.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-amber-700">{capa.capaNumber}</div>
                      <div className="mt-1 text-sm font-semibold text-slate-800">{capa.title}</div>
                      <div className="mt-1 text-xs text-slate-500">{capa.owner} · Due {capa.dueDate}</div>
                    </div>
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{formatLabel(capa.status)}</span>
                  </div>
                  <div className="mt-3 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <div><span className="font-semibold">Corrective:</span> {capa.correctiveAction}</div>
                    <div><span className="font-semibold">Preventive:</span> {capa.preventiveAction ?? "-"}</div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {capaStatusFlow.filter((status) => status !== capa.status).map((status) => (
                      <button key={status} type="button" onClick={() => capaStatusMutation.mutate({ capaId: capa.id, status })} className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-amber-300 hover:text-amber-700">
                        {formatLabel(status)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              createCapaMutation.mutate();
            }}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-sm font-bold text-slate-800">Create CAPA</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <Field label="Title"><input value={capaForm.title} onChange={(event) => setCapaForm({ ...capaForm, title: event.target.value })} className={fieldClass()} /></Field>
              <Field label="Owner"><input value={capaForm.owner} onChange={(event) => setCapaForm({ ...capaForm, owner: event.target.value })} className={fieldClass()} /></Field>
              <Field label="Severity"><select value={capaForm.severity} onChange={(event) => setCapaForm({ ...capaForm, severity: event.target.value as DeviationSeverity })} className={fieldClass()}>{severities.map((severity) => <option key={severity} value={severity}>{severity}</option>)}</select></Field>
              <Field label="Due date"><input type="date" value={capaForm.dueDate} onChange={(event) => setCapaForm({ ...capaForm, dueDate: event.target.value })} className={fieldClass()} /></Field>
            </div>
            <div className="mt-3 grid gap-3 lg:grid-cols-3">
              <Field label="Corrective action"><textarea value={capaForm.correctiveAction} onChange={(event) => setCapaForm({ ...capaForm, correctiveAction: event.target.value })} className={fieldClass("min-h-24")} /></Field>
              <Field label="Preventive action"><textarea value={capaForm.preventiveAction ?? ""} onChange={(event) => setCapaForm({ ...capaForm, preventiveAction: event.target.value })} className={fieldClass("min-h-24")} /></Field>
              <Field label="Effectiveness check"><textarea value={capaForm.effectivenessCheck ?? ""} onChange={(event) => setCapaForm({ ...capaForm, effectivenessCheck: event.target.value })} className={fieldClass("min-h-24")} /></Field>
            </div>
            <div className="mt-3">
              <Field label="CAPA closure password"><input type="password" value={capaClosurePassword} onChange={(event) => setCapaClosurePassword(event.target.value)} className={fieldClass()} placeholder="Used when moving linked CAPA to CLOSED" /></Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" disabled={createCapaMutation.isPending || isClosed} className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {createCapaMutation.isPending ? "Creating..." : "Create CAPA"}
              </button>
            </div>
          </form>
        </div>

        <aside className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Status Action</h2>
            <div className="mt-4 space-y-3">
              <Field label="Next status"><select disabled={isClosed} value={selectedStatus} onChange={(event) => setSelectedStatus(event.target.value as DeviationStatus)} className={fieldClass()}>{statusFlow.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}</select></Field>
              <Field label="Reason"><textarea disabled={isClosed} value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className={fieldClass("min-h-20")} /></Field>
              {selectedStatus === "CLOSED" ? (
                <>
                  <Field label="Closure summary"><textarea disabled={isClosed} value={closureSummary} onChange={(event) => setClosureSummary(event.target.value)} className={fieldClass("min-h-20")} /></Field>
                  <Field label="E-sign username"><input disabled={isClosed} value={signatureUsername} onChange={(event) => setSignatureUsername(event.target.value)} className={fieldClass()} /></Field>
                  <Field label="E-sign password"><input disabled={isClosed} type="password" value={signaturePassword} onChange={(event) => setSignaturePassword(event.target.value)} className={fieldClass()} /></Field>
                </>
              ) : null}
              <button type="button" disabled={isClosed || statusMutation.isPending} onClick={() => statusMutation.mutate()} className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50">
                {statusMutation.isPending ? "Updating..." : "Apply Status"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Record Info</h2>
            <div className="mt-4 space-y-3 text-xs">
              <Meta label="Detected by" value={deviation.detectedBy} />
              <Meta label="Detected at" value={formatDateTime(deviation.detectedAt)} />
              <Meta label="Created by" value={deviation.createdBy} />
              <Meta label="Closed by" value={deviation.closedBy ?? "-"} />
              <Meta label="Closed at" value={formatDateTime(deviation.closedAt)} />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Audit Timeline</h2>
            <div className="mt-4 space-y-3">
              {(auditEvents ?? []).length === 0 ? <div className="text-xs text-slate-400">No audit events yet.</div> : null}
              {(auditEvents ?? []).map((event) => (
                <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
                  <div className="font-semibold text-slate-700">{formatLabel(event.eventType)} · {event.fieldName ?? "record"}</div>
                  <div className="mt-1 text-slate-500">{event.oldValue ?? "-"} to {event.newValue ?? "-"}</div>
                  <div className="mt-1 text-[11px] text-slate-400">{event.actor} · {formatDateTime(event.eventAt)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">E-signatures</h2>
            <div className="mt-4 space-y-3">
              {(signatures ?? []).length === 0 ? <div className="text-xs text-slate-400">No signatures recorded.</div> : null}
              {(signatures ?? []).map((signature) => (
                <div key={signature.id} className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs">
                  <div className="font-semibold text-green-800">{formatLabel(signature.action)}</div>
                  <div className="mt-1 text-green-700">{signature.signerUsername} · {formatLabel(signature.verificationMethod)}</div>
                  <div className="mt-1 text-[11px] text-green-600">{formatDateTime(signature.signedAt)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0">
      <span className="text-slate-400">{label}</span>
      <span className="text-right font-semibold text-slate-700">{value}</span>
    </div>
  );
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400 ${extra}`;
}
