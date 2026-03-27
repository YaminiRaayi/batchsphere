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
