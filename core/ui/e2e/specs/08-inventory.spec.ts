import { test } from "../fixtures/auth.fixture";
import {
  createAndReceiveGrn,
  createApprovedSpec,
  createMaterialRecord,
  createVmsChain,
  createWarehouseHierarchy,
  fetchInventoryByMaterialAndBatch,
  e2eRunLabel,
  promoteInventoryToReleased,
  readRunId
} from "../fixtures/api";
import { InventoryPage } from "../pages/InventoryPage";

test.describe.serial("Inventory", () => {
  let runId = "";
  let materialName = "";
  let inventoryId = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "INV");

    const vms = await createVmsChain(runId);
    const spec = await createApprovedSpec(runId);
    const material = await createMaterialRecord({
      suffix: runId,
      specId: spec.id,
      materialName: `Inventory Material ${runId}`
    });
    const warehouse = await createWarehouseHierarchy(runId);
    const received = await createAndReceiveGrn({
      suffix: runId,
      supplierId: vms.supplier.id,
      vendorId: vms.vendor.id,
      vendorBusinessUnitId: vms.vendorBusinessUnit.id,
      materialId: material.id,
      palletId: warehouse.pallet.id
    });
    const inventory = await fetchInventoryByMaterialAndBatch(received.materialId, received.batchId);

    materialName = material.materialName;
    inventoryId = inventory.id;
  });

  test("INV-01 view inventory list", async ({ warehousePage }) => {
    const page = new InventoryPage(warehousePage);
    await page.goto();
    await page.expectLotVisible(materialName);
  });

  test("INV-02 GRN receipt reflected in inventory", async ({ warehousePage }) => {
    const page = new InventoryPage(warehousePage);
    await page.goto();
    await page.expectLotVisible(materialName);
    await page.expectLotQuantity(materialName, "100 KG");
    await page.expectLotStatus(materialName, "Quarantine");
  });

  test("INV-03 adjust inventory (positive)", async ({ warehousePage }) => {
    const page = new InventoryPage(warehousePage);
    await page.goto();
    await page.selectLotByMaterialName(materialName);
    await page.openAdjustDialog();
    await page.submitPositiveAdjustment("10", `Increase inventory for ${runId}`);
    await page.expectLotQuantity(materialName, "110 KG");
  });

  test("INV-04 issue inventory (requires RELEASED lot)", async ({ warehousePage }) => {
    await promoteInventoryToReleased(inventoryId, runId);

    const page = new InventoryPage(warehousePage);
    await page.goto();
    await page.expectLotStatus(materialName, "Released");
    await page.selectLotByMaterialName(materialName);
    await page.openIssueDialog();
    await page.submitIssue({
      quantity: "5",
      referenceType: "PRODUCTION",
      referenceNumber: `PROD-${runId}`,
      reason: `Issue stock for ${runId}`,
      remarks: "Playwright issue flow"
    });
    await page.expectLotQuantity(materialName, "105 KG");
  });

  test("INV-05 view stock movements", async ({ warehousePage }) => {
    const page = new InventoryPage(warehousePage);
    await page.goto();
    await page.expectMovementVisible({
      materialName,
      quantityText: "100 KG"
    });
    await page.expectMovementVisible({
      materialName,
      quantityText: "10 KG"
    });
    await page.expectMovementVisible({
      materialName,
      referenceNumber: `PROD-${runId}`,
      quantityText: "-5 KG"
    });
  });
});
