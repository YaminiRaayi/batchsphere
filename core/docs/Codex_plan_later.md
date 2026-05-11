# Codex Later Build Plan

**Date:** 2026-05-10  
**Purpose:** Later-stage implementation plan after comparing `IMPLEMENTATION_GAP_ANALYSIS.md`, `PHARMA_IMPROVEMENTS_AND_ROADMAP.md`, `PROJECT_OVERVIEW.md`, current code, and external pharma guidance.  
**Status:** Planning document. Use this as the working build sequence, not as a duplicate roadmap.

---

## 1. What Changed After Review

`IMPLEMENTATION_GAP_ANALYSIS.md` is the stronger source for current reality because it audits actual code and migrations. The old `Codex_plan_later.md` was too close to the broad roadmap and did not add implementation decisions.

This file now becomes the practical later plan:

- what to build first
- what to defer
- which gaps are already partly built
- what sampling and QC should really do
- where alerts fit after HRMS/training exists

---

## 2. Comparison: Implementation Gap Analysis vs Roadmap

| Topic | `IMPLEMENTATION_GAP_ANALYSIS.md` | Roadmap / old Codex plan | Decision |
|---|---|---|---|
| Audit trail | Correctly says no `AuditEvent` exists | Correctly says global gap | Build early, but after supplier/inventory hardening if current demo flow needs business correctness first |
| E-signature | Correctly says current confirmation text is not credential verification | Correctly listed global need | Build shared `ESignatureRecord` service |
| Supplier | Strong code-level gap: supplier is bare contact card | Broadly described supplier qualification | Implement V56 supplier pharma fields first |
| AVL | Strong code-level gap: no material-source approval entity | Broadly described approved vendor list | Build `VendorMaterialApproval` before CoA automation |
| Inventory expiry/retest | Strong code-level gap: dates exist on batch/GRN but not inventory | Roadmap says expiry/retest needed | Add inventory fields and blocking rules |
| Sampling | Stronger than roadmap because it found current code limitations | Roadmap was too generic | Replace with detailed variable-per-container sampling model below |
| QC worksheet | Strong code-level gap: worksheet service exists but no entity/gate | Roadmap says spec-driven QC needed | Build `QcWorksheet` entity and disposition gate |
| Alerts | Gap analysis says no alerting exists | Roadmap put alerts early | Defer alerts until after HRMS/training foundation, as requested |
| HRMS | Gap analysis says only `User.employeeId` exists | Roadmap says training is needed | Build before alert center because alerts need owners and due-date recipients |
| Document control | Gap analysis separates evidence docs from controlled SOPs | Roadmap says document control needed | Build controlled document MVP before training gating |

---

## 3. External Research Notes

Do not build pharma rules only from our local docs. The key external anchor points are:

- FDA 21 CFR Part 211 requires written procedures and controls for components, laboratory controls, records, and production operations.
- FDA 21 CFR Part 11 and FDA Part 11 guidance define expectations around electronic records, electronic signatures, audit trails, validation, record retention, and record copies.
- EU GMP Chapter 6 says sampling must follow written procedures and define sampling method, equipment, quantity, containers sampled, precautions, and storage conditions.
- EU GMP Annex 8 allows reduced sampling only under validated and justified conditions, especially for starting materials.
- WHO good practices for pharmaceutical quality control laboratories emphasize trained personnel, sample integrity, controlled receipt/storage, and documented QC laboratory practices.
- FDA OOS guidance expects structured investigation when test results are out of specification, not casual retesting until a passing result appears.
- ICH Q9(R1) supports risk-based controls, but risk-based does not mean uncontrolled.
- ICH Q10 supports pharmaceutical quality systems, change management, CAPA, management review, and continual improvement.

Official references:

