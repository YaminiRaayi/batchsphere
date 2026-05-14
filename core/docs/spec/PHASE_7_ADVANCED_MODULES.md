# Phase 7 — Advanced QMS Modules

**Defined:** 2026-05-14  
**Regulatory sources:** ICH Q9, ICH Q10, PIC/S PE 009, WHO TRS 957, EU GMP Annex 16, FDA 21 CFR 211.188  
**Prerequisites:** Phase 6G and 6H stable. Employee, document control, deviation, and CAPA modules fully wired.  
**Migration baseline entering Phase 7:** V86 (last 6H migration)

---

## Ticket 7.1: ICH Q9 Quality Risk Management — FMEA and Risk Register

**Status:** Not implemented.  
**Priority:** High — ICH Q9 adopted by FDA (2006) and EU GMP. Inspectors ask how risk is formally managed. Current system has only a `riskLevel` label on Change Control — not a formal risk management process.

### Regulatory Basis

ICH Q9 defines a structured quality risk management process:
1. Risk identification: What can go wrong? What is the likelihood? What is the consequence?
2. Risk analysis: FMEA (Failure Mode and Effect Analysis) — probability × severity × detectability = RPN.
3. Risk evaluation: Is the RPN acceptable? Does it exceed the threshold?
4. Risk control: What actions reduce the RPN?
5. Risk communication and review: periodic review of residual risk.

FMEA scales (1–5 each):
- **Probability (P)**: 1 = remote, 5 = almost certain.
- **Severity (S)**: 1 = negligible, 5 = catastrophic (patient harm).
- **Detectability (D)**: 1 = easily detected before reaching patient, 5 = undetectable.
- **RPN = P × S × D** (max 125). Threshold for mandatory action: typically RPN ≥ 50.

### Migration

`V87__create_risk_assessment.sql`

