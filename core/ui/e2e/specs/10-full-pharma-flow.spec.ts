import { test, expect } from "../fixtures/auth.fixture";
import {
  createMaterialRecord,
  createSamplingReadySpecSetup,
  createSamplingToolRecord,
  createVmsChain,
  createWarehouseHierarchy,
  e2eRunLabel,
  readRunId
} from "../fixtures/api";
import { GrnPage } from "../pages/GrnPage";
import { InventoryPage } from "../pages/InventoryPage";
import { SamplingPage } from "../pages/SamplingPage";

test.describe.serial("Full Pharma Flow", () => {
  test("F-01 to F-10 complete intake-to-QC-release flow", async ({ warehousePage, qcAnalystPage, qcManagerPage }) => {
    const runId = e2eRunLabel(await readRunId(), "FLOW");

    let supplierLabel = "";
    let vendorLabel = "";
    let vendorBusinessUnitLabel = "";
    let materialLabel = "";
    let palletLabel = "";
    let materialName = "";
    let grnNumber = `GRN-FLOW-${runId}`;
    let vendorBatch = `BATCH-${runId}`;
    let toolLabel = "";
    let parameterName = "";

    await test.step("F-01 to F-06 API master-data setup", async () => {
      const vms = await createVmsChain(runId);
      const quality = await createSamplingReadySpecSetup(runId);
      const tool = await createSamplingToolRecord(runId);
      const material = await createMaterialRecord({
        suffix: runId,
        specId: quality.spec.id,
        materialName: `Full Flow Material ${runId}`
      });
      const warehouse = await createWarehouseHierarchy(runId);

      expect(vms.supplier.id).toBeTruthy();
      expect(vms.vendor.id).toBeTruthy();
      expect(vms.vendorBusinessUnit.id).toBeTruthy();
      expect(quality.spec.id).toBeTruthy();
      expect(quality.moa.id).toBeTruthy();
      expect(material.id).toBeTruthy();
      expect(material.specId).toBe(quality.spec.id);
      expect(warehouse.pallet.id).toBeTruthy();

      supplierLabel = `${vms.supplier.supplierCode} – ${vms.supplier.supplierName}`;
      vendorLabel = `${vms.vendor.vendorCode} – ${vms.vendor.vendorName}`;
      vendorBusinessUnitLabel = vms.vendorBusinessUnit.buCode
        ? `${vms.vendorBusinessUnit.buCode} – ${vms.vendorBusinessUnit.unitName}`
        : vms.vendorBusinessUnit.unitName;
      materialLabel = `${material.materialCode} – ${material.materialName}`;
      palletLabel = `${warehouse.pallet.palletCode} – ${warehouse.pallet.palletName} (AMBIENT)`;
      materialName = material.materialName;
      toolLabel = `${tool.toolCode} - ${tool.toolName}`;
      parameterName = quality.parameter.parameterName;
    });

    await test.step("F-07 Warehouse creates and receives GRN", async () => {
      const page = new GrnPage(warehousePage);
      await page.goto();
      await page.createDraft({
        grnNumber,
        supplierLabel,
        vendorLabel,
        vendorBusinessUnitLabel,
        invoiceNumber: `INV-${runId}`,
        remarks: `Full flow receipt ${runId}`,
        materialLabel,
        vendorBatch,
        palletLabel,
        receivedQuantity: "100",
        acceptedQuantity: "100",
        rejectedQuantity: "0",
        manufactureDate: "2026-05-01",
        expiryDate: "2027-05-01",
        containerType: "BAG",
        numberOfContainers: "5",
        quantityPerContainer: "20",
        qcStatus: "PENDING"
      });
      await page.receiveCurrentGrn();
      await page.expectContainers({ count: 5, vendorBatch });
    });

    await test.step("F-08 Inventory reflects received lot in quarantine", async () => {
      const page = new InventoryPage(warehousePage);
      await page.goto();
      await page.expectLotVisible(materialName);
      await page.expectLotQuantity(materialName, "100 KG");
      await page.expectLotStatus(materialName, "Quarantine");
    });

    await test.step("F-09 QC analyst creates plan and hands off sample", async () => {
      const page = new SamplingPage(qcAnalystPage);
      await page.goto();
      await page.selectRequestByMaterialName(materialName);
      await page.createSamplingPlan({
        samplingLocation: "Sampling Booth Flow",
        analystCode: `AN-${runId}`,
        toolLabel,
        individualSampleQuantity: "0.250",
        rationale: `Integrated flow ${runId}`
      });
      await page.startSampling();
      await page.completeSampling();
      await page.handoffToQc();
      await page.expectQueueStatus(materialName, "Handed to QC");
    });

    await test.step("F-10 QC manager receives, reviews, and approves", async () => {
      const page = new SamplingPage(qcManagerPage);
      await page.goto();
      await page.selectRequestByMaterialName(materialName);
      await page.recordQcReceipt({
        receiptCondition: "Sealed and intact",
        storageLocation: "QC Flow Shelf A1",
        retainedQuantity: "0.050",
        retainedUntil: "2027-05-01"
      });
      await page.startQcReview(`AN-${runId}`);
      await page.expectQueueStatus(materialName, "QC Review");
      await page.saveWorksheetNumericResult(parameterName, "100", "Integrated flow pass");
      await page.expectWorksheetStatus(parameterName, "PASS");
      await page.recordApprovedQcDecision(`Approved integrated flow ${runId}`);
      await page.expectQueueStatus(materialName, "Approved");
    });
  });
});