- FDA Part 11 guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/part-11-electronic-records-electronic-signatures-scope-and-application
- eCFR 21 CFR Part 11: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11
- eCFR 21 CFR Part 211: https://www.ecfr.gov/current/title-21/chapter-I/subchapter-C/part-211
- FDA OOS guidance: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/investigating-out-specification-oos-test-results-pharmaceutical-production-level-2-revision
- ICH Q9(R1): https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q9r1-quality-risk-management
- ICH Q10: https://www.fda.gov/regulatory-information/search-fda-guidance-documents/q10-pharmaceutical-quality-system
- WHO QC laboratory guidance: https://www.who.int/publications/m/item/who-good-practices-for-pharmaceutical-quality-control-laboratories

---

## 4. Important Sampling Correction

Your concern is correct: sampling is not always "same quantity from every bag."

In a real incoming raw material flow:

- identity testing may require a small sample from every bag/container
- assay/purity testing may require a larger sample from selected containers
- retention sample may require a separate archive quantity
- selected bags may therefore lose more quantity than non-selected bags
- remaining quantity must be tracked per bag/container
- inventory should not show the original full quantity after physical sampling consumes material

Example:

| Container | Received | Identity | Composite assay | Retention | Total sampled | Remaining |
|---|---:|---:|---:|---:|---:|---:|
| Bag 1 | 25.000 kg | 0.050 kg | 0.200 kg | 0.100 kg | 0.350 kg | 24.650 kg |
| Bag 2 | 25.000 kg | 0.050 kg | 0.000 kg | 0.000 kg | 0.050 kg | 24.950 kg |
| Bag 3 | 25.000 kg | 0.050 kg | 0.200 kg | 0.000 kg | 0.250 kg | 24.750 kg |

The remaining material stays in the original bag/container, resealed and labeled. The sampled material becomes QC/retention material. Warehouse inventory must reflect that consumed/retained quantity.

### Current Code Reality

Current code has:

- `SamplingContainerSample.sampledQuantity`
- `GrnContainer.sampledQuantity`
- `Sample.sampleQuantity`
- `SampleContainerLink`

But current code lacks:

- separate sample purposes per container, such as identity vs assay vs retention
- multiple samples for one sampling request
- stored per-container remaining balance
- inventory ledger deduction for sampled material
- formal chain-of-custody event history beyond one handoff/receipt set of fields

### Required Product Model

Use this target model instead of one flat sample quantity:

```text
SamplingContainerDraw
  samplingPlanId
  grnContainerId
  containerNumber
  drawPurpose          // IDENTITY, COMPOSITE_ASSAY, RETENTION, MICRO, OTHER
  plannedQuantity
  actualQuantity
  uom
  containerBalanceBefore
  containerBalanceAfter
  sampledBy
  sampledAt
  containerCondition
  resealed
  samplingLabelApplied

Sample
  samplingRequestId
  sampleType           // IDENTITY, COMPOSITE_QC, RETENTION
  sampleNumber
  totalQuantity
  uom
  status

SampleContainerLink
  sampleId
  samplingContainerDrawId
  grnContainerId
  quantityContributed

SampleChainOfCustody
  sampleId
  fromUser
  toUser
  fromLocation
  toLocation
  handedOverAt
  receivedAt
  receiptCondition
```

### Required Database Changes

1. Add per-purpose draw table.

```text
V82__create_sampling_container_draw.sql
```

2. Relax sample uniqueness.

Current issue from gap analysis:

```text
Sample.samplingRequestId is unique
```

Target:

```text
UNIQUE(sampling_request_id, sample_type)
```

This allows one request to produce:

- identity sample
- composite QC sample
- retention sample

3. Add container remaining balance.

Either store it on `GrnContainer`:

```java
private BigDecimal remainingQuantity;
```

Or derive it from:

```text
container.quantity - sum(draw.actualQuantity)
```

Recommendation: store `remainingQuantity` for operational display, but recompute/validate from draw ledger during reconciliation.

4. Add inventory transaction type:

```java
SAMPLING_CONSUMPTION
```

### Required Service Behavior

On sampling completion:

1. Validate no draw exceeds container remaining quantity.
2. Validate required identity/composite/retention rules based on policy.
3. Update `GrnContainer.sampledQuantity`.
4. Update `GrnContainer.remainingQuantity`.
5. Create one or more `Sample` records.
6. Create `SampleContainerLink` records.
7. Deduct total consumed sample quantity from inventory via `InventoryTransactionType.SAMPLING_CONSUMPTION`.
8. Keep retained sample quantity visible separately, because retained quantity is not available for production.

