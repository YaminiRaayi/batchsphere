import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  acknowledgeDocumentDistribution,
  approveDocumentRevision,
  createDocument,
  createDocumentRevision,
  distributeDocumentRevision,
  fetchAuditEvents,
  fetchDocumentDistributions,
  fetchDocuments,
  fetchManagedUsers,
  fetchMyDocumentAcknowledgements,
  submitDocumentRevision
} from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type {
  ControlledDocument,
  ControlledDocumentStatus,
  ControlledDocumentType,
  DocumentApproval,
  DocumentDistribution,
  DocumentRevision
} from "../../types/document-control";

const documentTypes: Array<ControlledDocumentType | "ALL"> = ["ALL", "SPECIFICATION", "MOA", "SOP", "POLICY", "VALIDATION_REPORT"];
const documentStatuses: Array<ControlledDocumentStatus | "ALL"> = ["ALL", "DRAFT", "IN_REVIEW", "EFFECTIVE", "SUPERSEDED", "OBSOLETE"];

const initialDocumentForm = {
  documentNumber: "",
  title: "",
  documentType: "SOP" as ControlledDocumentType,
  category: "",
  department: "Quality Assurance",
  linkedMaterialCode: "",
  linkedMoaCode: "",
  reviewCycleMonths: 24,
  changeSummary: ""
};

const initialRevisionForm = {
  revision: "",
  changeSummary: "",
  file: null as File | null
};

const initialDistributionForm = {
  assignedUsernames: "",
  dueDate: ""
};

