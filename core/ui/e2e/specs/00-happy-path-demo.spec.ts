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
import { WmsPage } from "../pages/WmsPage";

test.describe("BatchSphere Happy Path Demo", () => {
  test(
    "Full pharma flow — intake to QC release in one browser window",
    { tag: "@demo" },
    async ({ adminPage }) => {
      const runId = e2eRunLabel(await readRunId(), "DEMO");

      let supplierLabel = "";
      let vendorLabel = "";
      let vendorBULabel = "";
      let materialLabel = "";
      let palletLabel = "";
      let materialName = "";
      let toolLabel = "";
      let parameterName = "";
      let warehouseCode = "";
      let roomCode = "";
      let rackCode = "";
      let palletCode = "";
      const grnNumber = `GRN-${runId}`;
      const vendorBatch = `BATCH-${runId}`;

      // ── Step 1: API setup ────────────────────────────────────────────────
      await test.step("Setup — create all master data via API", async () => {
        const vms = await createVmsChain(runId);
        const quality = await createSamplingReadySpecSetup(runId);
        const tool = await createSamplingToolRecord(runId);
        const material = await createMaterialRecord({
          suffix: runId,
          specId: quality.spec.id,
          materialName: `Demo Material ${runId}`
        });
        const wh = await createWarehouseHierarchy(runId);

        supplierLabel = `${vms.supplier.supplierCode} – ${vms.supplier.supplierName}`;
        vendorLabel = `${vms.vendor.vendorCode} – ${vms.vendor.vendorName}`;
        vendorBULabel = vms.vendorBusinessUnit.buCode
          ? `${vms.vendorBusinessUnit.buCode} – ${vms.vendorBusinessUnit.unitName}`
          : vms.vendorBusinessUnit.unitName;
        materialLabel = `${material.materialCode} – ${material.materialName}`;
        palletLabel = `${wh.pallet.palletCode} – ${wh.pallet.palletName} (AMBIENT)`;
        materialName = material.materialName;
        toolLabel = `${tool.toolCode} - ${tool.toolName}`;
        parameterName = quality.parameter.parameterName;
        warehouseCode = wh.warehouse.warehouseCode;
        roomCode = wh.room.roomCode;
        rackCode = wh.rack.rackCode;
        palletCode = wh.pallet.palletCode;
      });

      // ── Step 2: Dashboard ────────────────────────────────────────────────
      await test.step("Dashboard — Command Center overview", async () => {
        await adminPage.goto("/");
        await expect(adminPage.getByTestId("dashboard-heading")).toBeVisible();
      });

      // ── Step 3: Specs & MoA ──────────────────────────────────────────────
      await test.step("QC Refs — Spec & MoA are approved and ready", async () => {
        await adminPage.goto("/master-data/qc-refs/specs");
        await expect(adminPage.getByRole("button", { name: "Specifications" })).toBeVisible();
        await expect(adminPage.getByText(`SPEC-${runId}`)).toBeVisible();

        await adminPage.getByRole("button", { name: "Methods of Analysis" }).click();
        await expect(adminPage.getByText(`MOA-${runId}`)).toBeVisible();
      });

      // ── Step 4: Materials master ─────────────────────────────────────────
      await test.step("Materials — Material is linked to approved spec", async () => {
        await adminPage.goto("/master-data/materials/materials");
        await expect(adminPage.getByRole("heading", { name: "Materials Master" })).toBeVisible();
        await expect(adminPage.getByText(materialName)).toBeVisible();
      });

      // ── Step 5: Partners (VMS) ───────────────────────────────────────────
      await test.step("Partners — Supplier and Vendor are registered", async () => {
        // Suppliers page lands on the create form — click View Suppliers to browse the list
        await adminPage.goto("/master-data/partners/suppliers");
        await adminPage.getByRole("button", { name: "View Suppliers" }).click();
        await expect(adminPage.getByRole("cell", { name: `SUP-${runId}` })).toBeVisible();

        // Vendors page shows the full vendor list directly
        await adminPage.goto("/master-data/partners/vendors");
        await expect(adminPage.getByRole("heading", { name: "Vendor Management System" })).toBeVisible();
        await expect(adminPage.getByText(`VEN-${runId}`)).toBeVisible();
      });

      // ── Step 6: WMS – browse warehouse before receipt ────────────────────
      await test.step("WMS — Browse warehouse map and pallet structure", async () => {
        const wms = new WmsPage(adminPage);
        await wms.goto();
        await wms.selectMapPath({ warehouseCode, roomCode, rackCode });
        await wms.expectMapSelection({ warehouseCode, roomCode, rackCode });
        await wms.expectPalletVisible(palletCode);
      });

      // ── Step 7: GRN – receive incoming material ──────────────────────────
      await test.step("GRN — Create draft and receive 100 KG in 5 bags", async () => {
        const grn = new GrnPage(adminPage);
        await grn.goto();
        await grn.createDraft({
          grnNumber,
          supplierLabel,
          vendorLabel,
          vendorBusinessUnitLabel: vendorBULabel,
          invoiceNumber: `INV-${runId}`,
          remarks: `Demo intake ${runId}`,
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
        await grn.receiveCurrentGrn();
        await grn.expectContainers({ count: 5, vendorBatch });
      });

      // ── Step 8: Inventory – lot is in quarantine ─────────────────────────
      await test.step("Inventory — 100 KG in Quarantine, awaiting QC", async () => {
        const inv = new InventoryPage(adminPage);
        await inv.goto();
        await inv.expectLotVisible(materialName);
        await inv.expectLotQuantity(materialName, "100 KG");
        await inv.expectLotStatus(materialName, "Quarantine");
      });

      // ── Step 9: QC Sampling – plan, execute, hand off ────────────────────
      await test.step("QC Sampling — Plan → Start → Complete → Hand off to lab", async () => {
        const sampling = new SamplingPage(adminPage);
        await sampling.goto();
        await sampling.selectRequestByMaterialName(materialName);

        await sampling.createSamplingPlan({
          samplingLocation: "Sampling Booth Demo",
          analystCode: `AN-${runId}`,
          toolLabel,
          individualSampleQuantity: "0.250",
          rationale: `Demo pharma flow ${runId}`
        });
        await sampling.expectQueueStatus(materialName, "Plan Set");

        await sampling.startSampling();
        await sampling.expectQueueStatus(materialName, "Sampling");

        await sampling.completeSampling();
        await sampling.expectQueueStatus(materialName, "Sampled");

        await sampling.handoffToQc();
        await sampling.expectQueueStatus(materialName, "Handed to QC");
      });

      // ── Step 10: QC Lab – receive, test, approve ─────────────────────────
      await test.step("QC Lab — Receive sample, fill worksheet, approve disposition", async () => {
        const sampling = new SamplingPage(adminPage);
        await sampling.goto();
        await sampling.selectRequestByMaterialName(materialName);

        await sampling.recordQcReceipt({
          receiptCondition: "Sealed and intact",
          storageLocation: "QC Demo Shelf A1",
          retainedQuantity: "0.050",
          retainedUntil: "2027-05-01"
        });
        await sampling.expectQueueStatus(materialName, "QC Received");

        await sampling.startQcReview(`AN-${runId}`);
        await sampling.expectQueueStatus(materialName, "QC Review");

        await sampling.saveWorksheetNumericResult(parameterName, "100", "Within specification");
        await sampling.expectWorksheetStatus(parameterName, "PASS");

        await sampling.recordApprovedQcDecision(`Demo approved ${runId}`);
        await sampling.expectQueueStatus(materialName, "Approved");
      });

      // ── Step 11: Inventory – lot is released ─────────────────────────────
      await test.step("Inventory — Material is now Released and available for use", async () => {
        const inv = new InventoryPage(adminPage);
        await inv.goto();
        await inv.expectLotVisible(materialName);
        await inv.expectLotStatus(materialName, "Released");
      });
    }
  );
});
