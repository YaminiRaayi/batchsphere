export type StorageCondition =
  | "AMBIENT"
  | "ROOM_TEMPERATURE"
  | "CONTROLLED_ROOM_TEMPERATURE"
  | "REFRIGERATED_2_TO_8C"
  | "COLD"
  | "DEEP_FREEZER";

export type MaterialCategory =
  | "API"
  | "EXCIPIENT"
  | "SOLVENT"
  | "PACKAGING_MATERIAL"
  | "FINISHED_GOODS"
  | "REFERENCE_STANDARD";

export type LightSensitivity =
  | "NOT_SENSITIVE"
  | "PROTECT_FROM_LIGHT"
  | "AMBER_CONTAINER"
  | "STORE_IN_DARK";

export type Material = {
  id: string;
  materialCode: string;
  materialName: string;
  materialCategory: MaterialCategory | null;
  genericNames: string | null;
  materialType: string;
  uom: string;
  specId: string | null;
  hsnCode: string | null;
  casNumber: string | null;
  pharmacopoeialRef: string | null;
  storageCondition: StorageCondition;
  maxHumidity: string | null;
  lightSensitivity: LightSensitivity | null;
  hygroscopic: boolean;
  shelfLifeMonths: number | null;
  retestPeriodMonths: number | null;
  reorderLevel: string | null;
  leadTimeDays: number | null;
  controlledSubstance: boolean;
  photosensitive: boolean;
  hazardous: boolean;
  selectiveMaterial: boolean;
  vendorCoaReleaseAllowed: boolean;
  samplingRequired: boolean;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateMaterialRequest = {
  materialCode: string;
  materialName: string;
  materialCategory?: MaterialCategory;
  genericNames?: string;
  materialType: string;
  uom: string;
  specId: string;
  hsnCode?: string;
  casNumber?: string;
  pharmacopoeialRef?: string;
  storageCondition: StorageCondition;
  maxHumidity?: string;
  lightSensitivity?: LightSensitivity;
  hygroscopic: boolean;
  shelfLifeMonths?: number;
  retestPeriodMonths?: number;
  reorderLevel?: string;
  leadTimeDays?: number;
  controlledSubstance: boolean;
  photosensitive: boolean;
  hazardous: boolean;
  selectiveMaterial: boolean;
  vendorCoaReleaseAllowed: boolean;
  samplingRequired: boolean;
  description?: string;
  createdBy: string;
};
