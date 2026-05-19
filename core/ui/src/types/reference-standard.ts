export type ReferenceStandard = {
  id: string;
  standardCode: string;
  standardName: string;
  pharmacopeia: string | null;
  storageCondition: string | null;
  activeLotCount: number;
  hasExpiringLot: boolean;
  hasExpiredLot: boolean;
  isActive: boolean;
  createdAt: string;
};

export type ReferenceStandardLot = {
  id: string;
  standardId: string;
  standardCode: string | null;
  standardName: string | null;
  lotNumber: string;
  potency: number | null;
  receivedDate: string | null;
  expiryDate: string;
  quantityReceived: number | null;
  quantityUsed: number | null;
  quantityRemaining: number | null;
  unit: string | null;
  storedStatus: string;
  status: string;
  isActive: boolean;
};

export type CreateReferenceStandardRequest = {
  standardCode: string;
  standardName: string;
  pharmacopeia?: string;
  storageCondition?: string;
  createdBy?: string;
};

export type CreateReferenceStandardLotRequest = {
  lotNumber: string;
  potency?: number;
  receivedDate?: string;
  expiryDate: string;
  quantityReceived?: number;
  quantityUsed?: number;
  unit?: string;
  status?: string;
  createdBy?: string;
};

export type UpdateReferenceStandardLotRequest = {
  quantityUsed?: number;
  status?: string;
  updatedBy?: string;
};
