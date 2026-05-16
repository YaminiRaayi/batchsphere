import { type Page } from "@playwright/test";
import { test, expect } from "../fixtures/auth.fixture";
import {
  createMaterialLocationRuleRecord,
  createSamplingToolRecord,
  e2eRunLabel,
  fetchAuditEvents,
  fetchESignatures,
  fetchGrnItemContainers,
  findGrnByNumber,
  findMaterialByName,
  findSamplingRequestByGrnItemId,
  findSpecByCode,
  findSupplierByCode,
  findVendorBusinessUnitByCode,
  findVendorByCode,
  findWarehouseByCode,
  readRunId
} from "../fixtures/api";
import { DashboardPage } from "../pages/DashboardPage";
import { GrnPage } from "../pages/GrnPage";
import { InventoryPage } from "../pages/InventoryPage";
import { LoginPage } from "../pages/LoginPage";
import { MaterialsPage } from "../pages/MaterialsPage";
import { SamplingPage } from "../pages/SamplingPage";
import { SpecMoaPage } from "../pages/SpecMoaPage";
import { VmsPage } from "../pages/VmsPage";
import { WmsPage } from "../pages/WmsPage";

const password = "Admin@123";

async function signInAs(page: Page, username: string) {
  const login = new LoginPage(page);
  const dashboard = new DashboardPage(page);
  await login.goto();
  await login.signIn(username, password);
  await expect(page).not.toHaveURL(/\/login$/);
  await dashboard.goto();
  await dashboard.expectLoaded();
}

async function signOut(page: Page) {
  const dashboard = new DashboardPage(page);
  await dashboard.signOut();
  await expect(page).toHaveURL("/login");
}

