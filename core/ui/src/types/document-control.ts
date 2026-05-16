import type { PageResponse } from "./grn";

export type ControlledDocumentType = "SPECIFICATION" | "MOA" | "SOP" | "POLICY" | "VALIDATION_REPORT";
export type ControlledDocumentStatus = "DRAFT" | "IN_REVIEW" | "EFFECTIVE" | "SUPERSEDED" | "OBSOLETE";
export type DocumentReviewStatus = "CURRENT" | "DUE_SOON" | "OVERDUE";
export type DocumentRevisionStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "SUPERSEDED" | "OBSOLETE";
export type DocumentApprovalStep = "TECHNICAL_REVIEW" | "QA_APPROVAL";
export type DocumentApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";
export type DocumentDistributionStatus = "ASSIGNED" | "ACKNOWLEDGED" | "OVERDUE" | "WITHDRAWN";

export type DocumentApproval = {
  id: string;
  revisionId: string;
  approvalStep: DocumentApprovalStep;
  approverRole: string;
  status: DocumentApprovalStatus;
  comments: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  eSignatureId: string | null;
};

export type DocumentRevision = {
  id: string;
  documentId: string;
  revision: string;
  revisionStatus: DocumentRevisionStatus;
  changeSummary: string;
  fileName: string | null;
  storagePath: string | null;
  effectiveDate: string | null;
  supersededAt: string | null;
  createdBy: string;
  createdAt: string;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvals: DocumentApproval[];
};

export type ControlledDocument = {
  id: string;
  documentNumber: string;
  title: string;
  documentType: ControlledDocumentType;
  category: string | null;
  department: string;
  status: ControlledDocumentStatus;
  currentRevisionId: string | null;
  linkedMaterialCode: string | null;
  linkedMoaCode: string | null;
  reviewCycleMonths: number;
  nextReviewDate: string | null;
  reviewStatus: DocumentReviewStatus | null;
  effectiveDate: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  currentRevision: DocumentRevision | null;
  revisions: DocumentRevision[];
};

export type DocumentDistribution = {
  id: string;
  documentId: string;
  revisionId: string;
  documentNumber: string;
  documentTitle: string;
  revision: string;
  assignedUsername: string;
  status: DocumentDistributionStatus;
  dueDate: string | null;
  assignedBy: string;
  assignedAt: string;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  acknowledgementESignatureId: string | null;
  comments: string | null;
  isActive: boolean;
};

export type CreateControlledDocumentRequest = {
  documentNumber: string;
  title: string;
  documentType: ControlledDocumentType;
  category?: string;
  department: string;
  linkedMaterialCode?: string;
  linkedMoaCode?: string;
  reviewCycleMonths: number;
  changeSummary: string;
};

export type DocumentApprovalRequest = {
  comments?: string;
  username: string;
  password: string;
  meaning?: string;
};

export type CreateDocumentDistributionRequest = {
  assignedUsernames: string[];
  dueDate?: string;
};

export type DocumentAcknowledgementRequest = {
  comments?: string;
  username: string;
  password: string;
  meaning?: string;
};

export type ControlledDocumentPage = PageResponse<ControlledDocument>;
