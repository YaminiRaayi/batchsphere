import type { PageResponse } from "./grn";

export type ApqrStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "CLOSED";

export type Apqr = {
  id: string;
  apqrNumber: string;
  productName: string;
  materialId: string | null;
  reviewYear: number;
  periodStart: string;
  periodEnd: string;
  status: ApqrStatus;
  totalBatchesManufactured: number;
  totalGrnReceived: number;
  grnRejectionCount: number;
  oosCount: number;
  ootCount: number;
  deviationCount: number;
  openCapaCount: number;
  changeControlCount: number;
  complaintCount: number;
  processInControl: boolean | null;
  trendsIdentified: string | null;
  recommendations: string | null;
  preparedBy: string | null;
  preparedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  approvalESignatureId: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateApqrRequest = {
  productName: string;
  materialId?: string;
  reviewYear: number;
  periodStart: string;
  periodEnd: string;
};

export type ApqrConclusionRequest = {
  processInControl: boolean;
  trendsIdentified?: string;
  recommendations?: string;
};

export type ApproveApqrRequest = {
  username: string;
  password: string;
  meaning?: string;
  reason?: string;
};

export type ApqrSummaryItem = {
  materialId: string | null;
  productName: string;
  reviewYear: number;
  status: ApqrStatus;
  totalBatches: number;
  oosCount: number;
  deviationCount: number;
  openCapaCount: number;
};

export type ApqrPage = PageResponse<Apqr>;
