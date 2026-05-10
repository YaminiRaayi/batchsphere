import { test } from "../fixtures/auth.fixture";
import {
  createApprovedSpec,
  createMaterialLocationRuleRecord,
  createMaterialRecord,
  e2eRunLabel,
  fetchWarehouseTreeAdmin,
  readRunId
} from "../fixtures/api";
import { WmsPage } from "../pages/WmsPage";

test.describe.serial("Warehouse Management", () => {
  let runId = "";
  let businessUnitCode = "";
  let warehouseCode = "";
  let warehouseName = "";
  let roomCode = "";
  let roomName = "";
  let zoneName = "";
  let rackCode = "";
  let palletCode = "";
  let materialCode = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "WMS");
    businessUnitCode = `BU-${runId}`;
    warehouseCode = `WH-${runId}`;
    warehouseName = `E2E Warehouse ${runId}`;
    roomCode = `R-${runId}`;
    roomName = `E2E Room ${runId}`;
    zoneName = `Ambient Zone ${runId}`;
    rackCode = `${roomCode}-RK-01`;
    palletCode = "P-010101";
  });

  test("WMS-01 create warehouse location wizard", async ({ adminPage }) => {
    const page = new WmsPage(adminPage);
    await page.goto();
    await page.createLocation({
      businessUnitCode,
      businessUnitName: `Ops ${runId}`,
      warehouseCode,
      warehouseName,
      roomCode,
      roomName,
      zoneName
    });
    await page.selectMapPath({ warehouseCode, roomCode, rackCode });
    await page.expectMapSelection({ warehouseCode, roomCode, rackCode });
  });

  test("WMS-02 zone assignments show generated rule", async ({ adminPage }) => {
    const page = new WmsPage(adminPage);
    await page.goto();
    await page.switchToZones();
    await page.expectZoneRuleVisible({ warehouseCode, roomCode, roomName, zoneName });
  });

  test("WMS-03 warehouse op can read WMS map", async ({ warehousePage }) => {
    const page = new WmsPage(warehousePage);
    await page.goto();
    await page.selectMapPath({ warehouseCode, roomCode, rackCode });
    await page.expectMapSelection({ warehouseCode, roomCode, rackCode });
  });

  test("WMS-04 warehouse op sees generated pallet hierarchy", async ({ warehousePage }) => {
    const page = new WmsPage(warehousePage);
    await page.goto();
    await page.selectMapPath({ warehouseCode, roomCode, rackCode });
    await page.expectPalletVisible(palletCode);
  });

  test("WMS-05 material location mapping shows assigned default location", async ({ adminPage }) => {
    const spec = await createApprovedSpec(`WMS-${runId}`);
    const material = await createMaterialRecord({
      suffix: `WMS-${runId}`,
      specId: spec.id,
      materialName: `WMS Material ${runId}`
    });
    materialCode = material.materialCode;

    const tree = await fetchWarehouseTreeAdmin();
    const warehouse = tree.find((entry) => entry.warehouseCode === warehouseCode);
    if (!warehouse) {
      throw new Error(`Warehouse ${warehouseCode} not found in admin tree`);
    }
    const room = warehouse.rooms.find((entry) => entry.roomCode === roomCode);
    if (!room) {
      throw new Error(`Room ${roomCode} not found in warehouse tree`);
    }
    const rack = room.racks[0];
    if (!rack) {
      throw new Error(`Rack not found under room ${roomCode}`);
    }

    await createMaterialLocationRuleRecord({
      materialId: material.id,
      defaultWarehouseId: warehouse.id,
      defaultRoomId: room.id,
      defaultRackId: rack.id,
      quarantineWarehouseId: warehouse.id,
      quarantineRoomId: room.id,
      notes: `E2E WMS rule ${runId}`
    });

    const page = new WmsPage(adminPage);
    await page.goto();
    await page.switchToMaterials();
    await page.searchMaterial(materialCode);
    await page.expectMaterialLocationVisible({ materialCode, warehouseCode, roomCode });
  });

  test("WMS-06 warehouse op can open material mapping tab", async ({ warehousePage }) => {
    const page = new WmsPage(warehousePage);
    await page.goto();
    await page.switchToMaterials();
  });

  test("WMS-07 warehouse op can open zone assignments tab", async ({ warehousePage }) => {
    const page = new WmsPage(warehousePage);
    await page.goto();
    await page.switchToZones();
  });
});
