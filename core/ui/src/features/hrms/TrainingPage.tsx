import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  completeTrainingAssignment,
  createRoleQualificationRequirement,
  createTrainingAssignment,
  fetchDocuments,
  fetchEmployees,
  fetchManagedUsers,
  fetchMyTrainingAssignments,
  fetchRoleQualificationRequirements,
  fetchTrainingAssignments
} from "../../lib/api";
import type { TrainingAssignment, TrainingAssignmentStatus, TrainingType } from "../../types/training";

const TRAINING_TYPES: TrainingType[] = ["SOP", "GMP", "DATA_INTEGRITY", "EHS", "ROLE_QUALIFICATION", "OTHER"];
const STATUSES: Array<TrainingAssignmentStatus | "ALL"> = ["ALL", "ASSIGNED", "OVERDUE", "COMPLETED"];

const emptyAssignment = {
  employeeId: "",
  assignedUsername: "",
  trainingTitle: "",
  trainingType: "SOP" as TrainingType,
  documentId: "",
  revisionId: "",
  requiredRole: "",
  dueDate: ""
};

const emptyRequirement = {
  roleName: "",
  trainingTitle: "",
  trainingType: "SOP" as TrainingType,
  documentId: "",
  revisionId: "",
  recurrenceMonths: 12,
  isMandatory: true
};

