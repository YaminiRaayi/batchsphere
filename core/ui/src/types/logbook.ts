export type InstrumentUsageCondition = "NORMAL" | "ANOMALY";

export type InstrumentUsageLog = {
  id: string;
  equipmentId: string;
  equipmentCode: string | null;
  equipmentName: string | null;
  usedBy: string;
  usedAt: string;
  purpose: string | null;
  samplingRequestId: string | null;
  condition: InstrumentUsageCondition;
  anomalyDescription: string | null;
  linkedDeviationId: string | null;
  linkedDeviationNumber: string | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string | null;
  updatedBy: string | null;
  active: boolean;
};

export type CreateInstrumentUsageLogRequest = {
  equipmentId: string;
  usedBy?: string;
  usedAt?: string;
  purpose?: string;
  samplingRequestId?: string;
  condition: InstrumentUsageCondition;
  anomalyDescription?: string;
  linkedDeviationId?: string;
};
