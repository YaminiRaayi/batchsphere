export type VendorCategory =
  | "API_SUPPLIER"
  | "EXCIPIENT_SUPPLIER"
  | "SOLVENT_SUPPLIER"
  | "PACKAGING_SUPPLIER"
  | "LABELING_SUPPLIER"
  | "TESTING_LAB"
  | "EQUIPMENT_SUPPLIER";

export const VENDOR_CATEGORY_LABELS: Record<VendorCategory, string> = {
  API_SUPPLIER:        "API Supplier",
  EXCIPIENT_SUPPLIER:  "Excipient Supplier",
  SOLVENT_SUPPLIER:    "Solvent Supplier",
  PACKAGING_SUPPLIER:  "Packaging Supplier",
  LABELING_SUPPLIER:   "Labeling Supplier",
  TESTING_LAB:         "Testing Lab",
  EQUIPMENT_SUPPLIER:  "Equipment Supplier",
};

export type Vendor = {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  vendorCategory: VendorCategory | null;
  corporateAddress: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  gstin: string | null;
  pan: string | null;
  website: string | null;
  paymentTermsDays: number | null;
  approvedSince: string | null;
  lastAuditDate: string | null;
  nextAuditDue: string | null;
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

export type CreateVendorRequest = {
  vendorCode: string;
  vendorName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  vendorCategory?: VendorCategory;
  corporateAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin?: string;
  pan?: string;
  website?: string;
  paymentTermsDays?: number;
  approvedSince?: string;
  lastAuditDate?: string;
  nextAuditDue?: string;
  qaRating?: number;
  deliveryScore?: number;
  rejectionRate?: number;
  openCapaCount?: number;
  createdBy: string;
};

export type VendorApprovalRequest = {
  approved: boolean;
  approvedSince?: string;
};

export type VendorDocument = {
  id: string;
  vendorId: string;
  documentType: import("./vendor-business-unit").VendorDocumentType;
  documentTitle: string;
  fileName: string;
  storagePath: string;
  uploadedAt: string;
  expiryDate: string | null;
  status: import("./vendor-business-unit").VendorDocumentStatus;
  uploadedBy: string;
};
