import { test, expect } from "../fixtures/auth.fixture";
import { DashboardPage } from "../pages/DashboardPage";
import { LoginPage } from "../pages/LoginPage";

test.describe("Authentication and RBAC", () => {
  test("AUTH-01 valid login redirects to dashboard", async ({ page }) => {
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);

    await loginPage.goto();
    await loginPage.signIn("admin", "Admin@123");
    await expect(page).toHaveURL("/");
    await dashboardPage.expectLoaded();
  });

  test("AUTH-02 invalid credentials shows error", async ({ page }) => {
    const loginPage = new LoginPage(page);

    await loginPage.goto();
    await loginPage.signIn("admin", "wrongpass");
    await loginPage.expectErrorVisible();
    await expect(page).toHaveURL("/login");
  });

  test("AUTH-03 logout clears session", async ({ adminPage }) => {
    const dashboardPage = new DashboardPage(adminPage);

    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
    await dashboardPage.signOut();
    await expect(adminPage).toHaveURL("/login");

    const authState = await adminPage.evaluate(() => window.localStorage.getItem("batchsphere-auth"));
    expect(authState).not.toBeNull();
    expect(JSON.parse(authState ?? "{}").state.isAuthenticated).toBeFalsy();
  });

  test("AUTH-04 WAREHOUSE_OP blocked from User Management", async ({ warehousePage }) => {
    await warehousePage.goto("/admin/users");
    await expect(warehousePage).toHaveURL("/forbidden");
  });

  test("AUTH-05 QC_ANALYST blocked from GRN", async ({ qcAnalystPage }) => {
    await qcAnalystPage.goto("/inbound/grn");
    await expect(qcAnalystPage).toHaveURL("/forbidden");
  });

  test("AUTH-06 PROCUREMENT blocked from Sampling", async ({ procurementPage }) => {
    await procurementPage.goto("/qc/sampling");
    await expect(procurementPage).toHaveURL("/forbidden");
  });

  test("AUTH-07 WAREHOUSE_OP blocked from Partners", async ({ warehousePage }) => {
    await warehousePage.goto("/master-data/partners/suppliers");
    await expect(warehousePage).toHaveURL("/forbidden");
  });

  test("AUTH-08 all roles can reach dashboard", async ({ qcManagerPage }) => {
    const dashboardPage = new DashboardPage(qcManagerPage);

    await dashboardPage.goto();
    await dashboardPage.expectLoaded();
    await expect(qcManagerPage.getByTestId("dashboard-heading")).toContainText("Command Center");
  });
});
