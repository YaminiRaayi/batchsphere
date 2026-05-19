export type Reagent = {
  id: string;
  reagentCode: string;
  reagentName: string;
  grade: string | null;
  manufacturer: string | null;
  storageCondition: string | null;
  activeLotCount: number;
  hasExpiringLot: boolean;
  hasExpiredLot: boolean;
  isActive: boolean;
  createdAt: string;
};

export type ReagentLot = {
  id: string;
  reagentId: string;
  reagentCode: string | null;
  reagentName: string | null;
  lotNumber: string;
  supplier: string | null;
  receivedDate: string | null;
  expiryDate: string;
  quantityReceived: number;
  quantityUsed: number;
  quantityRemaining: number;
  unit: string | null;
  storedStatus: string;
  status: string;
  isActive: boolean;
};

export type CreateReagentRequest = {
  reagentCode: string;
  reagentName: string;
  grade?: string;
  manufacturer?: string;
  storageCondition?: string;
  createdBy?: string;
};

export type CreateReagentLotRequest = {
  lotNumber: string;
  supplier?: string;
  receivedDate?: string;
  expiryDate: string;
  quantityReceived: number;
  quantityUsed?: number;
  unit?: string;
  status?: string;
  createdBy?: string;
};

export type UpdateReagentLotRequest = {
  quantityUsed?: number;
  status?: string;
  updatedBy?: string;
};
