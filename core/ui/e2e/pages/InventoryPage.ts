import { expect, type Locator, type Page } from "@playwright/test";

export class InventoryPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/inventory");
    await expect(this.page.getByRole("heading", { name: "Inventory Management" })).toBeVisible();
  }

  rowByMaterialName(materialName: string): Locator {
    return this.page.locator("tr", { has: this.page.getByText(materialName, { exact: true }) });
  }

  async expectLotVisible(materialName: string) {
    await expect(this.rowByMaterialName(materialName)).toBeVisible();
  }

  async expectLotStatus(materialName: string, statusLabel: string) {
    await expect(this.rowByMaterialName(materialName).getByText(statusLabel, { exact: true })).toBeVisible();
  }

  async expectLotQuantity(materialName: string, quantityText: string) {
    await expect(this.rowByMaterialName(materialName).getByText(quantityText, { exact: true })).toBeVisible();
  }

  async selectLotByMaterialName(materialName: string) {
    const row = this.rowByMaterialName(materialName);
    await expect(row).toBeVisible();
    await row.getByRole("radio").check();
  }

  async openAdjustDialog() {
    await this.page.getByRole("button", { name: "Adjust" }).click();
    await expect(this.page.getByRole("heading", { name: "Adjust Inventory" })).toBeVisible();
  }

  async submitPositiveAdjustment(quantity: string, reason: string) {
    await this.page.getByRole("button", { name: "Increase Stock" }).click();
    await this.page.getByLabel("Quantity").fill(quantity);
    await this.page.getByLabel("Reason").fill(reason);
    await this.page.getByRole("button", { name: "Confirm Adjustment" }).click();
    await expect(this.page.getByRole("heading", { name: "Adjust Inventory" })).not.toBeVisible();
  }

  async openIssueDialog() {
    await this.page.getByRole("button", { name: "Issue" }).click();
    await expect(this.page.getByRole("heading", { name: "Issue Inventory" })).toBeVisible();
  }

  async submitIssue(params: {
    quantity: string;
    referenceType: "PRODUCTION" | "DISPENSING" | "SAMPLING_REQUEST" | "OTHER";
    referenceNumber: string;
    reason: string;
    remarks?: string;
  }) {
    await this.page.getByLabel("Issue Reference Type").selectOption(params.referenceType);
    await this.page.getByLabel("Quantity").fill(params.quantity);
    await this.page.getByLabel("Reference Number").fill(params.referenceNumber);
    await this.page.getByLabel("Reason").fill(params.reason);
    if (params.remarks) {
      await this.page.getByLabel("Remarks").fill(params.remarks);
    }
    await this.page.getByRole("button", { name: "Confirm Issue" }).click();
    await expect(this.page.getByRole("heading", { name: "Issue Inventory" })).not.toBeVisible();
  }

  movementByText(text: string): Locator {
    return this.page.locator("div").filter({ hasText: text }).first();
  }

  async expectMovementVisible(params: { materialName: string; referenceNumber?: string; quantityText?: string }) {
    const movement = this.page
      .locator("div")
      .filter({ hasText: params.materialName })
      .filter({ hasText: params.referenceNumber ?? "" })
      .first();

    await expect(movement).toBeVisible();
    if (params.quantityText) {
      await expect(movement).toContainText(params.quantityText);
    }
  }
}
