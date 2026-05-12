import type { DeviationSeverity } from "./deviation";
import type { PageResponse } from "./grn";

export type CapaStatus = "OPEN" | "IN_PROGRESS" | "COMPLETED" | "EFFECTIVENESS_CHECK" | "CLOSED" | "CANCELLED";

export type Capa = {
  id: string;
  capaNumber: string;
  deviationId: string;
  deviationNumber: string;
  title: string;
  description: string | null;
  severity: DeviationSeverity;
  status: CapaStatus;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction: string | null;
  effectivenessCheck: string | null;
  completionSummary: string | null;
  closedBy: string | null;
  closedAt: string | null;
  closureESignatureId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateCapaRequest = {
  deviationId: string;
  title: string;
  description?: string;
  severity: DeviationSeverity;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction?: string;
  effectivenessCheck?: string;
};

export type UpdateCapaRequest = {
  title: string;
  description?: string;
  severity: DeviationSeverity;
  owner: string;
  dueDate: string;
  correctiveAction: string;
  preventiveAction?: string;
  effectivenessCheck?: string;
};

export type CapaStatusUpdateRequest = {
  status: CapaStatus;
  reason?: string;
  completionSummary?: string;
  username?: string;
  password?: string;
  meaning?: string;
};

export type CapaSummary = {
  countsByStatus: Record<CapaStatus, number>;
  overdue: number;
  dueThisWeek: number;
};

export type CapaPage = PageResponse<Capa>;
