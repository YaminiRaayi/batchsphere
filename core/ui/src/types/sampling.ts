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
  materialId: string;
  batchId: string | null;
  palletId: string;
  requestStatus: string;
  warehouseLabelApplied: boolean;
  samplingLabelRequired: boolean;
  vendorCoaReleaseAllowed: boolean;
  photosensitiveMaterial: boolean;
  hygroscopicMaterial: boolean;
  hazardousMaterial: boolean;
  selectiveMaterial: boolean;
  remarks: string | null;
  totalContainers: number;
  qcDecisionRemarks: string | null;
  qcDecidedBy: string | null;
  qcDecidedAt: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
  plan: SamplingPlan | null;
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
