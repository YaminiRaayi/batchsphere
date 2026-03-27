export type GrnStatus = "DRAFT" | "RECEIVED" | "CANCELLED";
export type ContainerType = "BAG" | "DRUM" | "BOX" | "CAN" | "BOTTLE" | "FIBER_DRUM";
export type QcStatus = "PENDING" | "APPROVED" | "REJECTED" | "PARTIALLY_APPROVED";
export type LabelType = "IN_HOUSE_RECEIPT" | "QC_SAMPLING";
export type LabelStatus = "GENERATED" | "APPLIED";

export type GrnItem = {
  id: string;
  lineNumber: number;
  materialId: string;
  batchId: string | null;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uom: string;
  palletId: string | null;
  containerType: string;
  numberOfContainers: number;
  quantityPerContainer: number;
  vendorBatch: string | null;
  manufactureDate: string | null;
  expiryDate: string | null;
  retestDate: string | null;
  unitPrice: number;
  totalPrice: number;
  qcStatus: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  documents: GrnDocument[];
};

export type Grn = {
  id: string;
  grnNumber: string;
  supplierId: string;
  vendorId: string;
  vendorBusinessUnitId: string;
  receiptDate: string;
  invoiceNumber: string;
  remarks: string | null;
  status: GrnStatus;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  items: GrnItem[];
};

export type PageResponse<T> = {
  content: T[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
};

export type CreateGrnItemRequest = {
  materialId: string;
  batchId?: string;
  receivedQuantity: number;
  acceptedQuantity: number;
  rejectedQuantity: number;
  uom: string;
  palletId: string;
  containerType: ContainerType;
  numberOfContainers: number;
  quantityPerContainer: number;
  vendorBatch: string;
  manufactureDate?: string;
  expiryDate?: string;
  retestDate?: string;
  unitPrice: number;
  qcStatus: QcStatus;
  description?: string;
};

export type CreateGrnRequest = {
  grnNumber: string;
  supplierId: string;
  vendorId: string;
  vendorBusinessUnitId: string;
  receiptDate: string;
  invoiceNumber?: string;
  remarks?: string;
  createdBy: string;
  items: CreateGrnItemRequest[];
};

export type GrnContainer = {
  id: string;
  grnId: string;
  grnItemId: string;
  materialId: string;
  batchId: string | null;
  palletId: string;
  containerNumber: string;
  containerType: ContainerType;
  vendorBatch: string;
  internalLot: string;
  quantity: number;
  uom: string;
  manufactureDate: string | null;
  expiryDate: string | null;
  retestDate: string | null;
  storageCondition: string;
  inventoryStatus: string;
  labelStatus: LabelStatus;
  sampled: boolean;
  sampledQuantity: number | null;
  samplingLocation: string | null;
  sampledBy: string | null;
  sampledAt: string | null;
};

export type MaterialLabel = {
  id: string;
  grnContainerId: string;
  labelType: LabelType;
  labelStatus: LabelStatus;
  labelContent: string;
  qrPayload: string | null;
  qrCodeDataUrl: string | null;
  generatedBy: string;
  generatedAt: string;
  appliedBy: string | null;
  appliedAt: string | null;
};

export type GrnDocument = {
  id: string;
  grnItemId: string;
  documentName: string;
  documentType: string;
  fileName: string;
  documentPath: string | null;
  documentUrl: string | null;
  createdBy: string;
  createdAt: string;
};
