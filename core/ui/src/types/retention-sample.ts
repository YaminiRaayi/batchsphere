export type RetentionSampleStatus = "STORED" | "RETRIEVED" | "TESTED" | "DISPOSED";

export interface RetentionSample {
  id: string;
  samplingRequestId: string;
  lotNumber: string;
  materialId: string | null;
  materialName: string | null;
  quantity: number;
  uom: string;
  containerDescription: string | null;
  storageLocation: string;
  storageCondition: string | null;
  retentionUntil: string;
  daysUntilExpiry: number;
  status: RetentionSampleStatus;
  receivedBy: string;
  receivedAt: string;
  retrievalReason: string | null;
  retrievedBy: string | null;
  retrievedAt: string | null;
  testResultReference: string | null;
  disposalReason: string | null;
  disposedBy: string | null;
  disposedAt: string | null;
  disposalMethod: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface RetentionSampleSummary {
  totalStored: number;
  expiringIn30Days: number;
  overdueDisposal: number;
  retrievedThisMonth: number;
}

export interface CreateRetentionSampleRequest {
  samplingRequestId: string;
  lotNumber: string;
  materialId?: string;
  materialName?: string;
  quantity: number;
  uom: string;
  containerDescription?: string;
  storageLocation: string;
  storageCondition?: string;
  retentionUntil?: string;
}

export interface RetrieveRetentionSampleRequest {
  retrievalReason: string;
  testResultReference?: string;
}

export interface DisposeRetentionSampleRequest {
  disposalReason: string;
  disposalMethod: string;
}
