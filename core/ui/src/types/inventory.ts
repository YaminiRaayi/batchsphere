export type InventoryStatus =
  | "QUARANTINE"
  | "SAMPLING"
  | "UNDER_TEST"
  | "RELEASED"
  | "REJECTED"
  | "BLOCKED";

export type InventoryRecord = {
  id: string;
  materialId: string;
  batchId: string;
  palletId: string;
  quantityOnHand: number;
  uom: string;
  expiryDate: string | null;
  retestDueDate: string | null;
  status: InventoryStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type InventoryTransaction = {
  id: string;
  inventoryId: string;
  materialId: string;
  batchId: string;
  palletId: string;
  warehouseLocation: string;
  transactionType: string;
  referenceType: string;
  referenceId: string;
  referenceNumber: string | null;
  quantity: number;
  beforeQuantity: number | null;
  afterQuantity: number | null;
  uom: string;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
};

export type InventorySummary = {
  countsByStatus: Record<InventoryStatus, number>;
};
