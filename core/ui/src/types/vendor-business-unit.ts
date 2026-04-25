export type SiteType =
  | "MANUFACTURING"
  | "TESTING_LAB"
  | "PACKAGING"
  | "DISTRIBUTION"
  | "CORPORATE_OFFICE";

export const SITE_TYPE_LABELS: Record<SiteType, string> = {
  MANUFACTURING:    "Manufacturing",
  TESTING_LAB:      "Testing Lab",
  PACKAGING:        "Packaging",
  DISTRIBUTION:     "Distribution",
  CORPORATE_OFFICE: "Corporate Office",
};

export type QualificationStatus =
  | "NOT_STARTED"
  | "APPLICATION_SUBMITTED"
  | "DOCUMENT_REVIEW"
  | "AUDIT_SCHEDULED"
  | "AUDIT_IN_PROGRESS"
  | "CAPA_PENDING"
  | "QUALIFIED"
  | "RE_QUALIFICATION_DUE"
  | "SUSPENDED"
  | "DISQUALIFIED";

export const QUAL_STATUS_LABELS: Record<QualificationStatus, string> = {
  NOT_STARTED:           "Not Started",
  APPLICATION_SUBMITTED: "Application Submitted",
  DOCUMENT_REVIEW:       "Doc Review",
  AUDIT_SCHEDULED:       "Audit Scheduled",
  AUDIT_IN_PROGRESS:     "Audit In Progress",
  CAPA_PENDING:          "CAPA Pending",
  QUALIFIED:             "Qualified",
  RE_QUALIFICATION_DUE:  "Re-qual Due",
  SUSPENDED:             "Suspended",
  DISQUALIFIED:          "Disqualified",
};

export type VendorDocumentType =
  | "COMPANY_REGISTRATION"
  | "GST_CERTIFICATE"
  | "PAN_CARD"
  | "ISO_CERTIFICATE"
  | "GMP_CERTIFICATE"
  | "DRUG_MANUFACTURING_LICENSE"
  | "COA_TEMPLATE"
  | "MSDS"
  | "VENDOR_QUESTIONNAIRE"
  | "SITE_MASTER_FILE"
  | "QUALITY_AGREEMENT"
  | "NDA"
  | "AVL_AGREEMENT"
  | "AUDIT_REPORT";

export const VENDOR_DOCUMENT_TYPE_LABELS: Record<VendorDocumentType, string> = {
  COMPANY_REGISTRATION: "Company Registration",
  GST_CERTIFICATE: "GST Certificate",
  PAN_CARD: "PAN Card",
  ISO_CERTIFICATE: "ISO Certificate",
  GMP_CERTIFICATE: "GMP Certificate",
  DRUG_MANUFACTURING_LICENSE: "Drug Manufacturing License",
  COA_TEMPLATE: "CoA Template",
  MSDS: "MSDS",
  VENDOR_QUESTIONNAIRE: "Vendor Questionnaire",
  SITE_MASTER_FILE: "Site Master File",
  QUALITY_AGREEMENT: "Quality Agreement",
  NDA: "NDA",
  AVL_AGREEMENT: "AVL Agreement",
  AUDIT_REPORT: "Audit Report",
};

export type VendorDocumentStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";

export const VENDOR_DOCUMENT_STATUS_LABELS: Record<VendorDocumentStatus, string> = {
  VALID: "Valid",
  EXPIRING_SOON: "Expiring Soon",
  EXPIRED: "Expired",
};

export type VendorAuditType =
  | "INITIAL_QUALIFICATION"
  | "PERIODIC"
  | "FOR_CAUSE"
  | "POST_CAPA"
  | "REMOTE";

export const VENDOR_AUDIT_TYPE_LABELS: Record<VendorAuditType, string> = {
  INITIAL_QUALIFICATION: "Initial Qualification",
  PERIODIC: "Periodic",
  FOR_CAUSE: "For Cause",
  POST_CAPA: "Post CAPA",
  REMOTE: "Remote",
};

