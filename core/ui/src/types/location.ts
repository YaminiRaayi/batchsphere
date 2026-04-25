import type { StorageCondition } from "./material";

export type Warehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  businessUnitId: string | null;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type Room = {
  id: string;
  warehouseId: string;
  roomCode: string;
  roomName: string;
  storageCondition: StorageCondition;
  description: string | null;
  maxCapacity?: number | null;
  capacityUom?: string | null;
  temperatureRange?: string | null;
  humidityRange?: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type Rack = {
  id: string;
  roomId: string;
  rackCode: string;
  rackName: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type Shelf = {
  id: string;
  rackId: string;
  shelfCode: string;
  shelfName: string;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type Pallet = {
  id: string;
  shelfId: string;
  palletCode: string;
  palletName: string;
  storageCondition: StorageCondition;
  description: string | null;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type WarehouseTreePallet = {
  id: string;
  palletCode: string;
  palletName: string;
  storageCondition: StorageCondition;
};

export type WarehouseTreeShelf = {
  id: string;
  shelfCode: string;
  shelfName: string;
  pallets: WarehouseTreePallet[];
};

export type WarehouseTreeRack = {
  id: string;
  rackCode: string;
  rackName: string;
  shelves: WarehouseTreeShelf[];
};

export type WarehouseTreeRoom = {
  id: string;
  roomCode: string;
  roomName: string;
  storageCondition: StorageCondition;
  maxCapacity?: number | null;
  capacityUom?: string | null;
  temperatureRange?: string | null;
  humidityRange?: string | null;
  racks: WarehouseTreeRack[];
};

export type WarehouseTreeNode = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
  businessUnitId: string | null;
  businessUnitCode: string | null;
  businessUnitName: string | null;
  rooms: WarehouseTreeRoom[];
};

export type AvailablePallet = {
  palletId: string;
  palletCode: string;
  palletName: string;
  shelfId: string;
  shelfCode: string;
  rackId: string;
  rackCode: string;
  roomId: string;
  roomCode: string;
  warehouseId: string;
  warehouseCode: string;
  storageCondition: StorageCondition;
};

export type CreateWarehouseRequest = {
  warehouseCode: string;
  warehouseName: string;
  businessUnitId?: string;
  description?: string;
  createdBy: string;
};

export type CreateRoomRequest = {
  roomCode: string;
  roomName: string;
  storageCondition: StorageCondition;
  description?: string;
  maxCapacity?: number;
  capacityUom?: string;
  temperatureRange?: string;
  humidityRange?: string;
  createdBy: string;
};

export type WarehouseZoneRule = {
  id: string;
  roomId: string;
  roomCode: string | null;
  roomName: string | null;
  zoneName: string;
  allowedMaterialType: string | null;
  allowedStorageCondition: StorageCondition | null;
  restrictedAccess: boolean;
  quarantineOnly: boolean;
  rejectedOnly: boolean;
  notes: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateWarehouseZoneRuleRequest = {
  roomId: string;
  zoneName: string;
  allowedMaterialType?: string;
  allowedStorageCondition?: StorageCondition;
  restrictedAccess?: boolean;
  quarantineOnly?: boolean;
  rejectedOnly?: boolean;
  notes?: string;
};

export type MaterialLocationRule = {
  id: string;
  materialId: string;
  materialCode: string | null;
  materialName: string | null;
  materialType: string | null;
  storageCondition: string | null;
  defaultWarehouseId: string | null;
  defaultWarehouseCode: string | null;
  defaultRoomId: string | null;
  defaultRoomCode: string | null;
  defaultRackId: string | null;
  defaultRackCode: string | null;
  quarantineWarehouseId: string | null;
  quarantineWarehouseCode: string | null;
  quarantineRoomId: string | null;
  quarantineRoomCode: string | null;
  notes: string | null;
  currentLots: number;
  currentStock: number;
  stockUom: string | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateMaterialLocationRuleRequest = {
  materialId: string;
  defaultWarehouseId?: string;
  defaultRoomId?: string;
  defaultRackId?: string;
  quarantineWarehouseId?: string;
  quarantineRoomId?: string;
  notes?: string;
};

export type WmsSummary = {
  warehouses: {
    warehouseId: string;
    businessUnitId: string | null;
    businessUnitCode: string | null;
    businessUnitName: string | null;
    warehouseCode: string;
    warehouseName: string;
    roomCount: number;
    rackCount: number;
    shelfCount: number;
    palletCount: number;
  }[];
  rooms: {
    roomId: string;
    warehouseId: string;
    businessUnitId: string | null;
    businessUnitCode: string | null;
    businessUnitName: string | null;
    warehouseCode: string | null;
    roomCode: string;
    roomName: string;
    storageCondition: StorageCondition;
    maxCapacity: number | null;
    capacityUom: string | null;
    temperatureRange: string | null;
    humidityRange: string | null;
    currentLoad: number;
    currentLots: number;
    activePallets: number;
    totalPallets: number;
    rackCount: number;
    shelfCount: number;
    occupancyPercent: number;
  }[];
  zoneRules: WarehouseZoneRule[];
  materialLocations: MaterialLocationRule[];
};

export type CreateRackRequest = {
  rackCode: string;
  rackName: string;
  description?: string;
  createdBy: string;
};

export type CreateShelfRequest = {
  shelfCode: string;
  shelfName: string;
  description?: string;
  createdBy: string;
};

export type CreatePalletRequest = {
  palletCode: string;
  palletName: string;
  description?: string;
  createdBy: string;
};
