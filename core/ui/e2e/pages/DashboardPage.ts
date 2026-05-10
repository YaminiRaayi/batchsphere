import { expect, type Page } from "@playwright/test";

export class DashboardPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/");
  }

  async expectLoaded() {
    await expect(this.page.getByTestId("dashboard-heading")).toBeVisible();
  }

  async signOut() {
    await this.page.getByTestId("btn-logout").click();
  }
}