export type VendorAuditStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export const VENDOR_AUDIT_STATUS_LABELS: Record<VendorAuditStatus, string> = {
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export type VendorAuditOutcome =
  | "APPROVED"
  | "APPROVED_WITH_OBSERVATIONS"
  | "REJECTED"
  | "PENDING_CAPA";

export const VENDOR_AUDIT_OUTCOME_LABELS: Record<VendorAuditOutcome, string> = {
  APPROVED: "Approved",
  APPROVED_WITH_OBSERVATIONS: "Approved w/ Observations",
  REJECTED: "Rejected",
  PENDING_CAPA: "Pending CAPA",
};

export type VendorBusinessUnit = {
  id: string;
  vendorId: string;
  unitName: string;
  buCode: string | null;
  siteType: SiteType | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  siteContactPerson: string | null;
  siteEmail: string | null;
  sitePhone: string | null;
  drugLicenseNumber: string | null;
  drugLicenseExpiry: string | null;
  gmpCertBody: string | null;
  gmpCertNumber: string | null;
  gmpCertExpiry: string | null;
  isWhoGmpCertified: boolean;
  isUsfda: boolean;
  isEuGmp: boolean;
  qualificationStatus: QualificationStatus;
  qualifiedDate: string | null;
  nextRequalificationDue: string | null;
  lastAuditDate: string | null;
  qaRating: number | null;
  deliveryScore: number | null;
  rejectionRate: number | null;
  openCapaCount: number | null;
  isApproved: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateVendorBusinessUnitRequest = {
  unitName: string;
  buCode?: string;
  siteType?: SiteType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  siteContactPerson?: string;
  siteEmail?: string;
  sitePhone?: string;
  drugLicenseNumber?: string;
  drugLicenseExpiry?: string;
  gmpCertBody?: string;
  gmpCertNumber?: string;
  gmpCertExpiry?: string;
  isWhoGmpCertified?: boolean;
  isUsfda?: boolean;
  isEuGmp?: boolean;
  qualifiedDate?: string;
  nextRequalificationDue?: string;
  lastAuditDate?: string;
  qaRating?: number;
  deliveryScore?: number;
  rejectionRate?: number;
  openCapaCount?: number;
  createdBy: string;
};

export type UpdateVendorBusinessUnitRequest = {
  unitName: string;
  buCode?: string;
  siteType?: SiteType;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  siteContactPerson?: string;
  siteEmail?: string;
  sitePhone?: string;
  drugLicenseNumber?: string;
  drugLicenseExpiry?: string;
  gmpCertBody?: string;
  gmpCertNumber?: string;
  gmpCertExpiry?: string;
  isWhoGmpCertified?: boolean;
  isUsfda?: boolean;
  isEuGmp?: boolean;
  qualificationStatus?: QualificationStatus;
  qualifiedDate?: string;
  nextRequalificationDue?: string;
  lastAuditDate?: string;
  qaRating?: number;
  deliveryScore?: number;
  rejectionRate?: number;
  openCapaCount?: number;
  updatedBy: string;
};

export type VendorBusinessUnitDocument = {
  id: string;
  buId: string;
  documentType: VendorDocumentType;
  documentTitle: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  expiryDate: string | null;
  status: VendorDocumentStatus;
  uploadedBy: string;
};

export type CreateVendorBusinessUnitAuditRequest = {
  auditType: VendorAuditType;
  scheduledDate: string;
  completedDate?: string;
  auditedBy: string;
  status?: VendorAuditStatus;
  outcome?: VendorAuditOutcome;
  observationCount?: number;
  criticalObservationCount?: number;
  notes?: string;
};

export type VendorBusinessUnitAudit = {
  id: string;
  buId: string;
  auditType: VendorAuditType;
  scheduledDate: string;
  completedDate: string | null;
  auditedBy: string;
  status: VendorAuditStatus;
  outcome: VendorAuditOutcome | null;
  observationCount: number | null;
  criticalObservationCount: number | null;
  notes: string | null;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};
