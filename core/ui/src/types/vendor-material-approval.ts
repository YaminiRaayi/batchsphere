export type VendorMaterialApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "CONDITIONAL"
  | "SUSPENDED"
  | "DISQUALIFIED";

export type VendorMaterialApprovalBasis =
  | "AUDIT"
  | "DOCUMENT_REVIEW"
  | "HISTORICAL"
  | "REGULATORY";

export type VendorMaterialApproval = {
  id: string;
  vendorId: string;
  vendorBusinessUnitId: string;
  supplierId: string;
  materialId: string;
  status: VendorMaterialApprovalStatus;
  approvalBasis: VendorMaterialApprovalBasis;
  qualificationDate: string | null;
  nextRequalificationDate: string | null;
  approvedBy: string;
  remarks: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateVendorMaterialApprovalRequest = {
  vendorId: string;
  vendorBusinessUnitId: string;
  supplierId: string;
  materialId: string;
  status: VendorMaterialApprovalStatus;
  approvalBasis: VendorMaterialApprovalBasis;
  qualificationDate?: string;
  nextRequalificationDate?: string;
  approvedBy?: string;
  remarks?: string;
};
