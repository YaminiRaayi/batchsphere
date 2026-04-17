import type { Batch } from "../types/batch";
import type { LoginResponse } from "../types/auth";
import type { CreateMoaRequest, Moa } from "../types/moa";
import type { InventoryRecord, InventoryTransaction } from "../types/inventory";
import type {
  CreatePalletRequest,
  CreateRackRequest,
  CreateRoomRequest,
  CreateShelfRequest,
  CreateWarehouseRequest,
  Pallet,
  Rack,
  Room,
  Shelf,
  Warehouse
} from "../types/location";
import type { CreateMaterialRequest, Material } from "../types/material";
import type { CreateSamplingToolRequest, SamplingTool } from "../types/sampling-tool";
import type { CreateSpecRequest, Spec } from "../types/spec";
import type { CreateSupplierRequest, Supplier } from "../types/supplier";
import type {
  CreateGrnRequest,
  Grn,
  GrnContainer,
  GrnDocument,
  MaterialLabel,
  PageResponse
} from "../types/grn";
import type { SamplingPlanRequest, SamplingRequest } from "../types/sampling";
import type {
  CreateVendorBusinessUnitRequest,
  VendorBusinessUnit
} from "../types/vendor-business-unit";
import type { CreateVendorRequest, Vendor } from "../types/vendor";
import { useAuthStore } from "../stores/authStore";
import { useAppShellStore } from "../stores/appShellStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

let accessToken: string | null = null;
let refreshRequest: Promise<string | null> | null = null;

type ApiErrorResponse = {
  error?: string;
  message?: string;
  details?: string;
  timestamp?: string;
};

class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function buildError(response: Response) {
  let details = `Request failed with status ${response.status}`;

  try {
    const data = (await response.json()) as ApiErrorResponse;
    if (data.details) {
      details = data.details;
    } else if (data.message) {
      details = data.message;
    } else if (data.error) {
      details = data.error;
    }
  } catch {
    // Ignore JSON parse failures and fall back to the HTTP status message.
  }

  return new ApiError(response.status, details);
}

function shouldAttemptRefresh(path: string) {
  return path !== "/api/auth/login" && path !== "/api/auth/refresh";
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }

  if (window.location.pathname !== "/login") {
    window.location.replace("/login");
  }
}

function clearClientSession() {
  setAccessToken(null);
  useAuthStore.getState().clearSession();
  useAppShellStore.getState().resetCurrentUser();
}

function getAuthHeaders(extraHeaders?: HeadersInit, includeJsonContentType = false): HeadersInit {
  return {
    Accept: "application/json",
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...(extraHeaders ?? {})
  };
}

async function refreshAccessToken() {
  const { refreshToken, tokenType } = useAuthStore.getState();
  if (!refreshToken) {
    clearClientSession();
    redirectToLogin();
    return null;
  }

  if (!refreshRequest) {
    refreshRequest = (async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        clearClientSession();
        redirectToLogin();
        throw await buildError(response);
      }

      const payload = (await response.json()) as LoginResponse;
      setAccessToken(payload.accessToken);
      useAuthStore.getState().setSession({
        accessToken: payload.accessToken,
        refreshToken: payload.refreshToken,
        tokenType: payload.tokenType ?? tokenType,
        user: payload.user
      });
      return payload.accessToken;
    })().finally(() => {
      refreshRequest = null;
    });
  }

  return refreshRequest;
}

