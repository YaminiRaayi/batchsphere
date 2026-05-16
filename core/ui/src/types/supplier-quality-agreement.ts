import type { PageResponse } from "./grn";

export type SupplierQualityAgreementStatus =
  | "DRAFT"
  | "UNDER_NEGOTIATION"
  | "ACTIVE"
  | "EXPIRED"
  | "TERMINATED";

export const SQA_STATUS_LABELS: Record<SupplierQualityAgreementStatus, string> = {
  DRAFT: "Draft",
  UNDER_NEGOTIATION: "Under Negotiation",
  ACTIVE: "Active",
  EXPIRED: "Expired",
  TERMINATED: "Terminated"
};

export type SupplierQualityAgreement = {
  id: string;
  sqaNumber: string;
  supplierId: string | null;
  supplierName: string | null;
  vendorBusinessUnitId: string | null;
  vendorBusinessUnitName: string | null;
  title: string;
  effectiveDate: string | null;
  expiryDate: string | null;
  status: SupplierQualityAgreementStatus;
  sopDocumentId: string | null;
  gmpResponsibilities: string | null;
  changeNotificationRequirements: string | null;
  auditRights: string | null;
  testingResponsibilities: string | null;
  retentionSampleRequirements: string | null;
  agreedAcceptanceCriteria: string | null;
  ourSignatory: string | null;
  ourSignatoryDate: string | null;
  supplierSignatory: string | null;
  supplierSignatoryDate: string | null;
  terminatedReason: string | null;
  expiringSoon: boolean;
  daysUntilExpiry: number | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SupplierQualityAgreementPage = PageResponse<SupplierQualityAgreement>;

export type CreateSupplierQualityAgreementRequest = {
  supplierId?: string;
  vendorBusinessUnitId?: string;
  title: string;
  effectiveDate?: string;
  expiryDate?: string;
  status?: SupplierQualityAgreementStatus;
  sopDocumentId?: string;
  gmpResponsibilities?: string;
  changeNotificationRequirements?: string;
  auditRights?: string;
  testingResponsibilities?: string;
  retentionSampleRequirements?: string;
  agreedAcceptanceCriteria?: string;
  ourSignatory?: string;
  ourSignatoryDate?: string;
  supplierSignatory?: string;
  supplierSignatoryDate?: string;
  terminatedReason?: string;
};

export type SupplierQualityAgreementStatusRequest = {
  status: SupplierQualityAgreementStatus;
  terminatedReason?: string;
};
