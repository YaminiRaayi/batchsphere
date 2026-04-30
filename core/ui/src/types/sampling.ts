export type SamplingPlan = {
  id: string;
  samplingRequestId: string;
  specId: string;
  moaId: string;
  samplingMethod: string;
  sampleType: string;
  totalContainers: number;
  containersToSample: number;
  individualSampleQuantity: number | null;
  compositeSampleQuantity: number | null;
  samplingLocation: string;
  analystEmployeeCode: string;
  samplingToolId: string;
  photosensitiveHandlingRequired: boolean;
  hygroscopicHandlingRequired: boolean;
  coaBasedRelease: boolean;
  rationale: string | null;
  samplingLabelApplied: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  containerSamples: SamplingContainerSample[];
};

export type SamplingMethod =
  | "SQRT_N_PLUS_1"
  | "HUNDRED_PERCENT"
  | "COA_BASED_RELEASE";

export type SampleType = "INDIVIDUAL" | "COMPOSITE";

export type SamplingPlanRequest = {
  samplingMethod: SamplingMethod;
  sampleType: SampleType;
  specId: string;
  moaId: string;
  totalContainers: number;
  containersToSample: number;
  individualSampleQuantity: number;
  compositeSampleQuantity: number;
  samplingLocation: string;
  analystEmployeeCode: string;
  samplingToolId: string;
  photosensitiveHandlingRequired: boolean;
  hygroscopicHandlingRequired: boolean;
  coaBasedRelease: boolean;
  rationale?: string;
  containerSamples: SamplingContainerSampleRequest[];
  createdBy?: string;
  updatedBy?: string;
};

export type SamplingRequest = {
  id: string;
  grnId: string;
  grnItemId: string;
  parentSamplingRequestId: string | null;
  rootSamplingRequestId: string;
  materialId: string;
  batchId: string | null;
  palletId: string;
  cycleNumber: number;
  requestStatus: string;
  warehouseLabelApplied: boolean;
  samplingLabelRequired: boolean;
  vendorCoaReleaseAllowed: boolean;
  photosensitiveMaterial: boolean;
  hygroscopicMaterial: boolean;
  hazardousMaterial: boolean;
  selectiveMaterial: boolean;
  remarks: string | null;
  resampleReason: string | null;
  totalContainers: number;
  qcDecisionRemarks: string | null;
  qcDecidedBy: string | null;
  qcDecidedAt: string | null;
  qcDecisionConfirmedBy: string | null;
  qcDecisionConfirmationText: string | null;
  qcDecisionConfirmationAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  plan: SamplingPlan | null;
  sample: SampleRecord | null;
  qcDisposition: QcDisposition | null;
};

export type SamplingSummary = {
  countsByStatus: Record<string, number>;
};

export type SamplingContainerSample = {
  id: string;
  grnContainerId: string;
  containerNumber: string;
  sampledQuantity: number;
};

export type SamplingContainerSampleRequest = {
  grnContainerId: string;
  sampledQuantity: number;
};

