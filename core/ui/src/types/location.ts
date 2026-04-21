import type { StorageCondition } from "./material";

export type Warehouse = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
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
  racks: WarehouseTreeRack[];
};

export type WarehouseTreeNode = {
  id: string;
  warehouseCode: string;
  warehouseName: string;
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
  description?: string;
  createdBy: string;
};

export type CreateRoomRequest = {
  roomCode: string;
  roomName: string;
  storageCondition: StorageCondition;
  description?: string;
  createdBy: string;
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
