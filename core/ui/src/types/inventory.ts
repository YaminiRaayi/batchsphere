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
  transactionType: string;
  referenceType: string;
  referenceId: string;
  quantity: number;
  uom: string;
  remarks: string | null;
  createdBy: string;
  createdAt: string;
};
