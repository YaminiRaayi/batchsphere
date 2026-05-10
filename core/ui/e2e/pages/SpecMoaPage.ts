import { expect, type Page } from "@playwright/test";

export class SpecMoaPage {
  constructor(private readonly page: Page) {}

  async gotoSpecs() {
    await this.page.goto("/master-data/qc-refs/specs");
  }

  async gotoMoas() {
    await this.page.goto("/master-data/qc-refs/moa");
  }

  async gotoReviewQueue() {
    await this.page.goto("/master-data/qc-refs/specs");
    await this.page.getByRole("button", { name: "Review Queue" }).click();
  }

  async openNewSpec() {
    await this.page.getByRole("button", { name: "New Specification" }).click();
    await expect(this.page.getByLabel("Spec Code *")).toBeVisible();
  }

  async openNewMoa() {
    await this.page.getByRole("button", { name: "New Method (MOA)" }).click();
    await expect(this.page.getByLabel("MOA Code *")).toBeVisible();
  }

  async createSpecDraft(params: { code: string; name: string; revision: string }) {
    await this.openNewSpec();
    await this.page.getByLabel("Spec Code *").fill(params.code);
    await this.page.getByLabel("Specification Name *").fill(params.name);
    await this.page.getByLabel("Revision *").fill(params.revision);
    await this.page.getByRole("button", { name: "Save Draft" }).click();
    await expect(this.page.getByText(params.code)).toBeVisible();
  }

  async openSpecByCode(code: string) {
    const search = this.page.getByPlaceholder("Search spec code or name…");
    await search.fill(code);
    await this.page.getByRole("button", { name: new RegExp(code) }).click();
  }

  async addSpecParameter(params: {
    name: string;
    testType?: string;
    criteriaType?: string;
    lowerLimit?: string;
    upperLimit?: string;
    unit?: string;
  }) {
    await this.page.getByRole("button", { name: "+ Add Test Parameter" }).click();
    await this.page.getByLabel("Parameter Name").fill(params.name);
    if (params.testType) {
      await this.page.getByLabel("Test Type").selectOption(params.testType);
    }
    if (params.criteriaType) {
      await this.page.getByLabel("Criteria Type").selectOption(params.criteriaType);
    }
    if (params.lowerLimit) {
      await this.page.getByLabel("Lower Limit").fill(params.lowerLimit);
    }
    if (params.upperLimit) {
      await this.page.getByLabel("Upper Limit").fill(params.upperLimit);
    }
    if (params.unit) {
      await this.page.getByLabel("Unit").fill(params.unit);
    }
    await this.page.getByRole("button", { name: "Add Parameter" }).click();
  }

  async expectParameterVisible(name: string) {
    await expect(this.page.getByRole("cell", { name })).toBeVisible();
  }

  async submitSelectedSpec() {
    await this.page.getByRole("button", { name: "Submit" }).click();
  }

  async expectSelectedSpecStatus(status: string) {
    await expect(this.page.locator("span").filter({ hasText: status }).first()).toBeVisible();
  }

  async expectSelectedMoaDraft() {
    await expect(this.page.getByRole("button", { name: "Submit" })).toBeVisible();
  }

  async expectSelectedMoaUnderReview() {
    await expect(this.page.getByRole("button", { name: "Submit" })).toBeHidden();
    await expect(this.page.getByText(/^UNDER REVIEW\s+·\s+\d+$/)).toBeVisible();
  }

  async expectSelectedMoaApproved() {
    await expect(this.page.getByRole("button", { name: "Obsolete" })).toBeVisible();
  }

  async selectReviewSpec(code: string) {
    await this.gotoReviewQueue();
    await this.page.getByRole("button", { name: new RegExp(code) }).click();
  }

  async approveFromReviewQueue() {
    await this.page.getByRole("button", { name: "Approve" }).click();
  }

  async rejectFromReviewQueue(remarks: string) {
    await this.page.getByRole("button", { name: "Reject", exact: true }).click();
    await this.page.getByLabel("Review Remarks").fill(remarks);
    await this.page.getByRole("button", { name: "Reject", exact: true }).last().click();
  }

  async obsoleteSelectedSpec() {
    await this.page.getByRole("button", { name: "Obsolete" }).click();
  }

  async createMoaDraft(params: {
    code: string;
    name: string;
    revision: string;
    methodType?: string;
    validationStatus?: string;
    validationReferenceNo?: string;
  }) {
    await this.openNewMoa();
    await this.page.getByLabel("MOA Code *").fill(params.code);
    await this.page.getByLabel("Method Name *").fill(params.name);
    if (params.methodType) {
      await this.page.getByLabel("Method Type *").selectOption(params.methodType);
    }
    await this.page.getByLabel("Revision *").fill(params.revision);
    if (params.validationStatus) {
      await this.page.getByLabel("Validation Status *").selectOption(params.validationStatus);
    }
    if (params.validationReferenceNo) {
      await this.page.getByLabel("Validation Ref").fill(params.validationReferenceNo);
    }
    await this.page.getByRole("button", { name: "Save Draft" }).click();
    await expect(this.page.getByText(params.code)).toBeVisible();
  }

  async openMoaByCode(code: string) {
    const search = this.page.getByPlaceholder("Search MOA code or name…");
    await search.fill(code);
    await this.page.getByRole("button", { name: new RegExp(code) }).click();
  }

  async submitSelectedMoa() {
    await this.page.getByRole("button", { name: "Submit" }).click();
  }

  async selectReviewMoa(code: string) {
    await this.gotoReviewQueue();
    await this.page.getByRole("button", { name: new RegExp(code) }).click();
  }
}
