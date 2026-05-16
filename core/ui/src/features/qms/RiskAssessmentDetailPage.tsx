import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import {
  acceptRiskAssessment,
  addRiskItem,
  deleteRiskItem,
  fetchRiskAssessment,
  updateRiskItem
} from "../../lib/api";
import type {
  AcceptRiskAssessmentRequest,
  CreateRiskItemRequest,
  RiskAssessmentStatus,
  RiskControlType,
  RiskItem
} from "../../types/riskAssessment";
import { formatLabel } from "./deviationUi";
import { useAuthStore } from "../../stores/authStore";

type Tab = "overview" | "fmea";

const controlTypes: RiskControlType[] = [
  "ELIMINATE",
  "REDUCE_PROBABILITY",
  "REDUCE_SEVERITY",
  "INCREASE_DETECTABILITY",
  "ACCEPT"
];

const emptyItemForm: CreateRiskItemRequest = {
  processStep: "",
  failureMode: "",
  failureEffect: "",
  failureCause: "",
  currentControls: "",
  probability: 1,
  severity: 1,
  detectability: 1,
  riskControlType: undefined,
  proposedAction: "",
  actionOwner: "",
  actionDueDate: "",
  residualProbability: undefined,
  residualSeverity: undefined,
  residualDetectability: undefined
};