export function DocumentsPage() {
  const queryClient = useQueryClient();
  const authUser = useAuthStore((state) => state.user);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ControlledDocumentType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<ControlledDocumentStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [documentForm, setDocumentForm] = useState(initialDocumentForm);
  const [revisionForm, setRevisionForm] = useState(initialRevisionForm);
  const [signaturePassword, setSignaturePassword] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  const [distributionForm, setDistributionForm] = useState(initialDistributionForm);
  const [acknowledgementPassword, setAcknowledgementPassword] = useState("");
  const [acknowledgementComments, setAcknowledgementComments] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["documents", typeFilter, statusFilter, search],
    queryFn: () => fetchDocuments({ type: typeFilter, status: statusFilter, search })
  });
  const documents = data?.content ?? [];
  const selected = useMemo(
    () => documents.find((document) => document.id === selectedId) ?? documents[0] ?? null,
    [documents, selectedId]
  );
  const currentRevision = selected?.currentRevision ?? selected?.revisions[0] ?? null;
  const pendingApproval = currentRevision?.approvals.find((approval) => approval.status === "PENDING") ?? null;

  const { data: auditEvents = [] } = useQuery({
    queryKey: ["audit-events", "CONTROLLED_DOCUMENT", selected?.id],
    queryFn: () => fetchAuditEvents("CONTROLLED_DOCUMENT", selected?.id as string),
    enabled: Boolean(selected?.id)
  });

  const { data: distributions = [] } = useQuery({
    queryKey: ["document-distributions", selected?.id],
    queryFn: () => fetchDocumentDistributions(selected?.id as string),
    enabled: Boolean(selected?.id)
  });

  const { data: myAcknowledgements = [] } = useQuery({
    queryKey: ["my-document-acknowledgements"],
    queryFn: fetchMyDocumentAcknowledgements
  });

  const { data: managedUsers = [] } = useQuery({
    queryKey: ["managed-users"],
    queryFn: fetchManagedUsers
  });

  const invalidateDocuments = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["documents"] }),
      selected?.id ? queryClient.invalidateQueries({ queryKey: ["audit-events", "CONTROLLED_DOCUMENT", selected.id] }) : Promise.resolve()
      ,
      selected?.id ? queryClient.invalidateQueries({ queryKey: ["document-distributions", selected.id] }) : Promise.resolve(),
      queryClient.invalidateQueries({ queryKey: ["my-document-acknowledgements"] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: () => createDocument({
      ...documentForm,
      documentNumber: documentForm.documentNumber.trim(),
      title: documentForm.title.trim(),
      category: documentForm.category.trim() || undefined,
      department: documentForm.department.trim(),
      linkedMaterialCode: documentForm.linkedMaterialCode.trim() || undefined,
      linkedMoaCode: documentForm.linkedMoaCode.trim() || undefined,
      changeSummary: documentForm.changeSummary.trim()
    }),
    onSuccess: async (created) => {
      setActionError(null);
      setSelectedId(created.id);
      setShowCreate(false);
      setDocumentForm(initialDocumentForm);
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to create document")
  });

  const revisionMutation = useMutation({
    mutationFn: () => createDocumentRevision(selected?.id ?? "", revisionForm),
    onSuccess: async () => {
      setActionError(null);
      setRevisionForm(initialRevisionForm);
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to create revision")
  });

  const submitMutation = useMutation({
    mutationFn: (revision: DocumentRevision) => submitDocumentRevision(selected?.id ?? "", revision.id),
    onSuccess: async () => {
      setActionError(null);
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to submit revision")
  });

  const approvalMutation = useMutation({
    mutationFn: (revision: DocumentRevision) => approveDocumentRevision(selected?.id ?? "", revision.id, {
      username: authUser?.username ?? "",
      password: signaturePassword,
      comments: approvalComments.trim() || undefined,
      meaning: "I approve this controlled document revision"
    }),
    onSuccess: async () => {
      setActionError(null);
      setSignaturePassword("");
      setApprovalComments("");
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to approve revision")
  });

  const distributionMutation = useMutation({
    mutationFn: () => {
      const usernames = distributionForm.assignedUsernames
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      return distributeDocumentRevision(selected?.id ?? "", currentRevision?.id ?? "", {
        assignedUsernames: usernames,
        dueDate: distributionForm.dueDate || undefined
      });
    },
    onSuccess: async () => {
      setActionError(null);
      setDistributionForm(initialDistributionForm);
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to distribute revision")
  });

  const acknowledgementMutation = useMutation({
    mutationFn: (distribution: DocumentDistribution) => acknowledgeDocumentDistribution(distribution.id, {
      username: authUser?.username ?? "",
      password: acknowledgementPassword,
      comments: acknowledgementComments.trim() || undefined,
      meaning: "I acknowledge reading and understanding this controlled document"
    }),
    onSuccess: async () => {
      setActionError(null);
      setAcknowledgementPassword("");
      setAcknowledgementComments("");
      await invalidateDocuments();
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to acknowledge document")
  });

  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-violet-50/60">
      <header className="flex shrink-0 items-center gap-4 border-b border-violet-100 bg-white px-6 py-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-500">Quality / Document Control</div>
          <h1 className="text-xl font-bold text-slate-800">Controlled Documents</h1>
          <p className="text-sm text-slate-500">SOPs, specifications, methods, revision approval, and effective-state control</p>
        </div>
        <button type="button" onClick={() => setShowCreate(true)} className="ml-auto rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-700">
          New Document
        </button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="flex w-96 shrink-0 flex-col border-r border-violet-100 bg-white">
          <div className="flex gap-2 border-b border-violet-100 p-3">
            <input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-violet-100 bg-violet-50 px-3 py-2 text-xs text-slate-700 outline-none focus:border-violet-400" placeholder="Search documents..." />
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ControlledDocumentType | "ALL")} className="rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-xs text-slate-700">
              {documentTypes.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </div>
          <div className="border-b border-violet-100 p-3">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ControlledDocumentStatus | "ALL")} className="w-full rounded-xl border border-violet-100 bg-violet-50 px-2 py-2 text-xs text-slate-700">
              {documentStatuses.map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
            </select>
          </div>
          <div className="flex-1 overflow-y-auto">
            {isLoading ? <div className="p-5 text-sm text-slate-500">Loading documents...</div> : null}
            {errorMessage ? <div className="p-5 text-sm text-red-500">{errorMessage}</div> : null}
            {documents.map((document) => (
              <DocumentRow key={document.id} document={document} selected={selected?.id === document.id} onClick={() => setSelectedId(document.id)} />
            ))}
            {!isLoading && documents.length === 0 ? <div className="p-5 text-sm text-slate-500">No controlled documents found.</div> : null}
          </div>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto p-5">
          {selected ? (
            <div className="space-y-5">
              <section className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800">{selected.documentNumber}</h2>
                    <StatusPill status={selected.status} />
                    {currentRevision ? <span className="rounded-md bg-violet-600 px-2 py-1 text-xs font-bold text-white">{currentRevision.revision}</span> : null}
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{selected.title} · {formatLabel(selected.documentType)} · {selected.department}</p>
                </div>
              </section>

              {actionError ? <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{actionError}</div> : null}

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  <Panel title="Revision History">
                    <div className="space-y-3">
                      {selected.revisions.map((revision) => (
                        <RevisionCard
                          key={revision.id}
                          revision={revision}
                          isCurrent={revision.id === selected.currentRevisionId}
                          onSubmit={() => submitMutation.mutate(revision)}
                          disableSubmit={submitMutation.isPending || revision.revisionStatus !== "DRAFT"}
                        />
                      ))}
                    </div>
                  </Panel>

                  <Panel title="Approval Workflow">
                    {currentRevision ? (
                      <div className="space-y-4">
                        {currentRevision.approvals.map((approval) => <ApprovalStep key={approval.id} approval={approval} />)}
                        {pendingApproval && currentRevision.revisionStatus === "IN_REVIEW" ? (
                          <div className="rounded-xl border border-violet-100 bg-violet-50 p-4">
                            <div className="text-sm font-bold text-slate-800">Approve {formatLabel(pendingApproval.approvalStep)}</div>
                            <div className="mt-1 text-xs text-slate-500">Electronic signature is recorded against the revision approval step.</div>
                            <textarea value={approvalComments} onChange={(event) => setApprovalComments(event.target.value)} className={fieldClass("mt-3 min-h-20")} placeholder="Approval comments" />
                            <input type="password" value={signaturePassword} onChange={(event) => setSignaturePassword(event.target.value)} className={fieldClass("mt-3")} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                            <button type="button" onClick={() => approvalMutation.mutate(currentRevision)} disabled={approvalMutation.isPending || !signaturePassword} className="mt-3 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                              Approve With E-sign
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : <div className="text-sm text-slate-500">No revision workflow yet.</div>}
                  </Panel>

                  <Panel title="Create New Revision">
                    <div className="grid gap-3 md:grid-cols-[160px_minmax(0,1fr)]">
                      <input value={revisionForm.revision} onChange={(event) => setRevisionForm((current) => ({ ...current, revision: event.target.value }))} className={fieldClass()} placeholder="v2.0" />
                      <input type="file" onChange={(event) => setRevisionForm((current) => ({ ...current, file: event.target.files?.[0] ?? null }))} className={fieldClass()} />
                    </div>
                    <textarea value={revisionForm.changeSummary} onChange={(event) => setRevisionForm((current) => ({ ...current, changeSummary: event.target.value }))} className={fieldClass("mt-3 min-h-20")} placeholder="Change summary and regulatory reason" />
                    <button type="button" onClick={() => revisionMutation.mutate()} disabled={revisionMutation.isPending || !selected || !revisionForm.revision.trim() || !revisionForm.changeSummary.trim()} className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                      Add Revision
                    </button>
                  </Panel>
                </div>

                <div className="space-y-5">
                  <Panel title="Document Info">
                    <Info label="Type" value={formatLabel(selected.documentType)} />
                    <Info label="Category" value={selected.category ?? "-"} />
                    <Info label="Review cycle" value={`${selected.reviewCycleMonths} months`} />
                    <Info label="Effective date" value={selected.effectiveDate ?? "-"} />
                    <Info label="Next review" value={selected.nextReviewDate ?? "-"} />
                    <Info label="Linked material" value={selected.linkedMaterialCode ?? "-"} />
                    <Info label="Linked MoA" value={selected.linkedMoaCode ?? "-"} />
                  </Panel>

                  <Panel title="Distribution State">
                    <div className="space-y-3">
                      {currentRevision?.revisionStatus === "APPROVED" ? (
                        <div className="rounded-xl border border-violet-100 bg-violet-50 p-3">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-violet-500">Assign users</label>
                          <input
                            value={distributionForm.assignedUsernames}
                            onChange={(event) => setDistributionForm((current) => ({ ...current, assignedUsernames: event.target.value }))}
                            className={fieldClass("mt-2")}
                            placeholder="admin, qc.analyst"
                            list="document-usernames"
                          />
                          <datalist id="document-usernames">
                            {managedUsers.filter((user) => user.isActive).map((user) => <option key={user.id} value={user.username} />)}
                          </datalist>
                          <input
                            type="date"
                            value={distributionForm.dueDate}
                            onChange={(event) => setDistributionForm((current) => ({ ...current, dueDate: event.target.value }))}
                            className={fieldClass("mt-2")}
                          />
                          <button
                            type="button"
                            onClick={() => distributionMutation.mutate()}
                            disabled={distributionMutation.isPending || !distributionForm.assignedUsernames.trim()}
                            className="mt-2 rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                          >
                            Distribute
                          </button>
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-violet-200 bg-violet-50 p-3 text-xs text-slate-600">
                          Approve the current revision before distribution.
                        </div>
                      )}
                      <DistributionList distributions={distributions} />
                    </div>
                  </Panel>

                  <Panel title="My Acknowledgments">
                    <div className="space-y-3">
                      {myAcknowledgements.slice(0, 4).map((distribution) => {
                        const needsAck = distribution.status !== "ACKNOWLEDGED";
                        return (
                          <div key={distribution.id} className="rounded-xl border border-violet-100 bg-white p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="text-xs font-bold text-slate-800">{distribution.documentNumber} {distribution.revision}</div>
                                <div className="mt-0.5 text-[11px] text-slate-500">{distribution.documentTitle}</div>
                              </div>
                              <DistributionStatusPill status={distribution.status} />
                            </div>
                            {needsAck ? (
                              <div className="mt-3 space-y-2">
                                <textarea value={acknowledgementComments} onChange={(event) => setAcknowledgementComments(event.target.value)} className={fieldClass("min-h-16")} placeholder="Acknowledgment comments" />
                                <input type="password" value={acknowledgementPassword} onChange={(event) => setAcknowledgementPassword(event.target.value)} className={fieldClass()} placeholder={`Password for ${authUser?.username ?? "current user"}`} />
                                <button type="button" onClick={() => acknowledgementMutation.mutate(distribution)} disabled={acknowledgementMutation.isPending || !acknowledgementPassword} className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50">
                                  Acknowledge With E-sign
                                </button>
                              </div>
                            ) : (
                              <div className="mt-2 text-[11px] text-slate-500">Acknowledged {distribution.acknowledgedAt ? formatDateTime(distribution.acknowledgedAt) : ""}</div>
                            )}
                          </div>
                        );
                      })}
                      {myAcknowledgements.length === 0 ? <div className="text-sm text-slate-500">No assigned documents.</div> : null}
                    </div>
                  </Panel>

                  <Panel title="Audit Timeline">
                    <div className="space-y-3">
                      {auditEvents.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                          <div className="text-xs font-bold text-slate-700">{formatLabel(event.eventType)}</div>
                          <div className="mt-1 text-[11px] text-slate-500">{event.reason ?? `${event.fieldName ?? "Record"} changed`}</div>
                          <div className="mt-2 text-[10px] text-slate-400">{event.actor} · {formatDateTime(event.eventAt)}</div>
                        </div>
                      ))}
                      {auditEvents.length === 0 ? <div className="text-sm text-slate-500">No audit events yet.</div> : null}
                    </div>
                  </Panel>
                </div>
              </div>
            </div>
          ) : <div className="p-10 text-center text-sm text-slate-500">Create or select a controlled document.</div>}
        </main>
      </div>

      {showCreate ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <form
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl"
            onSubmit={(event) => {
              event.preventDefault();
              createMutation.mutate();
            }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-800">New Controlled Document</h2>
                <p className="text-sm text-slate-500">Create the draft record and initial v1.0 revision.</p>
              </div>
              <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input value={documentForm.documentNumber} onChange={(event) => setDocumentForm((current) => ({ ...current, documentNumber: event.target.value }))} className={fieldClass()} placeholder="SOP-QA-001" required />
              <select value={documentForm.documentType} onChange={(event) => setDocumentForm((current) => ({ ...current, documentType: event.target.value as ControlledDocumentType }))} className={fieldClass()}>
                {documentTypes.filter((value) => value !== "ALL").map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
              </select>
              <input value={documentForm.title} onChange={(event) => setDocumentForm((current) => ({ ...current, title: event.target.value }))} className={fieldClass("md:col-span-2")} placeholder="Document title" required />
              <input value={documentForm.category} onChange={(event) => setDocumentForm((current) => ({ ...current, category: event.target.value }))} className={fieldClass()} placeholder="Category" />
              <input value={documentForm.department} onChange={(event) => setDocumentForm((current) => ({ ...current, department: event.target.value }))} className={fieldClass()} placeholder="Department" required />
              <input value={documentForm.linkedMaterialCode} onChange={(event) => setDocumentForm((current) => ({ ...current, linkedMaterialCode: event.target.value }))} className={fieldClass()} placeholder="Linked material code" />
              <input value={documentForm.linkedMoaCode} onChange={(event) => setDocumentForm((current) => ({ ...current, linkedMoaCode: event.target.value }))} className={fieldClass()} placeholder="Linked MoA code" />
              <input type="number" min={1} value={documentForm.reviewCycleMonths} onChange={(event) => setDocumentForm((current) => ({ ...current, reviewCycleMonths: Number(event.target.value) }))} className={fieldClass()} placeholder="Review cycle months" />
              <textarea value={documentForm.changeSummary} onChange={(event) => setDocumentForm((current) => ({ ...current, changeSummary: event.target.value }))} className={fieldClass("min-h-24 md:col-span-2")} placeholder="Initial change summary" required />
            </div>
            {actionError ? <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{actionError}</div> : null}
            <button type="submit" disabled={createMutation.isPending} className="mt-5 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
              Create Draft
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function DocumentRow({ document, selected, onClick }: { document: ControlledDocument; selected: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full gap-3 border-b border-violet-50 px-4 py-3 text-left transition hover:bg-violet-50 ${selected ? "border-l-4 border-l-violet-600 bg-violet-50" : "border-l-4 border-l-transparent"}`}>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-xs font-bold text-violet-700">DC</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-xs font-bold text-violet-800">{document.documentNumber}</span>
          {document.currentRevision ? <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">{document.currentRevision.revision}</span> : null}
        </div>
        <div className="mt-0.5 truncate text-xs text-slate-500">{document.title}</div>
        <div className="mt-1 flex items-center gap-2"><StatusPill status={document.status} compact /><span className="truncate text-[10px] text-slate-400">{formatLabel(document.documentType)}</span></div>
      </div>
    </button>
  );
}

function RevisionCard({ revision, isCurrent, onSubmit, disableSubmit }: { revision: DocumentRevision; isCurrent: boolean; onSubmit: () => void; disableSubmit: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${isCurrent ? "border-violet-200 bg-violet-50" : "border-slate-200 bg-white"}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={isCurrent ? "rounded bg-violet-600 px-2 py-1 text-xs font-bold text-white" : "rounded bg-violet-100 px-2 py-1 text-xs font-bold text-violet-700"}>{revision.revision}</span>
            <span className="text-xs font-bold text-slate-600">{formatLabel(revision.revisionStatus)}</span>
          </div>
          <div className="mt-2 text-sm text-slate-700">{revision.changeSummary}</div>
          <div className="mt-2 text-[11px] text-slate-400">Created by {revision.createdBy} · {formatDateTime(revision.createdAt)}</div>
          {revision.fileName ? <div className="mt-1 text-[11px] font-semibold text-violet-700">{revision.fileName}</div> : null}
        </div>
        <button type="button" onClick={onSubmit} disabled={disableSubmit} className="rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-40">
          Submit
        </button>
      </div>
    </div>
  );
}

function ApprovalStep({ approval }: { approval: DocumentApproval }) {
  const approved = approval.status === "APPROVED";
  return (
    <div className="flex gap-3">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${approved ? "bg-green-500 text-white" : "bg-violet-100 text-violet-700"}`}>{approved ? "OK" : "..."}</div>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-bold ${approved ? "text-green-700" : "text-slate-700"}`}>{formatLabel(approval.approvalStep)}</div>
        <div className="text-xs text-slate-500">{approval.approverRole}{approved ? ` approved by ${approval.approvedBy}` : " pending"}</div>
        {approval.comments ? <div className="mt-1 text-xs italic text-slate-500">{approval.comments}</div> : null}
      </div>
    </div>
  );
}

function DistributionList({ distributions }: { distributions: DocumentDistribution[] }) {
  return (
    <div className="space-y-2">
      {distributions.map((distribution) => (
        <div key={distribution.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold text-slate-800">{distribution.assignedUsername}</div>
              <div className="mt-0.5 text-[11px] text-slate-500">
                {distribution.revision} assigned by {distribution.assignedBy}
              </div>
            </div>
            <DistributionStatusPill status={distribution.status} />
          </div>
          <div className="mt-2 grid gap-2 text-[11px] text-slate-500">
            <span>Due: {distribution.dueDate ?? "-"}</span>
            <span>Acknowledged: {distribution.acknowledgedAt ? formatDateTime(distribution.acknowledgedAt) : "-"}</span>
          </div>
          {distribution.comments ? <div className="mt-2 text-[11px] italic text-slate-500">{distribution.comments}</div> : null}
        </div>
      ))}
      {distributions.length === 0 ? <div className="text-sm text-slate-500">No distributions yet.</div> : null}
    </div>
  );
}

function DistributionStatusPill({ status }: { status: DocumentDistribution["status"] }) {
  const className = status === "ACKNOWLEDGED" ? "bg-green-100 text-green-700" : status === "OVERDUE" ? "bg-red-100 text-red-700" : status === "WITHDRAWN" ? "bg-slate-100 text-slate-600" : "bg-amber-100 text-amber-700";
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${className}`}>{formatLabel(status)}</span>;
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-xl border border-violet-100 bg-white p-4 shadow-sm"><h3 className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-slate-500">{title}</h3>{children}</section>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="mb-3"><div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</div><div className="mt-0.5 text-sm font-semibold text-slate-700">{value}</div></div>;
}

function StatusPill({ status, compact = false }: { status: ControlledDocumentStatus; compact?: boolean }) {
  const className = status === "EFFECTIVE" ? "bg-green-100 text-green-700" : status === "IN_REVIEW" ? "bg-amber-100 text-amber-700" : status === "DRAFT" ? "bg-slate-100 text-slate-700" : "bg-red-100 text-red-700";
  return <span className={`inline-flex rounded-full font-bold ${className} ${compact ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"}`}>{formatLabel(status)}</span>;
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-violet-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-violet-400 ${extra}`;
}

function formatLabel(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter: string) => letter.toUpperCase());
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
