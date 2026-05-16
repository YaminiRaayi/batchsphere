import type { DeviationSeverity } from "./deviation";
import type { PageResponse } from "./grn";

export type CapaStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "EFFECTIVENESS_CHECK" | "CLOSED" | "CANCELLED";

export type CapaApprovalStatus = "NONE" | "PENDING_APPROVAL" | "APPROVED" | "REJECTED";

export type CapaEffectivenessOutcome = "PENDING" | "PASSED" | "FAILED";

export type Capa = {
  id: string;
  capaNumber: string;
  deviationId: string;
  deviationNumber: string;
  title: string;
  description: string | null;
  severity: DeviationSeverity;
  status: CapaStatus;
  approvalStatus: CapaApprovalStatus;
  submittedForApprovalBy: string | null;
  submittedForApprovalAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalComments: string | null;
  approvalESignatureId: string | null;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction: string | null;
  effectivenessCheck: string | null;
  effectivenessReviewDate: string | null;
  effectivenessReviewer: string | null;
  effectivenessOutcome: CapaEffectivenessOutcome;
  effectivenessOutcomeComments: string | null;
  effectivenessReviewAt: string | null;
  effectivenessReviewBy: string | null;
  effectivenessESignatureId: string | null;
  completionSummary: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closureESignatureId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateCapaRequest = {
  deviationId: string;
  title: string;
  description?: string;
  severity: DeviationSeverity;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction?: string;
  effectivenessCheck?: string;
};

export type UpdateCapaRequest = {
  title: string;
  description?: string;
  severity: DeviationSeverity;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction?: string;
  effectivenessCheck?: string;
};

export type CapaStatusUpdateRequest = {
  status: CapaStatus;
  reason?: string;
  completionSummary?: string;
  username?: string;
  password?: string;
  meaning?: string;
};

export type CapaSummary = {
  countsByStatus: Record<CapaStatus, number>;
  overdue: number;
  dueThisWeek: number;
  alertCount: number;
  overdueEffectiveness: number;
};

export type CapaPage = PageResponse<Capa>;

export type CapaReassignment = {
  id: string;
  previousOwner: string;
  newOwner: string;
  reason: string;
  assignedBy: string;
  assignedAt: string;
};

export type ReassignCapaRequest = {
  newOwner: string;
  reason: string;
};

export type CapaAttachmentStage = "INVESTIGATION" | "CORRECTIVE_ACTION" | "PREVENTIVE_ACTION" | "EFFECTIVENESS_CHECK" | "GENERAL";

export type CapaAttachment = {
  id: string;
  capaId: string;
  stage: CapaAttachmentStage;
  fileName: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: string;
  uploadedAt: string;
};

export type CapaApproveRequest = {
  username: string;
  password: string;
  meaning?: string;
  comments?: string;
};

export type CapaRejectRequest = {
  reason: string;
};

export type ScheduleEffectivenessReviewRequest = {
  effectivenessReviewDate: string;
  effectivenessReviewer: string;
};

export type CapaEffectivenessReviewRequest = {
  outcome: "PASSED" | "FAILED";
  comments?: string;
  username: string;
  password: string;
  meaning?: string;
};

export type CapaAlert = {
  capaId: string;
  capaNumber: string;
  title: string;
  owner: string;
  alertType: "OVERDUE" | "DUE_SOON" | "EFFECTIVENESS_OVERDUE";
  severity: "HIGH" | "MEDIUM" | "LOW";
  dueDate: string;
  daysUntilDue: number;
  message: string;
};
