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
    materialType?: string;
    status?: string;
    genericNames?: string;
    category?: string;
    uom?: string;
    hsnCode?: string;
    casNumber?: string;
    pharmacopoeialRef?: string;
    storageCondition?: string;
    maxHumidity?: string;
    lightSensitivity?: string;
    hygroscopic?: boolean;
    specId: string;
    description?: string;
    shelfLifeMonths?: number;
    retestPeriodMonths?: number;
    reorderLevel?: string;
    leadTimeDays?: number;
    controlledSubstance?: boolean;
    hazardous?: boolean;
    photosensitive?: boolean;
    selectiveMaterial?: boolean;
    vendorCoaReleaseAllowed?: boolean;
    samplingRequired?: boolean;
  }) {
    await this.gotoCreate();
    if (params.materialType) {
      await this.page.getByTestId("material-type").selectOption(params.materialType);
    }
    if (params.status) {
      await this.page.getByLabel("Lifecycle Status").selectOption(params.status);
    }
    await this.page.getByTestId("material-name").fill(params.materialName);
    if (params.genericNames) {
      await this.page.getByLabel("Generic / Other Names").fill(params.genericNames);
    }
    await this.page.getByTestId("material-category").selectOption(params.category ?? "API");
    if (params.uom) {
      await this.page.getByTestId("material-uom").selectOption(params.uom);
    }
    if (params.hsnCode) {
      await this.page.getByLabel("HSN Code").fill(params.hsnCode);
    }
    if (params.casNumber) {
      await this.page.getByLabel("CAS Number").fill(params.casNumber);
    }
    if (params.pharmacopoeialRef) {
      await this.page.getByLabel("Pharmacopoeial Ref.").selectOption(params.pharmacopoeialRef);
    }
    await this.page.getByTestId("material-storage-condition").selectOption(params.storageCondition ?? "AMBIENT");
    if (params.maxHumidity) {
      await this.page.getByLabel("Max Humidity").fill(params.maxHumidity);
    }
    if (params.lightSensitivity) {
      await this.page.getByLabel("Light Sensitivity").selectOption(params.lightSensitivity);
    }
    if (params.hygroscopic !== undefined) {
      await this.page.getByLabel("Hygroscopic").selectOption(params.hygroscopic ? "yes" : "no");
    }
    await this.page.getByTestId("material-shelf-life-months").fill(String(params.shelfLifeMonths ?? 24));
    if (params.retestPeriodMonths !== undefined) {
      await this.page.getByLabel("Retest Period").fill(String(params.retestPeriodMonths));
    }
    if (params.reorderLevel) {
      await this.page.getByLabel("Reorder Level").fill(params.reorderLevel);
    }
    if (params.leadTimeDays !== undefined) {
      await this.page.getByLabel("Lead Time").fill(String(params.leadTimeDays));
    }
    await this.setToggle("Controlled Substance", params.controlledSubstance);
    await this.setToggle("Hazardous Material", params.hazardous);
    await this.setToggle("Photosensitive", params.photosensitive);
    await this.setToggle("Selective Material", params.selectiveMaterial);
    await this.setToggle("Vendor CoA Release", params.vendorCoaReleaseAllowed);
    await this.setToggle("Sampling Required", params.samplingRequired);
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

  private async setToggle(label: string, checked?: boolean) {
    if (checked === undefined) {
      return;
    }

    const toggle = this.page.locator("div").filter({ hasText: label }).locator("button").first();
    await expect(toggle).toBeVisible();
    const defaultChecked = label === "Sampling Required";
    const className = (await toggle.getAttribute("class")) ?? "";
    const isPressed = className.includes("bg-sky-500") || defaultChecked;
    if (isPressed !== checked) {
      await toggle.click();
    }
  }
}
