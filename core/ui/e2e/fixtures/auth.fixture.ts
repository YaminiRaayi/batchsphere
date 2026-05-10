import path from "node:path";
import { fileURLToPath } from "node:url";
import { test as base, expect, type Page } from "@playwright/test";

type RolePages = {
  adminPage: Page;
  warehousePage: Page;
  qcAnalystPage: Page;
  qcManagerPage: Page;
  procurementPage: Page;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authDir = path.join(__dirname, "..", ".auth");

function authState(fileName: string) {
  return path.join(authDir, fileName);
}

export const test = base.extend<RolePages>({
  adminPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: authState("admin.json") });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  warehousePage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: authState("warehouse-op.json") });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  qcAnalystPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: authState("qc-analyst.json") });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  qcManagerPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: authState("qc-manager.json") });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
  procurementPage: async ({ browser, baseURL }, use) => {
    const context = await browser.newContext({ baseURL, storageState: authState("procurement.json") });
    const page = await context.newPage();
    await use(page);
    await context.close();
  }
});

export { expect };
