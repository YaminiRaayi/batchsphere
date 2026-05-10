import { expect, type Page } from "@playwright/test";

export class WmsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/warehouse");
    await expect(this.page.getByText("Warehouse /")).toBeVisible();
  }

  async openNewLocation() {
    await this.page.getByRole("button", { name: "+ New Location" }).click();
    await expect(this.page.getByRole("heading", { name: "Create New Location" })).toBeVisible();
  }

  async createLocation(params: {
    businessUnitCode: string;
    businessUnitName: string;
    warehouseCode: string;
    warehouseName: string;
    roomCode: string;
    roomName: string;
    zoneName: string;
  }) {
    await this.openNewLocation();

    await this.page.locator('input[placeholder="BU-OPS"]').fill(params.businessUnitCode);
    await this.page.locator('input[placeholder="Operations"]').fill(params.businessUnitName);
    await this.page.getByRole("button", { name: "Create Business Unit" }).click();

    await this.page.locator('input[placeholder="WH-A"]').fill(params.warehouseCode);
    await this.page.locator('input[placeholder="Raw Material Store"]').fill(params.warehouseName);
    await this.page.locator('input[placeholder="R-01"]').fill(params.roomCode);
    await this.page.locator('input[placeholder="General Store"]').first().fill(params.roomName);
    await this.page.locator('input[placeholder="General Store"]').nth(1).fill(params.zoneName);
    await this.page.locator('input[placeholder="2"]').fill("1");
    await this.page.locator('input[placeholder="5"]').fill("1");
    await this.page.locator('input[placeholder="4"]').fill("1");

    await this.page.getByRole("button", { name: "Submit Location →" }).click();
    await expect(this.page.getByText(params.warehouseCode)).toBeVisible();
  }

  async selectMapPath(params: { warehouseCode: string; roomCode: string; rackCode: string }) {
    await this.page.getByRole("button", { name: new RegExp(`${params.warehouseCode}.*\\d+ rooms`) }).click();
    await this.page.getByRole("button", { name: new RegExp(`${params.roomCode}.*\\d+ racks`) }).click();
    await this.page.getByRole("button", { name: new RegExp(params.rackCode) }).click();
  }

  async expectMapSelection(params: { warehouseCode: string; roomCode: string; rackCode: string }) {
    await expect(
      this.page.getByRole("heading", {
        name: new RegExp(`${params.warehouseCode} / ${params.roomCode} / ${params.rackCode}`)
      })
    ).toBeVisible();
    await expect(
      this.page.locator("div").filter({ hasText: new RegExp(`${params.warehouseCode} / ${params.roomCode} / ${params.rackCode} /`) }).first()
    ).toBeVisible();
  }

  async expectPalletVisible(palletCode: string) {
    await expect(this.page.getByRole("button", { name: new RegExp(palletCode) })).toBeVisible();
  }

  async switchToZones() {
    await this.page.getByRole("button", { name: "Zone Assignments" }).click();
    await expect(this.page.getByRole("heading", { name: "Zone Assignments" })).toBeVisible();
  }

  async switchToMaterials() {
    await this.page.getByRole("button", { name: "Material → Location" }).click();
    await expect(this.page.getByRole("heading", { name: "Material → Location Mapping" })).toBeVisible();
  }

  async expectZoneRuleVisible(params: { warehouseCode: string; roomCode: string; roomName: string; zoneName?: string }) {
    await expect(this.page.getByText(`${params.warehouseCode} ·`, { exact: false })).toBeVisible();
    await expect(this.page.getByText(`${params.roomCode} · ${params.roomName}`)).toBeVisible();
  }

  async searchMaterial(code: string) {
    await this.page.getByPlaceholder("Search material...").fill(code);
  }

  async expectMaterialLocationVisible(params: { materialCode: string; warehouseCode: string; roomCode: string }) {
    const row = this.page
      .getByRole("row")
      .filter({ hasText: params.materialCode })
      .filter({ hasText: `${params.warehouseCode} / ${params.roomCode}` })
      .first();

    await expect(row).toBeVisible();
  }
}