### UI Behavior

Sampling screen should not show one generic "sample qty" field.

It should show a per-container matrix:

| Container | Received | Remaining | Identity | Assay/Composite | Retention | Total Draw | Balance After |
|---|---:|---:|---:|---:|---:|---:|---:|
| Bag 1 | 25.000 | 25.000 | editable | editable | editable | calculated | calculated |
| Bag 2 | 25.000 | 25.000 | editable | editable | editable | calculated | calculated |

Rules:

- total draw is calculated
- balance after is calculated
- negative balance is blocked
- composite total is calculated
- retention total is calculated
- identity coverage is shown as count/required count
- different bags can have different quantities

This is the right pharma model. Same result for every bag is only a convenience default, not a rule.

---

## 5. Alerting Decision

Alerting should be implemented after HRMS/training foundation, not now.

Reason:

- alerts need owners
- alerts need departments and escalation paths
- training alerts need employee records
- calibration alerts need instrument owners
- document alerts need document distribution records
- audit/requalification alerts need vendor/supplier owners

Build order:

1. HRMS `Employee`
2. Controlled documents
3. Training assignments
4. Instrument/supplier/vendor owner fields
5. Alert center

Target later entity:

```text
AlertEvent
  alertType
  severity
  sourceModule
  sourceEntityId
  title
  message
  dueDate
  ownerUserId
  department
  status             // OPEN, ACKNOWLEDGED, CLOSED, ESCALATED
  escalationLevel
```

Initial alerts after HRMS:

- training due/expired
- SOP acknowledgment due
- supplier/VBU audit due
- GMP certificate expiry
- inventory expiry/retest due
- instrument calibration due
- CAPA due/effectiveness due

---

## 6. Recommended Build Sequence

### Phase 1: Finish Inbound Master Data Controls

Goal: GRN should only receive material from qualified and controlled master data.

Build:

1. Supplier pharma fields from `SUPPLIER_ENHANCEMENT_REQUIREMENTS.md`
2. Supplier qualification status
3. `VendorMaterialApproval` approved vendor list
4. GRN service checks:
   - material must be active
   - material must have approved spec
   - supplier must be qualified or conditionally qualified
   - VBU must be qualified
   - vendor/material/source approval must exist
5. Material lifecycle:
   - DRAFT
   - ACTIVE
   - DISCONTINUED
   - OBSOLETE

Why first: it prevents bad receipt data from entering the system.

### Phase 2: Inventory Truth

Goal: inventory quantity and quality status must be trustworthy.

Build:

1. `Inventory.expiryDate`
2. `Inventory.retestDueDate`
3. issue block for expired inventory
4. block or QA review for retest-overdue inventory
5. FEFO selection visibility
6. `SAMPLING_CONSUMPTION` transaction
7. destruction workflow for rejected/expired material
8. cycle count / reconciliation records

Why second: QC and production cannot trust stock if inventory balance is wrong.

### Phase 3: Sampling Redesign

Goal: model real container-level sampling.

Build:

1. `SamplingContainerDraw`
2. sample purpose per draw
3. variable quantity per bag/container
4. remaining balance per container
5. multiple samples per sampling request
6. sample chain-of-custody event log
7. sampling policy:
   - all containers
   - sqrt(n)+1
   - risk-based reduced
   - CoA-based no physical sampling
8. retained sample destruction approval

Why third: it fixes the exact issue you raised and prevents inventory overstatement.

### Phase 4: QC Worksheet And OOS Controls

Goal: QC release should be impossible without completed required tests.

Build:

1. `QcWorksheet` entity
2. one worksheet per sample/spec
3. mandatory parameter completion gate
4. analyst/reviewer separation
5. OOS/OOT investigation gate
6. retest/resample authorization
7. final disposition e-signature

Why fourth: it makes release decisions defendable.

### Phase 5: Compliance Infrastructure

Goal: make regulated actions audit-ready.

Build:

