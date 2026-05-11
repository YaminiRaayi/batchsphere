export type SupplierType =
  | "MANUFACTURER"
  | "CONTRACT_MANUFACTURER"
  | "DISTRIBUTOR"
  | "BROKER";

export type SupplierQualificationStatus =
  | "QUALIFIED"
  | "CONDITIONALLY_QUALIFIED"
  | "SUSPENDED"
  | "DISQUALIFIED";

export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  supplierType: SupplierType;
  qualificationStatus: SupplierQualificationStatus;
  countryOfManufacture: string | null;
  gmpcertNumber: string | null;
  gmpcertIssuingAuthority: string | null;
  gmpcertExpiryDate: string | null;
  approvedSince: string | null;
  lastAuditDate: string | null;
  nextAuditDue: string | null;
  rejectionRate: number | null;
  openCapaCount: number;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateSupplierRequest = {
  supplierCode: string;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  supplierType: SupplierType;
  qualificationStatus: SupplierQualificationStatus;
  countryOfManufacture?: string;
  gmpcertNumber?: string;
  gmpcertIssuingAuthority?: string;
  gmpcertExpiryDate?: string;
  approvedSince?: string;
  lastAuditDate?: string;
  nextAuditDue?: string;
  rejectionRate?: number;
  openCapaCount?: number;
  createdBy: string;
};