function rpnBadgeClass(rpn: number) {
  if (rpn >= 75) return "bg-red-100 text-red-700 font-bold";
  if (rpn >= 50) return "bg-orange-100 text-orange-700 font-semibold";
  if (rpn >= 25) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function statusBadge(status: RiskAssessmentStatus) {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-semibold";
  switch (status) {
    case "DRAFT":
      return `${base} bg-slate-100 text-slate-600`;
    case "UNDER_REVIEW":
      return `${base} bg-yellow-100 text-yellow-700`;
    case "ACCEPTED":
      return `${base} bg-green-100 text-green-700`;
    case "CLOSED":
      return `${base} bg-blue-100 text-blue-700`;
    default:
      return `${base} bg-slate-100 text-slate-600`;
  }
}

export function RiskAssessmentDetailPage() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const canEdit =
    authUser?.role === "QC_ANALYST" ||
    authUser?.role === "QC_MANAGER" ||
    authUser?.role === "SUPER_ADMIN";

  const [tab, setTab] = useState<Tab>("overview");
  const [isAcceptOpen, setIsAcceptOpen] = useState(false);
  const [acceptForm, setAcceptForm] = useState<AcceptRiskAssessmentRequest>({
    username: "",
    password: "",
    meaning: "",
    reason: "",
    residualRiskAcceptable: true,
    overallRiskConclusion: ""
  });
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [itemForm, setItemForm] = useState<CreateRiskItemRequest>(emptyItemForm);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const { data: ra, isLoading, error } = useQuery({
    queryKey: ["risk-assessment", assessmentId],
    queryFn: () => fetchRiskAssessment(assessmentId!),
    enabled: !!assessmentId
  });

  const acceptMutation = useMutation({
    mutationFn: (payload: AcceptRiskAssessmentRequest) =>
      acceptRiskAssessment(assessmentId!, payload),
    onSuccess: async () => {
      setIsAcceptOpen(false);
      setAcceptError(null);
      await queryClient.invalidateQueries({ queryKey: ["risk-assessment", assessmentId] });
      await queryClient.invalidateQueries({ queryKey: ["risk-assessments"] });
    },
    onError: (err) => setAcceptError(err instanceof Error ? err.message : "Failed to accept")
  });

  const addItemMutation = useMutation({
    mutationFn: (payload: CreateRiskItemRequest) => addRiskItem(assessmentId!, payload),
    onSuccess: async () => {
      setIsAddItemOpen(false);
      setItemForm(emptyItemForm);
      setItemFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["risk-assessment", assessmentId] });
    },
    onError: (err) => setItemFormError(err instanceof Error ? err.message : "Failed to add item")
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, payload }: { itemId: string; payload: CreateRiskItemRequest }) =>
      updateRiskItem(assessmentId!, itemId, payload),
    onSuccess: async () => {
      setEditingItemId(null);
      setItemForm(emptyItemForm);
      setItemFormError(null);
      await queryClient.invalidateQueries({ queryKey: ["risk-assessment", assessmentId] });
    },
    onError: (err) => setItemFormError(err instanceof Error ? err.message : "Failed to update item")
  });

  const deleteItemMutation = useMutation({
    mutationFn: (itemId: string) => deleteRiskItem(assessmentId!, itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["risk-assessment", assessmentId] });
    }
  });

  function handleAcceptSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptForm.username || !acceptForm.password) {
      setAcceptError("Username and password are required.");
      return;
    }
    acceptMutation.mutate(acceptForm);
  }

  function handleItemFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!itemForm.failureMode?.trim() || !itemForm.failureEffect?.trim() || !itemForm.failureCause?.trim()) {
      setItemFormError("Failure mode, effect, and cause are required.");
      return;
    }
    const payload: CreateRiskItemRequest = {
      processStep: itemForm.processStep?.trim() || undefined,
      failureMode: itemForm.failureMode.trim(),
      failureEffect: itemForm.failureEffect.trim(),
      failureCause: itemForm.failureCause.trim(),
      currentControls: itemForm.currentControls?.trim() || undefined,
      probability: itemForm.probability,
      severity: itemForm.severity,
      detectability: itemForm.detectability,
      riskControlType: itemForm.riskControlType || undefined,
      proposedAction: itemForm.proposedAction?.trim() || undefined,
      actionOwner: itemForm.actionOwner?.trim() || undefined,
      actionDueDate: itemForm.actionDueDate || undefined,
      residualProbability: itemForm.residualProbability || undefined,
      residualSeverity: itemForm.residualSeverity || undefined,
      residualDetectability: itemForm.residualDetectability || undefined
    };

    if (editingItemId) {
      updateItemMutation.mutate({ itemId: editingItemId, payload });
    } else {
      addItemMutation.mutate(payload);
    }
  }

  function startEdit(item: RiskItem) {
    setEditingItemId(item.id);
    setItemForm({
      processStep: item.processStep ?? "",
      failureMode: item.failureMode,
      failureEffect: item.failureEffect,
      failureCause: item.failureCause,
      currentControls: item.currentControls ?? "",
      probability: item.probability,
      severity: item.severity,
      detectability: item.detectability,
      riskControlType: item.riskControlType ?? undefined,
      proposedAction: item.proposedAction ?? "",
      actionOwner: item.actionOwner ?? "",
      actionDueDate: item.actionDueDate ?? "",
      residualProbability: item.residualProbability ?? undefined,
      residualSeverity: item.residualSeverity ?? undefined,
      residualDetectability: item.residualDetectability ?? undefined
    });
    setIsAddItemOpen(true);
    setItemFormError(null);
  }

  const liveRpn = itemForm.probability * itemForm.severity * itemForm.detectability;

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-slate-400">Loading risk assessment...</div>
    );
  }

  if (error || !ra) {
    return (
      <div className="p-6 text-sm text-red-500">
        {error instanceof Error ? error.message : "Risk assessment not found."}
      </div>
    );
  }

  const items = ra.items ?? [];
  const canBeAccepted = ra.status === "UNDER_REVIEW";
  const isLocked = ra.status === "ACCEPTED" || ra.status === "CLOSED";

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/qms/risk-register")}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold text-purple-700">{ra.assessmentNumber}</span>
              <span className={statusBadge(ra.status)}>{formatLabel(ra.status)}</span>
            </div>
            <h1 className="mt-0.5 text-xl font-bold text-slate-800">{ra.title}</h1>
          </div>
        </div>
        {canEdit && canBeAccepted ? (
          <button
            type="button"
            onClick={() => setIsAcceptOpen(true)}
            className="rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-green-700"
          >
            Accept Risk Assessment
          </button>
        ) : null}
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {(["overview", "fmea"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-xs font-semibold transition ${
              tab === t
                ? "border-b-2 border-purple-600 text-purple-700"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t === "overview" ? "Overview" : `Risk Items (FMEA) · ${items.length}`}
          </button>
        ))}
      </div>

      {tab === "overview" ? (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-3">
            <MetaRow label="Scope" value={formatLabel(ra.scope)} />
            <MetaRow label="Methodology" value={ra.methodology ?? "FMEA"} />
            <MetaRow label="Prepared By" value={ra.preparedBy} />
            <MetaRow label="Reviewed By" value={ra.reviewedBy ?? "—"} />
            <MetaRow
              label="Next Review Date"
              value={ra.nextReviewDate ?? "—"}
            />
            <MetaRow
              label="Residual Risk Acceptable"
              value={
                ra.residualRiskAcceptable === null || ra.residualRiskAcceptable === undefined
                  ? "—"
                  : ra.residualRiskAcceptable
                  ? "Yes"
                  : "No"
              }
            />
            {ra.acceptedBy ? (
              <>
                <MetaRow label="Accepted By" value={ra.acceptedBy} />
                <MetaRow
                  label="Accepted At"
                  value={ra.acceptedAt ? ra.acceptedAt.slice(0, 10) : "—"}
                />
              </>
            ) : null}
            {ra.scopeEntityDisplay ? (
              <MetaRow label="Scope Entity" value={ra.scopeEntityDisplay} />
            ) : null}
          </div>

          {ra.overallRiskConclusion ? (
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-2 text-xs font-semibold text-slate-600">Overall Risk Conclusion</h3>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ra.overallRiskConclusion}</p>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">High RPN Items (≥50)</div>
              <div className="mt-1 text-2xl font-bold text-red-600">{ra.highRpnItemsCount}</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="text-xs text-slate-500">Critical Items (S=5)</div>
              <div className="mt-1 text-2xl font-bold text-red-800">{ra.criticalItemsCount}</div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === "fmea" ? (
        <div className="space-y-6">
          <RiskMatrix items={items} />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Risk Items</h3>
            {canEdit && !isLocked ? (
              <button
                type="button"
                onClick={() => {
                  setEditingItemId(null);
                  setItemForm(emptyItemForm);
                  setItemFormError(null);
                  setIsAddItemOpen(true);
                }}
                className="rounded-xl bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-purple-700"
              >
                + Add Risk Item
              </button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">#</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Process Step</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Failure Mode</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Effect</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Cause</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">P</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">S</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">D</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">RPN</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Control Type</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Action</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Owner</th>
                  <th className="px-3 py-3 text-left font-semibold text-slate-600">Due</th>
                  <th className="px-3 py-3 text-center font-semibold text-slate-600">Residual RPN</th>
                  {canEdit && !isLocked ? (
                    <th className="px-3 py-3 text-left font-semibold text-slate-600">Actions</th>
                  ) : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td className="px-3 py-8 text-center text-slate-400" colSpan={canEdit && !isLocked ? 15 : 14}>
                      No risk items yet. Add your first FMEA item.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-slate-500">{item.sequenceNumber}</td>
                      <td className="px-3 py-2 text-slate-500">{item.processStep ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-800 font-medium max-w-[180px]">{item.failureMode}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px]">{item.failureEffect}</td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px]">{item.failureCause}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.probability}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.severity}</td>
                      <td className="px-3 py-2 text-center font-mono">{item.detectability}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${rpnBadgeClass(item.rpn)}`}>
                          {item.rpn}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500">
                        {item.riskControlType ? formatLabel(item.riskControlType) : "—"}
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[140px]">{item.proposedAction ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-500">{item.actionOwner ?? "—"}</td>
                      <td className="px-3 py-2 text-slate-400">{item.actionDueDate ?? "—"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] ${rpnBadgeClass(item.residualRpn)}`}>
                          {item.residualRpn}
                        </span>
                      </td>
                      {canEdit && !isLocked ? (
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => startEdit(item)}
                              className="font-semibold text-purple-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteItemMutation.mutate(item.id)}
                              className="font-semibold text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {isAddItemOpen ? (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">
                  {editingItemId ? "Edit Risk Item" : "Add Risk Item"}
                </h4>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddItemOpen(false);
                    setEditingItemId(null);
                    setItemFormError(null);
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  Cancel
                </button>
              </div>
              <form onSubmit={handleItemFormSubmit} className="space-y-4">
                <Field label="Process step">
                  <input
                    value={itemForm.processStep ?? ""}
                    onChange={(e) => setItemForm({ ...itemForm, processStep: e.target.value })}
                    className={fieldClass()}
                    placeholder="e.g. Granulation, Filling"
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Failure mode *">
                    <textarea
                      value={itemForm.failureMode}
                      onChange={(e) => setItemForm({ ...itemForm, failureMode: e.target.value })}
                      className={fieldClass("min-h-16")}
                    />
                  </Field>
                  <Field label="Failure effect *">
                    <textarea
                      value={itemForm.failureEffect}
                      onChange={(e) => setItemForm({ ...itemForm, failureEffect: e.target.value })}
                      className={fieldClass("min-h-16")}
                    />
                  </Field>
                  <Field label="Failure cause *">
                    <textarea
                      value={itemForm.failureCause}
                      onChange={(e) => setItemForm({ ...itemForm, failureCause: e.target.value })}
                      className={fieldClass("min-h-16")}
                    />
                  </Field>
                </div>
                <Field label="Current controls">
                  <input
                    value={itemForm.currentControls ?? ""}
                    onChange={(e) => setItemForm({ ...itemForm, currentControls: e.target.value })}
                    className={fieldClass()}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Probability (1–5) *">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={itemForm.probability}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, probability: Math.min(5, Math.max(1, Number(e.target.value))) })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                  <Field label="Severity (1–5) *">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={itemForm.severity}
                      onChange={(e) =>
                        setItemForm({ ...itemForm, severity: Math.min(5, Math.max(1, Number(e.target.value))) })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                  <Field label="Detectability (1–5) *">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={itemForm.detectability}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          detectability: Math.min(5, Math.max(1, Number(e.target.value)))
                        })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                </div>
                <div className="rounded-lg bg-white border border-slate-200 px-4 py-3">
                  <span className="text-xs text-slate-500">Live RPN: </span>
                  <span className={`ml-1 rounded-full px-2 py-0.5 text-sm font-bold ${rpnBadgeClass(liveRpn)}`}>
                    {liveRpn}
                  </span>
                  <span className="ml-2 text-xs text-slate-400">
                    = {itemForm.probability} × {itemForm.severity} × {itemForm.detectability}
                  </span>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Risk control type">
                    <select
                      value={itemForm.riskControlType ?? ""}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          riskControlType: (e.target.value as RiskControlType) || undefined
                        })
                      }
                      className={fieldClass()}
                    >
                      <option value="">— None —</option>
                      {controlTypes.map((ct) => (
                        <option key={ct} value={ct}>
                          {formatLabel(ct)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Action owner">
                    <input
                      value={itemForm.actionOwner ?? ""}
                      onChange={(e) => setItemForm({ ...itemForm, actionOwner: e.target.value })}
                      className={fieldClass()}
                    />
                  </Field>
                  <Field label="Action due date">
                    <input
                      type="date"
                      value={itemForm.actionDueDate ?? ""}
                      onChange={(e) => setItemForm({ ...itemForm, actionDueDate: e.target.value })}
                      className={fieldClass()}
                    />
                  </Field>
                </div>
                <Field label="Proposed action">
                  <textarea
                    value={itemForm.proposedAction ?? ""}
                    onChange={(e) => setItemForm({ ...itemForm, proposedAction: e.target.value })}
                    className={fieldClass("min-h-16")}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Residual probability">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="—"
                      value={itemForm.residualProbability ?? ""}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          residualProbability: e.target.value ? Math.min(5, Math.max(1, Number(e.target.value))) : undefined
                        })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                  <Field label="Residual severity">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="—"
                      value={itemForm.residualSeverity ?? ""}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          residualSeverity: e.target.value ? Math.min(5, Math.max(1, Number(e.target.value))) : undefined
                        })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                  <Field label="Residual detectability">
                    <input
                      type="number"
                      min={1}
                      max={5}
                      placeholder="—"
                      value={itemForm.residualDetectability ?? ""}
                      onChange={(e) =>
                        setItemForm({
                          ...itemForm,
                          residualDetectability: e.target.value
                            ? Math.min(5, Math.max(1, Number(e.target.value)))
                            : undefined
                        })
                      }
                      className={fieldClass()}
                    />
                  </Field>
                </div>
                {itemFormError ? (
                  <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                    {itemFormError}
                  </div>
                ) : null}
                <button
                  type="submit"
                  disabled={addItemMutation.isPending || updateItemMutation.isPending}
                  className="rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {addItemMutation.isPending || updateItemMutation.isPending
                    ? "Saving..."
                    : editingItemId
                    ? "Update Item"
                    : "Add Item"}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      {isAcceptOpen ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Accept Risk Assessment</h2>
                <p className="text-sm text-slate-500">E-signature required to accept residual risk.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAcceptOpen(false);
                  setAcceptError(null);
                }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleAcceptSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Username *">
                  <input
                    value={acceptForm.username}
                    onChange={(e) => setAcceptForm({ ...acceptForm, username: e.target.value })}
                    className={fieldClass()}
                    autoComplete="username"
                  />
                </Field>
                <Field label="Password *">
                  <input
                    type="password"
                    value={acceptForm.password}
                    onChange={(e) => setAcceptForm({ ...acceptForm, password: e.target.value })}
                    className={fieldClass()}
                    autoComplete="current-password"
                  />
                </Field>
              </div>
              <Field label="Meaning">
                <input
                  value={acceptForm.meaning ?? ""}
                  onChange={(e) => setAcceptForm({ ...acceptForm, meaning: e.target.value })}
                  className={fieldClass()}
                  placeholder="I accept the risk assessment and approve residual risk"
                />
              </Field>
              <Field label="Reason / Justification">
                <textarea
                  value={acceptForm.reason ?? ""}
                  onChange={(e) => setAcceptForm({ ...acceptForm, reason: e.target.value })}
                  className={fieldClass("min-h-20")}
                />
              </Field>
              <Field label="Overall risk conclusion">
                <textarea
                  value={acceptForm.overallRiskConclusion ?? ""}
                  onChange={(e) => setAcceptForm({ ...acceptForm, overallRiskConclusion: e.target.value })}
                  className={fieldClass("min-h-20")}
                />
              </Field>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptForm.residualRiskAcceptable ?? false}
                  onChange={(e) => setAcceptForm({ ...acceptForm, residualRiskAcceptable: e.target.checked })}
                  className="h-4 w-4 rounded"
                />
                Residual risk is acceptable
              </label>
              {acceptError ? (
                <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                  {acceptError}
                </div>
              ) : null}
              <button
                type="submit"
                disabled={acceptMutation.isPending}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-xs font-semibold text-white disabled:opacity-60"
              >
                {acceptMutation.isPending ? "Accepting..." : "Accept Risk Assessment"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function RiskMatrix({ items }: { items: RiskItem[] }) {
  const cellCounts: Record<string, number> = {};
  for (const item of items) {
    const key = `${item.probability}-${item.severity}`;
    cellCounts[key] = (cellCounts[key] ?? 0) + 1;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-xs font-semibold text-slate-600">Risk Matrix (Probability × Severity)</h3>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-20 px-2 py-1 text-left text-slate-500">S ↓ / P →</th>
              {[1, 2, 3, 4, 5].map((p) => (
                <th key={p} className="w-14 px-2 py-1 text-center font-semibold text-slate-600">
                  P={p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[5, 4, 3, 2, 1].map((s) => (
              <tr key={s}>
                <td className="px-2 py-1 font-semibold text-slate-600">S={s}</td>
                {[1, 2, 3, 4, 5].map((p) => {
                  const ps = p * s;
                  const count = cellCounts[`${p}-${s}`] ?? 0;
                  return (
                    <td
                      key={p}
                      className={`w-14 border border-slate-200 px-2 py-2 text-center font-semibold ${matrixCellClass(ps)}`}
                    >
                      {count > 0 ? count : <span className="text-slate-300">{ps}</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex gap-4 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-red-200" /> P×S ≥ 20
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-orange-200" /> 10–19
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-yellow-100" /> 5–9
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-green-100" /> &lt;5
        </span>
      </div>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-sm text-slate-700">{value}</div>
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

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-purple-400 ${extra}`;
}

function matrixCellClass(ps: number) {
  if (ps >= 20) return "bg-red-200 text-red-800";
  if (ps >= 10) return "bg-orange-200 text-orange-800";
  if (ps >= 5) return "bg-yellow-100 text-yellow-800";
  return "bg-green-100 text-green-700";
}
