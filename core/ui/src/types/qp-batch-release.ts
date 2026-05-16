import type { PageResponse } from "./grn";

export type BatchReleaseStatus = "PENDING_QP_REVIEW" | "UNDER_REVIEW" | "CERTIFIED" | "REJECTED" | "ON_HOLD";

export type QpBatchRelease = {
  id: string;
  releaseNumber: string;
  lotNumber: string;
  productName: string;
  materialId: string | null;
  grnId: string | null;
  batchSize: number | null;
  batchUom: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  status: BatchReleaseStatus;
  qcDispositionConfirmed: boolean;
  oosInvestigationsClosed: boolean;
  noOpenCriticalDeviations: boolean;
  documentsComplete: boolean;
  qpName: string | null;
  qpEmployeeId: string | null;
  qpCertificationStatement: string | null;
  certifiedAt: string | null;
  certificationESignatureId: string | null;
  rejectionReason: string | null;
  onHoldReason: string | null;
  coaNumber: string | null;
  coaIssuedAt: string | null;
  coaIssuedBy: string | null;
  coaLocked: boolean;
  analystSignedBy: string | null;
  analystSignedAt: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CoaResponse = {
  id: string;
  releaseNumber: string;
  coaNumber: string | null;
  lotNumber: string;
  productName: string;
  batchSize: number | null;
  batchUom: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  status: BatchReleaseStatus;
  analystSignedBy: string | null;
  analystSignedAt: string | null;
  coaIssuedBy: string | null;
  coaIssuedAt: string | null;
  coaLocked: boolean;
};

export type AnalystSignCoaRequest = {
  username: string;
  password: string;
};

export type IssueCoaRequest = {
  username: string;
  password: string;
  deliveryNote?: string;
};

export type CreateQpBatchReleaseRequest = {
  lotNumber: string;
  productName: string;
  materialId?: string;
  grnId?: string;
  batchSize?: number;
  batchUom?: string;
  manufactureDate?: string;
  expiryDate?: string;
};

export type CertifyBatchRequest = {
  qpName?: string;
  qpEmployeeId?: string;
  certificationStatement?: string;
  username: string;
  password: string;
  meaning?: string;
  reason?: string;
};

export type RejectBatchRequest = {
  reason: string;
};

export type BatchCertificate = {
  id: string;
  releaseNumber: string;
  lotNumber: string;
  productName: string;
  materialId: string | null;
  grnId: string | null;
  batchSize: number | null;
  batchUom: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  status: BatchReleaseStatus;
  qcDispositionSummary: string;
  investigationSummary: string;
  deviationSummary: string;
  documentSummary: string;
  qpName: string | null;
  certificationStatement: string | null;
  certifiedAt: string | null;
  eSignatureId: string | null;
};

export type QpBatchReleasePage = PageResponse<QpBatchRelease>;
