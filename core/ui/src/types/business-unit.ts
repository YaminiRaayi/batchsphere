export type BusinessUnit = {
  id: string;
  unitCode: string;
  unitName: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateBusinessUnitRequest = {
  unitCode: string;
  unitName: string;
  description?: string;
  createdBy: string;
};
