import type { PageResponse } from "./grn";

export type RiskAssessmentStatus = "DRAFT" | "UNDER_REVIEW" | "ACCEPTED" | "CLOSED";
export type RiskAssessmentScope = "PROCESS" | "PRODUCT" | "EQUIPMENT" | "SUPPLIER" | "SYSTEM" | "MATERIAL" | "CHANGE_CONTROL" | "OTHER";
export type RiskControlType = "ELIMINATE" | "REDUCE_PROBABILITY" | "REDUCE_SEVERITY" | "INCREASE_DETECTABILITY" | "ACCEPT";

export type RiskItem = {
  id: string;
  riskAssessmentId: string;
  sequenceNumber: number;
  processStep: string | null;
  failureMode: string;
  failureEffect: string;
  failureCause: string;
  currentControls: string | null;
  probability: number;
  severity: number;
  detectability: number;
  rpn: number;
  riskControlType: RiskControlType | null;
  proposedAction: string | null;
  actionOwner: string | null;
  actionDueDate: string | null;
  linkedCapaId: string | null;
  residualProbability: number | null;
  residualSeverity: number | null;
  residualDetectability: number | null;
  residualRpn: number;
  highRpn: boolean;
  critical: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type RiskAssessment = {
  id: string;
  assessmentNumber: string;
  title: string;
  scope: RiskAssessmentScope;
  scopeEntityType: string | null;
  scopeEntityId: string | null;
  scopeEntityDisplay: string | null;
  status: RiskAssessmentStatus;
  methodology: string | null;
  preparedBy: string;
  reviewedBy: string | null;
  acceptedBy: string | null;
  acceptedAt: string | null;
  acceptanceESignatureId: string | null;
  nextReviewDate: string | null;
  residualRiskAcceptable: boolean | null;
  overallRiskConclusion: string | null;
  highRpnItemsCount: number;
  criticalItemsCount: number;
  items: RiskItem[];
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateRiskAssessmentRequest = {
  title: string;
  scope: RiskAssessmentScope;
  scopeEntityType?: string;
  scopeEntityId?: string;
  scopeEntityDisplay?: string;
  methodology?: string;
  nextReviewDate?: string;
};

export type CreateRiskItemRequest = {
  processStep?: string;
  failureMode: string;
  failureEffect: string;
  failureCause: string;
  currentControls?: string;
  probability: number;
  severity: number;
  detectability: number;
  riskControlType?: RiskControlType;
  proposedAction?: string;
  actionOwner?: string;
  actionDueDate?: string;
  linkedCapaId?: string;
  residualProbability?: number;
  residualSeverity?: number;
  residualDetectability?: number;
};

export type AcceptRiskAssessmentRequest = {
  username: string;
  password: string;
  meaning?: string;
  reason?: string;
  residualRiskAcceptable?: boolean;
  overallRiskConclusion?: string;
};

export type RiskAssessmentSummary = {
  total: number;
  highRpnCount: number;
  pendingAcceptance: number;
  criticalItems: number;
};

export type RiskAssessmentPage = PageResponse<RiskAssessment>;
