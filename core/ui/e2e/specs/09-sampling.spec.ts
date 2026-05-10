import { test } from "../fixtures/auth.fixture";
import {
  createAndReceiveGrn,
  createMaterialRecord,
  createSamplingReadySpecSetup,
  createSamplingToolRecord,
  createVmsChain,
  createWarehouseHierarchy,
  e2eRunLabel,
  readRunId
} from "../fixtures/api";
import { SamplingPage } from "../pages/SamplingPage";

test.describe.serial("QC Sampling", () => {
  let runId = "";
  let passMaterialName = "";
  let failMaterialName = "";
  let parameterName = "";
  let toolLabel = "";
  let passInvestigationReason = "";

  test.beforeAll(async () => {
    runId = e2eRunLabel(await readRunId(), "SAM");

    const quality = await createSamplingReadySpecSetup(runId);
    const tool = await createSamplingToolRecord(runId);
    const vms = await createVmsChain(runId);
    const warehouse = await createWarehouseHierarchy(runId);

    const passMaterial = await createMaterialRecord({
      suffix: `${runId}-PASS`,
      specId: quality.spec.id,
      materialName: `Sampling Pass Material ${runId}`
    });
    const failMaterial = await createMaterialRecord({
      suffix: `${runId}-FAIL`,
      specId: quality.spec.id,
      materialName: `Sampling Fail Material ${runId}`
    });

    await createAndReceiveGrn({
      suffix: `${runId}-PASS`,
      supplierId: vms.supplier.id,
      vendorId: vms.vendor.id,
      vendorBusinessUnitId: vms.vendorBusinessUnit.id,
      materialId: passMaterial.id,
      palletId: warehouse.pallet.id
    });
    await createAndReceiveGrn({
      suffix: `${runId}-FAIL`,
      supplierId: vms.supplier.id,
      vendorId: vms.vendor.id,
      vendorBusinessUnitId: vms.vendorBusinessUnit.id,
      materialId: failMaterial.id,
      palletId: warehouse.pallet.id
    });

    passMaterialName = passMaterial.materialName;
    failMaterialName = failMaterial.materialName;
    parameterName = quality.parameter.parameterName;
    toolLabel = `${tool.toolCode} - ${tool.toolName}`;
    passInvestigationReason = `OOS check ${runId}`;
  });

  test("SAM-01 create sampling request", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.expectQueueStatus(passMaterialName, "Pending");
  });

  test("SAM-02 create sampling plan", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.createSamplingPlan({
      samplingLocation: "Sampling Booth 1",
      analystCode: `AN-${runId}`,
      toolLabel,
      individualSampleQuantity: "0.250",
      rationale: `Plan for ${runId}`
    });
    await page.expectQueueStatus(passMaterialName, "Plan Set");
  });

  test("SAM-03 start sampling", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.startSampling();
    await page.expectQueueStatus(passMaterialName, "Sampling");
  });

  test("SAM-04 complete sampling", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.completeSampling();
    await page.expectQueueStatus(passMaterialName, "Sampled");
  });

  test("SAM-05 handoff samples to QC lab", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.handoffToQc();
    await page.expectQueueStatus(passMaterialName, "Handed to QC");
  });

  test("SAM-06 QC receipt", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.recordQcReceipt({
      receiptCondition: "Sealed and intact",
      storageLocation: "QC Shelf A1",
      retainedQuantity: "0.050",
      retainedUntil: "2027-05-01"
    });
    await page.expectQueueStatus(passMaterialName, "QC Received");
  });

  test("SAM-07 start review and fill test worksheet", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.startQcReview(`AN-${runId}`);
    await page.expectQueueStatus(passMaterialName, "QC Review");
    await page.saveWorksheetNumericResult(parameterName, "100", "Within range");
    await page.expectWorksheetStatus(parameterName, "PASS");
  });

  test("SAM-08 QC Manager approves disposition", async ({ qcManagerPage }) => {
    const page = new SamplingPage(qcManagerPage);
    await page.goto();
    await page.selectRequestByMaterialName(passMaterialName);
    await page.recordApprovedQcDecision(`Approved in E2E ${runId}`);
    await page.expectQueueStatus(passMaterialName, "Approved");
  });

  test("SAM-09 failing test triggers investigation", async ({ qcAnalystPage }) => {
    const page = new SamplingPage(qcAnalystPage);
    await page.goto();
    await page.selectRequestByMaterialName(failMaterialName);
    await page.createSamplingPlan({
      samplingLocation: "Sampling Booth 2",
      analystCode: `ANF-${runId}`,
      toolLabel,
      individualSampleQuantity: "0.250",
      rationale: `Failing cycle ${runId}`
    });
    await page.startSampling();
    await page.completeSampling();
    await page.handoffToQc();
    await page.recordQcReceipt({
      receiptCondition: "Sealed and intact",
      storageLocation: "QC Shelf B1",
      retainedQuantity: "0.050",
      retainedUntil: "2027-05-01"
    });
    await page.startQcReview(`ANF-${runId}`);
    await page.saveWorksheetNumericResult(parameterName, "90", "Out of specification");
    await page.expectWorksheetStatus(parameterName, "FAIL");
    await page.openInvestigation({
      parameterName,
      reason: passInvestigationReason,
      initialAssessment: "Initial OOS assessment"
    });
    await page.expectQueueStatus(failMaterialName, "Investigation");
  });

  test("SAM-10 resolve investigation", async ({ qcAnalystPage, qcManagerPage }) => {
    const analyst = new SamplingPage(qcAnalystPage);
    await analyst.goto();
    await analyst.selectRequestByMaterialName(failMaterialName);
    await analyst.resolveInvestigationForRetest({
      reason: passInvestigationReason,
      phaseSummary: "No assignable lab error found in Phase I",
      rootCause: "Sampling or preparation variation suspected",
      resolutionRemarks: "Move to retained-sample retest"
    });

    const manager = new SamplingPage(qcManagerPage);
    await manager.goto();
    await manager.selectRequestByMaterialName(failMaterialName);
    await manager.approveQaReview(passInvestigationReason, `QA approved retest path ${runId}`);
    await manager.expectInvestigationStatus(passInvestigationReason, "CLOSED_RETEST");
  });
});
