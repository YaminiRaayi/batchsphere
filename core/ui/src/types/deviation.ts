import type { PageResponse } from "./grn";

export type DeviationSeverity = "MINOR" | "MAJOR" | "CRITICAL";
export type DeviationStatus = "OPEN" | "UNDER_INVESTIGATION" | "CAPA_IN_PROGRESS" | "CLOSED" | "CANCELLED";
export type DeviationSourceModule = "MANUAL" | "GRN" | "SAMPLING" | "INVENTORY" | "WAREHOUSE" | "BATCH";
export type DeviationType = "MATERIAL" | "PROCESS" | "DOCUMENTATION" | "EQUIPMENT" | "FACILITY" | "SAFETY" | "OTHER";

export type Deviation = {
  id: string;
  deviationNumber: string;
  title: string;
  description: string;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  status: DeviationStatus;
  sourceModule: DeviationSourceModule;
  sourceEntityId: string | null;
  sourceReference: string | null;
  department: string | null;
  detectedBy: string;
  detectedAt: string;
  immediateAction: string | null;
  investigationSummary: string | null;
  rootCause: string | null;
  impactAssessment: string | null;
  closureSummary: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closureESignatureId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateDeviationRequest = {
  title: string;
  description: string;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  sourceModule: DeviationSourceModule;
  sourceEntityId?: string;
  sourceReference?: string;
  department?: string;
  detectedAt?: string;
  immediateAction?: string;
};

export type UpdateDeviationRequest = {
  title: string;
  description: string;
  deviationType: DeviationType;
  severity: DeviationSeverity;
  department?: string;
  immediateAction?: string;
  investigationSummary?: string;
  rootCause?: string;
  impactAssessment?: string;
};

export type DeviationStatusUpdateRequest = {
  status: DeviationStatus;
  reason?: string;
  closureSummary?: string;
  username?: string;
  password?: string;
  meaning?: string;
};

export type DeviationSummary = {
  countsByStatus: Record<DeviationStatus, number>;
  countsBySeverity: Record<DeviationSeverity, number>;
};

export type DeviationPage = PageResponse<Deviation>;
