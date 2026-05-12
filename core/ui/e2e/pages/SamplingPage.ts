import { expect, type Locator, type Page } from "@playwright/test";

const qcApprovalPhrase = "I APPROVE THIS FINAL QC DECISION";
const qaApprovalPhrase = "I APPROVE THIS QA REVIEW";

export class SamplingPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto("/qc/sampling");
    await expect(this.page.getByRole("heading", { name: "QC Sampling" })).toBeVisible();
  }

  requestRow(materialName: string): Locator {
    return this.page.getByRole("button").filter({ hasText: materialName }).first();
  }

  async selectRequestByMaterialName(materialName: string) {
    const row = this.requestRow(materialName);
    await expect(row).toBeVisible();
    await row.click();
  }

  async expectQueueStatus(materialName: string, label: string) {
    await expect(this.requestRow(materialName)).toContainText(label);
  }

  async createSamplingPlan(params: {
    samplingLocation: string;
    analystCode: string;
    toolLabel: string;
    individualSampleQuantity: string;
    containerDraws?: Array<{ quantity: string; purpose?: string }>;
    rationale?: string;
  }) {
    await this.page.getByLabel("Sampling location").fill(params.samplingLocation);
    await this.page.getByLabel("Analyst employee code").fill(params.analystCode);
    await this.page.getByLabel("Sampling tool").selectOption({ label: params.toolLabel });
    await this.page.getByPlaceholder(/Sample qty/).fill(params.individualSampleQuantity);
    if (params.containerDraws?.length) {
      const containerRows = this.page.locator("input[value*='BAG-']");
      for (const [index, draw] of params.containerDraws.entries()) {
        const row = containerRows.nth(index);
        await expect(row).toBeVisible();
        const rowContainer = row.locator("..");
        if (draw.purpose) {
          await rowContainer.locator("select").selectOption(draw.purpose);
        }
        await rowContainer.locator('input[type="number"]').first().fill(draw.quantity);
      }
    }
    if (params.rationale) {
      await this.page.getByLabel("Rationale").fill(params.rationale);
    }
    await this.page.getByRole("button", { name: "Create Sampling Plan" }).click();
  }

  async startSampling() {
    await this.page.getByRole("button", { name: "Start Sampling" }).click();
  }

  async completeSampling() {
    await this.page.getByRole("button", { name: "Mark Sampling Complete" }).click();
  }

  async handoffToQc() {
    await this.page.getByRole("button", { name: "Handoff to QC" }).click();
  }

  async recordQcReceipt(params: {
    receiptCondition: string;
    storageLocation: string;
    retainedQuantity?: string;
    retainedUntil?: string;
  }) {
    await this.page.getByLabel("Receipt Condition").fill(params.receiptCondition);
    await this.page.getByLabel("QC Storage Location").fill(params.storageLocation);
    if (params.retainedQuantity || params.retainedUntil) {
      await this.page.getByLabel("Retained sample required").check();
    }
    if (params.retainedQuantity) {
      await this.page.getByLabel("Retained Quantity").fill(params.retainedQuantity);
    }
    if (params.retainedUntil) {
      await this.page.getByLabel("Retained Until").fill(params.retainedUntil);
    }
    await this.page.getByRole("button", { name: "Record QC Receipt" }).click();
  }

  async startQcReview(analystCode: string) {
    await this.page.getByLabel("QC Analyst Code").fill(analystCode);
    await this.page.getByRole("button", { name: "Start QC Review" }).click();
  }

  async saveWorksheetNumericResult(parameterName: string, value: string, remarks?: string) {
    const row = this.page.getByRole("row").filter({ hasText: parameterName }).first();
    await expect(row).toBeVisible();
    await row.locator('input[type="number"]').fill(value);
    if (remarks) {
      await row.getByPlaceholder("Optional remarks").fill(remarks);
    }
    const saveResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes("/worksheet/") &&
        response.request().method() === "PUT"
    );
    await row.getByRole("button", { name: "Save Result" }).click();
    await saveResponse;
  }

  async expectWorksheetStatus(parameterName: string, status: string) {
    const row = this.page.getByRole("row").filter({ hasText: parameterName }).first();
    await expect
      .poll(async () => {
        return (await row.textContent()) ?? "";
      })
      .toContain(status);
  }

  async openInvestigation(params: { parameterName: string; reason: string; initialAssessment?: string }) {
    const row = this.page.getByRole("row").filter({ hasText: params.parameterName }).first();
    await row.getByRole("button", { name: "Select for Investigation" }).click();
    await this.page.getByLabel("Investigation reason").fill(params.reason);
    if (params.initialAssessment) {
      await this.page.getByLabel("Initial assessment").fill(params.initialAssessment);
    }
    await this.page.getByRole("button", { name: "Open Investigation" }).click();
  }

  investigationCard(reason: string): Locator {
    return this.page.locator("div.rounded-xl").filter({ hasText: reason }).first();
  }

  async resolveInvestigationForRetest(params: {
    reason: string;
    phaseSummary: string;
    rootCause: string;
    resolutionRemarks: string;
  }) {
    const card = this.investigationCard(params.reason);
    await expect(card).toBeVisible();
    await card.getByLabel("Proposed outcome").selectOption("RETEST_REQUIRED");
    await card.getByLabel("Root cause").fill(params.rootCause);
    await card.getByLabel("Phase I summary", { exact: true }).fill(params.phaseSummary);
    await card.getByLabel("Resolution remarks").fill(params.resolutionRemarks);
    await card.getByRole("button", { name: "Submit for QA Review" }).click();
  }

  async approveQaReview(reason: string, remarks: string) {
    const card = this.investigationCard(reason);
    await expect(card).toBeVisible();
    await card.getByLabel("QA review remarks").fill(remarks);
    await card.getByLabel("Typed confirmation").fill(qaApprovalPhrase);
    await card.getByRole("button", { name: "Approve QA Review" }).click();
  }

  async expectInvestigationStatus(reason: string, status: string) {
    await expect(this.investigationCard(reason)).toContainText(status);
  }

  async recordApprovedQcDecision(remarks: string) {
    await this.page.getByPlaceholder("Enter QC remarks (required before approve / reject)").fill(remarks);
    await this.page.getByLabel("Typed confirmation").fill(qcApprovalPhrase);
    await this.page.getByRole("button", { name: "Approve & Release" }).click();
  }
}
