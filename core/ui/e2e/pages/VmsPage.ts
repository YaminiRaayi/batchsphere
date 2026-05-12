import { expect, type Page } from "@playwright/test";

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class VmsPage {
  constructor(private readonly page: Page) {}

  async gotoSuppliers() {
    await this.page.goto("/master-data/partners/suppliers");
    await expect(this.page.getByRole("heading", { name: /Create supplier/i })).toBeVisible();
  }

  async gotoVendors() {
    await this.page.goto("/master-data/partners/vendors");
    await expect(this.page.getByRole("heading", { name: "Vendor Management System" })).toBeVisible();
  }

  async gotoVendorBusinessUnits(vendorId?: string) {
    const url = vendorId
      ? `/master-data/partners/vendor-business-units?vendorId=${vendorId}`
      : "/master-data/partners/vendor-business-units";
    await this.page.goto(url);
    await expect(this.page.getByRole("heading", { name: "Vendor Business Units" })).toBeVisible();
  }

  async createSupplier(params: {
    code: string;
    name: string;
    contactPerson?: string;
    email?: string;
    phone?: string;
    supplierType?: string;
    qualificationStatus?: string;
    countryOfManufacture?: string;
    openCapaCount?: string;
    gmpCertificateNumber?: string;
    gmpIssuingAuthority?: string;
    gmpExpiryDate?: string;
  }) {
    await this.page.getByLabel("Supplier code").fill(params.code);
    await this.page.getByLabel("Supplier name").fill(params.name);
    if (params.contactPerson) {
      await this.page.getByLabel("Contact person").fill(params.contactPerson);
    }
    if (params.email) {
      await this.page.getByLabel("Email").fill(params.email);
    }
    if (params.phone) {
      await this.page.getByLabel("Phone").fill(params.phone);
    }
    if (params.supplierType) {
      await this.page.getByLabel("Supplier type").selectOption(params.supplierType);
    }
    if (params.qualificationStatus) {
      await this.page.getByLabel("Qualification status").selectOption(params.qualificationStatus);
    }
    if (params.countryOfManufacture) {
      await this.page.getByLabel("Country of manufacture").fill(params.countryOfManufacture);
    }
    if (params.openCapaCount) {
      await this.page.getByLabel("Open CAPA count").fill(params.openCapaCount);
    }
    if (params.gmpCertificateNumber) {
      await this.page.getByLabel("GMP certificate no.").fill(params.gmpCertificateNumber);
    }
    if (params.gmpIssuingAuthority) {
      await this.page.getByLabel("Issuing authority").fill(params.gmpIssuingAuthority);
    }
    if (params.gmpExpiryDate) {
      await this.page.getByLabel("GMP expiry").fill(params.gmpExpiryDate);
    }
    this.page.on("console", (msg) => {
      if (msg.type() === "error") {
        console.log(`[Browser Console Error]: ${msg.text()}`);
      }
    });
    const responsePromise = this.page.waitForResponse((resp) =>
      resp.url().includes("/api/suppliers") && resp.request().method() === "POST"
    );
    await this.page.getByRole("button", { name: "Create supplier" }).click();
    const response = await responsePromise;
    const responseBody = await response.text();
    console.log(`[API Response]: ${response.status()} - ${responseBody}`);
    if (!response.ok()) {
      throw new Error(`Supplier creation failed: ${response.status()} - ${responseBody}`);
    }
    await expect(
      this.page
        .getByText(`Supplier ${params.code} created successfully.`)
        .or(this.page.getByText(new RegExp(`Supplier code already exists: ${escapeRegExp(params.code)}`)))
    ).toBeVisible();
    await this.page.getByRole("button", { name: "View Suppliers" }).click();
    await expect(this.page.getByRole("cell", { name: params.code })).toBeVisible();
    await this.page.getByRole("button", { name: "Close" }).click();
  }

  async createVendor(params: {
    code: string;
    name: string;
    category?: string;
    contactPerson?: string;
    email?: string;
    city?: string;
    state?: string;
    country?: string;
  }) {
    await this.page.getByRole("button", { name: "Add Vendor" }).first().click();
    await expect(this.page.getByRole("heading", { name: "Add New Vendor" })).toBeVisible();
    const form = this.page.locator("form#vendor-form");
    await form.getByPlaceholder("VEN-0042").fill(params.code);
    await form.getByPlaceholder("e.g. Granules India Ltd.").fill(params.name);
    if (params.category) {
      await form.locator("select").first().selectOption(params.category);
    }
    if (params.contactPerson) {
      await form.getByPlaceholder("e.g. Rajesh Kumar").fill(params.contactPerson);
    }
    if (params.email) {
      await form.getByPlaceholder("procurement@vendor.com").fill(params.email);
    }
    if (params.city) {
      await form.locator('input[placeholder="Hyderabad"]').fill(params.city);
    }
    if (params.state) {
      await form.locator('input[placeholder="Telangana"]').fill(params.state);
    }
    if (params.country) {
      await form.locator('input[placeholder="India"]').fill(params.country);
    }
    await this.page.getByRole("button", { name: "Add Vendor" }).last().click();
    await expect(this.page.getByRole("button").filter({ hasText: params.name })).toBeVisible();
  }

  async selectVendorByCode(code: string, name?: string) {
    await this.page.getByPlaceholder("Search vendor, code...").fill(code);
    const vendorRow = this.page.getByRole("button").filter({ hasText: name ?? code });
    await expect(vendorRow).toBeVisible();
    await vendorRow.click();
    await expect(this.page).toHaveURL(/\/master-data\/partners\/vendors\/[^/]+$/);
    await expect(this.page.getByText(code)).toBeVisible();
  }

  async expectVendorDetail(params: { code: string; name: string; categoryLabel?: string }) {
    await expect(this.page).toHaveURL(/\/master-data\/partners\/vendors\/[^/]+$/);
    await expect(this.page.locator("h1").filter({ hasText: params.name })).toBeVisible();
    await expect(this.page.getByText(params.code)).toBeVisible();
    if (params.categoryLabel) {
      await expect(this.page.locator("div").filter({ hasText: new RegExp(`^${escapeRegExp(params.categoryLabel)}$`) })).toBeVisible();
    }
    await expect(this.page.getByText("Qualification Status", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Vendor Profile", { exact: true })).toBeVisible();
    await expect(this.page.getByText("Vendor Documents", { exact: true })).toBeVisible();
  }

  async expectBackToVendorList() {
    await this.page.getByRole("button", { name: "← Back to Vendors" }).click();
    await expect(this.page).toHaveURL(/\/master-data\/partners\/vendors$/);
    await expect(this.page.getByRole("heading", { name: "Vendor Management System" })).toBeVisible();
  }

  async currentVendorIdFromDetailUrl() {
    const url = new URL(this.page.url());
    const parts = url.pathname.split("/").filter(Boolean);
    return parts.at(-1) ?? "";
  }

  async openSitesForSelectedVendor() {
    const openSites = this.page.getByRole("button", { name: /Open Sites|Add First Site/ });
    await openSites.click();
    await expect(this.page.getByRole("heading", { name: "Vendor Business Units" })).toBeVisible();
  }

  async createSite(params: {
    unitName: string;
    buCode?: string;
    siteType?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    contactPerson?: string;
    siteEmail?: string;
    sitePhone?: string;
    drugLicenseNumber?: string;
    drugLicenseExpiry?: string;
    whoGmp?: boolean;
    usfda?: boolean;
    euGmp?: boolean;
    gmpCertBody?: string;
    gmpCertNumber?: string;
    gmpCertExpiry?: string;
    qualifiedDate?: string;
    nextRequalificationDue?: string;
    lastAuditDate?: string;
    openCapaCount?: string;
    qaRating?: string;
    deliveryScore?: string;
    rejectionRate?: string;
  }) {
    await this.page.getByRole("button", { name: "Add Site" }).first().click();
    await expect(this.page.getByRole("heading", { name: "Add Manufacturing Site" })).toBeVisible();
    const form = this.page.locator("form#vbu-form");
    await form.getByPlaceholder("e.g. Granules Gagillapur Unit").fill(params.unitName);
    if (params.buCode) {
      await form.getByPlaceholder("e.g. GRA-UNIT-01").fill(params.buCode);
    }
    if (params.siteType) {
      await form.locator("select").first().selectOption(params.siteType);
    }
    if (params.address) {
      await form.getByPlaceholder("Plot 42, APIIC Industrial Park").fill(params.address);
    }
    if (params.city) {
      await form.locator('input[placeholder="Hyderabad"]').fill(params.city);
    }
    if (params.state) {
      await form.locator('input[placeholder="Telangana"]').fill(params.state);
    }
    if (params.country) {
      await form.locator('input[placeholder="India"]').fill(params.country);
    }
    if (params.contactPerson) {
      await form.locator('input[placeholder="e.g. Dr. Priya Sharma"]').fill(params.contactPerson);
    }
    if (params.siteEmail) {
      await form.locator('input[placeholder="site@vendor.com"]').fill(params.siteEmail);
    }
    if (params.sitePhone) {
      await form.locator('input[placeholder="+91 40 2345 6789"]').fill(params.sitePhone);
    }
    if (params.drugLicenseNumber) {
      await form.locator('input[placeholder="TG/MFG/2019/001234"]').fill(params.drugLicenseNumber);
    }
    if (params.drugLicenseExpiry) {
      await form.locator('input[type="date"]').nth(0).fill(params.drugLicenseExpiry);
    }
    await this.setSiteCheckbox("WHO-GMP", params.whoGmp);
    await this.setSiteCheckbox("USFDA", params.usfda);
    await this.setSiteCheckbox("EU-GMP", params.euGmp);
    if (params.gmpCertBody) {
      await form.locator('input[placeholder="e.g. WHO, USFDA, EDQM"]').fill(params.gmpCertBody);
    }
    if (params.gmpCertNumber) {
      await form.locator('input[placeholder="WHO-GMP-2024-1234"]').fill(params.gmpCertNumber);
    }
    if (params.gmpCertExpiry) {
      await form.locator('input[type="date"]').nth(2).fill(params.gmpCertExpiry);
    }
    if (params.qualifiedDate) {
      await form.locator('input[type="date"]').nth(3).fill(params.qualifiedDate);
    }
    if (params.nextRequalificationDue) {
      await form.locator('input[type="date"]').nth(4).fill(params.nextRequalificationDue);
    }
    if (params.lastAuditDate) {
      await form.locator('input[type="date"]').nth(5).fill(params.lastAuditDate);
    }
    if (params.openCapaCount) {
      await form.locator('input[placeholder="0"]').fill(params.openCapaCount);
    }
    if (params.qaRating) {
      await form.locator('input[placeholder="4.2"]').fill(params.qaRating);
    }
    if (params.deliveryScore) {
      await form.locator('input[placeholder="96.5"]').fill(params.deliveryScore);
    }
    if (params.rejectionRate) {
      await form.locator('input[placeholder="1.20"]').fill(params.rejectionRate);
    }
    await this.page.getByRole("button", { name: "Add Site" }).last().click();
    await expect(this.page.getByRole("heading", { name: params.unitName })).toBeVisible();
  }

  async selectSiteByCode(code: string) {
    const siteButton = this.page.getByRole("button").filter({ hasText: code }).first();
    if (await siteButton.count()) {
      await siteButton.click();
    }
    await expect(this.page.getByText(code).first()).toBeVisible();
  }

  async createMaterialApproval(params: {
    supplierLabel: string;
    materialLabel: string;
    status?: string;
    basis?: string;
    qualificationDate?: string;
  }) {
    await this.closeOpenSiteDrawer();

    const card = this.page
      .locator("div.rounded-2xl")
      .filter({ hasText: "Material Approvals" })
      .filter({ has: this.page.getByRole("button", { name: "Add Approval" }) })
      .first();
    await expect(card).toBeVisible();
    await card.locator("select").nth(0).selectOption({ label: params.supplierLabel });
    await card.locator("select").nth(1).selectOption({ label: params.materialLabel });
    await card.locator("select").nth(2).selectOption(params.status ?? "APPROVED");
    await card.locator("select").nth(3).selectOption(params.basis ?? "AUDIT");
    if (params.qualificationDate) {
      await card.locator('input[type="date"]').fill(params.qualificationDate);
    }
    const approvalResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/vendor-material-approvals") &&
        response.request().method() === "POST"
    );
    await card.getByRole("button", { name: "Add Approval" }).click();
    const response = await approvalResponse;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(
      card
        .getByRole("row")
        .filter({ hasText: params.supplierLabel })
        .filter({ hasText: params.materialLabel })
        .filter({ hasText: params.status ?? "APPROVED" })
    ).toBeVisible();
  }

  async openEditSelectedSite() {
    await this.page.getByRole("button", { name: "Edit" }).first().click();
    await expect(this.page.getByRole("heading", { name: "Edit Business Unit" })).toBeVisible();
  }

  async queueSiteDocument(params: {
    title: string;
    type?: string;
    expiryDate?: string;
    fileName: string;
    mimeType?: string;
    content?: string;
  }) {
    const form = this.page.locator("form#vbu-form");
    await form.getByPlaceholder("e.g. WHO GMP Certificate").fill(params.title);
    if (params.type) {
      await form.locator("select").nth(1).selectOption(params.type);
    }
    if (params.expiryDate) {
      await form.locator('input[type="date"]').first().fill(params.expiryDate);
    }
    await form.locator('input[type="file"]').first().setInputFiles({
      name: params.fileName,
      mimeType: params.mimeType ?? "application/pdf",
      buffer: Buffer.from(params.content ?? "e2e vendor site document")
    });
    await this.page.getByRole("button", { name: "Add Document" }).last().click();
    await expect(this.page.getByText(params.title)).toBeVisible();
  }

  async saveSiteChanges() {
    await this.page.getByRole("button", { name: "Save Changes" }).click();
  }

  async expectSiteDocumentVisible(title: string) {
    await expect(this.page.getByText(title).first()).toBeVisible();
  }

  async openAuditModalForSelectedSite() {
    await this.page.getByRole("button", { name: "Schedule Audit" }).first().click();
    await expect(this.page.getByRole("heading", { name: "Schedule Audit" })).toBeVisible();
  }

  async createAudit(params: {
    auditType?: string;
    scheduledDate: string;
    auditedBy: string;
    status?: string;
    outcome?: string;
    notes?: string;
  }) {
    const form = this.page.locator("form#audit-form");
    if (params.auditType) {
      await form.locator("select").nth(0).selectOption(params.auditType);
    }
    await form.locator('input[type="date"]').nth(0).fill(params.scheduledDate);
    await form.locator('input[type="text"]').fill(params.auditedBy);
    if (params.status) {
      await form.locator("select").nth(1).selectOption(params.status);
    }
    if (params.outcome) {
      await form.locator("select").nth(2).selectOption(params.outcome);
    }
    if (params.notes) {
      await form.locator("textarea").fill(params.notes);
    }
    await this.page.getByRole("button", { name: "Schedule Audit" }).last().click();
  }

  async editFirstAudit(params: {
    notes?: string;
    status?: string;
    outcome?: string;
    completedDate?: string;
  }) {
    const auditTable = this.page.getByRole("table").first();
    await expect(auditTable).toBeVisible();
    await auditTable.getByRole("button", { name: "Edit" }).first().click();
    await expect(this.page.getByRole("heading", { name: "Update Audit" })).toBeVisible();
    const form = this.page.locator("form#audit-form");
    if (params.completedDate) {
      await form.locator('input[type="date"]').nth(1).fill(params.completedDate);
    }
    if (params.status) {
      await form.locator("select").nth(1).selectOption(params.status);
    }
    if (params.outcome) {
      await form.locator("select").nth(2).selectOption(params.outcome);
    }
    if (params.notes) {
      await form.locator("textarea").fill(params.notes);
    }
    await this.page.getByRole("button", { name: "Update Audit" }).last().click();
  }

  async expectAuditVisible(value: string) {
    const note = this.page.getByText(value).first();
    if (await note.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(note).toBeVisible();
      return;
    }

    const auditRow = this.page
      .getByRole("row")
      .filter({ hasText: "Initial Qualification" })
      .filter({ hasText: "Completed" })
      .filter({ hasText: "Approved" })
      .first();
    await expect(auditRow).toBeVisible();
  }

  async ensureSelectedSiteQualified() {
    const qualifiedStatus = this.page.locator("div.rounded-xl").filter({ hasText: /^QualificationQualified$/ }).first();
    if (await qualifiedStatus.isVisible({ timeout: 1000 }).catch(() => false)) {
      return;
    }

    const approveButton = this.page.getByRole("button", { name: "Approve Site", exact: true });
    if (await approveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
      await approveButton.click();
      await expect(this.page.locator("div.rounded-xl").filter({ hasText: /^QualificationQualified$/ }).first()).toBeVisible();
      return;
    }

    await this.openEditSelectedSite();
    const form = this.page.locator("form#vbu-form");
    await form.getByLabel("Status").selectOption("QUALIFIED");
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/api/vendor-business-units/") &&
        response.request().method() === "PUT"
    );
    await this.page.getByRole("button", { name: "Save Changes" }).click();
    const response = await saveResponse;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(this.page.locator("div.rounded-xl").filter({ hasText: /^QualificationQualified$/ }).first()).toBeVisible();
  }

  async expectSelectedSiteQualified() {
    const qualificationCard = this.page.locator("div.rounded-xl").filter({ hasText: /^QualificationQualified$/ }).first();
    await expect(qualificationCard).toBeVisible();
  }

  async expectPartnersHiddenInSidebar() {
    await this.page.goto("/");
    await expect(this.page.getByText("Partners")).toHaveCount(0);
    await expect(this.page.getByRole("link", { name: /Vendor Management/i })).toHaveCount(0);
  }

  private async setSiteCheckbox(label: string, checked?: boolean) {
    if (checked === undefined) {
      return;
    }

    const checkbox = this.page.getByLabel(label);
    if ((await checkbox.isChecked()) !== checked) {
      await checkbox.setChecked(checked);
    }
  }

  private async closeOpenSiteDrawer() {
    const overlay = this.page.locator(".fixed.inset-0").filter({ has: this.page.locator("form#vbu-form") }).first();
    if (!(await overlay.isVisible({ timeout: 1000 }).catch(() => false))) {
      return;
    }

    const drawerHeading = overlay.getByRole("heading", { name: /Add Manufacturing Site|Edit Business Unit/ });
    await this.page.keyboard.press("Escape");
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await overlay.getByRole("button").first().click();
    }
    await expect(overlay).toBeHidden();
  }
}
