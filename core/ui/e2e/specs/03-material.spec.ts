import { test, expect } from "../fixtures/auth.fixture";
import { createApprovedSpec, createMaterialRecord, e2eRunLabel, readRunId } from "../fixtures/api";
import { MaterialsPage } from "../pages/MaterialsPage";

test.describe.serial("Material Management", () => {
  let runId = "";
  let createMaterialName = "";
  let editMaterialName = "";
  let specAId = "";
  let specBId = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "MAT");
    createMaterialName = `E2E UI Material ${runId}`;
    editMaterialName = `E2E Edit Material ${runId}`;

    const specA = await createApprovedSpec(`${runId}-a`);
    const specB = await createApprovedSpec(`${runId}-b`);
    specAId = specA.id;
    specBId = specB.id;

    await createMaterialRecord({
      suffix: `${runId}-edit`,
      specId: specAId,
      materialName: editMaterialName,
      description: "Initial description"
    });
  });

  test("MAT-01 create material", async ({ adminPage }) => {
    const materialsPage = new MaterialsPage(adminPage);

    await materialsPage.createMaterial({
      materialName: createMaterialName,
      specId: specAId,
      description: "Created through Playwright"
    });
    await materialsPage.expectLoaded();
    await materialsPage.expectMaterialVisible(createMaterialName);
  });

  test("MAT-02 view materials list", async ({ warehousePage }) => {
    const materialsPage = new MaterialsPage(warehousePage);

    await materialsPage.gotoList();
    await materialsPage.expectLoaded();
    await materialsPage.expectMaterialVisible(createMaterialName);
  });

  test("MAT-03 edit material", async ({ adminPage }) => {
    const materialsPage = new MaterialsPage(adminPage);
    const updatedDescription = `Updated description ${runId}`;

    await materialsPage.gotoList();
    await materialsPage.expectLoaded();
    await materialsPage.openEditByMaterialName(editMaterialName);
    await materialsPage.updateDescription(updatedDescription);

    await materialsPage.openEditByMaterialName(editMaterialName);
    await materialsPage.expectDescriptionValue(updatedDescription);
  });

  test("MAT-04 link approved spec to material via edit form", async ({ qcManagerPage }) => {
    const materialsPage = new MaterialsPage(qcManagerPage);

    await materialsPage.gotoList();
    await materialsPage.expectLoaded();
    await materialsPage.openEditByMaterialName(editMaterialName);
    await materialsPage.updateSpec(specBId);

    await materialsPage.openEditByMaterialName(editMaterialName);
    await materialsPage.expectSpecValue(specBId);
  });

  test("MAT-05 clear spec from material", async () => {
    test.fixme(true, "Current UI and backend both require specId on material update, so clearing the linked spec is not supported through the material form.");
  });

  test("MAT-06 procurement sees list, no create button", async ({ procurementPage }) => {
    const materialsPage = new MaterialsPage(procurementPage);

    await materialsPage.gotoList();
    await materialsPage.expectLoaded();
    await expect(procurementPage.getByTestId("btn-new-material")).toHaveCount(0);
  });

  test("MAT-07 procurement cannot access new material route", async ({ procurementPage }) => {
    await procurementPage.goto("/master-data/materials/new");
    await expect(procurementPage).toHaveURL("/forbidden");
  });
});
