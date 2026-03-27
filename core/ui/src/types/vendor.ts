export type Vendor = {
  id: string;
  vendorCode: string;
  vendorName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
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
  createdBy: string;
};