export type SampleRecord = {
  id: string;
  sampleNumber: string;
  samplingRequestId: string;
  batchId: string | null;
  materialId: string;
  sampleType: string;
  sampleStatus: string;
  sampleQuantity: number;
  uom: string;
  collectedBy: string;
  collectedAt: string;
  samplingLocation: string;
  handoffToQcBy: string | null;
  handoffToQcAt: string | null;
  receivedByQc: string | null;
  receivedAtQc: string | null;
  receiptCondition: string | null;
  qcStorageLocation: string | null;
  retainedFlag: boolean;
  consumedFlag: boolean;
  destroyedFlag: boolean;
  retainedQuantity: number | null;
  retainedUntil: string | null;
  retentionExpired: boolean;
  remarks: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type QcDisposition = {
  id: string;
  sampleId: string | null;
  samplingRequestId: string;
  status: string;
  decisionRemarks: string | null;
  decisionBy: string | null;
  decisionAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type QcReceiptRequest = {
  receivedBy: string;
  receiptCondition: string;
  receiptTimestamp?: string;
  sampleStorageLocation: string;
  retainedFlag?: boolean;
  retainedQuantity?: number;
  retainedUntil?: string;
};

export type StartQcReviewRequest = {
  analystCode: string;
};

export type QcWorksheetRow = {
  id: string;
  sampleId: string;
  specParameterId: string;
  moaIdUsed: string | null;
  moaCodeUsed: string | null;
  analystCode: string;
  parameterName: string;
  testType: string;
  specMoaCode: string | null;
  specMoaId: string | null;
  resultValue: number | null;
  resultText: string | null;
  status: string;
  passFailFlag: boolean | null;
  lowerLimitApplied: number | null;
  upperLimitApplied: number | null;
  criteriaTypeApplied: string;
  unitApplied: string | null;
  criteriaDisplay: string;
  mandatory: boolean;
  sequence: number;
  enteredAt: string | null;
  remarks: string | null;
};

export type RecordQcWorksheetResultRequest = {
  resultValue?: number;
  resultText?: string;
  moaIdUsed?: string;
  remarks?: string;
};

export type QcInvestigation = {
  id: string;
  qcDispositionId: string;
  samplingRequestId: string;
  sampleId: string;
  qcTestResultId: string;
  investigationNumber: string;
  status: string;
  investigationType: "OOS" | "OOT" | "GENERAL";
  phase: "PHASE_I" | "PHASE_II";
  outcome: string | null;
  reason: string;
  initialAssessment: string | null;
  phaseOneSummary: string | null;
  phaseTwoAssessment: string | null;
  phaseTwoSummary: string | null;
  phaseTwoEscalatedBy: string | null;
  phaseTwoEscalatedAt: string | null;
  rootCause: string | null;
  resolutionRemarks: string | null;
  capaRequired: boolean;
  capaReference: string | null;
  outcomeSubmittedBy: string | null;
  outcomeSubmittedAt: string | null;
  openedBy: string;
  openedAt: string;
  closedBy: string | null;
  closedAt: string | null;
  qaReviewRemarks: string | null;
  qaReviewedBy: string | null;
  qaReviewedAt: string | null;
  qaReviewDecision: "APPROVED" | "RETURNED" | null;
  closureCategory: "INVALIDATED_NO_ASSIGNABLE_CAUSE" | "RETEST_FROM_RETAINED_SAMPLE" | "FRESH_RESAMPLE_REQUIRED" | "MATERIAL_REJECTION_CONFIRMED" | null;
  returnedToQcBy: string | null;
  returnedToQcAt: string | null;
  returnedToQcRemarks: string | null;
  qaReviewConfirmedBy: string | null;
  qaReviewConfirmationText: string | null;
  qaReviewConfirmationAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type OpenQcInvestigationRequest = {
  qcTestResultId: string;
  reason: string;
  initialAssessment?: string;
  investigationType?: "OOS" | "OOT" | "GENERAL";
};

export type EscalateQcInvestigationRequest = {
  phaseOneSummary: string;
  phaseTwoAssessment: string;
};

export type ResolveQcInvestigationRequest = {
  outcome: "RESUME_REVIEW" | "RETEST_REQUIRED" | "RESAMPLE_REQUIRED" | "REJECTED";
  phaseSummary: string;
  rootCause?: string;
  resolutionRemarks: string;
  capaRequired?: boolean;
  capaReference?: string;
};

export type CompleteQaInvestigationReviewRequest = {
  approved: boolean;
  qaReviewRemarks: string;
  confirmedBy: string;
  confirmationText: string;
};

export type ExecuteRetestRequest = {
  analystCode: string;
  remarks?: string;
};

export type ExecuteResampleRequest = {
  reason: string;
};

export type QcDecisionRequest = {
  approved: boolean;
  remarks: string;
  updatedBy: string;
  confirmedBy: string;
  confirmationText: string;
};

export type DestroyRetainedSampleRequest = {
  remarks: string;
};
