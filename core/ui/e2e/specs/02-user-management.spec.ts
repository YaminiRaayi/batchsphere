import { test, expect } from "../fixtures/auth.fixture";
import { e2eRunLabel, readRunId } from "../fixtures/api";
import { UserManagementPage } from "../pages/UserManagementPage";

test.describe.serial("User Management", () => {
  let username = "";
  let email = "";

  test.beforeAll(async () => {
    const runId = e2eRunLabel(await readRunId(), "USR");
    username = `e2e-user-${runId}`;
    email = `e2e-user-${runId}@batchsphere.local`;
  });

  test("USR-01 create a new user", async ({ adminPage }) => {
    const userManagementPage = new UserManagementPage(adminPage);

    await userManagementPage.goto();
    await userManagementPage.expectLoaded();
    await userManagementPage.createUser({
      username,
      email,
      role: "QC_ANALYST",
      password: "Admin@123"
    });
    await userManagementPage.search(username);
    await userManagementPage.expectUserVisible(username);
    await userManagementPage.expectRole(username, "QC ANALYST");
  });

  test("USR-02 edit user role", async ({ adminPage }) => {
    const userManagementPage = new UserManagementPage(adminPage);

    await userManagementPage.goto();
    await userManagementPage.expectLoaded();
    await userManagementPage.search(username);
    await userManagementPage.openEditForUsername(username);
    await userManagementPage.updateRole("QC_MANAGER");
    await userManagementPage.expectRole(username, "QC MANAGER");
  });

  test("USR-03 deactivate and reactivate user", async ({ adminPage }) => {
    const userManagementPage = new UserManagementPage(adminPage);

    await userManagementPage.goto();
    await userManagementPage.expectLoaded();
    await userManagementPage.search(username);
    await userManagementPage.openEditForUsername(username);
    await userManagementPage.setActiveState(false);
    await userManagementPage.expectStatus(username, "Inactive");

    await userManagementPage.openEditForUsername(username);
    await userManagementPage.setActiveState(true);
    await userManagementPage.expectStatus(username, "Active");
  });

  test("USR-04 user management hidden for non-admin", async ({ warehousePage }) => {
    await warehousePage.goto("/");
    await expect(warehousePage.getByTestId("nav-item-admin-users")).toHaveCount(0);
  });
});
