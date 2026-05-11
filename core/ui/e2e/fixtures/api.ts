import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { request, expect } from "@playwright/test";

type RunIdState = {
  runId: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "..", ".auth");

export async function readRunId() {
  const file = await readFile(path.join(authDir, "run-id.json"), "utf8");
  return (JSON.parse(file) as RunIdState).runId;
}

export function e2eRunLabel(runId: string, scope: string) {
  return `${scope}-${runId}`.toUpperCase();
}

export async function createAdminApiContext() {
  const api = await request.newContext({
    baseURL: "http://127.0.0.1:8080",
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json"
    }
  });

  const response = await api.post("/api/auth/login", {
    data: {
      username: "admin",
      password: "Admin@123"
    }
  });

  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as { accessToken: string };
  await api.dispose();

  return request.newContext({
    baseURL: "http://127.0.0.1:8080",
    extraHTTPHeaders: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${payload.accessToken}`
    }
  });
}

async function fetchPagedAdmin<T>(pathName: string) {
  const api = await createAdminApiContext();
  const response = await api.get(pathName);
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as T[] | { content?: T[] };
  await api.dispose();
  if (Array.isArray(payload)) {
    return payload;
  }
  expect(Array.isArray(payload.content), `Expected ${pathName} to return an array or paged content`).toBeTruthy();
  return payload.content ?? [];
}

async function findPagedAdmin<T>(pathName: string, predicate: (entry: T) => boolean, label: string) {
  const content = await fetchPagedAdmin<T>(pathName);
  const match = content.find(predicate);
  expect(match, `${label} not found`).toBeTruthy();
  return match as T;
}

export async function findSupplierByCode(code: string) {
  return findPagedAdmin<{ id: string; supplierCode: string; supplierName: string }>(
    "/api/suppliers?page=0&size=500",
    (supplier) => supplier.supplierCode === code,
    `Supplier ${code}`
  );
}

export async function findVendorByCode(code: string) {
  return findPagedAdmin<{ id: string; vendorCode: string; vendorName: string }>(
    "/api/vendors?page=0&size=500",
    (vendor) => vendor.vendorCode === code,
    `Vendor ${code}`
  );
}

export async function findVendorBusinessUnitByCode(code: string) {
  return findPagedAdmin<{ id: string; buCode: string | null; unitName: string; vendorId: string }>(
    "/api/vendor-business-units?page=0&size=500",
    (businessUnit) => businessUnit.buCode === code,
    `Vendor business unit ${code}`
  );
}

export async function findSpecByCode(code: string) {
  return findPagedAdmin<{ id: string; specCode: string; specName: string; status: string }>(
    "/api/specs?page=0&size=500",
    (spec) => spec.specCode === code,
    `Spec ${code}`
  );
}

export async function findMaterialByName(name: string) {
  return findPagedAdmin<{ id: string; materialCode: string; materialName: string; specId: string | null }>(
    "/api/materials?page=0&size=500",
    (material) => material.materialName === name,
    `Material ${name}`
  );
}

export async function findGrnByNumber(grnNumber: string) {
  const grn = await findPagedAdmin<{
    id: string;
    grnNumber: string;
    items: Array<{ id: string; batchId: string | null; materialId: string }>;
  }>(
    "/api/grns?page=0&size=500&sort=createdAt,desc",
    (grn) => grn.grnNumber === grnNumber,
    `GRN ${grnNumber}`
  );

  const api = await createAdminApiContext();
  const response = await api.get(`/api/grns/${grn.id}`);
  expect(response.ok()).toBeTruthy();
  const detail = await response.json();
  await api.dispose();
  return detail as {
    id: string;
    grnNumber: string;
    items: Array<{ id: string; batchId: string | null; materialId: string }>;
  };
}

export async function fetchGrnItemContainers(grnItemId: string) {
  const api = await createAdminApiContext();
  const response = await api.get(`/api/grns/items/${grnItemId}/containers`);
  expect(response.ok()).toBeTruthy();
  const containers = await response.json();
  await api.dispose();
  return containers as Array<{
    id: string;
    containerNumber: string;
    quantity: number;
    remainingQuantity: number;
    status: string;
  }>;
}

export async function findSamplingRequestByGrnItemId(grnItemId: string) {
  return findPagedAdmin<{
    id: string;
    grnItemId: string;
    materialId: string;
    batchId: string | null;
    requestStatus: string;
  }>(
    "/api/sampling-requests?page=0&size=500&sort=createdAt,desc",
    (request) => request.grnItemId === grnItemId,
    `Sampling request for GRN item ${grnItemId}`
  );
}

export async function fetchAuditEvents(entityType: string, entityId: string) {
  const api = await createAdminApiContext();
  const params = new URLSearchParams({ entityType, entityId });
  const response = await api.get(`/api/audit-events?${params.toString()}`);
  expect(response.ok()).toBeTruthy();
  const events = await response.json();
  await api.dispose();
  return events as Array<{
    entityType: string;
    entityId: string;
    eventType: string;
    oldValue: string | null;
    newValue: string | null;
    reason: string | null;
    actor: string;
  }>;
}

export async function fetchESignatures(entityType: string, entityId: string) {
  const api = await createAdminApiContext();
  const params = new URLSearchParams({ entityType, entityId });
  const response = await api.get(`/api/e-signatures?${params.toString()}`);
  expect(response.ok()).toBeTruthy();
  const signatures = await response.json();
  await api.dispose();
  return signatures as Array<{
    entityType: string;
    entityId: string;
    action: string;
    meaning: string;
    signerUsername: string;
    verificationStatus: string;
  }>;
}

export async function findWarehouseByCode(code: string) {
  const tree = await fetchWarehouseTreeAdmin();
  const warehouse = tree.find((entry) => entry.warehouseCode === code);
  expect(warehouse, `Warehouse ${code} not found`).toBeTruthy();
  return warehouse as (typeof tree)[number];
}

export async function createApprovedSpec(suffix: string) {
  const api = await createAdminApiContext();

  const createResponse = await api.post("/api/specs", {
    data: {
      specCode: `SPEC-${suffix}`,
      specName: `E2E Spec ${suffix}`,
      revision: "1.0",
      specType: "MATERIAL",
      samplingMethod: "SQRT_N_PLUS_1",
      compendialRef: "IN_HOUSE",
      reviewRoute: "QC_ONLY",
      createdBy: "admin"
    }
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();

  const submitResponse = await api.post(`/api/specs/${created.id}/submit`, {
    data: {}
  });
  expect(submitResponse.ok()).toBeTruthy();

  const approveResponse = await api.post(`/api/specs/${created.id}/approve`, {
    data: {}
  });
  expect(approveResponse.ok()).toBeTruthy();
  const approved = await approveResponse.json();

  await api.dispose();
  return approved as { id: string; specCode: string; specName: string };
}

export async function createApprovedMoa(suffix: string) {
  const api = await createAdminApiContext();

  const createResponse = await api.post("/api/moas", {
    data: {
      moaCode: `MOA-${suffix}`,
      moaName: `E2E MoA ${suffix}`,
      revision: "1.0",
      moaType: "HPLC",
      compendialRef: "IN_HOUSE",
      validationStatus: "VALIDATED",
      validationReferenceNo: `VAL-${suffix}`,
      reviewRoute: "QC_ONLY",
      createdBy: "admin"
    }
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();

  const submitResponse = await api.post(`/api/moas/${created.id}/submit`, {
    data: {}
  });
  expect(submitResponse.ok()).toBeTruthy();

  const approveResponse = await api.post(`/api/moas/${created.id}/approve`, {
    data: {}
  });
  expect(approveResponse.ok()).toBeTruthy();
  const approved = await approveResponse.json();

  await api.dispose();
  return approved as { id: string; moaCode: string; moaName: string };
}

export async function createSamplingReadySpecSetup(suffix: string) {
  const api = await createAdminApiContext();

  const specCreateResponse = await api.post("/api/specs", {
    data: {
      specCode: `SPEC-${suffix}`,
      specName: `E2E Sampling Spec ${suffix}`,
      revision: "1.0",
      specType: "MATERIAL",
      samplingMethod: "SQRT_N_PLUS_1",
      compendialRef: "IN_HOUSE",
      reviewRoute: "QC_ONLY",
      createdBy: "admin"
    }
  });
  expect(specCreateResponse.ok()).toBeTruthy();
  const specDraft = await specCreateResponse.json();

  const moaCreateResponse = await api.post("/api/moas", {
    data: {
      moaCode: `MOA-${suffix}`,
      moaName: `E2E Sampling MoA ${suffix}`,
      revision: "1.0",
      moaType: "HPLC",
      compendialRef: "IN_HOUSE",
      validationStatus: "VALIDATED",
      validationReferenceNo: `VAL-${suffix}`,
      reviewRoute: "QC_ONLY",
      createdBy: "admin"
    }
  });
  expect(moaCreateResponse.ok()).toBeTruthy();
  const moaDraft = await moaCreateResponse.json();

  const parameterResponse = await api.post(`/api/specs/${specDraft.id}/parameters`, {
    data: {
      parameterName: `Assay ${suffix}`,
      testType: "ASSAY",
      moaId: moaDraft.id,
      criteriaType: "RANGE",
      lowerLimit: 98,
      upperLimit: 102,
      unit: "%",
      isMandatory: true,
      sequence: 1,
      notes: "E2E worksheet parameter"
    }
  });
  expect(parameterResponse.ok()).toBeTruthy();
  const parameter = await parameterResponse.json();

  const moaSubmitResponse = await api.post(`/api/moas/${moaDraft.id}/submit`, { data: {} });
  expect(moaSubmitResponse.ok()).toBeTruthy();
  const moaApproveResponse = await api.post(`/api/moas/${moaDraft.id}/approve`, { data: {} });
  expect(moaApproveResponse.ok()).toBeTruthy();
  const moa = await moaApproveResponse.json();

  const specSubmitResponse = await api.post(`/api/specs/${specDraft.id}/submit`, { data: {} });
  expect(specSubmitResponse.ok()).toBeTruthy();
  const specApproveResponse = await api.post(`/api/specs/${specDraft.id}/approve`, { data: {} });
  expect(specApproveResponse.ok()).toBeTruthy();
  const spec = await specApproveResponse.json();

  await api.dispose();
  return {
    spec: spec as { id: string; specCode: string; specName: string },
    moa: moa as { id: string; moaCode: string; moaName: string },
    parameter: parameter as { id: string; parameterName: string }
  };
}

export async function createMaterialRecord(params: {
  suffix: string;
  specId: string;
  materialName?: string;
  description?: string;
  materialCode?: string;
}) {
  const api = await createAdminApiContext();
  const suffix = params.suffix;
  const normalizedCode =
    params.materialCode ??
    `E2E-${suffix}`
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 50);

  const createResponse = await api.post("/api/materials", {
    data: {
      materialCode: normalizedCode,
      materialName: params.materialName ?? `E2E Material ${suffix}`,
      materialCategory: "API",
      genericNames: "",
      materialType: "CRITICAL",
      uom: "KG",
      specId: params.specId,
      hsnCode: "",
      casNumber: "",
      pharmacopoeialRef: "",
      storageCondition: "AMBIENT",
      maxHumidity: "",
      lightSensitivity: null,
      hygroscopic: false,
      shelfLifeMonths: 24,
      retestPeriodMonths: 12,
      reorderLevel: "",
      leadTimeDays: 14,
      controlledSubstance: false,
      photosensitive: false,
      hazardous: false,
      selectiveMaterial: false,
      vendorCoaReleaseAllowed: false,
      samplingRequired: true,
      description: params.description ?? "",
      createdBy: "admin"
    }
  });

  expect(createResponse.ok()).toBeTruthy();
  const created = await createResponse.json();
  await api.dispose();
  return created as { id: string; materialCode: string; materialName: string; specId: string | null };
}

export async function createSamplingToolRecord(suffix: string) {
  const api = await createAdminApiContext();
  const response = await api.post("/api/sampling-tools", {
    data: {
      toolCode: `TOOL-${suffix}`,
      toolName: `E2E Sampling Tool ${suffix}`,
      description: `Sampling tool ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await api.dispose();
  return created as { id: string; toolCode: string; toolName: string };
}

export async function fetchWarehouseTreeAdmin() {
  const api = await createAdminApiContext();
  const response = await api.get("/api/warehouses/tree");
  expect(response.ok()).toBeTruthy();
  const tree = await response.json();
  await api.dispose();
  return tree as Array<{
    id: string;
    warehouseCode: string;
    warehouseName: string;
    rooms: Array<{
      id: string;
      roomCode: string;
      roomName: string;
      racks: Array<{
        id: string;
        rackCode: string;
        shelves: Array<{
          id: string;
          shelfCode: string;
          pallets: Array<{
            id: string;
            palletCode: string;
            palletName: string;
          }>;
        }>;
      }>;
    }>;
  }>;
}

export async function createMaterialLocationRuleRecord(params: {
  materialId: string;
  defaultWarehouseId: string;
  defaultRoomId: string;
  defaultRackId: string;
  quarantineWarehouseId?: string;
  quarantineRoomId?: string;
  notes?: string;
}) {
  const api = await createAdminApiContext();
  const response = await api.post("/api/wms/material-location-rules", {
    data: params
  });
  expect(response.ok()).toBeTruthy();
  const created = await response.json();
  await api.dispose();
  return created as { id: string };
}

export async function createVmsChain(suffix: string) {
  const api = await createAdminApiContext();

  const supplierResponse = await api.post("/api/suppliers", {
    data: {
      supplierCode: `SUP-${suffix}`,
      supplierName: `E2E Supplier ${suffix}`,
      contactPerson: "E2E Supplier Contact",
      email: `supplier-${suffix}@example.com`,
      phone: "9876543210",
      createdBy: "admin"
    }
  });
  expect(supplierResponse.ok()).toBeTruthy();
  const supplier = (await supplierResponse.json()) as { id: string; supplierCode: string; supplierName: string };

  const vendorResponse = await api.post("/api/vendors", {
    data: {
      vendorCode: `VEN-${suffix}`,
      vendorName: `E2E Vendor ${suffix}`,
      vendorCategory: "API_SUPPLIER",
      contactPerson: "E2E Vendor Contact",
      email: `vendor-${suffix}@example.com`,
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      createdBy: "admin"
    }
  });
  expect(vendorResponse.ok()).toBeTruthy();
  const vendor = (await vendorResponse.json()) as { id: string; vendorCode: string; vendorName: string };

  const vendorBusinessUnitResponse = await api.post(`/api/vendors/${vendor.id}/business-units`, {
    data: {
      unitName: `E2E Site ${suffix}`,
      buCode: `SITE-${suffix}`,
      siteType: "MANUFACTURING",
      address: "Plot 42, APIIC Industrial Park",
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      createdBy: "admin"
    }
  });
  expect(vendorBusinessUnitResponse.ok()).toBeTruthy();
  const vendorBusinessUnit = (await vendorBusinessUnitResponse.json()) as {
    id: string;
    buCode: string | null;
    unitName: string;
  };

  await api.dispose();
  return { supplier, vendor, vendorBusinessUnit };
}

export async function createWarehouseHierarchy(suffix: string) {
  const api = await createAdminApiContext();

  const businessUnitResponse = await api.post("/api/business-units", {
    data: {
      unitCode: `BU-${suffix}`,
      unitName: `E2E BU ${suffix}`,
      description: `E2E warehouse hierarchy ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(businessUnitResponse.ok()).toBeTruthy();
  const businessUnit = (await businessUnitResponse.json()) as {
    id: string;
    unitCode: string;
    unitName: string;
  };

  const warehouseResponse = await api.post("/api/warehouses", {
    data: {
      warehouseCode: `WH-${suffix}`,
      warehouseName: `E2E Warehouse ${suffix}`,
      businessUnitId: businessUnit.id,
      description: `E2E Warehouse ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(warehouseResponse.ok()).toBeTruthy();
  const warehouse = (await warehouseResponse.json()) as {
    id: string;
    warehouseCode: string;
    warehouseName: string;
  };

  const roomResponse = await api.post(`/api/warehouses/${warehouse.id}/rooms`, {
    data: {
      roomCode: `R-${suffix}`,
      roomName: `E2E Room ${suffix}`,
      storageCondition: "AMBIENT",
      description: `Ambient room ${suffix}`,
      capacityUom: "KG",
      temperatureRange: "25C",
      humidityRange: "NMT 60%",
      createdBy: "admin"
    }
  });
  expect(roomResponse.ok()).toBeTruthy();
  const room = (await roomResponse.json()) as { id: string; roomCode: string; roomName: string };

  const rackResponse = await api.post(`/api/rooms/${room.id}/racks`, {
    data: {
      rackCode: `R-${suffix}-RK-01`,
      rackName: `Rack 01 ${suffix}`,
      description: `Primary rack ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(rackResponse.ok()).toBeTruthy();
  const rack = (await rackResponse.json()) as { id: string; rackCode: string; rackName: string };

  const shelfResponse = await api.post(`/api/racks/${rack.id}/shelves`, {
    data: {
      shelfCode: `R-${suffix}-SH-01`,
      shelfName: `Shelf 01 ${suffix}`,
      description: `Primary shelf ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(shelfResponse.ok()).toBeTruthy();
  const shelf = (await shelfResponse.json()) as { id: string; shelfCode: string; shelfName: string };

  const palletResponse = await api.post(`/api/shelves/${shelf.id}/pallets`, {
    data: {
      palletCode: `P-${suffix}`,
      palletName: `Pallet ${suffix}`,
      description: `Primary pallet ${suffix}`,
      createdBy: "admin"
    }
  });
  expect(palletResponse.ok()).toBeTruthy();
  const pallet = (await palletResponse.json()) as { id: string; palletCode: string; palletName: string };

  await api.dispose();
  return { businessUnit, warehouse, room, rack, shelf, pallet };
}

export async function createAndReceiveGrn(params: {
  suffix: string;
  supplierId: string;
  vendorId: string;
  vendorBusinessUnitId: string;
  materialId: string;
  palletId: string;
  vendorBatch?: string;
  receivedQuantity?: string;
  numberOfContainers?: number;
  quantityPerContainer?: string;
}) {
  const api = await createAdminApiContext();
  const vendorBatch = params.vendorBatch ?? `BATCH-${params.suffix}`;
  const receivedQuantity = params.receivedQuantity ?? "100";
  const numberOfContainers = params.numberOfContainers ?? 5;
  const quantityPerContainer = params.quantityPerContainer ?? "20";

  const createResponse = await api.post("/api/grns", {
    data: {
      grnNumber: `GRN-${params.suffix}`,
      supplierId: params.supplierId,
      vendorId: params.vendorId,
      vendorBusinessUnitId: params.vendorBusinessUnitId,
      receiptDate: "2026-05-01",
      invoiceNumber: `INV-${params.suffix}`,
      remarks: `Inventory baseline ${params.suffix}`,
      createdBy: "admin",
      items: [
        {
          materialId: params.materialId,
          receivedQuantity,
          acceptedQuantity: receivedQuantity,
          rejectedQuantity: "0",
          uom: "KG",
          palletId: params.palletId,
          containerType: "BAG",
          numberOfContainers,
          quantityPerContainer,
          vendorBatch,
          manufactureDate: "2026-05-01",
          expiryDate: "2027-05-01",
          unitPrice: "100",
          qcStatus: "PENDING",
          description: `Inventory item ${params.suffix}`
        }
      ]
    }
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()) as {
    id: string;
    grnNumber: string;
    items: Array<{ id: string; batchId: string | null; materialId: string }>;
  };

  const receiveResponse = await api.post(`/api/grns/${created.id}/receive`, {
    data: {
      updatedBy: "admin"
    }
  });
  expect(receiveResponse.ok()).toBeTruthy();
  const received = (await receiveResponse.json()) as {
    id: string;
    grnNumber: string;
    items: Array<{ id: string; batchId: string | null; materialId: string }>;
  };

  await api.dispose();
  return {
    grnId: received.id,
    grnNumber: received.grnNumber,
    grnItemId: received.items[0]?.id ?? "",
    batchId: received.items[0]?.batchId ?? "",
    materialId: received.items[0]?.materialId ?? params.materialId,
    vendorBatch
  };
}

export async function fetchInventoryRecords() {
  const api = await createAdminApiContext();
  const response = await api.get("/api/inventory?page=0&size=200&sort=createdAt,desc");
  expect(response.ok()).toBeTruthy();
  const payload = (await response.json()) as {
    content: Array<{
      id: string;
      materialId: string;
      batchId: string;
      palletId: string;
      quantityOnHand: number;
      uom: string;
      status: string;
    }>;
  };
  await api.dispose();
  return payload.content;
}

export async function fetchInventoryByMaterialAndBatch(materialId: string, batchId: string) {
  const records = await fetchInventoryRecords();
  const inventory = records.find((record) => record.materialId === materialId && record.batchId === batchId);
  expect(inventory, `Inventory not found for material ${materialId} and batch ${batchId}`).toBeTruthy();
  return inventory as {
    id: string;
    materialId: string;
    batchId: string;
    palletId: string;
    quantityOnHand: number;
    uom: string;
    status: string;
  };
}

export async function updateInventoryStatus(inventoryId: string, status: string, remarks?: string) {
  const api = await createAdminApiContext();
  const response = await api.put(`/api/inventory/${inventoryId}/status`, {
    data: {
      status,
      remarks
    }
  });
  expect(response.ok()).toBeTruthy();
  const updated = await response.json();
  await api.dispose();
  return updated as { id: string; status: string; quantityOnHand: number };
}

export async function promoteInventoryToReleased(inventoryId: string, suffix: string) {
  await updateInventoryStatus(inventoryId, "SAMPLING", `E2E sampling transition ${suffix}`);
  await updateInventoryStatus(inventoryId, "UNDER_TEST", `E2E under test transition ${suffix}`);
  return updateInventoryStatus(inventoryId, "RELEASED", `E2E release transition ${suffix}`);
}
