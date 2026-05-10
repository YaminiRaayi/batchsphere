import { expect, type Locator, type Page } from "@playwright/test";

export class UserManagementPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/admin/users");
  }

  async expectLoaded() {
    await expect(this.page.getByRole("heading", { name: "User Management" })).toBeVisible();
  }

  async openCreateModal() {
    await this.page.getByTestId("btn-create-user").click();
    await expect(this.page.getByTestId("create-user-modal")).toBeVisible();
  }

  async search(term: string) {
    const input = this.page.getByTestId("user-search");
    await input.fill(term);
  }

  rowByUsername(username: string): Locator {
    return this.page.locator("tr", { has: this.page.getByText(username, { exact: true }) });
  }

  async expectUserVisible(username: string) {
    await expect(this.rowByUsername(username)).toBeVisible();
  }

  async createUser(params: {
    username: string;
    email: string;
    role: string;
    password: string;
  }) {
    await this.openCreateModal();
    await this.page.getByTestId("user-form-username-create").fill(params.username);
    await this.page.getByTestId("user-form-email-create").fill(params.email);
    await this.page.getByTestId("user-form-role-create").selectOption(params.role);
    await this.page.getByTestId("user-form-password-create").fill(params.password);
    await this.page.getByTestId("btn-submit-user-create").click();
    await expect(this.page.getByTestId("create-user-modal")).toBeHidden();
  }

  async openEditForUsername(username: string) {
    const row = this.rowByUsername(username);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Edit" }).click();
    await expect(this.page.getByTestId("edit-user-modal")).toBeVisible();
  }

  async updateRole(role: string) {
    await this.page.getByTestId("user-form-role-edit").selectOption(role);
    await this.page.getByTestId("btn-submit-user-edit").click();
    await expect(this.page.getByTestId("edit-user-modal")).toBeHidden();
  }

  async setActiveState(active: boolean) {
    const checkbox = this.page.getByTestId("user-form-is-active-edit");
    await expect(checkbox).toBeVisible();
    if ((await checkbox.isChecked()) !== active) {
      await checkbox.click();
    }
    await this.page.getByTestId("btn-submit-user-edit").click();
    await expect(this.page.getByTestId("edit-user-modal")).toBeHidden();
  }

  async expectRole(username: string, roleLabel: string) {
    await expect(this.rowByUsername(username)).toContainText(roleLabel);
  }

  async expectStatus(username: string, statusLabel: string) {
    await expect(this.rowByUsername(username)).toContainText(statusLabel);
  }
}