test.describe.serial("Project Overview Happy Path", () => {
  test.describe.configure({ retries: 0 });
  test.setTimeout(180_000);

  let runId = "";
  let specCode = "";
  let moaCode = "";
  let parameterName = "";
  let supplierCode = ""; 
  let vendorCode = "";
  let siteCode = "";
  let warehouseCode = "";
  let roomOneCode = "";
  let roomTwoCode = "";
  let rackOneCode = "";
  let quarantinePalletCode = "";
  let palletOneLabel = "";
  let materialName = "";
  let materialCode = "";
  let materialLabel = "";
  let materialApprovalLabel = "";
  let supplierLabel = "";
  let vendorLabel = "";
  let siteLabel = "";
  let grnNumber = "";
  let vendorBatch = "";
  let toolLabel = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "OVR");
    specCode = `SPEC-${runId}`;
    moaCode = `MOA-${runId}`;
    parameterName = `Assay ${runId}`;
    supplierCode = `SUP-${runId}`;
    vendorCode = `VEN-${runId}`;
    siteCode = `SITE-${runId}`;
    warehouseCode = `WH-${runId}`;
    roomOneCode = `R1-${runId}`;
    roomTwoCode = `R2-${runId}`;
    rackOneCode = `${roomOneCode}-RK-01`;
    materialName = `Overview API Material ${runId}`;
    grnNumber = `GRN-${runId}`;
    vendorBatch = `BATCH-${runId}`;

    const tool = await createSamplingToolRecord(`OVR-${runId}`);
    toolLabel = `${tool.toolCode} - ${tool.toolName}`;
  });

  test("OVR-01 quality creates and approves MoA and Spec", async ({ page }) => {
    await signInAs(page, "qc.analyst");
    const qcRefs = new SpecMoaPage(page);

    await qcRefs.gotoMoas();
    await qcRefs.createMoaDraft({
      code: moaCode,
      name: `Overview HPLC Method ${runId}`,
      revision: "1.0",
      methodType: "HPLC",
      compendialRef: "IN_HOUSE",
      instrumentType: "Qualified HPLC-UV system with C18 column and calibrated UV detector",
      reportableRange: "80.0% - 120.0% of nominal assay concentration",
      referenceSop: `SOP-QC-HPLC-${runId}.pdf`,
      principle:
        "Assay of API raw material by reversed-phase HPLC with UV detection. The method separates the active analyte from related substances before quantitation against a certified reference standard.",
      systemSuitabilityCriteria:
        "Five replicate standard injections: %RSD NMT 2.0%; tailing factor NMT 2.0; theoretical plates NLT 2000; blank shows no interfering peak at analyte retention time.",
      reagentsAndStandards:
        "HPLC-grade water, acetonitrile, phosphate buffer pH 3.0, certified API reference standard, working standard prepared against current CoA potency, 0.45 micron membrane filters.",
      calculationFormula:
        "Assay (%) = (Area sample / Area standard) x (Weight standard / Weight sample) x Standard potency x Dilution factor x 100.",
      stabilityCondition:
        "Standard and sample solutions are protected from light and held at room temperature. Bracket standards are injected at start and end of sequence.",
      validationStatus: "VALIDATED",
      validationReferenceNo: `VAL-HPLC-${runId}`,
      validationAttachmentFileName: `validation-summary-${runId}.pdf`,
      validationAttachmentContent:
        "Validation summary covers specificity, accuracy, precision, linearity, range, robustness, solution stability, and system suitability per ICH Q2(R2).",
      solutionStabilityValue: "24",
      solutionStabilityUnit: "HOURS"
    });

    await qcRefs.gotoSpecs();
    await qcRefs.createSpecDraft({ code: specCode, name: `Overview API Spec ${runId}`, revision: "1.0" });
    await qcRefs.openSpecByCode(specCode);
    await qcRefs.addSpecParameter({
      name: parameterName,
      testType: "ASSAY",
      linkedMoaLabel: `${moaCode} · Overview HPLC Method ${runId}`,
      criteriaType: "RANGE",
      lowerLimit: "98",
      upperLimit: "102",
      unit: "%",
      sequence: "1",
      textCriteria: "Report assay result as percent on as-is basis; result must be within approved material specification.",
      notes: "Primary release assay linked to validated HPLC MoA.",
      compendialChapterRef: "In-house validated assay, ICH Q2(R2)",
      isMandatory: true
    });
    await qcRefs.expectParameterVisible(parameterName);
    await qcRefs.submitSelectedSpec();
    await qcRefs.expectSelectedSpecStatus("UNDER REVIEW");
    await qcRefs.gotoMoas();
    await qcRefs.openMoaByCode(moaCode);
    await qcRefs.submitSelectedMoa();
    await qcRefs.expectSelectedMoaUnderReview();
    await signOut(page);

    await signInAs(page, "qc.manager");
    const reviewer = new SpecMoaPage(page);
    await reviewer.selectReviewMoa(moaCode);
    await reviewer.approveFromReviewQueue();
    await reviewer.selectReviewSpec(specCode);
    await reviewer.approveFromReviewQueue();
    await signOut(page);
  });

  test("OVR-02 admin creates vendor, warehouse, material routing, supplier, and AVL approval", async ({ page }) => {
    const spec = await findSpecByCode(specCode);

    await signInAs(page, "admin");
    const vms = new VmsPage(page);
    await vms.gotoVendors();
    await vms.createVendor({
      code: vendorCode,
      name: `Overview Vendor ${runId}`,
      category: "API_SUPPLIER",
      contactPerson: "Overview QA Contact",
      email: `vendor-${runId.toLowerCase()}@example.com`,
      city: "Hyderabad",
      state: "Telangana",
      country: "India",
      contactPerson: "Dr. Priya Sharma",
      siteEmail: `site-${runId.toLowerCase()}@vendor.example.com`,
      sitePhone: "+91 40 2345 6789",
      drugLicenseNumber: `TG-MFG-${runId}`,
      drugLicenseExpiry: "2028-12-31",
      whoGmp: true,
      usfda: false,
      euGmp: true,
      gmpCertBody: "WHO GMP / EU GMP",
      gmpCertNumber: `GMP-${runId}`,
      gmpCertExpiry: "2027-12-31",
      qualifiedDate: "2026-05-10",
      nextRequalificationDue: "2028-05-10",
      lastAuditDate: "2026-05-10",
      openCapaCount: "0",
      qaRating: "4.7",
      deliveryScore: "98.5",
      rejectionRate: "0.25"
    });
    await vms.selectVendorByCode(vendorCode, `Overview Vendor ${runId}`);
    await vms.expectVendorDetail({ code: vendorCode, name: `Overview Vendor ${runId}`, categoryLabel: "API Supplier" });
    await vms.openSitesForSelectedVendor();
    await vms.createSite({
      unitName: `Overview Manufacturing Site ${runId}`,
      buCode: siteCode,
      siteType: "MANUFACTURING",
      address: "Plot 42, APIIC Industrial Park",
      city: "Hyderabad",
      state: "Telangana",
      country: "India"
    });
    await vms.openEditSelectedSite();
    await vms.queueSiteDocument({
      title: `WHO GMP ${runId}`,
      type: "GMP_CERTIFICATE",
      expiryDate: "2027-12-31",
      fileName: `who-gmp-${runId}.pdf`,
      content: `WHO GMP certificate evidence for ${siteCode}`
    });
    await vms.saveSiteChanges();
    await vms.expectSiteDocumentVisible(`WHO GMP ${runId}`);
    await vms.openAuditModalForSelectedSite();
    await vms.createAudit({
      auditType: "INITIAL_QUALIFICATION",
      scheduledDate: "2026-05-15",
      auditedBy: "admin",
      status: "COMPLETED",
      outcome: "APPROVED",
      notes: `Initial qualification audit approved for ${siteCode}`
    });
    await vms.expectAuditVisible(`Initial qualification audit approved for ${siteCode}`);
    await vms.ensureSelectedSiteQualified();
    await vms.expectSelectedSiteQualified();

    const wms = new WmsPage(page);
    await wms.goto();
    await wms.createLocation({
      businessUnitCode: `BU-${runId}`,
      businessUnitName: `Operations ${runId}`,
      warehouseCode,
      warehouseName: `Overview Raw Store ${runId}`,
      rooms: [
        {
          roomCode: roomOneCode,
          roomName: `Quarantine Room ${runId}`,
          zoneName: `Quarantine Zone ${runId}`,
          rackCount: "4",
          shelvesPerRack: "4",
          palletsPerShelf: "1",
          quarantineOnly: true,
          notes: `3x4 overview layout ${runId}`
        },
        {
          roomCode: roomTwoCode,
          roomName: `Released Room ${runId}`,
          zoneName: `Released Zone ${runId}`,
          rackCount: "4",
          shelvesPerRack: "4",
          palletsPerShelf: "1",
          notes: `Released stock room ${runId}`
        },
        {
          roomCode: `R3-${runId}`,
          roomName: `Reserve Room ${runId}`,
          zoneName: `Reserve Zone ${runId}`,
          rackCount: "4",
          shelvesPerRack: "4",
          palletsPerShelf: "1",
          notes: `Reserve room ${runId}`
        }
      ]
    });
    await wms.selectMapPath({ warehouseCode, roomCode: roomOneCode, rackCode: rackOneCode });
    await wms.expectMapSelection({ warehouseCode, roomCode: roomOneCode, rackCode: rackOneCode });

    const materials = new MaterialsPage(page);
    await materials.createMaterial({
      materialName,
      materialType: "CRITICAL",
      status: "ACTIVE",
      genericNames: `Pharma API overview ${runId}`,
      specId: spec.id,
      category: "API",
      uom: "KG",
      hsnCode: "29242990",
      casNumber: "103-90-2",
      pharmacopoeialRef: "In-house",
      storageCondition: "AMBIENT",
      maxHumidity: "NMT 65%",
      lightSensitivity: "PROTECT_FROM_LIGHT",
      hygroscopic: false,
      shelfLifeMonths: 24,
      retestPeriodMonths: 12,
      reorderLevel: "50 kg",
      leadTimeDays: 14,
      hazardous: true,
      photosensitive: true,
      samplingRequired: true,
      vendorCoaReleaseAllowed: false,
      description: `Project overview material linked to ${specCode} after vendor and warehouse setup`
    });
    await materials.gotoList();
    await materials.expectMaterialVisible(materialName);

    const material = await findMaterialByName(materialName);
    const warehouse = await findWarehouseByCode(warehouseCode);
    const roomOne = warehouse.rooms.find((room) => room.roomCode === roomOneCode);
    const roomTwo = warehouse.rooms.find((room) => room.roomCode === roomTwoCode);
    expect(roomOne, `Room ${roomOneCode} not found`).toBeTruthy();
    expect(roomTwo, `Room ${roomTwoCode} not found`).toBeTruthy();
    const quarantineRack = roomOne?.racks[0];
    const releasedRack = roomTwo?.racks[0];
    const quarantinePallet = quarantineRack?.shelves[0]?.pallets[0];
    expect(quarantineRack, `Rack not found for ${roomOneCode}`).toBeTruthy();
    expect(releasedRack, `Rack not found for ${roomTwoCode}`).toBeTruthy();
    expect(quarantinePallet, `Pallet not found for ${roomOneCode}`).toBeTruthy();

    await createMaterialLocationRuleRecord({
      materialId: material.id,
      defaultWarehouseId: warehouse.id,
      defaultRoomId: roomTwo?.id ?? "",
      defaultRackId: releasedRack?.id ?? "",
      quarantineWarehouseId: warehouse.id,
      quarantineRoomId: roomOne?.id,
      notes: `Overview routing ${runId}`
    });

    materialCode = material.materialCode;
    materialLabel = `${material.materialCode} – ${material.materialName}`;
    materialApprovalLabel = `${material.materialCode} - ${material.materialName}`;
    quarantinePalletCode = quarantinePallet?.palletCode ?? "P-010101";
    palletOneLabel = `${quarantinePalletCode} – ${quarantinePallet?.palletName} (AMBIENT)`;

    await wms.goto();
    await wms.switchToMaterials();
    await wms.searchMaterial(materialCode);
    await wms.expectMaterialLocationVisible({ materialCode, warehouseCode, roomCode: roomTwoCode });
    await signOut(page);

    await signInAs(page, "procurement.user");
    const procurement = new VmsPage(page);
    await procurement.gotoSuppliers();
    await procurement.createSupplier({
      code: supplierCode,
      name: `Overview Supplier ${runId}`,
      contactPerson: "Procurement Contact",
      email: `supplier-${runId.toLowerCase()}@example.com`,
      phone: "9876543210",
      supplierType: "MANUFACTURER",
      qualificationStatus: "QUALIFIED",
      countryOfManufacture: "India",
      openCapaCount: "0",
      gmpCertificateNumber: `SUP-GMP-${runId}`,
      gmpIssuingAuthority: "State FDA / WHO GMP",
      gmpExpiryDate: "2027-12-31"
    });
    await signOut(page);

    const supplier = await findSupplierByCode(supplierCode);
    supplierLabel = `${supplier.supplierCode} – ${supplier.supplierName}`;

    await signInAs(page, "admin");
    const approvalVms = new VmsPage(page);
    const selectedVendor = await findVendorByCode(vendorCode);
    await approvalVms.gotoVendorBusinessUnits(selectedVendor.id);
    await approvalVms.selectSiteByCode(siteCode);
    await approvalVms.createMaterialApproval({
      supplierLabel: `${supplier.supplierCode} - ${supplier.supplierName}`,
      materialLabel: materialApprovalLabel,
      status: "APPROVED",
      basis: "AUDIT",
      qualificationDate: "2026-05-10"
    });
    await signOut(page);
  });

  test("OVR-03 warehouse GRN increases quarantine stock", async ({ page }) => {
    const supplier = await findSupplierByCode(supplierCode);
    const vendor = await findVendorByCode(vendorCode);
    const site = await findVendorBusinessUnitByCode(siteCode);
    supplierLabel = `${supplier.supplierCode} – ${supplier.supplierName}`;
    vendorLabel = `${vendor.vendorCode} – ${vendor.vendorName}`;
    siteLabel = site.buCode ? `${site.buCode} – ${site.unitName}` : site.unitName;

    await signInAs(page, "warehouse.op");
    const grn = new GrnPage(page);
    await grn.goto();
    await grn.createDraft({
      grnNumber,
      supplierLabel,
      vendorLabel,
      vendorBusinessUnitLabel: siteLabel,
      invoiceNumber: `INV-${runId}`,
      remarks: `Project overview receipt ${runId}`,
      materialLabel,
      vendorBatch,
      palletLabel: palletOneLabel,
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
        documentName: `Vendor CoA ${runId}`,
        documentType: "COA",
        fileName: `vendor-coa-${runId}.pdf`,
        content: `Vendor certificate of analysis for ${materialName}, batch ${vendorBatch}`
      }
    });
    await grn.expectAttachedDocument(`Vendor CoA ${runId}`);
    await grn.receiveCurrentGrn();

    const inventoryBeforeQc = new InventoryPage(page);
    await inventoryBeforeQc.goto();
    await inventoryBeforeQc.expectLotVisible(materialName);
    await inventoryBeforeQc.expectLotStatus(materialName, "Quarantine");
    await inventoryBeforeQc.expectLotQuantity(materialName, "100 KG");

    const warehouseView = new WmsPage(page);
    await warehouseView.goto();
    await warehouseView.selectMapPath({ warehouseCode, roomCode: roomOneCode, rackCode: rackOneCode });
    await warehouseView.expectPalletVisible(quarantinePalletCode);
    await signOut(page);
  });

  test("OVR-04 QC sampling releases the quarantined lot", async ({ page }) => {
    await signInAs(page, "qc.analyst");
    const sampling = new SamplingPage(page);
    await sampling.goto();
    await sampling.selectRequestByMaterialName(materialName);
    await sampling.createSamplingPlan({
      samplingLocation: "Sampling Booth 1",
      analystCode: `AN-${runId}`,
      toolLabel,
      individualSampleQuantity: "0.250",
      containerDraws: [
        { quantity: "0.100", purpose: "IDENTITY" },
        { quantity: "0.125", purpose: "COMPOSITE_ASSAY" },
        { quantity: "0.150", purpose: "COMPOSITE_ASSAY" },
        { quantity: "0.175", purpose: "RETENTION" }
      ],
      rationale: `Overview sampling plan ${runId}`
    });
    await sampling.startSampling();
    await sampling.completeSampling();

    const grn = await findGrnByNumber(grnNumber);
    const containers = await fetchGrnItemContainers(grn.items[0]?.id ?? "");
    expect(containers[0]?.remainingQuantity).toBeCloseTo(19.9, 3);
    expect(containers[1]?.remainingQuantity).toBeCloseTo(19.875, 3);
    expect(containers[2]?.remainingQuantity).toBeCloseTo(19.85, 3);
    expect(containers[3]?.remainingQuantity).toBeCloseTo(19.825, 3);

    await sampling.handoffToQc();
    await sampling.recordQcReceipt({
      receiptCondition: "Sealed and intact",
      storageLocation: "QC Shelf A1",
      retainedQuantity: "0.050",
      retainedUntil: "2027-05-01"
    });
    await sampling.startQcReview(`AN-${runId}`);
    await sampling.saveWorksheetNumericResult(parameterName, "100", "Within range");
    await sampling.expectWorksheetStatus(parameterName, "PASS");
    await signOut(page);

    await signInAs(page, "qc.manager");
    const qcManager = new SamplingPage(page);
    await qcManager.goto();
    await qcManager.selectRequestByMaterialName(materialName);
    await qcManager.recordApprovedQcDecision(`Approved project overview lot ${runId}`);
    await qcManager.expectQueueStatus(materialName, "Approved");

    const releasedGrn = await findGrnByNumber(grnNumber);
    const samplingRequest = await findSamplingRequestByGrnItemId(releasedGrn.items[0]?.id ?? "");
    const auditEvents = await fetchAuditEvents("SAMPLING_REQUEST", samplingRequest.id);
    expect(auditEvents.some((event) => event.eventType === "STATUS_CHANGE" && event.newValue === "COMPLETED")).toBeTruthy();
    expect(auditEvents.some((event) => event.eventType === "E_SIGNATURE" && event.newValue === "APPROVED")).toBeTruthy();
    const signatures = await fetchESignatures("SAMPLING_REQUEST", samplingRequest.id);
    expect(signatures.some((signature) => signature.action === "QC_FINAL_APPROVAL" && signature.signerUsername === "qc.manager")).toBeTruthy();
    await signOut(page);

    await signInAs(page, "warehouse.op");
    const releasedInventory = new InventoryPage(page);
    await releasedInventory.goto();
    await releasedInventory.expectLotStatus(materialName, "Released");
    await releasedInventory.expectLotQuantity(materialName, "99.45 KG");
    await signOut(page);
  });

  test("OVR-05 issuing released stock decreases warehouse inventory", async ({ page }) => {
    const grn = await findGrnByNumber(grnNumber);
    expect(grn.items[0]?.batchId, `Batch was not generated for ${grnNumber}`).toBeTruthy();

    await signInAs(page, "warehouse.op");
    const inventory = new InventoryPage(page);
    await inventory.goto();
    await inventory.expectLotStatus(materialName, "Released");
    await inventory.expectLotQuantity(materialName, "99.45 KG");
    await inventory.selectLotByMaterialName(materialName);
    await inventory.openIssueDialog();
    await inventory.submitIssue({
      quantity: "5",
      referenceType: "PRODUCTION",
      referenceNumber: `PROD-${runId}`,
      reason: "Dispense to production",
      remarks: `Overview issue ${runId}`
    });
    await inventory.expectLotQuantity(materialName, "94.45 KG");
    await inventory.expectMovementVisible({
      materialName,
      referenceNumber: `PROD-${runId}`,
      quantityText: "-5 KG"
    });
    await signOut(page);
  });
});
