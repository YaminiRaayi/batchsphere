import { test, expect } from "../fixtures/auth.fixture";
import { e2eRunLabel, readRunId } from "../fixtures/api";
import { SpecMoaPage } from "../pages/SpecMoaPage";

test.describe.serial("Spec and MoA", () => {
  let runId = "";
  let specCode = "";
  let specName = "";
  let rejectSpecCode = "";
  let rejectSpecName = "";
  let moaCode = "";
  let moaName = "";
  let rejectMoaCode = "";
  let rejectMoaName = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "QMS");
    specCode = `SPEC-${runId}`;
    specName = `E2E Spec ${runId}`;
    rejectSpecCode = `SPEC-RJ-${runId}`;
    rejectSpecName = `E2E Reject Spec ${runId}`;
    moaCode = `MOA-${runId}`;
    moaName = `E2E MoA ${runId}`;
    rejectMoaCode = `MOA-RJ-${runId}`;
    rejectMoaName = `E2E Reject MoA ${runId}`;
  });

  test("SPEC-01 create Spec in draft", async ({ qcAnalystPage }) => {
    const page = new SpecMoaPage(qcAnalystPage);
    await page.gotoSpecs();
    await page.createSpecDraft({ code: specCode, name: specName, revision: "1.0" });
    await page.openSpecByCode(specCode);
    await page.expectSelectedSpecStatus("DRAFT");
  });

  test("SPEC-02 add test parameter to spec", async ({ qcAnalystPage }) => {
    const page = new SpecMoaPage(qcAnalystPage);
    await page.gotoSpecs();
    await page.openSpecByCode(specCode);
    await page.addSpecParameter({
      name: `Assay ${runId}`,
      testType: "ASSAY",
      criteriaType: "RANGE",
      lowerLimit: "98",
      upperLimit: "102",
      unit: "%"
    });
    await page.expectParameterVisible(`Assay ${runId}`);
  });

  test("SPEC-03 submit spec for review", async ({ qcAnalystPage }) => {
    const page = new SpecMoaPage(qcAnalystPage);
    await page.gotoSpecs();
    await page.openSpecByCode(specCode);
    await page.submitSelectedSpec();
    await page.expectSelectedSpecStatus("UNDER REVIEW");
  });

  test("SPEC-04 approve spec", async ({ qcManagerPage }) => {
    const page = new SpecMoaPage(qcManagerPage);
    await page.selectReviewSpec(specCode);
    await page.approveFromReviewQueue();
    await page.gotoSpecs();
    await page.openSpecByCode(specCode);
    await page.expectSelectedSpecStatus("APPROVED");
  });

  test("SPEC-05 reject spec with remarks", async ({ qcAnalystPage, qcManagerPage }) => {
    const analyst = new SpecMoaPage(qcAnalystPage);
    await analyst.gotoSpecs();
    await analyst.createSpecDraft({ code: rejectSpecCode, name: rejectSpecName, revision: "1.0" });
    await analyst.openSpecByCode(rejectSpecCode);
    await analyst.submitSelectedSpec();

    const manager = new SpecMoaPage(qcManagerPage);
    await manager.selectReviewSpec(rejectSpecCode);
    await manager.rejectFromReviewQueue("Rejected by E2E");
    await manager.gotoSpecs();
    await manager.openSpecByCode(rejectSpecCode);
    await manager.expectSelectedSpecStatus("DRAFT");
  });

  test("SPEC-06 obsolete approved spec", async ({ qcManagerPage }) => {
    const page = new SpecMoaPage(qcManagerPage);
    await page.gotoSpecs();
    await page.openSpecByCode(specCode);
    await page.obsoleteSelectedSpec();
    await page.expectSelectedSpecStatus("OBSOLETE");
  });

  test("MOA-01 create MoA in draft", async ({ qcAnalystPage }) => {
    const page = new SpecMoaPage(qcAnalystPage);
    await page.gotoMoas();
    await page.createMoaDraft({
      code: moaCode,
      name: moaName,
      revision: "1.0",
      methodType: "HPLC",
      validationStatus: "VALIDATED",
      validationReferenceNo: `VAL-${runId}`
    });
    await page.openMoaByCode(moaCode);
    await page.expectSelectedMoaDraft();
  });

  test("MOA-02 submit MoA for review", async ({ qcAnalystPage }) => {
    const page = new SpecMoaPage(qcAnalystPage);
    await page.gotoMoas();
    await page.openMoaByCode(moaCode);
    await page.submitSelectedMoa();
    await page.expectSelectedMoaUnderReview();
  });

  test("MOA-03 approve MoA", async ({ qcManagerPage }) => {
    const page = new SpecMoaPage(qcManagerPage);
    await page.selectReviewMoa(moaCode);
    await page.approveFromReviewQueue();
    await page.gotoMoas();
    await page.openMoaByCode(moaCode);
    await page.expectSelectedMoaApproved();
  });

  test("MOA-04 reject MoA", async ({ qcAnalystPage, qcManagerPage }) => {
    const analyst = new SpecMoaPage(qcAnalystPage);
    await analyst.gotoMoas();
    await analyst.createMoaDraft({ code: rejectMoaCode, name: rejectMoaName, revision: "1.0", methodType: "GC" });
    await analyst.openMoaByCode(rejectMoaCode);
    await analyst.submitSelectedMoa();

    const manager = new SpecMoaPage(qcManagerPage);
    await manager.selectReviewMoa(rejectMoaCode);
    await manager.rejectFromReviewQueue("Rejected by E2E");
    await manager.gotoMoas();
    await manager.openMoaByCode(rejectMoaCode);
    await manager.expectSelectedMoaDraft();
  });
});
