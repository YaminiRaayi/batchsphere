import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchComplaint,
  linkComplaintCapa,
  linkComplaintDeviation,
  updateComplaint,
  updateComplaintStatus
} from "../../lib/api";
import type {
  ComplaintCategory,
  ComplaintSeverity,
  ComplaintStatus,
  RegulatoryReportability,
  UpdateComplaintRequest
} from "../../types/complaint";
import { formatDateTime, formatLabel } from "./deviationUi";
import { AuditTimeline } from "../../components/AuditTimeline";

const categories: ComplaintCategory[] = ["PRODUCT_QUALITY", "ADVERSE_EVENT", "LABELING_ERROR", "PACKAGING_DEFECT", "EFFICACY", "CONTAMINATION", "OTHER"];
const severities: ComplaintSeverity[] = ["CRITICAL", "MAJOR", "MINOR", "INFORMATIONAL"];
const reportabilityOptions: RegulatoryReportability[] = ["NOT_ASSESSED", "REPORTABLE", "NOT_REPORTABLE", "REPORTED"];
const statusFlow: ComplaintStatus[] = ["UNDER_INVESTIGATION", "PENDING_CLOSURE"];

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

export function ComplaintDetailPage() {
  const { complaintId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [investigationForm, setInvestigationForm] = useState<UpdateComplaintRequest | null>(null);
  const [deviationIdInput, setDeviationIdInput] = useState("");
  const [capaIdInput, setCapaIdInput] = useState("");
  const [closureSummary, setClosureSummary] = useState("");
  const [closureUsername, setClosureUsername] = useState("");
  const [closurePassword, setClosurePassword] = useState("");
  const [statusReason, setStatusReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data: complaint, isLoading, error } = useQuery({
    queryKey: ["complaint", complaintId],
    queryFn: () => fetchComplaint(complaintId as string),
    enabled: Boolean(complaintId)
  });

  useEffect(() => {
    if (complaint) {
      setInvestigationForm({
        category: complaint.category,
        severity: complaint.severity,
        description: complaint.description,
        productName: complaint.productName ?? "",
        lotNumber: complaint.lotNumber ?? "",
        reportedBy: complaint.reportedBy ?? "",
        initialAssessment: complaint.initialAssessment ?? "",
        rootCause: complaint.rootCause ?? "",
        impactAssessment: complaint.impactAssessment ?? "",
        recallRequired: complaint.recallRequired,
        regulatoryReportability: complaint.regulatoryReportability,
        regulatoryAuthority: complaint.regulatoryAuthority ?? "",
        regulatoryReportDate: complaint.regulatoryReportDate ?? ""
      });
      setClosureSummary(complaint.closureSummary ?? "");
    }
  }, [complaint]);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateComplaintRequest) => updateComplaint(complaintId as string, payload),
    onSuccess: async () => {
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update complaint")
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: ComplaintStatus) =>
      updateComplaintStatus(complaintId as string, {
        status: nextStatus,
        reason: statusReason.trim() || undefined
      }),
    onSuccess: async () => {
      setActionError(null);
      setStatusReason("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events", "COMPLAINT", complaintId] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update status")
  });

  const closureMutation = useMutation({
    mutationFn: () =>
      updateComplaintStatus(complaintId as string, {
        status: "CLOSED",
        closureSummary: closureSummary.trim(),
        username: closureUsername.trim(),
        password: closurePassword,
        meaning: "I approve closure of this complaint"
      }),
    onSuccess: async () => {
      setActionError(null);
      setClosurePassword("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] }),
        queryClient.invalidateQueries({ queryKey: ["audit-events", "COMPLAINT", complaintId] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to close complaint")
  });

  const linkDeviationMutation = useMutation({
    mutationFn: () => linkComplaintDeviation(complaintId as string, deviationIdInput.trim()),
    onSuccess: async () => {
      setActionError(null);
      setDeviationIdInput("");
      await queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to link deviation")
  });

  const linkCapaMutation = useMutation({
    mutationFn: () => linkComplaintCapa(complaintId as string, capaIdInput.trim()),
    onSuccess: async () => {
      setActionError(null);
      setCapaIdInput("");
      await queryClient.invalidateQueries({ queryKey: ["complaint", complaintId] });
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to link CAPA")
  });

  function handleInvestigationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!investigationForm) return;
    updateMutation.mutate({
      ...investigationForm,
      productName: investigationForm.productName?.trim() || undefined,
      lotNumber: investigationForm.lotNumber?.trim() || undefined,
      reportedBy: investigationForm.reportedBy?.trim() || undefined,
      initialAssessment: investigationForm.initialAssessment?.trim() || undefined,
      rootCause: investigationForm.rootCause?.trim() || undefined,
      impactAssessment: investigationForm.impactAssessment?.trim() || undefined,
      regulatoryAuthority: investigationForm.regulatoryAuthority?.trim() || undefined,
      regulatoryReportDate: investigationForm.regulatoryReportDate?.trim() || undefined
    });
  }

  if (isLoading) {
    return <div className="p-6 text-sm text-slate-500">Loading complaint...</div>;
  }
  if (error || !complaint || !investigationForm) {
    return <div className="p-6 text-sm text-red-500">{error instanceof Error ? error.message : "Complaint not found"}</div>;
  }

  const isClosed = complaint.status === "CLOSED" || complaint.status === "WITHDRAWN";
  const isPendingClosure = complaint.status === "PENDING_CLOSURE";
  const availableTransitions = statusFlow.filter((s) => s !== complaint.status);

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button type="button" onClick={() => navigate("/qms/complaints")} className="mb-2 text-xs font-semibold text-red-600 hover:underline">
            Back to complaints
          </button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-slate-800">{complaint.complaintNumber}</h1>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${complaintSeverityClass(complaint.severity)}`}>{complaint.severity}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${complaintStatusClass(complaint.status)}`}>{formatLabel(complaint.status)}</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">{complaint.description.slice(0, 120)}{complaint.description.length > 120 ? "..." : ""}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-right text-xs text-slate-500">
          <div className="font-semibold text-slate-700">{formatLabel(complaint.source)}</div>
          <div>{complaint.receivedDate}</div>
          {complaint.reportedBy ? <div className="mt-1">{complaint.reportedBy}</div> : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Overview</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-xs">
              <Meta label="Product" value={complaint.productName ?? "-"} />
              <Meta label="Lot number" value={complaint.lotNumber ?? "-"} />
              <Meta label="Source" value={formatLabel(complaint.source)} />
              <Meta label="Category" value={formatLabel(complaint.category)} />
              <Meta label="Regulatory reportability" value={formatLabel(complaint.regulatoryReportability)} />
              <Meta label="Recall required" value={complaint.recallRequired ? "Yes" : "No"} />
              {complaint.regulatoryAuthority ? <Meta label="Regulatory authority" value={complaint.regulatoryAuthority} /> : null}
              {complaint.regulatoryReportDate ? <Meta label="Regulatory report date" value={complaint.regulatoryReportDate} /> : null}
            </div>
          </div>

          <form onSubmit={handleInvestigationSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Investigation</h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Category">
                <select disabled={isClosed} value={investigationForm.category} onChange={(event) => setInvestigationForm({ ...investigationForm, category: event.target.value as ComplaintCategory })} className={fieldClass()}>
                  {categories.map((cat) => <option key={cat} value={cat}>{formatLabel(cat)}</option>)}
                </select>
              </Field>
              <Field label="Severity">
                <select disabled={isClosed} value={investigationForm.severity} onChange={(event) => setInvestigationForm({ ...investigationForm, severity: event.target.value as ComplaintSeverity })} className={fieldClass()}>
                  {severities.map((sev) => <option key={sev} value={sev}>{sev}</option>)}
                </select>
              </Field>
              <Field label="Product name">
                <input disabled={isClosed} value={investigationForm.productName ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, productName: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Lot number">
                <input disabled={isClosed} value={investigationForm.lotNumber ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, lotNumber: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Reported by">
                <input disabled={isClosed} value={investigationForm.reportedBy ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, reportedBy: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Regulatory reportability">
                <select disabled={isClosed} value={investigationForm.regulatoryReportability} onChange={(event) => setInvestigationForm({ ...investigationForm, regulatoryReportability: event.target.value as RegulatoryReportability })} className={fieldClass()}>
                  {reportabilityOptions.map((r) => <option key={r} value={r}>{formatLabel(r)}</option>)}
                </select>
              </Field>
              <Field label="Regulatory authority">
                <input disabled={isClosed} value={investigationForm.regulatoryAuthority ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, regulatoryAuthority: event.target.value })} className={fieldClass()} />
              </Field>
              <Field label="Regulatory report date">
                <input type="date" disabled={isClosed} value={investigationForm.regulatoryReportDate ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, regulatoryReportDate: event.target.value })} className={fieldClass()} />
              </Field>
            </div>

            <Field label="Description">
              <textarea disabled={isClosed} value={investigationForm.description} onChange={(event) => setInvestigationForm({ ...investigationForm, description: event.target.value })} className={fieldClass("min-h-24")} />
            </Field>
            <Field label="Initial assessment">
              <textarea disabled={isClosed} value={investigationForm.initialAssessment ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, initialAssessment: event.target.value })} className={fieldClass("min-h-20")} />
            </Field>

            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="Root cause">
                <textarea disabled={isClosed} value={investigationForm.rootCause ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, rootCause: event.target.value })} className={fieldClass("min-h-32")} />
              </Field>
              <Field label="Impact assessment">
                <textarea disabled={isClosed} value={investigationForm.impactAssessment ?? ""} onChange={(event) => setInvestigationForm({ ...investigationForm, impactAssessment: event.target.value })} className={fieldClass("min-h-32")} />
              </Field>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isClosed}
                checked={investigationForm.recallRequired}
                onChange={(event) => setInvestigationForm({ ...investigationForm, recallRequired: event.target.checked })}
                className="h-4 w-4 rounded border-slate-300 text-red-600"
              />
              <span className="text-xs font-semibold text-slate-700">Recall required</span>
            </label>

            {actionError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">{actionError}</div> : null}
            <div className="flex justify-end">
              <button type="submit" disabled={isClosed || updateMutation.isPending} className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">
                {updateMutation.isPending ? "Saving..." : "Save Investigation"}
              </button>
            </div>
          </form>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Linked Records</h2>
            <div className="mt-4 space-y-3">
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Linked Deviation ID</div>
                {complaint.linkedDeviationId ? (
                  <div className="font-mono text-xs text-slate-700">{complaint.linkedDeviationId}</div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={deviationIdInput}
                      onChange={(event) => setDeviationIdInput(event.target.value)}
                      placeholder="Paste deviation UUID"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                      disabled={isClosed}
                    />
                    <button
                      type="button"
                      disabled={!deviationIdInput.trim() || isClosed || linkDeviationMutation.isPending}
                      onClick={() => linkDeviationMutation.mutate()}
                      className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {linkDeviationMutation.isPending ? "Linking..." : "Link"}
                    </button>
                  </div>
                )}
              </div>
              <div>
                <div className="mb-1 text-xs font-semibold text-slate-500">Linked CAPA ID</div>
                {complaint.linkedCapaId ? (
                  <div className="font-mono text-xs text-slate-700">{complaint.linkedCapaId}</div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      value={capaIdInput}
                      onChange={(event) => setCapaIdInput(event.target.value)}
                      placeholder="Paste CAPA UUID"
                      className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-xs outline-none focus:border-blue-400"
                      disabled={isClosed}
                    />
                    <button
                      type="button"
                      disabled={!capaIdInput.trim() || isClosed || linkCapaMutation.isPending}
                      onClick={() => linkCapaMutation.mutate()}
                      className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {linkCapaMutation.isPending ? "Linking..." : "Link"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-5">
          {!isClosed && availableTransitions.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-800">Status Transition</h2>
              <div className="mt-4 space-y-3">
                <Field label="Reason (optional)">
                  <textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className={fieldClass("min-h-16")} />
                </Field>
                <div className="flex flex-wrap gap-2">
                  {availableTransitions.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate(nextStatus)}
                      className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:border-red-300 hover:text-red-700 disabled:opacity-50"
                    >
                      {statusMutation.isPending ? "Updating..." : `Move to ${formatLabel(nextStatus)}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {isPendingClosure ? (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-orange-800">Close Complaint</h2>
              <p className="mt-1 text-xs text-orange-600">E-signature required. Root cause and impact assessment must be saved first.</p>
              <div className="mt-4 space-y-3">
                <Field label="Closure summary">
                  <textarea value={closureSummary} onChange={(event) => setClosureSummary(event.target.value)} className={fieldClass("min-h-20")} />
                </Field>
                <Field label="Your username (e-sign)">
                  <input value={closureUsername} onChange={(event) => setClosureUsername(event.target.value)} className={fieldClass()} />
                </Field>
                <Field label="Your password (e-sign)">
                  <input type="password" value={closurePassword} onChange={(event) => setClosurePassword(event.target.value)} className={fieldClass()} />
                </Field>
                <button
                  type="button"
                  disabled={!closureSummary.trim() || !closureUsername.trim() || !closurePassword || closureMutation.isPending}
                  onClick={() => closureMutation.mutate()}
                  className="w-full rounded-xl bg-red-700 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
                >
                  {closureMutation.isPending ? "Closing..." : "Sign & Close Complaint"}
                </button>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Record Info</h2>
            <div className="mt-4 space-y-3 text-xs">
              <Meta label="Created by" value={complaint.createdBy} />
              <Meta label="Created at" value={formatDateTime(complaint.createdAt)} />
              <Meta label="Updated by" value={complaint.updatedBy ?? "-"} />
              <Meta label="Updated at" value={formatDateTime(complaint.updatedAt)} />
              {complaint.closedBy ? <Meta label="Closed by" value={complaint.closedBy} /> : null}
              {complaint.closedAt ? <Meta label="Closed at" value={formatDateTime(complaint.closedAt)} /> : null}
            </div>
          </div>

          {complaint.closureSummary ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 shadow-sm">
              <h2 className="text-sm font-bold text-green-800">Closure Summary</h2>
              <p className="mt-2 text-xs text-green-700">{complaint.closureSummary}</p>
            </div>
          ) : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800">Audit Timeline</h2>
            <div className="mt-4">
              <AuditTimeline entityType="COMPLAINT" entityId={complaintId as string} />
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
