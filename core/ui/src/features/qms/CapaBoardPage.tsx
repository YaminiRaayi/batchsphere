import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approveCapaAction, deleteCapaAttachment, downloadCsvExport, downloadPdfReport, fetchCapaAlerts, fetchCapaAttachmentFile, fetchCapaAttachments, fetchCapaReassignmentHistory, fetchCapaSummary, fetchCapas, fetchEmployees, reassignCapa, rejectCapaAction, reviewCapaEffectiveness, scheduleCapaEffectivenessReview, submitCapaForApproval, updateCapaStatus, uploadCapaAttachment } from "../../lib/api";
import type { Capa, CapaApprovalStatus, CapaAttachmentStage, CapaEffectivenessOutcome, CapaStatus } from "../../types/capa";
import { useAuthStore } from "../../stores/authStore";
import { formatDateTime, formatLabel, severityClass } from "./deviationUi";
import { capaStatusClass, capaStatuses, dueState } from "./capaUi";
import { AuditTimeline } from "../../components/AuditTimeline";

export function CapaBoardPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canApprove = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [approvalFilter, setApprovalFilter] = useState("ALL");
  const [selected, setSelected] = useState<Capa | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [completionSummary, setCompletionSummary] = useState("");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [approvePassword, setApprovePassword] = useState("");
  const [approveComments, setApproveComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploadStage, setUploadStage] = useState<CapaAttachmentStage>("GENERAL");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reviewDate, setReviewDate] = useState("");
  const [reviewer, setReviewer] = useState("");
  const [reviewOutcome, setReviewOutcome] = useState<"PASSED" | "FAILED">("PASSED");
  const [reviewComments, setReviewComments] = useState("");
  const [reviewPassword, setReviewPassword] = useState("");
  const [showReassignPanel, setShowReassignPanel] = useState(false);
  const [reassignOwner, setReassignOwner] = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const { data, isLoading, error } = useQuery({ queryKey: ["capas"], queryFn: () => fetchCapas() });
  const { data: attachments = [] } = useQuery({
    queryKey: ["capa-attachments", selected?.id],
    queryFn: () => fetchCapaAttachments(selected!.id),
    enabled: Boolean(selected?.id)
  });
  const { data: summary } = useQuery({ queryKey: ["capa-summary"], queryFn: fetchCapaSummary });
  const { data: alerts = [] } = useQuery({ queryKey: ["capa-alerts"], queryFn: fetchCapaAlerts });
  const { data: employees = [] } = useQuery({ queryKey: ["employees"], queryFn: () => fetchEmployees(), staleTime: 300_000 });
  const { data: reassignmentHistory = [] } = useQuery({
    queryKey: ["capa-reassignments", selected?.id],
    queryFn: () => fetchCapaReassignmentHistory(selected!.id),
    enabled: Boolean(selected?.id),
  });
  const capas = data?.content ?? [];
  const owners = useMemo(() => Array.from(new Set(capas.map((capa) => capa.owner))).sort(), [capas]);
  const filtered = useMemo(
    () => capas.filter((capa) =>
      (severityFilter === "ALL" || capa.severity === severityFilter) &&
      (ownerFilter === "ALL" || capa.owner === ownerFilter) &&
      (approvalFilter === "ALL" || capa.approvalStatus === approvalFilter)
    ),
    [capas, ownerFilter, severityFilter, approvalFilter]
  );

  const invalidate = async () => {
    setActionError(null);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["capas"] }),
      queryClient.invalidateQueries({ queryKey: ["capa-summary"] }),
      queryClient.invalidateQueries({ queryKey: ["capa-alerts"] })
    ]);
  };

  const invalidateAttachments = async () => {
    if (selected?.id) {
      await queryClient.invalidateQueries({ queryKey: ["capa-attachments", selected.id] });
    }
  };

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadCapaAttachment(selected!.id, uploadStage, file),
    onSuccess: async () => { setActionError(null); await invalidateAttachments(); if (fileInputRef.current) fileInputRef.current.value = ""; },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Upload failed")
  });

  const deleteMutation = useMutation({
    mutationFn: ({ attachmentId }: { attachmentId: string }) => deleteCapaAttachment(selected!.id, attachmentId),
    onSuccess: async () => { setActionError(null); await invalidateAttachments(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Delete failed")
  });

  const scheduleMutation = useMutation({
    mutationFn: () => scheduleCapaEffectivenessReview(selected!.id, { effectivenessReviewDate: reviewDate, effectivenessReviewer: reviewer }),
    onSuccess: async (updated) => { setSelected(updated); setReviewDate(""); setReviewer(""); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to schedule review")
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewCapaEffectiveness(selected!.id, {
      outcome: reviewOutcome,
      comments: reviewComments.trim() || undefined,
      username: authUser?.username ?? "",
      password: reviewPassword,
      meaning: reviewOutcome === "PASSED" ? "I confirm CAPA effectiveness verified" : "I confirm CAPA effectiveness failed"
    }),
    onSuccess: async (updated) => { setSelected(updated); setReviewPassword(""); setReviewComments(""); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to record review")
  });

  const statusMutation = useMutation({
    mutationFn: ({ capa, status }: { capa: Capa; status: CapaStatus }) => updateCapaStatus(capa.id, {
      status,
      reason: statusReason.trim() || undefined,
      completionSummary: status === "CLOSED" || status === "COMPLETED" || status === "EFFECTIVENESS_CHECK" ? completionSummary.trim() || undefined : undefined,
      username: status === "CLOSED" ? authUser?.username : undefined,
      password: status === "CLOSED" ? signaturePassword : undefined,
      meaning: status === "CLOSED" ? "I approve CAPA closure" : undefined
    }),
    onSuccess: async (updated) => { setSelected(updated); setSignaturePassword(""); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update CAPA")
  });

  const submitMutation = useMutation({
    mutationFn: (capa: Capa) => submitCapaForApproval(capa.id),
    onSuccess: async (updated) => { setSelected(updated); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to submit for approval")
  });

  const approveMutation = useMutation({
    mutationFn: (capa: Capa) => approveCapaAction(capa.id, {
      username: authUser?.username ?? "",
      password: approvePassword,
      comments: approveComments.trim() || undefined,
      meaning: "I approve this CAPA action plan"
    }),
    onSuccess: async (updated) => { setSelected(updated); setApprovePassword(""); setApproveComments(""); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to approve CAPA")
  });

  const rejectMutation = useMutation({
    mutationFn: (capa: Capa) => rejectCapaAction(capa.id, { reason: rejectReason.trim() }),
    onSuccess: async (updated) => { setSelected(updated); setRejectReason(""); await invalidate(); },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to reject CAPA")
  });

  const reassignMutation = useMutation({
    mutationFn: (capa: Capa) => reassignCapa(capa.id, { newOwner: reassignOwner, reason: reassignReason }),
    onSuccess: async (updated) => {
      setSelected(updated);
      setReassignOwner(""); setReassignReason(""); setShowReassignPanel(false);
      await Promise.all([
        invalidate(),
        queryClient.invalidateQueries({ queryKey: ["capa-reassignments", updated.id] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to reassign CAPA")
  });

  const pendingApprovalCount = capas.filter((c) => c.approvalStatus === "PENDING_APPROVAL").length;
  const today = new Date().toISOString().slice(0, 10);
  const overdueEffectivenessCount = capas.filter(
    (c) => c.status === "EFFECTIVENESS_CHECK" && c.effectivenessOutcome === "PENDING"
      && c.effectivenessReviewDate && c.effectivenessReviewDate < today
  ).length;
  const openCount = (summary?.countsByStatus.OPEN ?? 0) + (summary?.countsByStatus.IN_PROGRESS ?? 0) + (summary?.countsByStatus.COMPLETED ?? 0) + (summary?.countsByStatus.EFFECTIVENESS_CHECK ?? 0);
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-amber-50/30">
      <div className="flex items-center gap-4 border-b border-amber-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CAPA Tracker</h1>
          <p className="text-sm text-slate-500">Corrective and preventive actions linked to QMS deviations</p>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-amber-100 bg-white px-6 py-3">
        <Stat value={openCount} label="Open CAPAs" className="text-slate-800" />
        <Stat value={summary?.overdue ?? 0} label="Overdue" className="text-red-500" />
        <Stat value={summary?.dueThisWeek ?? 0} label="Due this week" className="text-amber-600" />
        {canApprove && pendingApprovalCount > 0 ? (
          <Stat value={pendingApprovalCount} label="Pending approval" className="text-violet-600" />
        ) : null}
        {overdueEffectivenessCount > 0 ? (
          <Stat value={overdueEffectivenessCount} label="Overdue effectiveness" className="text-orange-500" />
        ) : null}
        {(summary?.alertCount ?? alerts.length) > 0 ? (
          <Stat value={summary?.alertCount ?? alerts.length} label="Active alerts" className="text-rose-600" />
        ) : null}
        <Stat value={summary?.countsByStatus.CLOSED ?? 0} label="Closed" className="text-green-600" />
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => void downloadCsvExport("/api/capas?size=10000", "capas.csv")}
            className="rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50"
          >
            Export CSV
          </button>
          <select value={approvalFilter} onChange={(event) => setApprovalFilter(event.target.value)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <option value="ALL">All approvals</option>
            <option value="PENDING_APPROVAL">Pending approval</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            {["ALL", "CRITICAL", "MAJOR", "MINOR"].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <option value="ALL">All Owners</option>
            {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? <div className="p-6 text-sm text-slate-500">Loading CAPAs...</div> : null}
      {errorMessage ? <div className="p-6 text-sm text-red-500">{errorMessage}</div> : null}

      {alerts.length > 0 ? (
        <div className="border-b border-amber-100 bg-rose-50 px-6 py-3">
          <div className="mb-2 text-xs font-bold uppercase text-rose-700">CAPA Escalation Alerts</div>
          <div className="flex gap-2 overflow-x-auto">
            {alerts.slice(0, 8).map((alert) => (
              <button
                key={`${alert.alertType}-${alert.capaId}`}
                type="button"
                onClick={() => setSelected(capas.find((capa) => capa.id === alert.capaId) ?? null)}
                className="min-w-64 rounded-lg border border-rose-200 bg-white px-3 py-2 text-left text-xs shadow-sm hover:bg-rose-50"
              >
                <div className="font-mono font-bold text-rose-700">{alert.capaNumber}</div>
                <div className="mt-1 font-semibold text-slate-800">{alert.message}</div>
                <div className="mt-1 text-slate-500">{alert.owner} · due {alert.dueDate}</div>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-x-auto p-5">
        <div className="flex h-full min-w-max gap-4">
          {capaStatuses.map((status) => {
            const statusCapas = filtered.filter((capa) => capa.status === status);
            return (
              <div key={status} className="flex w-64 shrink-0 flex-col rounded-xl border border-amber-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3">
                  <span className="text-xs font-bold text-slate-700">{formatLabel(status)}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{statusCapas.length}</span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {statusCapas.map((capa) => <CapaCard key={capa.id} capa={capa} onClick={() => setSelected(capa)} />)}
                  {statusCapas.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No CAPAs</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs font-bold text-amber-700">{selected.capaNumber}</div>
                <h2 className="mt-1 text-lg font-bold text-slate-800">{selected.title}</h2>
                <p className="text-xs text-slate-500">Deviation {selected.deviationNumber}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${capaStatusClass(selected.status)}`}>{formatLabel(selected.status)}</span>
                  <ApprovalPill approvalStatus={selected.approvalStatus} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { void downloadPdfReport(`/api/capas/${selected.id}/report`, `capa-${selected.capaNumber}.pdf`); }}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-100"
                >
                  PDF
                </button>
                <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Info label="Owner" value={selected.owner} />
                {selected.status !== "CLOSED" && selected.status !== "CANCELLED" && (
                  <button
                    onClick={() => { setShowReassignPanel((v) => !v); setReassignOwner(selected.owner); }}
                    className="rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 hover:bg-amber-100"
                  >Reassign</button>
                )}
              </div>
              {showReassignPanel && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="text-xs font-bold text-amber-700">Reassign Owner</div>
                  <select value={reassignOwner} onChange={(e) => setReassignOwner(e.target.value)}
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs focus:outline-none">
                    <option value="">Select employee…</option>
                    {employees.filter((emp) => emp.employmentStatus === "ACTIVE").map((emp) => (
                      <option key={emp.id} value={emp.fullName}>{emp.fullName} — {emp.department}</option>
                    ))}
                  </select>
                  <input value={reassignReason} onChange={(e) => setReassignReason(e.target.value)}
                    placeholder="Reason for reassignment *"
                    className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs focus:outline-none" />
                  <button
                    disabled={!reassignOwner || !reassignReason || reassignMutation.isPending}
                    onClick={() => reassignMutation.mutate(selected)}
                    className="rounded-lg bg-amber-500 px-4 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >{reassignMutation.isPending ? "Saving…" : "Confirm Reassign"}</button>
                </div>
              )}
              {reassignmentHistory.length > 0 && (
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">Ownership History</div>
                  <div className="space-y-1.5">
                    {reassignmentHistory.map((r) => (
                      <div key={r.id} className="text-[11px] text-gray-600">
                        <span className="font-semibold">{r.previousOwner}</span> → <span className="font-semibold">{r.newOwner}</span>
                        <span className="ml-1 text-gray-400">by {r.assignedBy} · {formatDateTime(r.assignedAt)}</span>
                        {r.reason && <div className="italic text-gray-400">{r.reason}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <Info label="Due date" value={selected.dueDate} />
              <Info label="Corrective action" value={selected.correctiveAction} />
              <Info label="Preventive action" value={selected.preventiveAction ?? "-"} />
              <Info label="Effectiveness check" value={selected.effectivenessCheck ?? "-"} />
            </div>

            {selected.approvalStatus !== "NONE" ? (
              <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-1">
                <div className="text-xs font-bold uppercase tracking-wider text-violet-500">Approval</div>
                {selected.submittedForApprovalBy ? <div className="text-xs text-slate-600">Submitted by <span className="font-semibold">{selected.submittedForApprovalBy}</span>{selected.submittedForApprovalAt ? ` · ${formatDateTime(selected.submittedForApprovalAt)}` : ""}</div> : null}
                {selected.approvedBy ? <div className="text-xs text-slate-600">{selected.approvalStatus === "REJECTED" ? "Rejected" : "Approved"} by <span className="font-semibold">{selected.approvedBy}</span>{selected.approvedAt ? ` · ${formatDateTime(selected.approvedAt)}` : ""}</div> : null}
                {selected.approvalComments ? <div className="text-xs italic text-slate-500">{selected.approvalComments}</div> : null}
              </div>
            ) : null}

            {selected.status === "EFFECTIVENESS_CHECK" ? (
              <div className="mt-5 rounded-xl border border-purple-100 bg-purple-50 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-500">Effectiveness Review</div>
                {selected.effectivenessReviewDate ? (
                  <div className="text-xs text-slate-600">
                    Scheduled <span className="font-semibold">{selected.effectivenessReviewDate}</span>
                    {selected.effectivenessReviewer ? ` · Reviewer: ${selected.effectivenessReviewer}` : ""}
                  </div>
                ) : null}
                {selected.effectivenessOutcome !== "PENDING" ? (
                  <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${selected.effectivenessOutcome === "PASSED" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {selected.effectivenessOutcome === "PASSED" ? "✓ Passed" : "✗ Failed"}
                    {selected.effectivenessReviewBy ? ` — ${selected.effectivenessReviewBy}` : ""}
                    {selected.effectivenessOutcomeComments ? ` · ${selected.effectivenessOutcomeComments}` : ""}
                  </div>
                ) : null}
                {selected.effectivenessOutcome === "PENDING" && !selected.effectivenessReviewDate ? (
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Schedule Review</div>
                    <input type="date" value={reviewDate} onChange={(e) => setReviewDate(e.target.value)} className={fieldClass()} />
                    <input value={reviewer} onChange={(e) => setReviewer(e.target.value)} className={fieldClass()} placeholder="Reviewer name or username" />
                    <button type="button" onClick={() => scheduleMutation.mutate()} disabled={scheduleMutation.isPending || !reviewDate || !reviewer.trim()} className="rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      {scheduleMutation.isPending ? "Scheduling..." : "Schedule"}
                    </button>
                  </div>
                ) : null}
                {canApprove && selected.effectivenessOutcome === "PENDING" ? (
                  <div className="space-y-2 border-t border-purple-100 pt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Record Outcome (E-sign required)</div>
                    <div className="flex gap-2">
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input type="radio" checked={reviewOutcome === "PASSED"} onChange={() => setReviewOutcome("PASSED")} className="accent-green-600" /> Pass
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs">
                        <input type="radio" checked={reviewOutcome === "FAILED"} onChange={() => setReviewOutcome("FAILED")} className="accent-red-600" /> Fail
                      </label>
                    </div>
                    <textarea value={reviewComments} onChange={(e) => setReviewComments(e.target.value)} className={fieldClass("min-h-14")} placeholder="Review comments" />
                    <input type="password" value={reviewPassword} onChange={(e) => setReviewPassword(e.target.value)} className={fieldClass()} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                    <button type="button" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending || !reviewPassword} className={`w-full rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-50 ${reviewOutcome === "PASSED" ? "bg-green-600" : "bg-red-600"}`}>
                      {reviewMutation.isPending ? "Saving..." : `Record ${reviewOutcome === "PASSED" ? "Pass" : "Fail"} with E-sign`}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Evidence &amp; Attachments</div>
              {(["INVESTIGATION", "CORRECTIVE_ACTION", "PREVENTIVE_ACTION", "EFFECTIVENESS_CHECK", "GENERAL"] as CapaAttachmentStage[]).map((stage) => {
                const stageFiles = attachments.filter((a) => a.stage === stage);
                if (stageFiles.length === 0) return null;
                return (
                  <div key={stage} className="mb-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{formatLabel(stage)}</div>
                    <div className="space-y-1">
                      {stageFiles.map((attachment) => (
                        <div key={attachment.id} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                          <span className="flex-1 truncate text-xs font-medium text-slate-700">{attachment.fileName}</span>
                          {attachment.fileSize ? <span className="text-[10px] text-slate-400">{(attachment.fileSize / 1024).toFixed(0)} KB</span> : null}
                          <button type="button" onClick={async () => {
                            const blob = await fetchCapaAttachmentFile(selected.id, attachment.id);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement("a");
                            a.href = url; a.download = attachment.fileName; a.click();
                            URL.revokeObjectURL(url);
                          }} className="text-[10px] font-bold text-violet-600 hover:underline">↓</button>
                          {selected.status !== "CLOSED" && selected.status !== "CANCELLED" ? (
                            <button type="button" onClick={() => deleteMutation.mutate({ attachmentId: attachment.id })} disabled={deleteMutation.isPending} className="text-[10px] font-bold text-red-500 hover:underline disabled:opacity-40">✕</button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {selected.status !== "CLOSED" && selected.status !== "CANCELLED" ? (
                <div className="mt-3 flex items-center gap-2">
                  <select value={uploadStage} onChange={(event) => setUploadStage(event.target.value as CapaAttachmentStage)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700">
                    {(["INVESTIGATION", "CORRECTIVE_ACTION", "PREVENTIVE_ACTION", "EFFECTIVENESS_CHECK", "GENERAL"] as CapaAttachmentStage[]).map((s) => (
                      <option key={s} value={s}>{formatLabel(s)}</option>
                    ))}
                  </select>
                  <input ref={fileInputRef} type="file" onChange={(event) => { const f = event.target.files?.[0]; if (f) uploadMutation.mutate(f); }} className="flex-1 text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-100 file:px-2 file:py-1 file:text-xs file:font-semibold file:text-violet-700" disabled={uploadMutation.isPending} />
                </div>
              ) : null}
              {attachments.length === 0 ? <div className="text-xs text-slate-400">No evidence attached yet.</div> : null}
            </div>

            {actionError ? <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{actionError}</div> : null}

            {selected.status === "IN_PROGRESS" && selected.approvalStatus !== "PENDING_APPROVAL" && selected.approvalStatus !== "APPROVED" ? (
              <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50 p-4">
                <div className="text-xs font-bold text-slate-700">Submit for Approval</div>
                <div className="mt-1 text-xs text-slate-500">Requires QC Manager review before marking CAPA as completed.</div>
                <button type="button" onClick={() => submitMutation.mutate(selected)} disabled={submitMutation.isPending} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                  {submitMutation.isPending ? "Submitting..." : "Submit for Approval"}
                </button>
              </div>
            ) : null}

            {canApprove && selected.approvalStatus === "PENDING_APPROVAL" ? (
              <div className="mt-5 space-y-3 rounded-xl border border-green-100 bg-green-50 p-4">
                <div className="text-xs font-bold text-slate-700">Approve CAPA Action Plan</div>
                <textarea value={approveComments} onChange={(event) => setApproveComments(event.target.value)} className={fieldClass("min-h-14")} placeholder="Approval comments (optional)" />
                <input type="password" value={approvePassword} onChange={(event) => setApprovePassword(event.target.value)} className={fieldClass()} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                <div className="flex gap-2">
                  <button type="button" onClick={() => approveMutation.mutate(selected)} disabled={approveMutation.isPending || !approvePassword} className="flex-1 rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                    {approveMutation.isPending ? "Approving..." : "Approve with E-sign"}
                  </button>
                  <div className="w-px bg-slate-200" />
                  <div className="flex-1 space-y-2">
                    <textarea value={rejectReason} onChange={(event) => setRejectReason(event.target.value)} className={fieldClass("min-h-10")} placeholder="Rejection reason" />
                    <button type="button" onClick={() => rejectMutation.mutate(selected)} disabled={rejectMutation.isPending || !rejectReason.trim()} className="w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                      {rejectMutation.isPending ? "Rejecting..." : "Reject"}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="mt-5 space-y-3">
              <textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className={fieldClass("min-h-16")} placeholder="Status change reason" />
              <textarea value={completionSummary} onChange={(event) => setCompletionSummary(event.target.value)} className={fieldClass("min-h-16")} placeholder="Completion / effectiveness summary" />
              <input type="password" value={signaturePassword} onChange={(event) => setSignaturePassword(event.target.value)} className={fieldClass()} placeholder="Password required for closure" />
              <div className="grid grid-cols-2 gap-2">
                {capaStatuses.filter((status) => status !== selected.status).map((status) => (
                  <button key={status} type="button" onClick={() => statusMutation.mutate({ capa: selected, status })} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={statusMutation.isPending}>
                    Move to {formatLabel(status)}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-xs font-bold text-slate-700">Audit Timeline</div>
              <div className="mt-3">
                <AuditTimeline entityType="QMS_CAPA" entityId={selected.id} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ApprovalPill({ approvalStatus }: { approvalStatus: CapaApprovalStatus }) {
  if (approvalStatus === "NONE") return null;
  const className = approvalStatus === "APPROVED"
    ? "bg-green-100 text-green-700"
    : approvalStatus === "PENDING_APPROVAL"
    ? "bg-violet-100 text-violet-700"
    : "bg-red-100 text-red-700";
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}>{formatLabel(approvalStatus)}</span>;
}

function CapaCard({ capa, onClick }: { capa: Capa; onClick: () => void }) {
  const due = dueState(capa.dueDate, capa.status === "CLOSED");
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-500 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-amber-700">{capa.capaNumber}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${severityClass(capa.severity)}`}>{capa.severity}</span>
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-800">{capa.title}</div>
      <div className="mt-1 text-[10px] text-slate-400">Source: {capa.deviationNumber}</div>
      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${capaStatusClass(capa.status)}`}>{formatLabel(capa.status)}</span>
        {capa.approvalStatus !== "NONE" ? <ApprovalPill approvalStatus={capa.approvalStatus} /> : null}
        <span className={`ml-auto text-[10px] font-bold ${due.className}`}>{due.label}</span>
      </div>
    </button>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return <div className="flex items-center gap-2"><span className={`text-2xl font-bold ${className}`}>{value}</span><span className="text-xs text-slate-500">{label}</span></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold text-slate-400">{label}</div><div className="mt-1 text-slate-700">{value}</div></div>;
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 ${extra}`;
}
