import type { SamplingMethod } from "./sampling";

export type SpecType = "MATERIAL" | "IN_PROCESS" | "FINISHED_PRODUCT" | "PACKAGING";
export type SpecStatus = "DRAFT" | "UNDER_REVIEW" | "APPROVED" | "OBSOLETE";
export type TargetMarket =
  | "EU"
  | "US_FDA"
  | "UK_MHRA"
  | "INDIA_CDSCO"
  | "JAPAN_PMDA"
  | "CHINA_NMPA"
  | "WHO_PREQUALIFICATION"
  | "GLOBAL"
  | "INTERNAL";
export type CompendialRef =
  | "PH_EUR"
  | "USP"
  | "BP"
  | "JP"
  | "IP"
  | "CHN_PHARMACOPOEIA"
  | "WHO_INT"
  | "MULTI_COMPENDIAL"
  | "IN_HOUSE"
  | "NONE";
export type ReviewRoute = "QC_ONLY" | "QC_THEN_QA" | "QA_ONLY";

export type SpecParameterTestType =
  | "IDENTITY"
  | "ASSAY"
  | "PURITY"
  | "PHYSICAL"
  | "CHEMICAL"
  | "MICROBIOLOGICAL"
  | "DESCRIPTION";

export type SpecParameterCriteriaType = "NLT" | "NMT" | "RANGE" | "PASS_FAIL" | "COMPLIES" | "TEXT";

export type Spec = {
  id: string;
  specCode: string;
  specName: string;
  revision: string | null;
  specType: SpecType;
  status: SpecStatus;
  samplingMethod: SamplingMethod;
  targetMarket: TargetMarket | null;
  effectiveDate: string | null;
  expiryDate: string | null;
  compendialRef: CompendialRef | null;
  compendialEdition: string | null;
  referenceDocumentNo: string | null;
  referenceAttachment: string | null;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewRemarks: string | null;
  reviewRoute: ReviewRoute;
  approvedBy: string | null;
  approvedAt: string | null;
  previousSpecId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SpecParameter = {
  id: string;
  specId: string;
  parameterName: string;
  testType: SpecParameterTestType;
  moaId: string | null;
  criteriaType: SpecParameterCriteriaType;
  lowerLimit: number | null;
  upperLimit: number | null;
  textCriteria: string | null;
  compendialChapterRef: string | null;
  unit: string | null;
  isMandatory: boolean;
  sequence: number;
  notes: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type MaterialSpecLink = {
  id: string;
  materialId: string;
  specId: string;
  isActive: boolean;
  linkedBy: string;
  linkedAt: string;
  delinkedBy: string | null;
  delinkedAt: string | null;
  notes: string | null;
  createdAt: string;
};

export type CreateSpecRequest = {
  specCode: string;
  specName: string;
  revision?: string;
  specType: SpecType;
  samplingMethod: SamplingMethod;
  targetMarket?: TargetMarket;
  effectiveDate?: string;
  expiryDate?: string;
  compendialRef?: CompendialRef;
  compendialEdition?: string;
  referenceDocumentNo?: string;
  referenceAttachment?: string;
  reviewRoute?: ReviewRoute;
  materialIds?: string[];
  createdBy: string;
};

export type ReviewSubmissionRequest = {
  reviewRoute?: ReviewRoute;
};

export type RejectRequest = {
  reviewRemarks: string;
};

export type SpecParameterRequest = {
  parameterName: string;
  testType: SpecParameterTestType;
  moaId?: string;
  criteriaType: SpecParameterCriteriaType;
  lowerLimit?: number;
  upperLimit?: number;
  textCriteria?: string;
  compendialChapterRef?: string;
  unit?: string;
  isMandatory: boolean;
  sequence: number;
  notes?: string;
};

export type LinkMaterialSpecRequest = {
  specId: string;
  notes?: string;
};

export type DelinkMaterialSpecRequest = {
  notes?: string;
};
