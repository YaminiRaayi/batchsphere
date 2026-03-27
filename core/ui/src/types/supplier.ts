export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
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
  createdBy: string;
};
