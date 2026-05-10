import { expect, type Locator, type Page } from "@playwright/test";

export class MaterialsPage {
  constructor(private readonly page: Page) {}

  async gotoList() {
    await this.page.goto("/master-data/materials/materials");
  }

  async gotoCreate() {
    await this.page.goto("/master-data/materials/new");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: "Materials Master" })).toBeVisible();
  }

  rowByMaterialName(name: string): Locator {
    return this.page.locator("tr", { has: this.page.getByText(name, { exact: true }) });
  }

  async expectMaterialVisible(name: string) {
    await expect(this.rowByMaterialName(name)).toBeVisible();
  }

  async openEditByMaterialName(name: string) {
    const row = this.rowByMaterialName(name);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();
  }

  async createMaterial(params: {
    materialName: string;
    category?: string;
    storageCondition?: string;
    specId: string;
    description?: string;
    shelfLifeMonths?: number;
  }) {
    await this.gotoCreate();
    await this.page.getByTestId("material-name").fill(params.materialName);
    await this.page.getByTestId("material-category").selectOption(params.category ?? "API");
    await this.page.getByTestId("material-storage-condition").selectOption(params.storageCondition ?? "AMBIENT");
    await this.page.getByTestId("material-shelf-life-months").fill(String(params.shelfLifeMonths ?? 24));
    await this.page.getByTestId("material-spec-select").selectOption(params.specId);
    if (params.description) {
      await this.page.getByTestId("material-description").fill(params.description);
    }
    await this.page.getByTestId("btn-save-material").click();
    await this.page.waitForURL("/master-data/materials/materials");
  }

  async updateDescription(description: string) {
    await this.page.getByTestId("material-description").fill(description);
    await this.page.getByTestId("btn-save-material").click();
    await this.page.waitForURL("/master-data/materials/materials");
  }

  async expectDescriptionValue(description: string) {
    await expect(this.page.getByTestId("material-description")).toHaveValue(description);
  }

  async updateSpec(specId: string) {
    await this.page.getByTestId("material-spec-select").selectOption(specId);
    await this.page.getByTestId("btn-save-material").click();
    await this.page.waitForURL("/master-data/materials/materials");
  }

  async expectSpecValue(specId: string) {
    await expect(this.page.getByTestId("material-spec-select")).toHaveValue(specId);
  }
}
