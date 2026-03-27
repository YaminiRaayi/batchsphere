export type VendorBusinessUnit = {
  id: string;
  vendorId: string;
  unitName: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateVendorBusinessUnitRequest = {
  unitName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  createdBy: string;
};