export function TrainingPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<TrainingAssignmentStatus | "ALL">("ALL");
  const [assignmentForm, setAssignmentForm] = useState(emptyAssignment);
  const [requirementForm, setRequirementForm] = useState(emptyRequirement);
  const [completionComments, setCompletionComments] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: assignments = [], isLoading } = useQuery({ queryKey: ["training-assignments"], queryFn: () => fetchTrainingAssignments() });
  const { data: myAssignments = [] } = useQuery({ queryKey: ["my-training-assignments"], queryFn: fetchMyTrainingAssignments });
  const { data: requirements = [] } = useQuery({ queryKey: ["role-qualification-requirements"], queryFn: fetchRoleQualificationRequirements });
  const { data: employees = [] } = useQuery({ queryKey: ["employees", true], queryFn: () => fetchEmployees(true) });
  const { data: users = [] } = useQuery({ queryKey: ["managed-users"], queryFn: fetchManagedUsers });
  const { data: documentPage } = useQuery({ queryKey: ["documents", "EFFECTIVE"], queryFn: () => fetchDocuments({ status: "EFFECTIVE", size: 200 }) });
  const documents = documentPage?.content ?? [];

  const filteredAssignments = useMemo(
    () => statusFilter === "ALL" ? assignments : assignments.filter((assignment) => assignment.status === statusFilter),
    [assignments, statusFilter]
  );

  const selectedDocument = documents.find((document) => document.id === assignmentForm.documentId);
  const selectedRequirementDocument = documents.find((document) => document.id === requirementForm.documentId);
  const openCount = assignments.filter((assignment) => assignment.status !== "COMPLETED" && assignment.status !== "CANCELLED").length;
  const overdueCount = assignments.filter((assignment) => assignment.status === "OVERDUE").length;

  const invalidateTraining = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["training-assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["my-training-assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["role-qualification-requirements"] }),
      queryClient.invalidateQueries({ queryKey: ["employees"] })
    ]);
  };

  const assignMutation = useMutation({
    mutationFn: () => createTrainingAssignment({
      employeeId: assignmentForm.employeeId,
      assignedUsername: assignmentForm.assignedUsername.trim(),
      trainingTitle: assignmentForm.trainingTitle.trim(),
      trainingType: assignmentForm.trainingType,
      documentId: assignmentForm.documentId || undefined,
      revisionId: assignmentForm.revisionId || undefined,
      requiredRole: assignmentForm.requiredRole.trim() || undefined,
      dueDate: assignmentForm.dueDate || undefined
    }),
    onSuccess: async () => {
      toast.success("Training assigned.");
      setError(null);
      setAssignmentForm(emptyAssignment);
      await invalidateTraining();
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Failed to assign training.")
  });

  const completeMutation = useMutation({
    mutationFn: (assignment: TrainingAssignment) => completeTrainingAssignment(assignment.id, { comments: completionComments.trim() || undefined }),
    onSuccess: async () => {
      toast.success("Training completed.");
      setCompletionComments("");
      setError(null);
      await invalidateTraining();
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Failed to complete training.")
  });

  const requirementMutation = useMutation({
    mutationFn: () => createRoleQualificationRequirement({
      roleName: requirementForm.roleName.trim(),
      trainingTitle: requirementForm.trainingTitle.trim(),
      trainingType: requirementForm.trainingType,
      documentId: requirementForm.documentId || undefined,
      revisionId: requirementForm.revisionId || undefined,
      recurrenceMonths: requirementForm.recurrenceMonths || undefined,
      isMandatory: requirementForm.isMandatory
    }),
    onSuccess: async () => {
      toast.success("Role requirement added.");
      setRequirementForm(emptyRequirement);
      setError(null);
      await invalidateTraining();
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Failed to create requirement.")
  });

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">Enterprise / <span className="font-medium text-rose-700">Training</span></p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Training Assignment</h1>
          <p className="mt-0.5 text-sm text-slate-500">Assign SOP, GMP, data integrity, and role qualification training before enforcing gates.</p>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</div> : null}

      <section className="grid gap-4 md:grid-cols-4">
        <Kpi label="Assignments" value={assignments.length} />
        <Kpi label="Open" value={openCount} />
        <Kpi label="Overdue" value={overdueCount} tone="red" />
        <Kpi label="Role Requirements" value={requirements.length} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.9fr)]">
        <div className="space-y-5">
          <Panel title="Admin Assignment View">
            <div className="mb-3 flex flex-wrap gap-2">
              {STATUSES.map((status) => (
                <button key={status} type="button" onClick={() => setStatusFilter(status)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${statusFilter === status ? "bg-rose-600 text-white" : "bg-rose-50 text-rose-700"}`}>
                  {formatLabel(status)}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-rose-50 bg-rose-50/60 text-left text-[11px] font-semibold uppercase text-slate-500">
                    <th className="px-3 py-2">Training</th>
                    <th className="px-3 py-2">Employee</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? <tr><td colSpan={4} className="px-3 py-6 text-slate-500">Loading training assignments...</td></tr> : null}
                  {filteredAssignments.map((assignment) => <AssignmentRow key={assignment.id} assignment={assignment} />)}
                  {!isLoading && filteredAssignments.length === 0 ? <tr><td colSpan={4} className="px-3 py-6 text-slate-500">No training assignments found.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </Panel>

          <Panel title="Role Qualification Requirements">
            <div className="space-y-2">
              {requirements.map((requirement) => (
                <div key={requirement.id} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-800">{requirement.roleName}</div>
                      <div className="mt-0.5 text-xs text-slate-500">{requirement.trainingTitle} · {formatLabel(requirement.trainingType)}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">{requirement.recurrenceMonths ? `${requirement.recurrenceMonths} months` : "One time"}</div>
                  </div>
                </div>
              ))}
              {requirements.length === 0 ? <div className="text-sm text-slate-500">No role requirements yet.</div> : null}
            </div>
          </Panel>
        </div>

        <aside className="space-y-5">
          <Panel title="Assign Training">
            <div className="space-y-3">
              <select value={assignmentForm.employeeId} onChange={(event) => setAssignmentForm((current) => ({ ...current, employeeId: event.target.value }))} className={fieldClass()}>
                <option value="">Select employee</option>
                {employees.filter((employee) => employee.isActive).map((employee) => <option key={employee.id} value={employee.id}>{employee.employeeCode} - {employee.fullName}</option>)}
              </select>
              <input value={assignmentForm.assignedUsername} onChange={(event) => setAssignmentForm((current) => ({ ...current, assignedUsername: event.target.value }))} className={fieldClass()} placeholder="Assigned login username" list="training-usernames" />
              <datalist id="training-usernames">{users.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.username} />)}</datalist>
              <input value={assignmentForm.trainingTitle} onChange={(event) => setAssignmentForm((current) => ({ ...current, trainingTitle: event.target.value }))} className={fieldClass()} placeholder="GMP Awareness and Data Integrity" />
              <div className="grid gap-3 md:grid-cols-2">
                <select value={assignmentForm.trainingType} onChange={(event) => setAssignmentForm((current) => ({ ...current, trainingType: event.target.value as TrainingType }))} className={fieldClass()}>
                  {TRAINING_TYPES.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
                </select>
                <input type="date" value={assignmentForm.dueDate} onChange={(event) => setAssignmentForm((current) => ({ ...current, dueDate: event.target.value }))} className={fieldClass()} />
              </div>
              <select value={assignmentForm.documentId} onChange={(event) => {
                const document = documents.find((item) => item.id === event.target.value);
                setAssignmentForm((current) => ({ ...current, documentId: event.target.value, revisionId: document?.currentRevisionId ?? "" }));
              }} className={fieldClass()}>
                <option value="">No controlled document linked</option>
                {documents.map((document) => <option key={document.id} value={document.id}>{document.documentNumber} - {document.title}</option>)}
              </select>
              {selectedDocument ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-slate-600">Revision: {selectedDocument.currentRevision?.revision ?? "-"}</div> : null}
              <input value={assignmentForm.requiredRole} onChange={(event) => setAssignmentForm((current) => ({ ...current, requiredRole: event.target.value }))} className={fieldClass()} placeholder="Required role, e.g. QC_ANALYST" />
              <button type="button" onClick={() => assignMutation.mutate()} disabled={assignMutation.isPending || !assignmentForm.employeeId || !assignmentForm.assignedUsername.trim() || !assignmentForm.trainingTitle.trim()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Assign Training
              </button>
            </div>
          </Panel>

          <Panel title="My Training Queue">
            <div className="space-y-3">
              {myAssignments.slice(0, 5).map((assignment) => {
                const canComplete = assignment.status !== "COMPLETED" && assignment.status !== "CANCELLED";
                return (
                  <div key={assignment.id} className="rounded-xl border border-rose-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-bold text-slate-800">{assignment.trainingTitle}</div>
                        <div className="mt-0.5 text-xs text-slate-500">{assignment.documentNumber ?? formatLabel(assignment.trainingType)} · Due {assignment.dueDate ?? "-"}</div>
                      </div>
                      <StatusPill status={assignment.status} />
                    </div>
                    {canComplete ? (
                      <div className="mt-3 space-y-2">
                        <textarea value={completionComments} onChange={(event) => setCompletionComments(event.target.value)} className={fieldClass("min-h-16")} placeholder="Completion comments" />
                        <button type="button" onClick={() => completeMutation.mutate(assignment)} disabled={completeMutation.isPending} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                          Complete Training
                        </button>
                      </div>
                    ) : <div className="mt-2 text-xs text-slate-500">Completed {assignment.completedAt ? formatDateTime(assignment.completedAt) : ""}</div>}
                  </div>
                );
              })}
              {myAssignments.length === 0 ? <div className="text-sm text-slate-500">No training assigned to you.</div> : null}
            </div>
          </Panel>

          <Panel title="Add Role Requirement">
            <div className="space-y-3">
              <input value={requirementForm.roleName} onChange={(event) => setRequirementForm((current) => ({ ...current, roleName: event.target.value }))} className={fieldClass()} placeholder="QC_ANALYST" />
              <input value={requirementForm.trainingTitle} onChange={(event) => setRequirementForm((current) => ({ ...current, trainingTitle: event.target.value }))} className={fieldClass()} placeholder="Sampling Technique SOP" />
              <div className="grid gap-3 md:grid-cols-2">
                <select value={requirementForm.trainingType} onChange={(event) => setRequirementForm((current) => ({ ...current, trainingType: event.target.value as TrainingType }))} className={fieldClass()}>
                  {TRAINING_TYPES.map((type) => <option key={type} value={type}>{formatLabel(type)}</option>)}
                </select>
                <input type="number" min={1} value={requirementForm.recurrenceMonths} onChange={(event) => setRequirementForm((current) => ({ ...current, recurrenceMonths: Number(event.target.value) }))} className={fieldClass()} />
              </div>
              <select value={requirementForm.documentId} onChange={(event) => {
                const document = documents.find((item) => item.id === event.target.value);
                setRequirementForm((current) => ({ ...current, documentId: event.target.value, revisionId: document?.currentRevisionId ?? "" }));
              }} className={fieldClass()}>
                <option value="">No controlled document linked</option>
                {documents.map((document) => <option key={document.id} value={document.id}>{document.documentNumber} - {document.title}</option>)}
              </select>
              {selectedRequirementDocument ? <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-slate-600">Revision: {selectedRequirementDocument.currentRevision?.revision ?? "-"}</div> : null}
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
                <input type="checkbox" checked={requirementForm.isMandatory} onChange={(event) => setRequirementForm((current) => ({ ...current, isMandatory: event.target.checked }))} />
                Mandatory requirement
              </label>
              <button type="button" onClick={() => requirementMutation.mutate()} disabled={requirementMutation.isPending || !requirementForm.roleName.trim() || !requirementForm.trainingTitle.trim()} className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                Add Requirement
              </button>
            </div>
          </Panel>
        </aside>
      </section>
    </div>
  );
}

function AssignmentRow({ assignment }: { assignment: TrainingAssignment }) {
  return (
    <tr className="border-b border-rose-50">
      <td className="px-3 py-3">
        <div className="font-semibold text-slate-800">{assignment.trainingTitle}</div>
        <div className="text-xs text-slate-500">{formatLabel(assignment.trainingType)}{assignment.documentNumber ? ` · ${assignment.documentNumber} ${assignment.documentRevision ?? ""}` : ""}</div>
      </td>
      <td className="px-3 py-3 text-slate-600">
        <div>{assignment.employeeName ?? assignment.assignedUsername}</div>
        <div className="text-xs text-slate-400">{assignment.employeeDepartment ?? "-"} · {assignment.employeeJobTitle ?? "-"}</div>
      </td>
      <td className="px-3 py-3 text-slate-600">{assignment.dueDate ?? "-"}</td>
      <td className="px-3 py-3"><StatusPill status={assignment.status} /></td>
    </tr>
  );
}

function Kpi({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "red" }) {
  return (
    <article className="rounded-xl border border-rose-100 bg-white p-4 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${tone === "red" ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </article>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-rose-100 bg-white p-4 shadow-sm"><h2 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h2>{children}</section>;
}

function StatusPill({ status }: { status: TrainingAssignmentStatus }) {
  const className = status === "COMPLETED" ? "bg-green-100 text-green-700" : status === "OVERDUE" ? "bg-red-100 text-red-700" : status === "CANCELLED" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700";
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>{formatLabel(status)}</span>;
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-rose-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-rose-300 ${extra}`;
}

function formatLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
