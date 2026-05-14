import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchChangeControls,
  createChangeControl,
  submitChangeControlForReview,
  approveChangeControl,
  rejectChangeControl,
  startChangeControlImplementation,
  moveChangeControlToEffectivenessCheck,
  closeChangeControl,
  cancelChangeControl,
  addChangeControlAffectedEntity,
  removeChangeControlAffectedEntity,
  addChangeControlTask,
  updateChangeControlTaskStatus,
  removeChangeControlTask,
} from "../../lib/api";
import type {
  ChangeControl,
  ChangeControlStatus,
  ChangeControlType,
  ChangeControlRisk,
  AffectedEntityType,
  ChangeControlTaskStatus,
} from "../../types/change-control";
import { useAuthStore } from "../../stores/authStore";

const STATUS_LABEL: Record<ChangeControlStatus, string> = {
  DRAFT: "Draft",
  UNDER_REVIEW: "Under Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  IN_IMPLEMENTATION: "In Implementation",
  EFFECTIVENESS_CHECK: "Effectiveness Check",
  CLOSED: "Closed",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<ChangeControlStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-600",
  UNDER_REVIEW: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  IN_IMPLEMENTATION: "bg-blue-100 text-blue-700",
  EFFECTIVENESS_CHECK: "bg-purple-100 text-purple-700",
  CLOSED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

const RISK_COLOR: Record<ChangeControlRisk, string> = {
  LOW: "bg-green-100 text-green-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-orange-100 text-orange-700",
  CRITICAL: "bg-red-100 text-red-700",
};

const CC_TYPES: ChangeControlType[] = ["DOCUMENT", "PROCESS", "EQUIPMENT", "MATERIAL", "SUPPLIER", "SYSTEM", "OTHER"];
const CC_RISKS: ChangeControlRisk[] = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const ENTITY_TYPES: AffectedEntityType[] = ["MATERIAL", "SPEC", "MOA", "VENDOR", "WAREHOUSE", "DOCUMENT", "PROCESS", "SYSTEM_CONFIG", "OTHER"];

function StatusPill({ status }: { status: ChangeControlStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function fieldClass(extra = "") {
  return `w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none ${extra}`;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <div className="mt-5 mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">{children}</div>;
}

export function ChangeControlPage() {
  const qc = useQueryClient();
  const authUser = useAuthStore((s) => s.user);
  const canApprove = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";

  const [selected, setSelected] = useState<ChangeControl | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // create form state
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<ChangeControlType>("DOCUMENT");
  const [newReason, setNewReason] = useState("");
  const [newRisk, setNewRisk] = useState<ChangeControlRisk>("LOW");
  const [newDescription, setNewDescription] = useState("");
  const [newImpact, setNewImpact] = useState("");
  const [newImplPlan, setNewImplPlan] = useState("");
  const [newEffCheck, setNewEffCheck] = useState("");
  const [newTargetDate, setNewTargetDate] = useState("");

  // approval state
  const [approvePassword, setApprovePassword] = useState("");
  const [approveComments, setApproveComments] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showApprovePanel, setShowApprovePanel] = useState(false);
  const [showRejectPanel, setShowRejectPanel] = useState(false);

  // close state
  const [closureSummary, setClosureSummary] = useState("");
  const [closePassword, setClosePassword] = useState("");
  const [showClosePanel, setShowClosePanel] = useState(false);

  // cancel state
  const [showCancelPanel, setShowCancelPanel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  // affected entity state
  const [aeType, setAeType] = useState<AffectedEntityType>("MATERIAL");
  const [aeRef, setAeRef] = useState("");
  const [aeNotes, setAeNotes] = useState("");

  // task state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskAssignedTo, setTaskAssignedTo] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskDesc, setTaskDesc] = useState("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["change-controls"] });
  };
  const invalidateSelected = (updated: ChangeControl) => {
    setSelected(updated);
    invalidate();
  };

  const { data, isLoading } = useQuery({
    queryKey: ["change-controls"],
    queryFn: () => fetchChangeControls(),
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: createChangeControl,
    onSuccess: (cc) => {
      invalidate();
      setSelected(cc);
      setShowCreate(false);
      setNewTitle(""); setNewType("DOCUMENT"); setNewReason("");
      setNewRisk("LOW"); setNewDescription(""); setNewImpact("");
      setNewImplPlan(""); setNewEffCheck(""); setNewTargetDate("");
    },
  });

  const submitReviewMutation = useMutation({
    mutationFn: (id: string) => submitChangeControlForReview(id),
    onSuccess: invalidateSelected,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => approveChangeControl(id, {
      username: authUser?.username ?? "",
      password: approvePassword,
      comments: approveComments,
    }),
    onSuccess: (cc) => {
      setShowApprovePanel(false);
      setApprovePassword(""); setApproveComments("");
      invalidateSelected(cc);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => rejectChangeControl(id, rejectReason),
    onSuccess: (cc) => {
      setShowRejectPanel(false);
      setRejectReason("");
      invalidateSelected(cc);
    },
  });

  const startImplMutation = useMutation({
    mutationFn: (id: string) => startChangeControlImplementation(id),
    onSuccess: invalidateSelected,
  });

  const effCheckMutation = useMutation({
    mutationFn: (id: string) => moveChangeControlToEffectivenessCheck(id),
    onSuccess: invalidateSelected,
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => closeChangeControl(id, {
      username: authUser?.username ?? "",
      password: closePassword,
      closureSummary,
    }),
    onSuccess: (cc) => {
      setShowClosePanel(false);
      setClosePassword(""); setClosureSummary("");
      invalidateSelected(cc);
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelChangeControl(id, cancelReason),
    onSuccess: (cc) => {
      setShowCancelPanel(false);
      setCancelReason("");
      invalidateSelected(cc);
    },
  });

  const addEntityMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof addChangeControlAffectedEntity>[1] }) =>
      addChangeControlAffectedEntity(id, payload),
    onSuccess: () => {
      if (selected) {
        setAeType("MATERIAL"); setAeRef(""); setAeNotes("");
        qc.invalidateQueries({ queryKey: ["change-controls"] });
        // re-fetch selected
        fetchChangeControls().then((d) => {
          const updated = d.content.find((c) => c.id === selected.id);
          if (updated) setSelected(updated);
        });
      }
    },
  });

  const removeEntityMutation = useMutation({
    mutationFn: ({ id, entityId }: { id: string; entityId: string }) =>
      removeChangeControlAffectedEntity(id, entityId),
    onSuccess: () => {
      if (selected) {
        fetchChangeControls().then((d) => {
          const updated = d.content.find((c) => c.id === selected.id);
          if (updated) setSelected(updated);
        });
        invalidate();
      }
    },
  });

  const addTaskMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof addChangeControlTask>[1] }) =>
      addChangeControlTask(id, payload),
    onSuccess: () => {
      if (selected) {
        setTaskTitle(""); setTaskAssignedTo(""); setTaskDueDate(""); setTaskDesc("");
        fetchChangeControls().then((d) => {
          const updated = d.content.find((c) => c.id === selected.id);
          if (updated) setSelected(updated);
        });
        invalidate();
      }
    },
  });

  const taskStatusMutation = useMutation({
    mutationFn: ({ id, taskId, status }: { id: string; taskId: string; status: ChangeControlTaskStatus }) =>
      updateChangeControlTaskStatus(id, taskId, status),
    onSuccess: () => {
      if (selected) {
        fetchChangeControls().then((d) => {
          const updated = d.content.find((c) => c.id === selected.id);
          if (updated) setSelected(updated);
        });
        invalidate();
      }
    },
  });

  const removeTaskMutation = useMutation({
    mutationFn: ({ id, taskId }: { id: string; taskId: string }) => removeChangeControlTask(id, taskId),
    onSuccess: () => {
      if (selected) {
        fetchChangeControls().then((d) => {
          const updated = d.content.find((c) => c.id === selected.id);
          if (updated) setSelected(updated);
        });
        invalidate();
      }
    },
  });

  const list = data?.content ?? [];
  const isTerminal = (s: ChangeControlStatus) => s === "CLOSED" || s === "CANCELLED";

  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      {/* LEFT: list */}
      <div className="flex w-80 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
          <span className="text-sm font-bold text-gray-800">Change Controls</span>
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            + New
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center text-xs text-gray-400">Loading…</div>
        ) : list.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 text-xs text-gray-400">
            <span>No change controls yet.</span>
            <button onClick={() => setShowCreate(true)} className="text-indigo-500 underline">Create one</button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            {list.map((cc) => (
              <button
                key={cc.id}
                onClick={() => { setSelected(cc); setShowCreate(false); }}
                className={`w-full border-b border-gray-100 px-4 py-3 text-left transition hover:bg-indigo-50 ${selected?.id === cc.id ? "bg-indigo-50" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-xs font-bold text-indigo-600">{cc.changeControlNumber}</div>
                    <div className="mt-0.5 truncate text-sm font-medium text-gray-800">{cc.title}</div>
                  </div>
                  <StatusPill status={cc.status} />
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${RISK_COLOR[cc.riskClassification]}`}>
                    {cc.riskClassification}
                  </span>
                  <span className="text-[10px] text-gray-400">{cc.changeType.replace(/_/g, " ")}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* RIGHT: detail or create */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
        {showCreate && (
          <div className="mx-auto max-w-2xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 text-base font-bold text-gray-800">New Change Control</div>
            <div className="space-y-3">
              <input placeholder="Title *" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={fieldClass()} />
              <select value={newType} onChange={(e) => setNewType(e.target.value as ChangeControlType)} className={fieldClass()}>
                {CC_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
              </select>
              <select value={newRisk} onChange={(e) => setNewRisk(e.target.value as ChangeControlRisk)} className={fieldClass()}>
                {CC_RISKS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
              <textarea placeholder="Reason for change *" value={newReason} onChange={(e) => setNewReason(e.target.value)} className={fieldClass("min-h-[60px]")} />
              <textarea placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} className={fieldClass("min-h-[60px]")} />
              <textarea placeholder="Impact Assessment" value={newImpact} onChange={(e) => setNewImpact(e.target.value)} className={fieldClass("min-h-[60px]")} />
              <textarea placeholder="Implementation Plan" value={newImplPlan} onChange={(e) => setNewImplPlan(e.target.value)} className={fieldClass("min-h-[60px]")} />
              <textarea placeholder="Effectiveness Check Criteria" value={newEffCheck} onChange={(e) => setNewEffCheck(e.target.value)} className={fieldClass("min-h-[60px]")} />
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 whitespace-nowrap">Target completion</label>
                <input type="date" value={newTargetDate} onChange={(e) => setNewTargetDate(e.target.value)} className={fieldClass()} />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                disabled={!newTitle || !newReason || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  title: newTitle, changeType: newType, reason: newReason,
                  riskClassification: newRisk,
                  description: newDescription || undefined,
                  impactAssessment: newImpact || undefined,
                  implementationPlan: newImplPlan || undefined,
                  effectivenessCheck: newEffCheck || undefined,
                  targetCompletionDate: newTargetDate || undefined,
                })}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {createMutation.isPending ? "Creating…" : "Create"}
              </button>
              <button onClick={() => setShowCreate(false)} className="rounded-lg border border-gray-200 px-4 py-2 text-xs text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
            </div>
            {createMutation.isError && (
              <div className="mt-2 text-xs text-red-500">Failed to create. Check all fields.</div>
            )}
          </div>
        )}

        {selected && !showCreate && (
          <div className="mx-auto max-w-2xl space-y-5">
            {/* Header */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="text-xs font-bold text-indigo-500">{selected.changeControlNumber}</div>
                  <div className="mt-0.5 text-lg font-bold text-gray-900">{selected.title}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <StatusPill status={selected.status} />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${RISK_COLOR[selected.riskClassification]}`}>
                      {selected.riskClassification} risk
                    </span>
                    <span className="text-xs text-gray-400">{selected.changeType.replace(/_/g, " ")}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-400 text-right">
                  <div>By {selected.createdBy}</div>
                  <div>{new Date(selected.createdAt).toLocaleDateString()}</div>
                  {selected.targetCompletionDate && (
                    <div className="mt-1">Target: {selected.targetCompletionDate}</div>
                  )}
                </div>
              </div>

              {selected.description && (
                <p className="mt-3 text-sm text-gray-600">{selected.description}</p>
              )}

              <div className="mt-3 text-sm">
                <span className="font-semibold text-gray-700">Reason: </span>
                <span className="text-gray-600">{selected.reason}</span>
              </div>

              {/* Action buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === "DRAFT" && (
                  <button
                    onClick={() => submitReviewMutation.mutate(selected.id)}
                    disabled={submitReviewMutation.isPending}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                  >
                    Submit for Review
                  </button>
                )}
                {selected.status === "UNDER_REVIEW" && canApprove && (
                  <>
                    <button onClick={() => { setShowApprovePanel(!showApprovePanel); setShowRejectPanel(false); }}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-700">
                      Approve
                    </button>
                    <button onClick={() => { setShowRejectPanel(!showRejectPanel); setShowApprovePanel(false); }}
                      className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">
                      Reject
                    </button>
                  </>
                )}
                {selected.status === "APPROVED" && (
                  <button onClick={() => startImplMutation.mutate(selected.id)} disabled={startImplMutation.isPending}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50">
                    Start Implementation
                  </button>
                )}
                {selected.status === "IN_IMPLEMENTATION" && (
                  <button onClick={() => effCheckMutation.mutate(selected.id)} disabled={effCheckMutation.isPending}
                    className="rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-700 disabled:opacity-50">
                    Move to Effectiveness Check
                  </button>
                )}
                {selected.status === "EFFECTIVENESS_CHECK" && canApprove && (
                  <button onClick={() => { setShowClosePanel(!showClosePanel); setShowCancelPanel(false); }}
                    className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-teal-700">
                    Close
                  </button>
                )}
                {!isTerminal(selected.status) && (
                  <button onClick={() => { setShowCancelPanel(!showCancelPanel); setShowClosePanel(false); setShowApprovePanel(false); setShowRejectPanel(false); }}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50">
                    Cancel
                  </button>
                )}
              </div>

              {/* Approve panel */}
              {showApprovePanel && (
                <div className="mt-3 rounded-xl border border-green-200 bg-green-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-green-700">Approve Change Control</div>
                  <textarea value={approveComments} onChange={(e) => setApproveComments(e.target.value)}
                    className={fieldClass("min-h-[60px]")} placeholder="Approval comments (optional)" />
                  <input type="password" value={approvePassword} onChange={(e) => setApprovePassword(e.target.value)}
                    className={fieldClass()} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                  <button disabled={!approvePassword || approveMutation.isPending}
                    onClick={() => approveMutation.mutate(selected.id)}
                    className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50">
                    {approveMutation.isPending ? "Approving…" : "Approve with E-sign"}
                  </button>
                  {approveMutation.isError && <div className="text-xs text-red-500">Approval failed. Check credentials.</div>}
                </div>
              )}

              {/* Reject panel */}
              {showRejectPanel && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-red-700">Reject Change Control</div>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)}
                    className={fieldClass("min-h-[60px]")} placeholder="Rejection reason *" />
                  <button disabled={!rejectReason || rejectMutation.isPending}
                    onClick={() => rejectMutation.mutate(selected.id)}
                    className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50">
                    {rejectMutation.isPending ? "Rejecting…" : "Reject"}
                  </button>
                </div>
              )}

              {/* Close panel */}
              {showClosePanel && (
                <div className="mt-3 rounded-xl border border-teal-200 bg-teal-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-teal-700">Close Change Control (E-Sign Required)</div>
                  <textarea value={closureSummary} onChange={(e) => setClosureSummary(e.target.value)}
                    className={fieldClass("min-h-[60px]")} placeholder="Closure summary *" />
                  <input type="password" value={closePassword} onChange={(e) => setClosePassword(e.target.value)}
                    className={fieldClass()} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                  <button disabled={!closureSummary || !closePassword || closeMutation.isPending}
                    onClick={() => closeMutation.mutate(selected.id)}
                    className="rounded-lg bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50">
                    {closeMutation.isPending ? "Closing…" : "Close with E-sign"}
                  </button>
                  {closeMutation.isError && <div className="text-xs text-red-500">Closure failed. Check all tasks are done and credentials are correct.</div>}
                </div>
              )}

              {/* Cancel panel */}
              {showCancelPanel && (
                <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-2">
                  <div className="text-xs font-bold text-gray-600">Cancel Change Control</div>
                  <input value={cancelReason} onChange={(e) => setCancelReason(e.target.value)}
                    className={fieldClass()} placeholder="Reason (optional)" />
                  <button onClick={() => cancelMutation.mutate(selected.id)} disabled={cancelMutation.isPending}
                    className="rounded-lg bg-gray-500 px-4 py-2 text-xs font-bold text-white hover:bg-gray-600 disabled:opacity-50">
                    {cancelMutation.isPending ? "Cancelling…" : "Confirm Cancel"}
                  </button>
                </div>
              )}
            </div>

            {/* Approval / rejection info */}
            {(selected.approvedBy || selected.rejectedBy) && (
              <div className={`rounded-xl border p-4 text-sm ${selected.approvedBy ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                {selected.approvedBy ? (
                  <>
                    <span className="font-semibold text-green-700">Approved</span> by {selected.approvedBy}
                    {selected.approvalComments && <p className="mt-1 text-gray-600">{selected.approvalComments}</p>}
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-red-700">Rejected</span> by {selected.rejectedBy}
                    {selected.rejectionReason && <p className="mt-1 text-gray-600">{selected.rejectionReason}</p>}
                  </>
                )}
              </div>
            )}

            {/* Implementation details */}
            {(selected.impactAssessment || selected.implementationPlan || selected.effectivenessCheck) && (
              <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3">
                {selected.impactAssessment && (
                  <div><div className="text-xs font-bold text-gray-400 mb-1">Impact Assessment</div><p className="text-sm text-gray-700">{selected.impactAssessment}</p></div>
                )}
                {selected.implementationPlan && (
                  <div><div className="text-xs font-bold text-gray-400 mb-1">Implementation Plan</div><p className="text-sm text-gray-700">{selected.implementationPlan}</p></div>
                )}
                {selected.effectivenessCheck && (
                  <div><div className="text-xs font-bold text-gray-400 mb-1">Effectiveness Check Criteria</div><p className="text-sm text-gray-700">{selected.effectivenessCheck}</p></div>
                )}
              </div>
            )}

            {/* Affected Entities */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeading>Affected Entities</SectionHeading>
              {selected.affectedEntities.length === 0 ? (
                <p className="text-xs text-gray-400">None added yet.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {selected.affectedEntities.map((ae) => (
                    <div key={ae.id} className="flex items-start justify-between rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                      <div>
                        <span className="text-xs font-semibold text-indigo-600">{ae.entityType.replace(/_/g, " ")}</span>
                        <span className="mx-1 text-gray-400">·</span>
                        <span className="text-xs text-gray-700">{ae.entityReference}</span>
                        {ae.notes && <div className="mt-0.5 text-[11px] text-gray-400">{ae.notes}</div>}
                      </div>
                      {!isTerminal(selected.status) && (
                        <button onClick={() => removeEntityMutation.mutate({ id: selected.id, entityId: ae.id })}
                          className="text-[11px] text-red-400 hover:text-red-600">remove</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isTerminal(selected.status) && (
                <div className="flex flex-wrap gap-2">
                  <select value={aeType} onChange={(e) => setAeType(e.target.value as AffectedEntityType)}
                    className={fieldClass("flex-1 min-w-[120px]")}>
                    {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
                  </select>
                  <input value={aeRef} onChange={(e) => setAeRef(e.target.value)}
                    placeholder="Reference (e.g. MAT-001)" className={fieldClass("flex-1 min-w-[140px]")} />
                  <input value={aeNotes} onChange={(e) => setAeNotes(e.target.value)}
                    placeholder="Notes (optional)" className={fieldClass("flex-1 min-w-[120px]")} />
                  <button disabled={!aeRef || addEntityMutation.isPending}
                    onClick={() => addEntityMutation.mutate({ id: selected.id, payload: { entityType: aeType, entityReference: aeRef, notes: aeNotes || undefined } })}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Implementation Tasks */}
            <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <SectionHeading>Implementation Tasks</SectionHeading>
              {selected.tasks.length === 0 ? (
                <p className="text-xs text-gray-400 mb-3">No tasks added yet.</p>
              ) : (
                <div className="space-y-2 mb-3">
                  {selected.tasks.map((task) => (
                    <div key={task.id} className={`flex items-start justify-between rounded-lg border px-3 py-2 ${
                      task.status === "COMPLETED" ? "border-green-100 bg-green-50" :
                      task.status === "SKIPPED" ? "border-gray-100 bg-gray-50 opacity-60" :
                      task.status === "IN_PROGRESS" ? "border-blue-100 bg-blue-50" : "border-gray-100 bg-white"
                    }`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-800">{task.title}</span>
                          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                            task.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                            task.status === "SKIPPED" ? "bg-gray-100 text-gray-500" :
                            task.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" : "bg-yellow-100 text-yellow-700"
                          }`}>{task.status.replace(/_/g, " ")}</span>
                        </div>
                        {task.assignedTo && <div className="text-[11px] text-gray-400">Assigned: {task.assignedTo}</div>}
                        {task.dueDate && <div className="text-[11px] text-gray-400">Due: {task.dueDate}</div>}
                        {task.completedBy && <div className="text-[11px] text-gray-400">Done by: {task.completedBy}</div>}
                      </div>
                      {!isTerminal(selected.status) && task.status !== "COMPLETED" && task.status !== "SKIPPED" && (
                        <div className="flex gap-1 ml-2">
                          {task.status === "PENDING" && (
                            <button onClick={() => taskStatusMutation.mutate({ id: selected.id, taskId: task.id, status: "IN_PROGRESS" })}
                              className="text-[11px] text-blue-500 hover:underline">start</button>
                          )}
                          <button onClick={() => taskStatusMutation.mutate({ id: selected.id, taskId: task.id, status: "COMPLETED" })}
                            className="text-[11px] text-green-600 hover:underline">complete</button>
                          <button onClick={() => taskStatusMutation.mutate({ id: selected.id, taskId: task.id, status: "SKIPPED" })}
                            className="text-[11px] text-gray-400 hover:underline">skip</button>
                          <button onClick={() => removeTaskMutation.mutate({ id: selected.id, taskId: task.id })}
                            className="text-[11px] text-red-400 hover:underline">del</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {!isTerminal(selected.status) && (
                <div className="flex flex-wrap gap-2">
                  <input value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="Task title *" className={fieldClass("flex-1 min-w-[180px]")} />
                  <input value={taskAssignedTo} onChange={(e) => setTaskAssignedTo(e.target.value)}
                    placeholder="Assign to" className={fieldClass("flex-1 min-w-[120px]")} />
                  <input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)}
                    className={fieldClass("flex-1 min-w-[120px]")} />
                  <button disabled={!taskTitle || addTaskMutation.isPending}
                    onClick={() => addTaskMutation.mutate({ id: selected.id, payload: {
                      title: taskTitle,
                      assignedTo: taskAssignedTo || undefined,
                      dueDate: taskDueDate || undefined,
                      description: taskDesc || undefined,
                    }})}
                    className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                    Add Task
                  </button>
                </div>
              )}
            </div>

            {/* Closure info */}
            {selected.closedBy && (
              <div className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">
                <span className="font-semibold text-teal-700">Closed</span> by {selected.closedBy}
                {selected.closureSummary && <p className="mt-1 text-gray-600">{selected.closureSummary}</p>}
              </div>
            )}
          </div>
        )}

        {!selected && !showCreate && (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Select a change control or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
