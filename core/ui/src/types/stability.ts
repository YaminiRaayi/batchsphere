export type StabilityStudySummary = {
  id: string;
  studyNumber: string;
  materialId: string | null;
  productName: string;
  batchNumber: string | null;
  conditionLabel: string;
  storageCondition: string | null;
  startDate: string;
  ootThresholdPct: number;
  status: string;
  completedTimepoints: number;
  totalTimepoints: number;
  hasOotAlert: boolean;
  createdAt: string;
};

export type StabilityTimepoint = {
  id: string;
  studyId: string;
  monthOffset: number;
  scheduledDate: string;
  pulledDate: string | null;
  pulledBy: string | null;
  status: string;
};

export type StabilityResult = {
  id: string;
  studyId: string;
  timepointId: string;
  specParameterId: string;
  parameterName: string;
  resultValue: number | null;
  resultText: string | null;
  unit: string | null;
  ootFlag: boolean;
  enteredBy: string;
  enteredAt: string;
};

export type StabilityStudyDetail = {
  study: StabilityStudySummary;
  timepoints: StabilityTimepoint[];
  results: StabilityResult[];
};

export type CreateStabilityStudyRequest = {
  studyNumber: string;
  materialId?: string;
  productName: string;
  batchNumber?: string;
  conditionLabel: string;
  storageCondition?: string;
  startDate: string;
  ootThresholdPct?: number;
  protocolMonths: number[];
  createdBy?: string;
};

export type RecordStabilityResultRequest = {
  specParameterId: string;
  parameterName?: string;
  resultValue?: number;
  resultText?: string;
  unit?: string;
  enteredBy?: string;
};

export type UpdateStabilityStatusRequest = {
  status: "ON_HOLD" | "COMPLETED" | "DISCONTINUED";
  updatedBy?: string;
  username?: string;
  password?: string;
  signatureMeaning?: string;
  ootDisposition?: string;
};

export type TrendPoint = {
  monthOffset: number;
  value: number;
  ootFlag: boolean;
};

export type TrendSeries = {
  specParameterId: string;
  parameterName: string;
  unit: string | null;
  points: TrendPoint[];
};
