import { expect, type Page } from "@playwright/test";

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/login");
  }

  async signIn(username: string, password: string) {
    await this.page.getByTestId("login-username").fill(username);
    await this.page.getByTestId("login-password").fill(password);
    await this.page.getByTestId("login-submit").click();
  }

  async expectVisible() {
    await expect(this.page.getByTestId("login-submit")).toBeVisible();
  }

  async expectErrorVisible() {
    await expect(this.page.getByTestId("login-error")).toBeVisible();
  }
}
