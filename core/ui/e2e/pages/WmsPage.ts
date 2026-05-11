import { expect, type Page } from "@playwright/test";

type LocationRoomParams = {
  roomCode: string;
  roomName: string;
  zoneName: string;
  storageCondition?: string;
  temperatureRange?: string;
  humidityRange?: string;
  maxCapacity?: string;
  capacityUom?: string;
  allowedCategories?: string;
  rackCount?: string;
  shelvesPerRack?: string;
  palletsPerShelf?: string;
  quarantineOnly?: boolean;
  restrictedAccess?: boolean;
  rejectedOnly?: boolean;
  notes?: string;
};

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
    roomCode?: string;
    roomName?: string;
    zoneName?: string;
    rooms?: LocationRoomParams[];
  }) {
    await this.openNewLocation();

    await this.page.locator('input[placeholder="BU-OPS"]').fill(params.businessUnitCode);
    await this.page.locator('input[placeholder="Operations"]').fill(params.businessUnitName);
    await this.page.getByRole("button", { name: "Create Business Unit" }).click();

    await this.page.locator('input[placeholder="WH-A"]').fill(params.warehouseCode);
    await this.page.locator('input[placeholder="Raw Material Store"]').fill(params.warehouseName);
    const rooms = params.rooms ?? [
      {
        roomCode: params.roomCode ?? "R-01",
        roomName: params.roomName ?? "General Store",
        zoneName: params.zoneName ?? "General Store",
        rackCount: "1",
        shelvesPerRack: "1",
        palletsPerShelf: "1"
      }
    ];

    for (let index = 1; index < rooms.length; index += 1) {
      await this.page.getByRole("button", { name: "+ Add Room" }).click();
    }

    for (const [index, room] of rooms.entries()) {
      await this.page.locator('input[placeholder="R-01"]').nth(index).fill(room.roomCode);
      await this.page.locator('input[placeholder="General Store"]').nth(index * 2).fill(room.roomName);
      await this.page.getByLabel("Temp Zone").nth(index).selectOption(room.storageCondition ?? "AMBIENT");
      await this.page.locator('input[placeholder="Ambient 15–30°C"]').nth(index).fill(room.temperatureRange ?? "Ambient 15-30C");
      await this.page.locator('input[placeholder="40–65% RH"]').nth(index).fill(room.humidityRange ?? "40-65% RH");
      await this.page.locator('input[placeholder="5000"]').nth(index).fill(room.maxCapacity ?? "5000");
      await this.page.locator('input[placeholder="kg"]').nth(index).fill(room.capacityUom ?? "KG");
      await this.page.locator('input[placeholder="API, Excipients"]').nth(index).fill(room.allowedCategories ?? "API");
      await this.page.locator('input[placeholder="General Store"]').nth(index * 2 + 1).fill(room.zoneName);
      await this.page.locator('input[placeholder="2"]').nth(index).fill(room.rackCount ?? "1");
      await this.page.locator('input[placeholder="5"]').nth(index).fill(room.shelvesPerRack ?? "1");
      await this.page.locator('input[placeholder="4"]').nth(index).fill(room.palletsPerShelf ?? "1");
      await this.setRoomCheckbox("Restricted Access", index, room.restrictedAccess);
      await this.setRoomCheckbox("Quarantine Only", index, room.quarantineOnly);
      await this.setRoomCheckbox("Rejected Only", index, room.rejectedOnly);
      if (room.notes) {
        await this.page.locator('textarea[placeholder="Optional rule or room notes"]').nth(index).fill(room.notes);
      }
    }

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

  private async setRoomCheckbox(label: string, index: number, checked?: boolean) {
    if (checked === undefined) {
      return;
    }

    const checkbox = this.page.getByLabel(label).nth(index);
    if ((await checkbox.isChecked()) !== checked) {
      await checkbox.setChecked(checked);
    }
  }
}