```sql
CREATE TYPE risk_assessment_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'ACCEPTED', 'CLOSED');
CREATE TYPE risk_assessment_scope AS ENUM (
  'PROCESS', 'PRODUCT', 'EQUIPMENT', 'SUPPLIER', 'SYSTEM', 'MATERIAL', 'CHANGE_CONTROL', 'OTHER'
);
CREATE TYPE risk_control_type AS ENUM ('ELIMINATE', 'REDUCE_PROBABILITY', 'REDUCE_SEVERITY', 'INCREASE_DETECTABILITY', 'ACCEPT');

CREATE TABLE risk_assessment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_number VARCHAR(30) UNIQUE NOT NULL,   -- RA-2026-001
  title VARCHAR(255) NOT NULL,
  scope risk_assessment_scope NOT NULL,
  scope_entity_type VARCHAR(50),                   -- CHANGE_CONTROL, MATERIAL, EQUIPMENT, etc.
  scope_entity_id UUID,                            -- FK to actual entity
  scope_entity_display VARCHAR(255),
  status risk_assessment_status NOT NULL DEFAULT 'DRAFT',
  methodology VARCHAR(50) DEFAULT 'FMEA',          -- FMEA, HACCP, FTA, PHA
  prepared_by VARCHAR(100) NOT NULL,
  reviewed_by VARCHAR(100),
  accepted_by VARCHAR(100),
  accepted_at TIMESTAMP WITH TIME ZONE,
  acceptance_e_signature_id UUID,
  next_review_date DATE,
  residual_risk_acceptable BOOLEAN,
  overall_risk_conclusion TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE risk_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_assessment_id UUID NOT NULL REFERENCES risk_assessment(id),
  sequence_number INT NOT NULL,
  process_step VARCHAR(255),                       -- What process step
  failure_mode TEXT NOT NULL,                      -- What can go wrong
  failure_effect TEXT NOT NULL,                    -- Effect on product/patient
  failure_cause TEXT NOT NULL,                     -- Why it could happen
  current_controls TEXT,                           -- Existing controls in place
  probability INT NOT NULL CHECK (probability BETWEEN 1 AND 5),
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  detectability INT NOT NULL CHECK (detectability BETWEEN 1 AND 5),
  rpn INT GENERATED ALWAYS AS (probability * severity * detectability) STORED,
  risk_control_type risk_control_type,
  proposed_action TEXT,
  action_owner VARCHAR(100),
  action_due_date DATE,
  linked_capa_id UUID REFERENCES qms_capa(id),
  residual_probability INT CHECK (residual_probability BETWEEN 1 AND 5),
  residual_severity INT CHECK (residual_severity BETWEEN 1 AND 5),
  residual_detectability INT CHECK (residual_detectability BETWEEN 1 AND 5),
  residual_rpn INT GENERATED ALWAYS AS (
    COALESCE(residual_probability, probability) *
    COALESCE(residual_severity, severity) *
    COALESCE(residual_detectability, detectability)
  ) STORED,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `qms/riskassessment`

Entities: `RiskAssessment`, `RiskItem`

DTOs:
- `CreateRiskAssessmentRequest`: `title`, `scope`, `scopeEntityType`, `scopeEntityId`, `methodology`.
- `CreateRiskItemRequest`: all FMEA fields — failure mode, effect, cause, controls, P/S/D scores, proposed action.
- `UpdateRiskItemRequest`: same + residual P/S/D after controls applied.
- `AcceptRiskAssessmentRequest`: `overallRiskConclusion`, `residualRiskAcceptable`, `nextReviewDate`, `username`, `password`, `meaning`.
- `RiskAssessmentResponse`: full fields + list of `RiskItemResponse` + `highRpnItems` (RPN ≥ 50 count) + `criticalItems` (severity = 5 count).

Service — `RiskAssessmentService` / `RiskAssessmentServiceImpl`:
- Auto-generate `assessmentNumber`.
- `acceptRiskAssessment(id, request)`: require e-sign from `QC_MANAGER` or `SUPER_ADMIN`. Set `residualRiskAcceptable`, record acceptor/timestamp.
- `getRiskMatrix()`: returns all risk items with RPN scores for heat-map display — grouped by P×S matrix cell.
- Link risk assessment to Change Control: when CC is `UNDER_REVIEW`, suggest creating a linked risk assessment.

Controller — `/api/risk-assessments`:
- `GET /api/risk-assessments?scope=&status=`
- `POST /api/risk-assessments`
- `GET /api/risk-assessments/{id}`
- `PUT /api/risk-assessments/{id}`
- `POST /api/risk-assessments/{id}/items`
- `PUT /api/risk-assessments/{id}/items/{itemId}`
- `DELETE /api/risk-assessments/{id}/items/{itemId}` (soft-delete only)
- `POST /api/risk-assessments/{id}/accept`

### Frontend

Route: `/qms/risk-register`  
Mockup: `core/ux-mockups/13-risk-assessment.html`

Risk register list:
- KPI strip: Total Assessments, High RPN Items (≥50), Critical Items (S=5), Pending Acceptance.
- Table: RA Number, Title, Scope, Status pill, Highest RPN, Items Count, Next Review.
- "New Assessment" button.

Assessment detail:
- Header with status, methodology, scope entity link.
- Risk Matrix tab: 5×5 grid (Probability × Severity) showing item count per cell; color-coded — green (low), yellow (medium), orange (high), red (critical).
- Risk Items tab: table of all items with failure mode, P/S/D scores, RPN badge (color by threshold), control action, residual RPN.
- Add item inline form with P/S/D sliders showing live RPN calculation.
- "Accept Assessment" action with e-sign for QC Manager.
- Audit timeline.

### Tests

- `POST /api/risk-assessments/{id}/items` creates item; RPN auto-computed = P×S×D.
- Acceptance requires `QC_MANAGER` e-sign; unauthorized role blocked.
- Risk items with RPN ≥ 50 appear in `highRpnItems` count.
- Soft-delete risk item sets `isActive = false`; not returned in default list.

### Done Means

- Every process, product, or change risk has a formal FMEA assessment.
- RPN scores drive prioritization of control actions.
- Accepted risk assessments are e-signed and audit-trailed.
- ICH Q9 risk management lifecycle (identify → analyze → control → review) is system-enforced.

---

## Ticket 7.2: Annual Product Quality Review (APQR)

**Status:** Not implemented.  
**Priority:** High — APQR is one of the first documents requested during an FDA pre-approval inspection or EU GMP routine inspection.

### Regulatory Basis

ICH Q10 Section 3.2.1 and EU GMP Chapter 1.10 require an Annual Product Review (APR) compiled at least annually for each product marketed. Contents:
- Starting material review (supplier performance, deviations, rejections).
- In-process and finished product OOS/OOT rates.
- All deviations and their CAPA closure status.
- All changes (Change Controls) in the review period.
- Stability data review.
- Any customer complaints.
- Reprocessing/rework incidents.
- QP/authorized person certification status.
- Conclusions: Is the manufacturing process in a state of control? Trends?

### Migration

`V88__create_apqr.sql`

```sql
CREATE TYPE apqr_status AS ENUM ('DRAFT', 'UNDER_REVIEW', 'APPROVED', 'CLOSED');

