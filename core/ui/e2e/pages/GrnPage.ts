import { expect, type Page } from "@playwright/test";

export class GrnPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/inbound/grn");
    await expect(this.page.getByText("GRN Inbound")).toBeVisible();
  }

  async startNewGrn() {
    await this.page.getByRole("button", { name: "+ New GRN" }).click();
    await expect(this.page.getByRole("heading", { name: "Create New GRN" })).toBeVisible();
  }

  async createDraft(params: {
    grnNumber: string;
    supplierLabel: string;
    vendorLabel: string;
    vendorBusinessUnitLabel?: string;
    invoiceNumber?: string;
    remarks?: string;
    materialLabel: string;
    vendorBatch: string;
    palletLabel: string;
    receivedQuantity: string;
    acceptedQuantity: string;
    rejectedQuantity?: string;
    uom?: string;
    manufactureDate?: string;
    expiryDate?: string;
    containerType: string;
    numberOfContainers: string;
    quantityPerContainer: string;
    qcStatus?: string;
    document?: {
      lineItemIndex?: string;
      documentName: string;
      documentType: string;
      documentUrl?: string;
      fileName: string;
      mimeType?: string;
      content?: string;
    };
  }) {
    await this.startNewGrn();

    const form = this.page.locator("form#grn-create-form");
    const headerSection = form.locator("div.rounded-2xl").filter({ hasText: "Header Information" }).first();
    const materialSection = form.locator("div.rounded-2xl").filter({ hasText: "Material Details" }).first();
    const containerSection = form.locator("div.rounded-2xl").filter({ hasText: "Container / Package Details" }).first();
    const documentSection = form.locator("div.rounded-2xl").filter({ hasText: "Supporting Documents" }).first();

    await headerSection.locator('input[placeholder="GRN-2026-0001"]').fill(params.grnNumber);
    await this.selectByLabel(headerSection, "Supplier", params.supplierLabel);
    await this.selectByLabel(headerSection, "Vendor (Corporate)", params.vendorLabel);
    if (params.vendorBusinessUnitLabel) {
      await this.selectByLabel(headerSection, "Manufacturing Site / VBU", params.vendorBusinessUnitLabel);
    }
    if (params.invoiceNumber) {
      await headerSection.locator('input[placeholder="INV-SA-20260417"]').fill(params.invoiceNumber);
    }
    if (params.remarks) {
      await headerSection.locator('textarea[placeholder="Initial inward receipt"]').fill(params.remarks);
    }

    const lineItemCard = materialSection.locator("div.rounded-xl").filter({ hasText: "Line Item 1" }).first();
    await this.selectByLabel(lineItemCard, "Material", params.materialLabel);
    await this.fillInputByLabel(lineItemCard, "Vendor / Supplier Batch No.", params.vendorBatch);
    await this.selectByLabel(lineItemCard, "Pallet", params.palletLabel);
    await this.fillInputByLabel(lineItemCard, "Received Qty", params.receivedQuantity, 0);
    await this.fillInputByLabel(lineItemCard, "Received Qty", params.uom ?? "KG", 1);
    await this.fillInputByLabel(lineItemCard, "Accepted Qty", params.acceptedQuantity);
    await this.fillInputByLabel(lineItemCard, "Rejected Qty", params.rejectedQuantity ?? "0");
    if (params.manufactureDate) {
      await this.fillInputByLabel(lineItemCard, "Mfg Date", params.manufactureDate);
    }
    if (params.expiryDate) {
      await this.fillInputByLabel(lineItemCard, "Expiry Date", params.expiryDate);
    }

    const containerCard = containerSection.locator("div.rounded-xl").filter({ hasText: /^Line 1/ }).first();
    await this.selectByLabel(containerCard, "Container Type", params.containerType);
    await this.fillInputByLabel(containerCard, "No. of Containers", params.numberOfContainers);
    await this.fillInputByLabel(containerCard, "Qty / Container", params.quantityPerContainer);
    if (params.qcStatus) {
      await this.selectByLabel(containerCard, "QC Status", params.qcStatus);
    }

    if (params.document) {
      if (params.document.lineItemIndex) {
        await documentSection.locator("select").nth(0).selectOption(params.document.lineItemIndex);
      }
      await documentSection.locator('input[placeholder="Document name (e.g. CoA)"]').fill(params.document.documentName);
      await documentSection.locator("select").nth(1).selectOption(params.document.documentType);
      if (params.document.documentUrl) {
        await documentSection.locator('input[placeholder="Optional URL / path"]').fill(params.document.documentUrl);
      }
      await documentSection.locator('input[type="file"]').setInputFiles({
        name: params.document.fileName,
        mimeType: params.document.mimeType ?? "application/pdf",
        buffer: Buffer.from(params.document.content ?? "e2e grn document")
      });
    }

    const createResponse = this.page.waitForResponse(
      (response) => response.url().includes("/api/grns") && response.request().method() === "POST"
    );
    await this.page.getByRole("button", { name: "Submit GRN →" }).click();
    const response = await createResponse;
    expect(response.ok(), await response.text()).toBeTruthy();
    await expect(this.page.getByRole("heading", { name: params.grnNumber })).toBeVisible();
  }

  async backToQueue() {
    const backButton = this.page.getByRole("button", { name: "← Back to GRNs" });
    if (await backButton.count()) {
      await backButton.click();
      await expect(this.page.getByText("GRN queue")).toBeVisible();
    }
  }

  async searchQueue(grnNumber: string) {
    await this.backToQueue();
    await this.page.getByPlaceholder("Search GRN, material, supplier...").fill(grnNumber);
  }

  async openGrn(grnNumber: string) {
    const currentHeading = this.page.getByRole("heading", { name: grnNumber });
    if (await currentHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(currentHeading).toBeVisible();
      return;
    }

    await this.searchQueue(grnNumber);
    await this.page.getByRole("button", { name: new RegExp(grnNumber) }).first().click();
    await expect(this.page.getByRole("heading", { name: grnNumber })).toBeVisible();
  }

  async expectDraftDetail(grnNumber: string) {
    await expect(this.page.getByRole("heading", { name: grnNumber })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Receive" })).toBeVisible();
    await expect(this.page.getByRole("button", { name: "Cancel" })).toBeVisible();
  }

  async expectDraftLineItemSummary(params: { vendorBatch: string; containers: number }) {
    await expect(this.page.getByText(params.vendorBatch)).toBeVisible();
    const lineItemCard = this.page.locator("article").filter({ hasText: "Line 1" }).first();
    await expect(lineItemCard.getByText(String(params.containers), { exact: true })).toBeVisible();
  }

  async expectContainers(params: { count: number; vendorBatch: string }) {
    await expect(this.page.getByText(`Containers (${params.count})`)).toBeVisible();
    await expect(this.page.getByText(params.vendorBatch)).toBeVisible();
    const rows = this.page
      .locator("table")
      .filter({ hasText: "Container" })
      .locator("tbody tr");
    await expect(rows).toHaveCount(params.count);
  }

  async receiveCurrentGrn() {
    await this.page.getByRole("button", { name: "Receive" }).click();
    await expect(this.page.getByRole("button", { name: "Print Labels" })).toBeVisible();
  }

  async printLabels() {
    const printDataPromise = this.page.waitForResponse(
      (response) =>
        response.url().includes("/labels/print-data") && response.request().method() === "GET"
    );
    const popupPromise = this.page.waitForEvent("popup", { timeout: 3000 }).catch(() => null);

    await this.page.getByRole("button", { name: "Print Labels" }).click();

    await printDataPromise;
    const popup = await popupPromise;
    if (popup) {
      return;
    }

    await expect(this.page.getByText("Unable to open the print window. Please allow pop-ups and try again.")).toBeVisible();
  }

  async expectAttachedDocument(name: string) {
    await expect(this.page.getByText("Attached Documents")).toBeVisible();
    await expect(this.page.getByText(name).first()).toBeVisible();
  }

  async cancelCurrentGrn(reason: string) {
    await this.page.getByRole("button", { name: "Cancel" }).click();
    await expect(this.page.getByRole("heading", { name: "Cancel GRN" })).toBeVisible();
    await this.page.getByPlaceholder("Explain why this draft GRN is being cancelled.").fill(reason);
    await this.page.getByRole("button", { name: "Confirm Cancel" }).click();
  }

  async expectCancelledInQueue(grnNumber: string) {
    await this.backToQueue();
    await this.page.getByPlaceholder("Search GRN, material, supplier...").fill(grnNumber);
    await expect(this.page.getByRole("button", { name: new RegExp(grnNumber) }).first()).toBeVisible();
  }

  private async fillInputByLabel(scope: ReturnType<Page["locator"]>, labelText: string, value: string, index = 0) {
    await scope.locator("label").filter({ hasText: labelText }).locator("input").nth(index).fill(value);
  }

  private async selectByLabel(scope: ReturnType<Page["locator"]>, labelText: string, optionLabel: string) {
    await scope.locator("label").filter({ hasText: labelText }).locator("select").first().selectOption({ label: optionLabel });
  }
}
