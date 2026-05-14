import type { PageResponse } from "./grn";

export type ChangeControlStatus =
  | "DRAFT"
  | "UNDER_REVIEW"
  | "APPROVED"
  | "REJECTED"
  | "IN_IMPLEMENTATION"
  | "EFFECTIVENESS_CHECK"
  | "CLOSED"
  | "CANCELLED";

export type ChangeControlType =
  | "DOCUMENT" | "PROCESS" | "EQUIPMENT" | "MATERIAL" | "SUPPLIER" | "SYSTEM" | "OTHER";

export type ChangeControlRisk = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type AffectedEntityType =
  | "MATERIAL" | "SPEC" | "MOA" | "VENDOR" | "WAREHOUSE" | "DOCUMENT" | "PROCESS" | "SYSTEM_CONFIG" | "OTHER";

export type ChangeControlTaskStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED";

export type ChangeControlAffectedEntity = {
  id: string;
  entityType: AffectedEntityType;
  entityReference: string;
  entityId: string | null;
  notes: string | null;
  createdAt: string;
};

export type ChangeControlTask = {
  id: string;
  title: string;
  description: string | null;
  assignedTo: string | null;
  dueDate: string | null;
  status: ChangeControlTaskStatus;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
};

export type ChangeControl = {
  id: string;
  changeControlNumber: string;
  title: string;
  description: string | null;
  changeType: ChangeControlType;
  reason: string;
  riskClassification: ChangeControlRisk;
  status: ChangeControlStatus;
  impactAssessment: string | null;
  implementationPlan: string | null;
  effectivenessCheck: string | null;
  closureSummary: string | null;
  targetCompletionDate: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalComments: string | null;
  approvalESignatureId: string | null;
  rejectedBy: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closureESignatureId: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  affectedEntities: ChangeControlAffectedEntity[];
  tasks: ChangeControlTask[];
};

export type CreateChangeControlRequest = {
  title: string;
  description?: string;
  changeType: ChangeControlType;
  reason: string;
  riskClassification: ChangeControlRisk;
  impactAssessment?: string;
  implementationPlan?: string;
  effectivenessCheck?: string;
  targetCompletionDate?: string;
};

export type ChangeControlApproveRequest = {
  username: string;
  password: string;
  meaning?: string;
  comments?: string;
};

export type ChangeControlCloseRequest = {
  username: string;
  password: string;
  meaning?: string;
  closureSummary: string;
};

export type AddAffectedEntityRequest = {
  entityType: AffectedEntityType;
  entityReference: string;
  entityId?: string;
  notes?: string;
};

export type CreateTaskRequest = {
  title: string;
  description?: string;
  assignedTo?: string;
  dueDate?: string;
};

export type ChangeControlPage = PageResponse<ChangeControl>;
