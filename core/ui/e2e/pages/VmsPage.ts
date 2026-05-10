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
    await this.page.getByRole("button", { name: "Create supplier" }).click();
    await expect(
      this.page
        .getByText(`Supplier ${params.code} created successfully.`)
        .or(this.page.getByText(new RegExp(`Supplier code already exists: ${escapeRegExp(params.code)}`)))
    ).toBeVisible();
    await this.page.getByRole("button", { name: "View Suppliers" }).click();
    await expect(this.page.getByRole("cell", { name: params.code })).toBeVisible();
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
    await this.page.getByRole("button", { name: "Add Site" }).last().click();
    await expect(this.page.getByRole("heading", { name: params.unitName })).toBeVisible();
  }

  async openEditSelectedSite() {
    await this.page.getByRole("button", { name: "Edit" }).click();
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
    await expect(this.page.getByText(title)).toBeVisible();
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
    await expect(this.page.getByText(value)).toBeVisible();
  }

  async ensureSelectedSiteQualified() {
    const approveButton = this.page.getByRole("button", { name: "Approve Site" });
    if (await approveButton.count()) {
      await approveButton.click();
    }
  }

  async expectSelectedSiteQualified() {
    const qualificationCard = this.page.locator("div").filter({ hasText: "Qualification" }).filter({ hasText: "Qualified" }).first();
    await expect(qualificationCard).toBeVisible();
  }

  async expectPartnersHiddenInSidebar() {
    await this.page.goto("/");
    await expect(this.page.getByText("Partners")).toHaveCount(0);
    await expect(this.page.getByRole("link", { name: /Vendor Management/i })).toHaveCount(0);
  }
}
