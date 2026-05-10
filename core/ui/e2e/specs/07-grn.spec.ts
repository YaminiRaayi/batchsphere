import { test } from "../fixtures/auth.fixture";
import {
  createApprovedSpec,
  createMaterialRecord,
  createVmsChain,
  createWarehouseHierarchy,
  e2eRunLabel,
  readRunId
} from "../fixtures/api";
import { GrnPage } from "../pages/GrnPage";

test.describe.serial("Goods Receipt Note", () => {
  let runId = "";
  let supplierLabel = "";
  let vendorLabel = "";
  let vendorBusinessUnitLabel = "";
  let materialLabel = "";
  let palletLabel = "";

  let primaryGrnNumber = "";
  let primaryVendorBatch = "";
  let documentGrnNumber = "";
  let cancelledGrnNumber = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "GRN");

    const vms = await createVmsChain(`GRN-${runId}`);
    const spec = await createApprovedSpec(`GRN-${runId}`);
    const material = await createMaterialRecord({
      suffix: `GRN-${runId}`,
      specId: spec.id,
      materialName: `GRN Material ${runId}`
    });
    const warehouse = await createWarehouseHierarchy(`GRN-${runId}`);

    supplierLabel = `${vms.supplier.supplierCode} – ${vms.supplier.supplierName}`;
    vendorLabel = `${vms.vendor.vendorCode} – ${vms.vendor.vendorName}`;
    vendorBusinessUnitLabel = vms.vendorBusinessUnit.buCode
      ? `${vms.vendorBusinessUnit.buCode} – ${vms.vendorBusinessUnit.unitName}`
      : vms.vendorBusinessUnit.unitName;
    materialLabel = `${material.materialCode} – ${material.materialName}`;
    palletLabel = `${warehouse.pallet.palletCode} – ${warehouse.pallet.palletName} (AMBIENT)`;

    primaryGrnNumber = `GRN-E2E-${runId}`;
    primaryVendorBatch = `BATCH-${runId}`;
    documentGrnNumber = `GRN-DOC-${runId}`;
    cancelledGrnNumber = `GRN-CAN-${runId}`;
  });

  test("GRN-01 create GRN with line item", async ({ warehousePage }) => {
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber: primaryGrnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-${runId}`,
      remarks: `Primary GRN ${runId}`,
      materialLabel,
      vendorBatch: primaryVendorBatch,
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
    await page.expectDraftDetail(primaryGrnNumber);
    await page.expectDraftLineItemSummary({ vendorBatch: primaryVendorBatch, containers: 5 });
  });

  test("GRN-02 verify generated containers", async ({ warehousePage }) => {
    const grnNumber = `GRN-REC-${runId}`;
    const vendorBatch = `REC-BATCH-${runId}`;
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-REC-${runId}`,
      remarks: `Receive GRN ${runId}`,
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

  test("GRN-03 receive GRN", async ({ warehousePage }) => {
    const grnNumber = `GRN-STATUS-${runId}`;
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-STATUS-${runId}`,
      remarks: `Status GRN ${runId}`,
      materialLabel,
      vendorBatch: `STATUS-BATCH-${runId}`,
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
  });

  test("GRN-04 print container labels", async ({ warehousePage }) => {
    const grnNumber = `GRN-PRINT-${runId}`;
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-PRINT-${runId}`,
      remarks: `Print GRN ${runId}`,
      materialLabel,
      vendorBatch: `PRINT-BATCH-${runId}`,
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
    await page.printLabels();
  });

  test("GRN-05 upload document (CoA)", async ({ warehousePage }) => {
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber: documentGrnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-DOC-${runId}`,
      remarks: `Document GRN ${runId}`,
      materialLabel,
      vendorBatch: `DOC-BATCH-${runId}`,
      palletLabel,
      receivedQuantity: "100",
      acceptedQuantity: "100",
      rejectedQuantity: "0",
      manufactureDate: "2026-05-01",
      expiryDate: "2027-05-01",
      containerType: "BAG",
      numberOfContainers: "5",
      quantityPerContainer: "20",
      qcStatus: "PENDING",
      document: {
        lineItemIndex: "0",
        documentName: `CoA ${runId}`,
        documentType: "COA",
        documentUrl: `https://example.com/coa/${runId}`,
        fileName: `coa-${runId}.pdf`
      }
    });
    await page.expectAttachedDocument(`CoA ${runId}`);
  });

  test("GRN-06 cancel a DRAFT GRN", async ({ warehousePage }) => {
    const page = new GrnPage(warehousePage);
    await page.goto();
    await page.createDraft({
      grnNumber: cancelledGrnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel,
      invoiceNumber: `INV-CAN-${runId}`,
      remarks: `Cancelled GRN ${runId}`,
      materialLabel,
      vendorBatch: `CAN-BATCH-${runId}`,
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
    await page.cancelCurrentGrn(`Cancel draft ${runId}`);
    await page.expectCancelledInQueue(cancelledGrnNumber);
  });
});
