import { test } from "../fixtures/auth.fixture";
import { e2eRunLabel, readRunId } from "../fixtures/api";
import { VmsPage } from "../pages/VmsPage";

test.describe.serial("Vendor Management System", () => {
  let runId = "";
  let supplierCode = "";
  let supplierName = "";
  let vendorCode = "";
  let vendorName = "";
  let siteCode = "";
  let siteName = "";
  let auditNote = "";
  let updatedAuditNote = "";
  let vendorId = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "VMS");
    supplierCode = `SUP-${runId}`;
    supplierName = `E2E Supplier ${runId}`;
    vendorCode = `VEN-${runId}`;
    vendorName = `E2E Vendor ${runId}`;
    siteCode = `SITE-${runId}`;
    siteName = `E2E Site ${runId}`;
    auditNote = `Initial audit ${runId}`;
    updatedAuditNote = `Updated audit ${runId}`;
  });

  test("VMS-01 procurement creates a supplier", async ({ procurementPage }) => {
    const page = new VmsPage(procurementPage);

    await test.step("Open supplier creation screen", async () => {
      await page.gotoSuppliers();
    });

    await test.step("Create supplier and verify it appears in the supplier list", async () => {
      await page.createSupplier({
        code: supplierCode,
        name: supplierName,
        contactPerson: "Priya Rao",
        email: `supplier-${runId}@example.com`,
        phone: "9876543210"
      });
    });
  });

  test("VMS-02 admin creates a vendor", async ({ adminPage }) => {
    const page = new VmsPage(adminPage);

    await test.step("Open vendor list", async () => {
      await page.gotoVendors();
    });

    await test.step("Create an API vendor from the drawer", async () => {
      await page.createVendor({
        code: vendorCode,
        name: vendorName,
        category: "API_SUPPLIER",
        contactPerson: "Ravi Vendor",
        email: `vendor-${runId}@example.com`,
        city: "Hyderabad",
        state: "Telangana",
        country: "India"
      });
    });
  });

  test("VMS-03 selecting a vendor opens the vendor detail page", async ({ adminPage }) => {
    const page = new VmsPage(adminPage);

    await test.step("Search for the vendor and open detail page", async () => {
      await page.gotoVendors();
      await page.selectVendorByCode(vendorCode, vendorName);
      vendorId = await page.currentVendorIdFromDetailUrl();
    });

    await test.step("Verify detail page sections and route", async () => {
      await page.expectVendorDetail({
        code: vendorCode,
        name: vendorName,
        categoryLabel: "API Supplier"
      });
    });

    await test.step("Back navigation returns to the vendor list", async () => {
      await page.expectBackToVendorList();
    });
  });

  test("VMS-04 admin creates a vendor business unit from vendor details", async ({ adminPage }) => {
    const page = new VmsPage(adminPage);

    await test.step("Open vendor details and continue to sites", async () => {
      await page.gotoVendors();
      await page.selectVendorByCode(vendorCode, vendorName);
      vendorId = vendorId || await page.currentVendorIdFromDetailUrl();
      await page.openSitesForSelectedVendor();
    });

    await test.step("Create manufacturing site for the selected vendor", async () => {
      await page.createSite({
        unitName: siteName,
        buCode: siteCode,
        siteType: "MANUFACTURING",
        address: "Plot 42, APIIC Industrial Park",
        city: "Hyderabad",
        state: "Telangana",
        country: "India"
      });
    });
  });

  test("VMS-05 procurement uploads a vendor site qualification document", async ({ procurementPage }) => {
    const page = new VmsPage(procurementPage);

    await test.step("Open the selected vendor site for editing", async () => {
      await page.gotoVendorBusinessUnits(vendorId || undefined);
      await page.openEditSelectedSite();
    });

    await test.step("Attach and save a GMP certificate", async () => {
      await page.queueSiteDocument({
        title: `WHO GMP ${runId}`,
        type: "GMP_CERTIFICATE",
        expiryDate: "2027-12-31",
        fileName: `who-gmp-${runId}.pdf`
      });
      await page.saveSiteChanges();
      await page.expectSiteDocumentVisible(`WHO GMP ${runId}`);
    });
  });

  test("VMS-06 procurement schedules and completes vendor site audit", async ({ procurementPage }) => {
    const page = new VmsPage(procurementPage);

    await test.step("Open audit dialog for the vendor site", async () => {
      await page.gotoVendorBusinessUnits(vendorId || undefined);
      await page.openAuditModalForSelectedSite();
    });

    await test.step("Create completed initial qualification audit", async () => {
      await page.createAudit({
        auditType: "INITIAL_QUALIFICATION",
        scheduledDate: "2026-05-15",
        auditedBy: "procurement.user",
        status: "COMPLETED",
        outcome: "APPROVED",
        notes: auditNote
      });
      await page.expectAuditVisible(auditNote);
    });
  });

  test("VMS-07 procurement edits the vendor site audit", async ({ procurementPage }) => {
    const page = new VmsPage(procurementPage);

    await test.step("Open vendor site and edit first audit", async () => {
      await page.gotoVendorBusinessUnits(vendorId || undefined);
      await page.editFirstAudit({
        completedDate: "2026-05-16",
        status: "COMPLETED",
        outcome: "APPROVED",
        notes: updatedAuditNote
      });
    });

    await test.step("Verify updated audit remarks", async () => {
      await page.expectAuditVisible(updatedAuditNote);
    });
  });

  test("VMS-08 admin qualifies the vendor business unit", async ({ adminPage }) => {
    const page = new VmsPage(adminPage);

    await test.step("Open selected vendor site", async () => {
      await page.gotoVendorBusinessUnits(vendorId || undefined);
    });

    await test.step("Approve site qualification and verify qualified state", async () => {
      await page.ensureSelectedSiteQualified();
      await page.expectSelectedSiteQualified();
    });
  });

  test("VMS-09 warehouse operator cannot access partner management", async ({ warehousePage }) => {
    const page = new VmsPage(warehousePage);

    await test.step("Verify Partners navigation is hidden for warehouse operator", async () => {
      await page.expectPartnersHiddenInSidebar();
    });
  });
});
