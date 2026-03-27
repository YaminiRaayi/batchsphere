export type StorageCondition =
  | "AMBIENT"
  | "ROOM_TEMPERATURE"
  | "CONTROLLED_ROOM_TEMPERATURE"
  | "REFRIGERATED_2_TO_8C"
  | "COLD"
  | "DEEP_FREEZER";

export type Material = {
  id: string;
  materialCode: string;
  materialName: string;
  materialType: string;
  uom: string;
  storageCondition: StorageCondition;
  photosensitive: boolean;
  hygroscopic: boolean;
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
  materialType: string;
  uom: string;
  storageCondition: StorageCondition;
  photosensitive: boolean;
  hygroscopic: boolean;
  hazardous: boolean;
  selectiveMaterial: boolean;
  vendorCoaReleaseAllowed: boolean;
  samplingRequired: boolean;
  description?: string;
  createdBy: string;
};