async function performRequest(path: string, init: RequestInit, retryAuth = true) {
  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (response.status === 401 && retryAuth && shouldAttemptRefresh(path)) {
    try {
      const refreshedAccessToken = await refreshAccessToken();
      if (refreshedAccessToken) {
        return fetch(`${API_BASE_URL}${path}`, {
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${refreshedAccessToken}`
          }
        });
      }
    } catch {
      // Failed refresh falls through to the original HTTP error below.
    }
  }

  return response;
}

async function requestJson<T>(path: string): Promise<T> {
  const response = await performRequest(path, {
    headers: getAuthHeaders()
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

async function requestMutation<T>(path: string, init: RequestInit): Promise<T> {
  const response = await performRequest(path, {
    ...init,
    headers: getAuthHeaders(init.headers, true)
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

async function requestVoid(path: string, init: RequestInit): Promise<void> {
  const response = await performRequest(path, {
    ...init,
    headers: getAuthHeaders(init.headers, true)
  });

  if (!response.ok) {
    throw await buildError(response);
  }
}

async function requestMultipart<T>(path: string, formData: FormData): Promise<T> {
  const response = await performRequest(path, {
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    throw await buildError(response);
  }

  return (await response.json()) as T;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export async function login(username: string, password: string) {
  return requestMutation<LoginResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
}

export async function fetchCurrentUser() {
  return requestJson<LoginResponse["user"]>("/api/auth/me");
}

export async function logout() {
  return requestVoid("/api/auth/logout", {
    method: "POST"
  });
}

export async function fetchGrns(page = 0, size = 15) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Grn>>(`/api/grns?${params.toString()}`);
}

export async function createGrn(payload: CreateGrnRequest) {
  return requestMutation<Grn>("/api/grns", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function receiveGrn(id: string, updatedBy: string) {
  return requestMutation<Grn>(`/api/grns/${id}/receive`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function fetchGrnById(id: string) {
  return requestJson<Grn>(`/api/grns/${id}`);
}

export async function fetchGrnItemContainers(grnItemId: string) {
  return requestJson<GrnContainer[]>(`/api/grns/items/${grnItemId}/containers`);
}

export async function fetchContainerLabels(containerId: string) {
  return requestJson<MaterialLabel[]>(`/api/grns/containers/${containerId}/labels`);
}

export async function uploadGrnDocument(
  grnItemId: string,
  payload: {
    documentName: string;
    documentType: string;
    documentUrl?: string;
    createdBy: string;
    file: File;
  }
) {
  const formData = new FormData();
  formData.set("documentName", payload.documentName);
  formData.set("documentType", payload.documentType);
  if (payload.documentUrl) {
    formData.set("documentUrl", payload.documentUrl);
  }
  formData.set("createdBy", payload.createdBy);
  formData.set("file", payload.file);
  return requestMultipart<GrnDocument>(`/api/grns/items/${grnItemId}/documents`, formData);
}

export async function fetchSuppliers() {
  return requestJson<Supplier[]>("/api/suppliers");
}

export async function createSupplier(payload: CreateSupplierRequest) {
  return requestMutation<Supplier>("/api/suppliers", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSupplier(id: string, payload: CreateSupplierRequest) {
  return requestMutation<Supplier>(`/api/suppliers/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSupplier(id: string) {
  return requestVoid(`/api/suppliers/${id}`, {
    method: "DELETE"
  });
}

export async function fetchVendors(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Vendor>>(`/api/vendors?${params.toString()}`);
}

export async function createVendor(payload: CreateVendorRequest) {
  return requestMutation<Vendor>("/api/vendors", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendor(id: string, payload: CreateVendorRequest) {
  return requestMutation<Vendor>(`/api/vendors/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteVendor(id: string) {
  return requestVoid(`/api/vendors/${id}`, {
    method: "DELETE"
  });
}

export async function fetchVendorBusinessUnits(page = 0, size = 20, vendorId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });

  if (vendorId) {
    params.set("vendorId", vendorId);
  }

  return requestJson<PageResponse<VendorBusinessUnit>>(
    `/api/vendor-business-units?${params.toString()}`
  );
}

export async function createVendorBusinessUnit(
  vendorId: string,
  payload: CreateVendorBusinessUnitRequest
) {
  return requestMutation<VendorBusinessUnit>(`/api/vendors/${vendorId}/business-units`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateVendorBusinessUnit(
  vendorId: string,
  id: string,
  payload: CreateVendorBusinessUnitRequest
) {
  return requestMutation<VendorBusinessUnit>(`/api/vendors/${vendorId}/business-units/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      unitName: payload.unitName,
      address: payload.address,
      city: payload.city,
      state: payload.state,
      country: payload.country,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteVendorBusinessUnit(id: string) {
  return requestVoid(`/api/vendor-business-units/${id}`, {
    method: "DELETE"
  });
}

export async function fetchMaterials(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Material>>(`/api/materials?${params.toString()}`);
}

export async function createMaterial(payload: CreateMaterialRequest) {
  return requestMutation<Material>("/api/materials", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMaterial(id: string, payload: CreateMaterialRequest) {
  return requestMutation<Material>(`/api/materials/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMaterial(id: string) {
  return requestVoid(`/api/materials/${id}`, {
    method: "DELETE"
  });
}

export async function fetchSpecs() {
  return requestJson<Spec[]>("/api/specs");
}

export async function createSpec(payload: CreateSpecRequest) {
  return requestMutation<Spec>("/api/specs", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSpec(id: string, payload: CreateSpecRequest) {
  return requestMutation<Spec>(`/api/specs/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSpec(id: string) {
  return requestVoid(`/api/specs/${id}`, {
    method: "DELETE"
  });
}

export async function fetchMoas() {
  return requestJson<Moa[]>("/api/moas");
}

export async function createMoa(payload: CreateMoaRequest) {
  return requestMutation<Moa>("/api/moas", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateMoa(id: string, payload: CreateMoaRequest) {
  return requestMutation<Moa>(`/api/moas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteMoa(id: string) {
  return requestVoid(`/api/moas/${id}`, {
    method: "DELETE"
  });
}

export async function fetchSamplingTools() {
  return requestJson<SamplingTool[]>("/api/sampling-tools");
}

export async function createSamplingTool(payload: CreateSamplingToolRequest) {
  return requestMutation<SamplingTool>("/api/sampling-tools", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSamplingTool(id: string, payload: CreateSamplingToolRequest) {
  return requestMutation<SamplingTool>(`/api/sampling-tools/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

export async function deleteSamplingTool(id: string) {
  return requestVoid(`/api/sampling-tools/${id}`, {
    method: "DELETE"
  });
}

export async function fetchWarehouses(page = 0, size = 50) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Warehouse>>(`/api/warehouses?${params.toString()}`);
}

export async function createWarehouse(payload: CreateWarehouseRequest) {
  return requestMutation<Warehouse>("/api/warehouses", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateWarehouse(id: string, payload: CreateWarehouseRequest) {
  return requestMutation<Warehouse>(`/api/warehouses/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      warehouseCode: payload.warehouseCode,
      warehouseName: payload.warehouseName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteWarehouse(id: string) {
  return requestVoid(`/api/warehouses/${id}`, {
    method: "DELETE"
  });
}

export async function fetchRooms(page = 0, size = 50, warehouseId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (warehouseId) {
    params.set("warehouseId", warehouseId);
  }
  return requestJson<PageResponse<Room>>(`/api/rooms?${params.toString()}`);
}

export async function createRoom(warehouseId: string, payload: CreateRoomRequest) {
  return requestMutation<Room>(`/api/warehouses/${warehouseId}/rooms`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRoom(warehouseId: string, id: string, payload: CreateRoomRequest) {
  return requestMutation<Room>(`/api/warehouses/${warehouseId}/rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      roomCode: payload.roomCode,
      roomName: payload.roomName,
      storageCondition: payload.storageCondition,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteRoom(id: string) {
  return requestVoid(`/api/rooms/${id}`, {
    method: "DELETE"
  });
}

export async function fetchRacks(page = 0, size = 50, roomId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (roomId) {
    params.set("roomId", roomId);
  }
  return requestJson<PageResponse<Rack>>(`/api/racks?${params.toString()}`);
}

export async function createRack(roomId: string, payload: CreateRackRequest) {
  return requestMutation<Rack>(`/api/rooms/${roomId}/racks`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateRack(roomId: string, id: string, payload: CreateRackRequest) {
  return requestMutation<Rack>(`/api/rooms/${roomId}/racks/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      rackCode: payload.rackCode,
      rackName: payload.rackName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteRack(id: string) {
  return requestVoid(`/api/racks/${id}`, {
    method: "DELETE"
  });
}

export async function fetchShelves(page = 0, size = 50, rackId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (rackId) {
    params.set("rackId", rackId);
  }
  return requestJson<PageResponse<Shelf>>(`/api/shelves?${params.toString()}`);
}

export async function createShelf(rackId: string, payload: CreateShelfRequest) {
  return requestMutation<Shelf>(`/api/racks/${rackId}/shelves`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateShelf(rackId: string, id: string, payload: CreateShelfRequest) {
  return requestMutation<Shelf>(`/api/racks/${rackId}/shelves/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      shelfCode: payload.shelfCode,
      shelfName: payload.shelfName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deleteShelf(id: string) {
  return requestVoid(`/api/shelves/${id}`, {
    method: "DELETE"
  });
}

export async function fetchPallets(page = 0, size = 50, shelfId?: string) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  if (shelfId) {
    params.set("shelfId", shelfId);
  }
  return requestJson<PageResponse<Pallet>>(`/api/pallets?${params.toString()}`);
}

export async function createPallet(shelfId: string, payload: CreatePalletRequest) {
  return requestMutation<Pallet>(`/api/shelves/${shelfId}/pallets`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updatePallet(shelfId: string, id: string, payload: CreatePalletRequest) {
  return requestMutation<Pallet>(`/api/shelves/${shelfId}/pallets/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      palletCode: payload.palletCode,
      palletName: payload.palletName,
      description: payload.description,
      updatedBy: payload.createdBy
    })
  });
}

export async function deletePallet(id: string) {
  return requestVoid(`/api/pallets/${id}`, {
    method: "DELETE"
  });
}

export async function fetchBatches(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<Batch>>(`/api/batches?${params.toString()}`);
}

export async function fetchInventory(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<InventoryRecord>>(`/api/inventory?${params.toString()}`);
}

export async function fetchInventoryTransactions(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<InventoryTransaction>>(
    `/api/inventory/transactions?${params.toString()}`
  );
}

export async function updateInventoryStatus(id: string, status: InventoryRecord["status"], remarks?: string) {
  return requestMutation<InventoryRecord>(`/api/inventory/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({
      status,
      remarks
    })
  });
}

export async function fetchSamplingRequests(page = 0, size = 20) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort: "createdAt,desc"
  });
  return requestJson<PageResponse<SamplingRequest>>(
    `/api/sampling-requests?${params.toString()}`
  );
}

export async function createSamplingPlan(
  samplingRequestId: string,
  payload: SamplingPlanRequest
) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/plans`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateSamplingPlan(
  samplingRequestId: string,
  planId: string,
  payload: SamplingPlanRequest
) {
  return requestMutation<SamplingRequest>(
    `/api/sampling-requests/${samplingRequestId}/plans/${planId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload)
    }
  );
}

export async function completeSampling(samplingRequestId: string, updatedBy: string) {
  return requestMutation<SamplingRequest>(`/api/sampling-requests/${samplingRequestId}/complete`, {
    method: "POST",
    body: JSON.stringify({ updatedBy })
  });
}

export async function recordQcDecision(
  samplingRequestId: string,
  payload: { approved: boolean; remarks: string; updatedBy: string }
) {
  return requestMutation<SamplingRequest>(
    `/api/sampling-requests/${samplingRequestId}/qc-decision`,
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );
}
