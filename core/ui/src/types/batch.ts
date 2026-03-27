export type BatchType = "RAW_MATERIAL" | "FINISHED_GOOD";

export type Batch = {
  id: string;
  batchNumber: string;
  material: {
    id: string;
    materialCode: string;
    materialName: string;
  } | null;
  batchType: BatchType;
  batchStatus: string;
  quantity: number;
  unitOfMeasure: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  retestDate: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateBatchRequest = {
  batchNumber: string;
  materialId: string;
  batchType: BatchType;
  quantity: number;
  unitOfMeasure: string;
  manufactureDate?: string;
  expiryDate?: string;
  retestDate?: string;
  createdBy: string;
};
