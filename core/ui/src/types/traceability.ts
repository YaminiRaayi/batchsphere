export type TraceabilityEvent = {
  eventType: string;
  eventLabel: string;
  status: string | null;
  actor: string | null;
  timestamp: string;
  referenceId: string | null;
  referenceNumber: string | null;
  remarks: string | null;
};

export type LotTraceabilityResponse = {
  searchKey: string;
  grnId: string;
  grnNumber: string;
  grnStatus: string;
  receiptDate: string;
  coaReviewStatus: string;
  coaReviewedBy: string | null;
  coaReviewedAt: string | null;
  linkedDeviationId: string | null;
  linkedDeviationNumber: string | null;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  vendorBatch: string;
  receivedQuantity: number;
  uom: string;
  timeline: TraceabilityEvent[];
};
