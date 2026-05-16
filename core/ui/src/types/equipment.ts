import type { PageResponse } from "./grn";

export type EquipmentType =
  | "BALANCE"
  | "HPLC"
  | "GC"
  | "UV_SPECTROPHOTOMETER"
  | "IR_SPECTROPHOTOMETER"
  | "DISSOLUTION"
  | "PARTICLE_SIZE"
  | "KF_TITRATOR"
  | "PH_METER"
  | "TOC_ANALYZER"
  | "STABILITY_CHAMBER"
  | "REFRIGERATOR"
  | "AUTOCLAVE"
  | "LAB_COMPUTER"
  | "OTHER";

export type EquipmentStatus = "ACTIVE" | "UNDER_MAINTENANCE" | "RETIRED" | "PENDING_QUALIFICATION";

export type QualificationType = "IQ" | "OQ" | "PQ" | "REQUALIFICATION" | "CALIBRATION";

export type QualificationResult = "PASS" | "FAIL" | "CONDITIONAL_PASS" | "PENDING";

export type Equipment = {
  id: string;
  equipmentId: string;
  name: string;
  equipmentType: EquipmentType;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  location: string;
  status: EquipmentStatus;
  installationDate: string | null;
  lastQualificationDate: string | null;
  nextQualificationDue: string | null;
  lastCalibrationDate: string | null;
  nextCalibrationDue: string | null;
  calibrationIntervalMonths: number | null;
  responsibleAnalyst: string | null;
  calibrationOverdue: boolean;
  qualificationOverdue: boolean;
  daysUntilCalibrationDue: number | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type QualificationRecord = {
  id: string;
  equipmentId: string;
  qualificationType: QualificationType;
  protocolReference: string;
  performedBy: string;
  performedAt: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  result: QualificationResult;
  deviationNoted: string | null;
  nextRequalificationDue: string | null;
  calibrationCertificateNumber: string | null;
  calibrationCertificateExpiry: string | null;
  eSignatureId: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
};

export type CreateEquipmentRequest = {
  name: string;
  equipmentType: EquipmentType;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  calibrationIntervalMonths?: number;
  responsibleAnalyst?: string;
};

export type UpdateEquipmentRequest = {
  name: string;
  location: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installationDate?: string;
  calibrationIntervalMonths?: number;
  responsibleAnalyst?: string;
  status: EquipmentStatus;
};

export type CreateQualificationRecordRequest = {
  qualificationType: QualificationType;
  protocolReference: string;
  performedBy: string;
  performedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  result: QualificationResult;
  deviationNoted?: string;
  nextRequalificationDue?: string;
  calibrationCertificateNumber?: string;
  calibrationCertificateExpiry?: string;
  username?: string;
  password?: string;
  signatureMeaning?: string;
};

export type EquipmentSummary = {
  totalActive: number;
  pendingQualification: number;
  underMaintenance: number;
  calibrationDueSoon: number;
  qualificationDueSoon: number;
  calibrationOverdue: number;
  qualificationOverdue: number;
};

export type EquipmentPage = PageResponse<Equipment>;