CREATE TABLE apqr (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apqr_number VARCHAR(30) UNIQUE NOT NULL,          -- APQR-2026-PARACETAMOL-500MG
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  review_year INT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status apqr_status NOT NULL DEFAULT 'DRAFT',
  -- Summary statistics (auto-compiled)
  total_batches_manufactured INT DEFAULT 0,
  total_grn_received INT DEFAULT 0,
  grn_rejection_count INT DEFAULT 0,
  oos_count INT DEFAULT 0,
  oot_count INT DEFAULT 0,
  deviation_count INT DEFAULT 0,
  open_capa_count INT DEFAULT 0,
  change_control_count INT DEFAULT 0,
  complaint_count INT DEFAULT 0,
  -- Conclusions
  process_in_control BOOLEAN,
  trends_identified TEXT,
  recommendations TEXT,
  -- Review and approval
  prepared_by VARCHAR(100) NOT NULL,
  prepared_at TIMESTAMP WITH TIME ZONE,
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(100),
  approved_at TIMESTAMP WITH TIME ZONE,
  approval_e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `qms/apqr`

Entity: `Apqr`

DTOs:
- `CreateApqrRequest`: `productName`, `materialId`, `reviewYear`, `periodStart`, `periodEnd`.
- `ApqrCompileResponse`: all stats auto-compiled from existing data + `deviationList`, `capaList`, `changeControlList`, `complaintList`, `grnRejectionList` for the period.
- `ApqrConclusionRequest`: `processInControl`, `trendsIdentified`, `recommendations`.
- `ApproveApqrRequest`: `username`, `password`, `meaning`.

Service — `ApqrService` / `ApqrServiceImpl`:
- `compileApqr(id)`: auto-populate all stat fields by querying:
  - `DeviationRepository.countByPeriodAndMaterial(materialId, periodStart, periodEnd)`
  - `CapaRepository.countOpenByPeriod(...)` for open CAPAs
  - `ChangeControlRepository.countByPeriod(...)`
  - `ComplaintRepository.countByPeriod(...)`
  - `GrnRepository.countByMaterialAndRejected(materialId, period)`
  - `SamplingRepository.countOosByMaterialAndPeriod(...)`
- `approveApqr(id, request)`: require `QC_MANAGER` e-sign. Set status `APPROVED`.
- `generateApqrSummary()`: list of products with last APQR date and whether current year's APQR exists.

Controller — `/api/apqr`:
- `GET /api/apqr?year=&materialId=`
- `POST /api/apqr`
- `GET /api/apqr/{id}`
- `POST /api/apqr/{id}/compile` (triggers stat compilation)
- `PUT /api/apqr/{id}/conclusions`
- `POST /api/apqr/{id}/approve`
- `GET /api/apqr/summary` (products × years matrix)

### Frontend

Route: `/qms/apqr`  
Mockup: `core/ux-mockups/16-apqr.html`

APQR list:
- KPI strip: Products With APQR This Year, Overdue APQRs (product has no APQR for last full year), Draft in Progress, Approved.
- Table: Product, Year, Period, Status pill, Batches, OOS Count, Deviation Count, CAPA Count, Prepared By.
- "New APQR" button.

APQR detail:
- Header: product name, year, period, status.
- "Compile Data" button: hits `POST /api/apqr/{id}/compile` and refreshes stats.
- Stats cards row: Batches / GRN Received / Rejections / OOS / Deviations / CAPAs / Change Controls / Complaints.
- Linked records tabs: Deviations tab (list of deviations in period), CAPAs tab, Change Controls tab, Complaints tab.
- Conclusions section: text fields for trends identified and recommendations, "Process in Control" toggle.
- Approval panel: e-sign approval by QC Manager.
- Audit timeline.

### Tests

- `POST /api/apqr/{id}/compile` populates stat fields from related entity counts.
- Approval requires `QC_MANAGER` e-sign; unauthorized blocked.
- `GET /api/apqr/summary` shows products with missing APQR for last full year.

### Done Means

- Every product has an annual quality review record.
- APQR auto-compiles stats from existing QMS/GRN/sampling data — no manual data entry.
- QA Manager can review and approve APQR with e-sign.
- ICH Q10 and EU GMP Chapter 1.10 APQR requirement is met.

---

## Ticket 7.3: Supplier Quality Agreement Management

**Status:** Not implemented.  
**Priority:** Medium — required by PIC/S and WHO GMP for all suppliers; increasingly scrutinized in EU GMP inspections.

### Regulatory Basis

PIC/S PE 009 Part I, Chapter 7 (Outsourced Activities) and WHO Technical Report Series 957 require formal written quality agreements (SQA) with all suppliers:
- GMP responsibilities of each party.
- Change notification requirements (supplier must notify purchaser of manufacturing/site changes).
- Audit rights.
- Product specifications and testing responsibilities.
- Retention sample requirements.
- Agreed acceptance criteria.

### Migration

`V89__create_supplier_quality_agreement.sql`

```sql
CREATE TYPE sqa_status AS ENUM ('DRAFT', 'UNDER_NEGOTIATION', 'ACTIVE', 'EXPIRED', 'TERMINATED');

CREATE TABLE supplier_quality_agreement (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sqa_number VARCHAR(30) UNIQUE NOT NULL,           -- SQA-2026-001
  supplier_id UUID REFERENCES supplier(id),
  vendor_business_unit_id UUID REFERENCES vendor_business_unit(id),
  title VARCHAR(255) NOT NULL,
  effective_date DATE,
  expiry_date DATE,
  status sqa_status NOT NULL DEFAULT 'DRAFT',
  sop_document_id UUID REFERENCES controlled_document(id),   -- link to the actual agreement document
  gmp_responsibilities TEXT,
  change_notification_requirements TEXT,
  audit_rights TEXT,
  testing_responsibilities TEXT,
  retention_sample_requirements TEXT,
  agreed_acceptance_criteria TEXT,
  our_signatory VARCHAR(100),
  our_signatory_date DATE,
  supplier_signatory VARCHAR(255),
  supplier_signatory_date DATE,
  terminated_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `masterdata/supplier/sqa`

Entity: `SupplierQualityAgreement`

Service:
- `findExpiringSoon(days)`: SQAs where `expiryDate ≤ today + days`. For dashboard alerts.
- `findSuppliersWithoutSqa()`: suppliers with qualification status `QUALIFIED` but no `ACTIVE` SQA.
- Dashboard KPI: suppliers without SQA, SQAs expiring within 60d.

Controller — `/api/supplier-quality-agreements`:
- `GET /api/supplier-quality-agreements?supplierId=&status=`
- `POST /api/supplier-quality-agreements`
- `GET /api/supplier-quality-agreements/{id}`
- `PUT /api/supplier-quality-agreements/{id}`
- `PUT /api/supplier-quality-agreements/{id}/status`
- `GET /api/supplier-quality-agreements/expiring-soon?days=60`
- `GET /api/suppliers/{id}/quality-agreements`

### Frontend

- Add "Quality Agreements" tab on Supplier detail page in VMS (`/master-data/partners/suppliers`).
- SQA form: supplier selector, title, effective/expiry dates, linked SOP document.
- Text sections: responsibilities, change notification, audit rights, testing responsibilities.
- Status badge: DRAFT / ACTIVE / EXPIRED / TERMINATED.
- Expiry warning: amber badge if SQA expires within 60 days.
- Dashboard card: "Suppliers Without SQA: N" → navigates to supplier list filtered by no active SQA.

### Tests

- `POST /api/supplier-quality-agreements` creates SQA linked to supplier.
- SQA past `expiryDate` appears in `expiring-soon?days=0` response.
- `findSuppliersWithoutSqa()` returns suppliers with `QUALIFIED` status but no `ACTIVE` SQA.

### Done Means

- Every qualified supplier has a formal SQA on record.
- SQA expiry is tracked and surfaced in dashboard.
- Link from SQA to actual agreement document in document control.
- PIC/S Chapter 7 / WHO outsourced activities requirement is met.

---

## Ticket 7.4: QP Batch Release and Batch Certificate

**Status:** Not implemented.  
**Priority:** Medium — required in EU GMP before any batch is released for distribution; highly visible in EU inspections.

### Regulatory Basis

EU GMP Annex 16 requires a Qualified Person (QP) to certify each batch before release to market. The QP is a legally responsible person (named on the manufacturing authorization) who verifies:
- Batch was manufactured in accordance with GMP.
- Batch complies with its specification and approved marketing authorization.
- All required deviations investigated, CAPAs addressed.
- QC testing complete and results within spec.
- No open critical deviations linked to the batch.

FDA equivalent: Authorized Person / Responsible Person batch record review.

### Migration

`V90__create_qp_batch_release.sql`

```sql
CREATE TYPE batch_release_status AS ENUM ('PENDING_QP_REVIEW', 'UNDER_REVIEW', 'CERTIFIED', 'REJECTED', 'ON_HOLD');

CREATE TABLE qp_batch_release (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_number VARCHAR(30) UNIQUE NOT NULL,       -- BR-2026-001
  lot_number VARCHAR(100) NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  material_id UUID REFERENCES material(id),
  grn_id UUID REFERENCES grn(id),
  batch_size NUMERIC(14,4),
  batch_uom VARCHAR(20),
  manufacture_date DATE,
  expiry_date DATE,
  status batch_release_status NOT NULL DEFAULT 'PENDING_QP_REVIEW',
  -- QC checklist
  qc_disposition_confirmed BOOLEAN DEFAULT FALSE,   -- sampling disposition = RELEASED
  oos_investigations_closed BOOLEAN DEFAULT FALSE,  -- no open OOS for this lot
  no_open_critical_deviations BOOLEAN DEFAULT FALSE,
  documents_complete BOOLEAN DEFAULT FALSE,         -- all required documents in order
  -- QP certification
  qp_name VARCHAR(255),                             -- Named QP (employee)
  qp_employee_id UUID REFERENCES employee(id),
  qp_certification_statement TEXT,                 -- "I certify this batch meets..."
  certified_at TIMESTAMP WITH TIME ZONE,
  certification_e_signature_id UUID,
  rejection_reason TEXT,
  on_hold_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `qms/batchrelease`

Entity: `QpBatchRelease`

Service — `QpBatchReleaseService` / `QpBatchReleaseServiceImpl`:
- `createBatchRelease(request)`: auto-generate `releaseNumber`. Populate QC checklist items by querying:
  - `SamplingRepository`: does lot have a `RELEASED` disposition? → `qcDispositionConfirmed`.
  - `QcInvestigationRepository`: any open OOS investigations for this lot? → `oosInvestigationsClosed`.
  - `DeviationRepository`: any `CRITICAL` severity open deviations with `sourceEntityId = grnId`? → `noOpenCriticalDeviations`.
- `certifyBatch(id, request)`: require e-sign from `QC_MANAGER` (acting as QP for demo). Validate all 4 checklist items are `true`. Set status `CERTIFIED`.
- `rejectBatch(id, reason)`: set status `REJECTED` with reason.
- `getBatchCertificate(id)`: returns a structured `BatchCertificateResponse` with all data for PDF generation.

Controller — `/api/qp-batch-releases`:
- `GET /api/qp-batch-releases?status=&materialId=`
- `POST /api/qp-batch-releases`
- `GET /api/qp-batch-releases/{id}`
- `POST /api/qp-batch-releases/{id}/certify`
- `POST /api/qp-batch-releases/{id}/reject`
- `GET /api/qp-batch-releases/{id}/certificate` (batch certificate data)

### Frontend

Route: `/qms/batch-release`  
Mockup: `core/ux-mockups/17-qp-batch-release.html`

Batch release queue (left list):
- KPI strip: Pending Review, Certified This Month, Rejected, On Hold.
- Table: Release No., Lot No., Product, Manufacture Date, Expiry, Status pill, QC Disposition.
- "New Batch Release" button: pick lot from inventory.

QP Review detail (right panel):
- Header: release number, lot, product, status.
- QC Checklist section: 4 checklist items with green/red indicators:
  - QC Disposition: RELEASED ✓ / Not Released ✗
  - OOS Investigations: All Closed ✓ / Open Investigations ✗
  - Critical Deviations: None Open ✓ / Open Critical Deviations ✗
  - Documentation Complete: Confirmed ✓ / Incomplete ✗
- Batch Info section: batch size, manufacture date, expiry date, material link, GRN link.
- QP Certification section (enabled only when all checklist items green):
  - QP name selector (employee lookup).
  - Certification statement text area with default pharma certification language.
  - "Certify Batch" e-sign button.
- "Batch Certificate" button (after certification): opens printable/downloadable certificate view.
- Audit timeline.

Batch Certificate view:
- Formal certificate layout: BatchSphere logo, Release No., Lot No., Product, Specifications, Test Results Summary, QP name, e-sign reference, certification date.

### Tests

- `POST /api/qp-batch-releases` auto-populates checklist from existing QC/deviation records.
- Certification blocked if any checklist item is false.
- Certification requires `QC_MANAGER` e-sign.
- `GET /api/qp-batch-releases/{id}/certificate` returns full structured certificate data.

### Done Means

- Every lot has a formal QP batch release record before distribution.
- QP certification is e-signed and checklist-gated.
- Batch certificate is generatable for lot documentation packages.
- EU GMP Annex 16 QP certification requirement is represented in the system.