1. `AuditEvent`
2. field-level old/new value audit
3. reason-for-change fields
4. `ESignatureRecord`
5. e-signature dialog
6. central status transition service
7. audit timeline UI tab

Note: this is P0 compliance work, but it is placed after the current inbound truth fixes if your immediate goal is product behavior. If the goal shifts to compliance demo, move this phase to Phase 1.

### Phase 6: Document Control And HRMS

Goal: establish people, SOP, and training foundation.

Build:

1. `Employee`
2. `ControlledDocument`
3. `DocumentRevision`
4. document approval workflow
5. SOP acknowledgment
6. `TrainingAssignment`
7. role qualification requirements
8. training gating for sampling and QC

Why before alerts: alerts need employee owners and training/document due dates.

### Phase 7: Alerts And Notifications

Goal: notify the right owner at the right time.

Build after HRMS:

1. `AlertEvent`
2. alert center UI
3. daily scheduler
4. escalation rules
5. email or in-app notification channel

Initial alert types:

- GMP certificate expiry
- audit due
- inventory expiry
- inventory retest due
- SOP acknowledgment due
- training expiry
- CAPA due
- calibration due

### Phase 8: QMS Foundation

Goal: manage abnormal events and planned changes.

Build:

1. `Deviation`
2. `CAPA`
3. `ChangeRequest`
4. `RiskAssessment`
5. GRN rejection to deviation candidate
6. OOS closure to CAPA candidate
7. material/spec/vendor edit to change control

### Phase 9: LIMS Foundation

Goal: make lab results traceable.

Build:

1. `LabInstrument`
2. `ReferenceStandard`
3. `ReagentLot`
4. `RawDataAttachment`
5. FKs from `QcTestResult`
6. instrument calibration status guard
7. reference standard expiry guard

Instrument integration can come much later.

---

## 7. Open Decisions

These are product decisions to confirm before coding.

1. Should `SAMPLING_CONSUMPTION` reduce warehouse inventory immediately at sampling completion, or split between `sample consumed` and `retention held`?

   Recommendation: reduce production-available inventory immediately. Track retained sample separately as retained QC material.

2. Should identity sampling from all containers be mandatory for every material?

   Recommendation: make it policy-driven. Some starting materials require all-container identity. Reduced sampling should require supplier/material qualification policy.

3. Should alerting include email at first release?

   Recommendation: start with in-app alert center only. Email after owner/escalation model is stable.

4. Should compliance infrastructure move before sampling redesign?

   Recommendation: if the next demo is pharma correctness, do sampling/inventory first. If the next demo is audit/compliance, do audit/e-signature first.

---

## 8. Next Practical Tickets

Start with these tickets:

1. Add supplier qualification fields and UI.
2. Add material lifecycle status.
3. Add `VendorMaterialApproval`.
4. Enforce qualified source and approved spec in GRN.
5. Add `Inventory.expiryDate` and `Inventory.retestDueDate`.
6. Add `SAMPLING_CONSUMPTION` transaction.
7. Add `SamplingContainerDraw` with per-purpose quantity.
8. Change sampling UI to per-container quantity matrix.
9. Allow multiple samples per sampling request.
10. Add `QcWorksheet` entity and block disposition until mandatory tests are complete.

---

## 9. Related Documents

- [IMPLEMENTATION_GAP_ANALYSIS.md](./IMPLEMENTATION_GAP_ANALYSIS.md)
- [PHARMA_IMPROVEMENTS_AND_ROADMAP.md](./PHARMA_IMPROVEMENTS_AND_ROADMAP.md)
- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)
- [QC_CONTAINER_SAMPLING_RULES.md](./QC_CONTAINER_SAMPLING_RULES.md)
- [QC_SAMPLING_GAP_ANALYSIS.md](./QC_SAMPLING_GAP_ANALYSIS.md)
- [SUPPLIER_ENHANCEMENT_REQUIREMENTS.md](./SUPPLIER_ENHANCEMENT_REQUIREMENTS.md)
- [SPEC_MOA_DESIGN.md](./SPEC_MOA_DESIGN.md)
