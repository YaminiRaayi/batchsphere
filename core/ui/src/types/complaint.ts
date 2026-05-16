import type { PageResponse } from "./grn";

export type ComplaintSource = "CUSTOMER" | "MARKET" | "CLINICAL" | "INTERNAL" | "DISTRIBUTOR" | "REGULATORY_AUTHORITY";
export type ComplaintCategory = "PRODUCT_QUALITY" | "ADVERSE_EVENT" | "LABELING_ERROR" | "PACKAGING_DEFECT" | "EFFICACY" | "CONTAMINATION" | "OTHER";
export type ComplaintSeverity = "CRITICAL" | "MAJOR" | "MINOR" | "INFORMATIONAL";
export type ComplaintStatus = "RECEIVED" | "UNDER_INVESTIGATION" | "PENDING_CLOSURE" | "CLOSED" | "WITHDRAWN";
export type RegulatoryReportability = "NOT_ASSESSED" | "REPORTABLE" | "NOT_REPORTABLE" | "REPORTED";

export type Complaint = {
  id: string;
  complaintNumber: string;
  receivedDate: string;
  source: ComplaintSource;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  status: ComplaintStatus;
  productName: string | null;
  lotNumber: string | null;
  reportedBy: string | null;
  description: string;
  initialAssessment: string | null;
  rootCause: string | null;
  impactAssessment: string | null;
  recallRequired: boolean;
  regulatoryReportability: RegulatoryReportability;
  regulatoryReportDate: string | null;
  regulatoryAuthority: string | null;
  linkedDeviationId: string | null;
  linkedCapaId: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closureSummary: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateComplaintRequest = {
  description: string;
  receivedDate: string;
  source: ComplaintSource;
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  productName?: string;
  lotNumber?: string;
  reportedBy?: string;
  initialAssessment?: string;
};

export type UpdateComplaintRequest = {
  category: ComplaintCategory;
  severity: ComplaintSeverity;
  description: string;
  productName?: string;
  lotNumber?: string;
  reportedBy?: string;
  initialAssessment?: string;
  rootCause?: string;
  impactAssessment?: string;
  recallRequired: boolean;
  regulatoryReportability: RegulatoryReportability;
  regulatoryAuthority?: string;
  regulatoryReportDate?: string;
};

export type ComplaintStatusUpdateRequest = {
  status: ComplaintStatus;
  reason?: string;
  closureSummary?: string;
  username?: string;
  password?: string;
  meaning?: string;
};

export type ComplaintSummary = {
  countsByStatus: Record<ComplaintStatus, number>;
  countsByCategory: Record<ComplaintCategory, number>;
  countsBySeverity: Record<ComplaintSeverity, number>;
};

export type ComplaintPage = PageResponse<Complaint>;
