import type { CompendialRef, ReviewRoute } from "./spec";

export type MoaType =
  | "HPLC"
  | "GC"
  | "UV_VIS"
  | "IR"
  | "TITRATION"
  | "KARL_FISCHER"
  | "LOD_OVEN"
  | "PHYSICAL"
  | "MICROBIOLOGICAL"
  | "VISUAL"
  | "OTHER";

export type MoaStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "OBSOLETE";
export type MoaValidationStatus = "NOT_VALIDATED" | "IN_VALIDATION" | "VALIDATED" | "VALIDATED_COMPENDIAL";
export type SampleSolutionStabilityUnit = "MINUTES" | "HOURS" | "DAYS";

export type Moa = {
  id: string;
  moaCode: string;
  moaName: string;
  revision: string | null;
  moaType: MoaType | null;
  principle: string | null;
  compendialRef: CompendialRef | null;
  instrumentType: string | null;
  reagentsAndStandards: string | null;
  systemSuitabilityCriteria: string | null;
  calculationFormula: string | null;
  reportableRange: string | null;
  referenceAttachment: string | null;
  validationReferenceNo: string | null;
  validationAttachment: string | null;
  sampleSolutionStabilityValue: number | null;
  sampleSolutionStabilityUnit: SampleSolutionStabilityUnit | null;
  sampleSolutionStabilityCondition: string | null;
  validationStatus: MoaValidationStatus;
  status: MoaStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  reviewRoute: ReviewRoute;
  approvedBy: string | null;
  approvedAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateMoaRequest = {
  moaCode: string;
  moaName: string;
  revision?: string;
  moaType?: MoaType;
  principle?: string;
  compendialRef?: CompendialRef;
  instrumentType?: string;
  reagentsAndStandards?: string;
  systemSuitabilityCriteria?: string;
  calculationFormula?: string;
  reportableRange?: string;
  referenceAttachment?: string;
  validationReferenceNo?: string;
  validationAttachment?: string;
  sampleSolutionStabilityValue?: number;
  sampleSolutionStabilityUnit?: SampleSolutionStabilityUnit;
  sampleSolutionStabilityCondition?: string;
  validationStatus?: MoaValidationStatus;
  reviewRoute?: ReviewRoute;
  createdBy: string;
};
