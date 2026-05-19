# LIMS Master Plan — BatchSphere
**Author:** Yamini Raayi (QC Manager)  
**Date:** 2026-05-16  
**Status:** LIMS Sprint 1-3 + ALCOA++ + navigation MVP complete

---

## 0. Implementation Gaps to Close Before Sprint 1

These gaps were found during plan review. All must be resolved in migrations/code before LIMS-A work starts.

| # | Gap | Impact | Resolution |
|---|---|---|---|
| G-1 | `requires_instrument` missing from `spec_parameter` | LIMS-A calibration gate has nothing to check | Add to V98, entity, DTO, and spec parameter UI |
| G-2 | `reagent_lot_id` ordering conflict | LIMS-A/B are Sprint 1; `lab_reagent_lot` table not until V99 (Sprint 2) | Remove `reagentLotId` from LIMS-A/B entirely; add to `RecordQcTestResultRequest` + entity in LIMS-4 alongside V99 |
| G-3 | `QUALIFIED` status used in dropdown query but doesn't exist | Equipment dropdown returns nothing | Use `ACTIVE` status only; calibration-date check already gates misuse |
| G-4 | `InstrumentUsageLog` auto-create in LIMS-A but table is V102 (Sprint 3) | Compile error or deferred logic ambiguity | Move logbook table creation to V98 alongside instrument columns; park service code until LIMS-7 |
| G-5 | CoA numbering uses `MAX()+1` — race condition on concurrent issuance | Duplicate CoA numbers under load | Use PostgreSQL `CREATE SEQUENCE coa_number_seq` in V102 |
| G-6 | Audit/e-sign events not specified per new module | Inconsistent audit trail; compliance gaps | Added explicit audit event table per ticket below |
| G-7 | No acceptance criteria per ticket | No way to verify correctness | Added AC checklist per ticket below |

---

## 1. What Is LIMS in Pharma?

**LIMS (Laboratory Information Management System)** is the software backbone of a pharmaceutical QC laboratory. It manages the full lifecycle of laboratory work:

- Sample receipt → test scheduling → result capture → review/approval → release
- Instrument qualification and calibration tracking
- Reagent and reference standard inventory
- Stability study scheduling and trending
- Out-of-Specification (OOS) and Out-of-Trend (OOT) investigations
- Certificate of Analysis (CoA) generation

### Regulatory Basis

| Regulation / Guideline | Requirement |
|---|---|
| **21 CFR Part 11** | All electronic records and signatures must be audit-trailed, access-controlled, tamper-evident |
| **21 CFR Part 211** | Laboratory records, sampling, testing, OOS handling must be documented |
| **EU GMP Annex 11** | Computerised systems must be validated, access-controlled, data-integrity-controlled |
| **ICH Q10** | Quality system must include CAPA, change control, product/process monitoring — LIMS feeds this |
| **ICH Q1A–Q1F** | Stability study design and reporting requirements |
| **USP \<1058\>** | Analytical instrument qualification (IQ/OQ/PQ) — tracked in Equipment module |
| **FDA Guidance on OOS** | Phase I (lab investigation) and Phase II (full investigation) mandatory for any OOS result |

---

## 2. What Is Already Built

| Module | Backend Package | Frontend Route | Status |
|---|---|---|---|
| Equipment & Instruments | `lims/equipment` | `/lims/equipment` | ✅ Complete |
| Equipment Qualification (IQ/OQ/PQ) | `lims/equipment` | `/lims/equipment/:id` | ✅ Complete |
| Retention Samples | `lims/retentionsample` | `/lims/retention-samples` | ✅ Complete |
| QC Sampling workflow | `transactions/sampling` | `/qc/sampling` | ✅ Complete |
| QC Worksheet (per parameter result entry) | `transactions/sampling` | Inside sampling page | ✅ Complete |
| QC Disposition (pass/fail/reject) | `transactions/sampling` | Inside sampling page | ✅ Complete |
| QC Investigation (Phase I & II) | `transactions/sampling` | Inside sampling page | ✅ Complete |
| Specification management | `masterdata/spec` | `/master-data/qc-refs/specs` | ✅ Complete |
| Method of Analysis (MoA) | `masterdata/moa` | `/master-data/qc-refs/moa` | ✅ Complete |
| Sampling Tools master | `masterdata/samplingtool` | `/master-data/qc-refs/sampling-tools` | ✅ Complete |
| QMS — Deviation | `qms/deviation` | `/qms/deviations` | ✅ Complete |
| QMS — CAPA | `qms/capa` | `/qms/capas` | ✅ Complete |
| QP Batch Release | `qms/batchrelease` | `/qms/batch-releases` | ✅ Complete |

**Foundation note:** `QcTestResult` already has `isLocked`, `passFailFlag`, full audit trail, e-sign-on-amend — already proper-product quality. What's missing: instrument linkage, reagent lot linkage, and bulk CSV entry.

---

## 3. Architecture Decisions

All confirmed YES by product owner (2026-05-16). Items marked ⚠️ pending pharma expert validation.

| ID | Decision | Confirmed |
|---|---|---|
| AD-1 | Instrument linkage at **test result level** (not worksheet) | YES |
| AD-2 | Instrument mandatory when `spec_parameter.requiresInstrument = true` ⚠️ | YES |
| AD-3 | Calibration gate = **hard block** at service layer | YES |
| AD-4 | CoA = **dual e-sign** (Analyst signs results + Manager issues) ⚠️ | YES |
| AD-5 | OOT threshold = **per-study configurable** `oot_threshold_pct`, default 10% ⚠️ | YES |
| AD-6 | CSV import = **atomic** (all-or-nothing) | YES |
| AD-7 | Reagent lot tracking at **result level** (`reagent_lot_id` on `qc_test_result`) | YES |
| AD-8 | Environmental monitoring points linked to **Warehouse Room** via `room_id FK` | YES |

---

## 4. Database Schema — New Migrations

### V98 — Instrument linkage + logbook table (G-1, G-3, G-4 fixes)

```sql
-- G-1: requires_instrument on spec_parameter
ALTER TABLE spec_parameter
    ADD COLUMN requires_instrument BOOLEAN NOT NULL DEFAULT FALSE;

-- Instrument columns on qc_test_result
ALTER TABLE qc_test_result
    ADD COLUMN equipment_id    UUID REFERENCES equipment(id),
    ADD COLUMN instrument_ref  VARCHAR(50);

-- G-4: logbook table created here (service code parked until LIMS-7)
CREATE TABLE instrument_usage_log (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id         UUID NOT NULL REFERENCES equipment(id),
    used_by              VARCHAR(100) NOT NULL,
    used_at              TIMESTAMP NOT NULL,
    purpose              VARCHAR(200),
    sampling_request_id  UUID REFERENCES sampling_request(id),
    condition_at_use     VARCHAR(30) NOT NULL DEFAULT 'NORMAL', -- NORMAL, ANOMALY
    anomaly_description  TEXT,
    linked_deviation_id  UUID REFERENCES qms_deviation(id),
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);
```

### V99 — Reagent & Reference Standard tables

```sql
CREATE TABLE lab_reagent (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reagent_code      VARCHAR(30) UNIQUE NOT NULL,
    name              VARCHAR(200) NOT NULL,
    grade             VARCHAR(50),                        -- AR, HPLC, GR, LR
    cas_number        VARCHAR(20),
    storage_condition VARCHAR(100),
    expiry_alert_days INTEGER NOT NULL DEFAULT 30,
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_by        VARCHAR(100) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE lab_reagent_lot (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reagent_id         UUID NOT NULL REFERENCES lab_reagent(id),
    lot_number         VARCHAR(50) NOT NULL,
    supplier           VARCHAR(200),
    received_date      DATE NOT NULL,
    expiry_date        DATE,
    quantity_received  NUMERIC(12,3),
    quantity_remaining NUMERIC(12,3),
    unit               VARCHAR(20),
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, EXHAUSTED, REJECTED
    notes              TEXT,
    received_by        VARCHAR(100) NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);

-- G-2: reagent_lot_id on qc_test_result (after lab_reagent_lot exists)
ALTER TABLE qc_test_result
    ADD COLUMN reagent_lot_id UUID REFERENCES lab_reagent_lot(id);

CREATE TABLE lab_reference_standard (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_code     VARCHAR(30) UNIQUE NOT NULL,
    name              VARCHAR(200) NOT NULL,
    standard_type     VARCHAR(30) NOT NULL,               -- PRIMARY, WORKING, SECONDARY
    pharmacopoeia_ref VARCHAR(100),                       -- USP, EP, BP, IP
    cas_number        VARCHAR(20),
    storage_condition VARCHAR(100),
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    created_by        VARCHAR(100) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE lab_reference_standard_lot (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_id        UUID NOT NULL REFERENCES lab_reference_standard(id),
    lot_number         VARCHAR(50) NOT NULL,
    potency            NUMERIC(8,4),
    potency_unit       VARCHAR(20),
    certificate_number VARCHAR(100),
    expiry_date        DATE NOT NULL,
    opened_date        DATE,
    status             VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, EXPIRED, EXHAUSTED
    received_by        VARCHAR(100) NOT NULL,
    created_at         TIMESTAMP NOT NULL DEFAULT now()
);
```

### V100 — Stability Study

```sql
CREATE TABLE stability_study (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_number      VARCHAR(30) UNIQUE NOT NULL,
    product_name      VARCHAR(200) NOT NULL,
    batch_number      VARCHAR(100),
    grn_id            UUID REFERENCES grn(id),
    material_id       UUID REFERENCES material(id),
    spec_id           UUID REFERENCES spec(id),
    storage_condition VARCHAR(50) NOT NULL,  -- LONG_TERM, ACCELERATED, INTERMEDIATE
    temperature_target VARCHAR(20),          -- e.g. 25C/60RH
    study_start_date  DATE NOT NULL,
    study_end_date    DATE,
    protocol_summary  TEXT,
    oot_threshold_pct NUMERIC(5,2) NOT NULL DEFAULT 10.00,
    status            VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, ON_HOLD, COMPLETED, DISCONTINUED
    initiated_by      VARCHAR(100) NOT NULL,
    created_at        TIMESTAMP NOT NULL DEFAULT now(),
    updated_by        VARCHAR(100),
    updated_at        TIMESTAMP
);

CREATE TABLE stability_timepoint (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_id       UUID NOT NULL REFERENCES stability_study(id),
    month_offset   INTEGER NOT NULL,      -- 0, 3, 6, 9, 12, 18, 24, 36
    scheduled_date DATE NOT NULL,
    pulled_date    DATE,
    pulled_by      VARCHAR(100),
    status         VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, PULLED, TESTED, COMPLETE, SKIPPED
    notes          TEXT
);

CREATE TABLE stability_result (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timepoint_id      UUID NOT NULL REFERENCES stability_timepoint(id),
    spec_parameter_id UUID REFERENCES spec_parameter(id),
    parameter_name    VARCHAR(200) NOT NULL,  -- denormalized for permanence
    result_value      NUMERIC(18,6),
    result_text       VARCHAR(500),
    unit              VARCHAR(50),
    lower_limit       NUMERIC(18,4),
    upper_limit       NUMERIC(18,4),
    pass_fail_flag    BOOLEAN,
    oot_flag          BOOLEAN NOT NULL DEFAULT FALSE,
    analyst_code      VARCHAR(100) NOT NULL,
    equipment_id      UUID REFERENCES equipment(id),
    tested_at         TIMESTAMP NOT NULL,
    notes             TEXT
);
```

### V101 — Environmental Monitoring

```sql
CREATE TABLE em_monitoring_point (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_code           VARCHAR(30) UNIQUE NOT NULL,
    location_description VARCHAR(200) NOT NULL,
    room_id              UUID REFERENCES room(id),  -- AD-8
    monitoring_type      VARCHAR(50) NOT NULL, -- TEMPERATURE, HUMIDITY, PRESSURE, PARTICLE, MICROBIAL
    frequency            VARCHAR(30) NOT NULL, -- DAILY, WEEKLY, MONTHLY
    alert_limit          NUMERIC(10,3),
    action_limit         NUMERIC(10,3),
    unit                 VARCHAR(20),
    is_active            BOOLEAN NOT NULL DEFAULT TRUE,
    created_by           VARCHAR(100) NOT NULL,
    created_at           TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE em_result (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monitoring_point_id UUID NOT NULL REFERENCES em_monitoring_point(id),
    result_value        NUMERIC(10,3) NOT NULL,
    recorded_at         TIMESTAMP NOT NULL,
    recorded_by         VARCHAR(100) NOT NULL,
    alert_breached      BOOLEAN NOT NULL DEFAULT FALSE,
    action_breached     BOOLEAN NOT NULL DEFAULT FALSE,
    linked_deviation_id UUID REFERENCES qms_deviation(id),
    notes               TEXT
);
```

### V102 — CoA fields on QP Batch Release + sequence (G-5 fix)

```sql
-- G-5: use PostgreSQL sequence, not MAX()+1
CREATE SEQUENCE IF NOT EXISTS coa_number_seq START 1 INCREMENT 1;

ALTER TABLE qp_batch_release

    ADD COLUMN coa_number        VARCHAR(30),
    ADD COLUMN coa_issued_at     TIMESTAMP,
    ADD COLUMN coa_issued_by     VARCHAR(100),
    ADD COLUMN coa_locked        BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN analyst_signed_by VARCHAR(100),
    ADD COLUMN analyst_signed_at TIMESTAMP;
```

CoA number format generated in service:
```java
String coaNumber = "COA-" + Year.now() + "-"
    + String.format("%05d", jdbcTemplate.queryForObject(
        "SELECT nextval('coa_number_seq')", Long.class));
```

---

## 5. Backend Package Structure

```
com.batchsphere.core/
  lims/
    equipment/          [EXISTING]
    retentionsample/    [EXISTING]
    reagent/            [NEW — LIMS-4]
      entity/     LabReagent, LabReagentLot
      dto/        CreateReagentRequest, ReagentLotRequest, ReagentResponse, ReagentLotResponse
      service/    ReagentService, ReagentServiceImpl
      controller/ ReagentController
      repository/ ReagentRepository, ReagentLotRepository
    referencestandard/  [NEW — LIMS-5]
      entity/     ReferenceStandard, ReferenceStandardLot
      (same pattern)
    stability/          [NEW — LIMS-6]
      entity/     StabilityStudy, StabilityTimepoint, StabilityResult
      dto/        CreateStabilityStudyRequest, RecordStabilityResultRequest,
                  StabilityStudyResponse, StabilityTimepointResponse, TrendSeriesResponse
      service/    StabilityService, StabilityServiceImpl
      controller/ StabilityController
      repository/ StabilityStudyRepository, StabilityTimepointRepository, StabilityResultRepository
    envmonitoring/      [NEW — LIMS-8]
      entity/     EmMonitoringPoint, EmResult
      (same pattern)
    logbook/            [NEW — LIMS-7]
      entity/     InstrumentUsageLog
      dto/        CreateUsageLogRequest, UsageLogResponse
      service/    InstrumentLogbookService, InstrumentLogbookServiceImpl
      controller/ InstrumentLogbookController
      repository/ InstrumentUsageLogRepository

  transactions/sampling/
    dto/    RecordQcTestResultRequest   [MODIFY — add equipmentId]
    entity/ QcTestResult                [MODIFY — add equipmentId, instrumentRef]
    service/ QcTestResultServiceImpl    [MODIFY — calibration gate, mandatory instrument check]
    controller/ SamplingController      [MODIFY — add CSV import + template endpoints]

  masterdata/spec/
    entity/ SpecParameter               [MODIFY — add requiresInstrument field]
    dto/    SpecParameterRequest        [MODIFY — add requiresInstrument field]
    (UI: add checkbox to spec parameter form in SpecsPage)
```

---

## 6. Frontend Routes

```
/lims/equipment              [EXISTING]
/lims/retention-samples      [EXISTING]
/lims/reagents               [NEW — LIMS-4]
/lims/reference-standards    [NEW — LIMS-5]
/lims/stability              [NEW — LIMS-6: list + KPIs]
/lims/stability/:id          [NEW — LIMS-6: detail, timeline, trend chart]
/lims/env-monitoring         [NEW — LIMS-8]
/lims/logbook                [NEW — LIMS-7: cross-instrument log view]
```

CoA: panel on `/qms/batch-releases` — no separate route.  
Instrument selector + CSV import: within existing `/qc/sampling` page.

---

## 7. Sprint Tickets (with UI Mockups, Audit Events, Acceptance Criteria)

---

### PRE-SPRINT: G-1 — Add `requires_instrument` to Spec Parameter ✅ DONE
**Priority:** P0-blocker | **Effort:** 0.5 days | **Migration:** V98 (first ALTER)
**Completed:** 2026-05-16

**Backend:**
- V98 adds `requires_instrument BOOLEAN NOT NULL DEFAULT FALSE` to `spec_parameter`
- Add `requiresInstrument` to `SpecParameter` entity + `SpecParameterRequest` DTO + `SpecParameterResponse` DTO

**Frontend — Spec parameter form (SpecsPage):**
```
┌──────────────────────────────────────────────────────┐
│ Edit Parameter — Assay (%)                           │
│ ──────────────────────────────────────────────────── │
│ Name:         [Assay (%)          ]                  │
│ Criteria:     [RANGE ▼]                              │
│ Lower limit:  [98.0]  Upper limit: [102.0]           │
│ Unit:         [%    ]                                │
│ Mandatory:    [✓]                                    │
│ Requires Instrument: [✓] ← NEW checkbox              │
│   When checked: analyst must select instrument       │
│   before entering result for this parameter          │
│                                                      │
│                [Cancel]  [Save Parameter]            │
└──────────────────────────────────────────────────────┘
```

**Audit events:** `SPEC_PARAMETER / UPDATE / requiresInstrument changed`

**Acceptance criteria:**
- [x] `requires_instrument = true` → instrument selector shown + mandatory in worksheet row
- [x] `requires_instrument = false` → instrument selector optional (not shown by default)
- [x] Default `false` on all existing parameters after migration
- [x] API rejects result entry for `requiresInstrument=true` parameter without `equipmentId`

---

### LIMS-A — Instrument Linkage + Calibration Gate ✅ DONE
**Priority:** P0 | **Effort:** 1.5 days | **Migration:** V98
**Completed:** 2026-05-16

**Backend changes:**
- `QcTestResult` entity: add `equipmentId UUID`, `instrumentRef VARCHAR(50)`
- `RecordQcTestResultRequest`: add `equipmentId UUID`
- `QcTestResultServiceImpl.recordResult()`:
  1. If spec parameter has `requiresInstrument = true` and no `equipmentId` → `BusinessConflictException("Instrument required for parameter: {name}")`
  2. If `equipmentId` provided → load equipment → if `nextCalibrationDue` before today → `BusinessConflictException("Instrument {equipmentId} calibration expired {date}. Recalibrate before use.")`  
  3. Write `equipment_id`, `instrument_ref = equipment.getEquipmentId()` on save
- `QcTestResultResponse`: add `equipmentId`, `instrumentRef`
- Equipment list endpoint: add optional `?status=ACTIVE` filter (G-3 fix — no QUALIFIED status)

**Frontend — Worksheet row in `/qc/sampling`:**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ QC Worksheet                             [Import CSV]  [Download Template]  │
│ ─────────────────────────────────────────────────────────────────────────── │
│ ┌──────────────────┬─────────────┬──────────────────┬──────────┬──────────┐ │
│ │ Parameter        │ Criterion   │ Instrument       │ Result   │ Status   │ │
│ ├──────────────────┼─────────────┼──────────────────┼──────────┼──────────┤ │
│ │ Identification   │ COMPLIES    │ [FTIR-001      ▼]│[COMPLIES]│ ● PASS   │ │
│ │ Assay (%)      * │ 98.0–102.0  │ [HPLC-001      ▼]│[99.5    ]│ ● PASS   │ │
│ │ Water Content  * │ NMT 0.5     │ [KF-001 ⚠EXPIRED▼]│[0.3  ]│ ⛔ BLOCK │ │
│ │ Appearance       │ PASS / FAIL │ — (not required) │[PASS    ]│ ● PASS   │ │
│ └──────────────────┴─────────────┴──────────────────┴──────────┴──────────┘ │
│ * = requires instrument                                                      │
│                                                                              │
│ Instrument dropdown (for Water Content row):                                 │
│ ┌──────────────────────────────────────────────┐                            │
│ │ ⚠ KF-001 — Metrohm 870 KF Titrator          │                            │
│ │   Cal EXPIRED: 2026-04-30                    │                            │
│ │ ─────────────────────────────────────────── │                            │
│ │ ✓ HPLC-001 — Shimadzu LC-2040               │                            │
│ │   Cal due: 2026-08-01                        │                            │
│ │ ✓ UV-002 — Agilent 8453 UV-Vis              │                            │
│ │   Cal due: 2026-06-15                        │                            │
│ └──────────────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger | Fields logged |
|---|---|---|---|
| `QC_TEST_RESULT` | `UPDATE` | Result recorded with instrument | `equipment_id`, `instrument_ref`, `result_value`, `status` |
| `QC_TEST_RESULT` | `UPDATE` | Calibration gate triggered | log blocked attempt with `equipment_id` + `expiry_date` |

**Acceptance criteria:**
- [x] `requiresInstrument=true` param + no equipmentId → HTTP 409 `"Instrument required for parameter: {name}"`
- [x] `equipmentId` with `nextCalibrationDue` in past → HTTP 409 `"Instrument {ID} calibration expired {date}"`
- [x] `equipmentId` with valid calibration → result saves; `instrument_ref` populated in DB
- [x] Result response includes `instrumentRef` and `equipmentId`
- [x] Equipment dropdown only shows `status = ACTIVE` instruments
- [x] Expired instruments shown in dropdown with ⚠ label and disabled for selection

---

### LIMS-B — CSV Bulk Result Import ✅ DONE
**Priority:** P0 | **Effort:** 1.5 days | **Migration:** none (uses V98 schema)
**Completed:** 2026-05-16

**Backend:**
- `POST /api/sampling-requests/{id}/worksheet/import-csv`
  - `multipart/form-data`, field `file`, accept `.csv`
  - CSV columns: `parameter_name, result_value, result_text, remarks, equipment_id`
  - Match `parameter_name` (trim + case-insensitive) to open worksheet rows
  - Each matched row calls `qcTestResultService.recordResult()` — reuses all validation + calibration gate
  - **Atomic** `@Transactional`: any row fails → full rollback → return `400` with:
    ```json
    { "errors": [{ "row": 2, "parameterName": "Assay (%)", "error": "Instrument KF-001 calibration expired" }] }
    ```
  - On success: return full updated worksheet list

- `GET /api/sampling-requests/{id}/worksheet/csv-template`
  - Returns CSV with parameter names pre-filled, result columns blank
  - `Content-Disposition: attachment; filename="worksheet-template-{requestNumber}.csv"`

**Frontend — import flow in `/qc/sampling`:**
```
Step 1 — Click "Import CSV":
┌──────────────────────────────────────────────────────┐
│ Import Worksheet Results                  [✕ Close]  │
│ ──────────────────────────────────────────────────── │
│ [Download CSV Template]                              │
│                                                      │
│ Drop CSV file here or                                │
│ [  Choose File  ]  worksheet-2026-05-16.csv          │
│                                                      │
│                           [Cancel]  [Preview Import] │
└──────────────────────────────────────────────────────┘

Step 2 — Preview (before import):
┌──────────────────────────────────────────────────────┐
│ Import Preview — 4 rows detected         [✕ Close]  │
│ ──────────────────────────────────────────────────── │
│ Row │ Parameter         │ Value  │ Instrument │ Valid │
│ ─── │ ───────────────── │ ────── │ ────────── │ ───── │
│  1  │ Identification    │COMPLIES│ FTIR-001   │  ✓   │
│  2  │ Assay (%)         │ 99.5   │ HPLC-001   │  ✓   │
│  3  │ Water Content (%) │ 0.3    │ KF-001     │  ⚠   │
│     │                   │        │ Cal expired│       │
│  4  │ pH                │ 6.8    │ —          │  ✗   │
│     │ Parameter not found in spec              │       │
│ ──────────────────────────────────────────── │
│ 2 valid · 1 calibration issue · 1 not found  │
│                                              │
│ Import is atomic — all rows must be valid.   │
│                       [Cancel]  [Fix & Retry]│
└──────────────────────────────────────────────┘

Step 3 — All rows valid:
┌──────────────────────────────────────────────────────┐
│ Import Preview — 3 rows · All valid       [✕ Close]  │
│ ──────────────────────────────────────────────────── │
│  ✓ Identification    → COMPLIES  (FTIR-001)          │
│  ✓ Assay (%)         → 99.5      (HPLC-001)          │
│  ✓ Water Content (%) → 0.3       (KF-002)            │
│                                                      │
│                    [Cancel]   [Confirm Import All]   │
└──────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger |
|---|---|---|
| `SAMPLING_REQUEST` | `WORKFLOW_ACTION` | CSV import completed — N rows imported |
| `QC_TEST_RESULT` | `UPDATE` (per row) | Same as manual result entry |

**Acceptance criteria:**
- [x] One invalid row → zero rows saved, HTTP 400 with per-row error list
- [x] All valid → all rows saved in single transaction, HTTP 200
- [x] Unknown `parameter_name` → error row `"Parameter not found in spec"`
- [x] CSV with no header row → HTTP 400 `"CSV must include header row"`
- [x] Template download returns CSV with correct parameter names from worksheet
- [x] Import respects calibration gate (same validation as manual entry)

---

### LIMS-3 — Certificate of Analysis (CoA) ✅ DONE
**Completed:** 2026-05-16
**Priority:** P1 | **Effort:** 2 days | **Migration:** V102

**Backend:**
- `GET /api/qp-batch-releases/{id}/coa` → `CoaResponse` JSON
- `GET /api/qp-batch-releases/{id}/coa/pdf` → PDF preview stream (not locked)
- `POST /api/qp-batch-releases/{id}/coa/analyst-sign` → Analyst e-sign; sets `analyst_signed_by`, `analyst_signed_at`
- `POST /api/qp-batch-releases/{id}/coa/issue` → QC Manager e-sign; sets `coa_number` via sequence, `coa_issued_at`, `coa_issued_by`, `coa_locked = true`
- `GET /api/qp-batch-releases/{id}/coa/reprint` → PDF with REPRINT watermark
- `PdfReportService.generateCoa(...)`: GMP header, batch info table, spec parameters table, all test results with limits + pass/fail, analyst sign-off, QC Manager sign-off

**CoA number generation (G-5):**
```java
long seq = jdbcTemplate.queryForObject("SELECT nextval('coa_number_seq')", Long.class);
String coaNumber = "COA-" + Year.now(ZoneOffset.UTC) + "-" + String.format("%05d", seq);
```

**Frontend — CoA panel on QP Batch Release detail page:**
```
┌──────────────────────────────────────────────────────────┐
│ Certificate of Analysis                                  │
│ ──────────────────────────────────────────────────────── │
│                                                          │
│ Status:  ○ DRAFT ────── ○ ANALYST SIGNED ─── ● ISSUED   │
│                                                          │
│ [Preview PDF]                                            │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Step 1 — Analyst Sign-off                          │   │
│ │ I confirm all test results are accurate and valid. │   │
│ │ Password: [____________________]                   │   │
│ │ Username: qc.analyst (auto-filled)                 │   │
│ │                          [Sign Results]            │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ Step 2 — Issue CoA   (QC Manager only)             │   │
│ │ I approve issuance of this Certificate of Analysis.│   │
│ │ Password: [____________________]                   │   │
│ │ Username: qc.manager (auto-filled)                 │   │
│ │              [Issue CoA — Locks Record]            │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘

After issued:
┌──────────────────────────────────────────────────────────┐
│ Certificate of Analysis                                  │
│ ──────────────────────────────────────────────────────── │
│ CoA #: COA-2026-00001    ● ISSUED                        │
│ Issued: 2026-05-16 14:32 by qc.manager                   │
│ Analyst sign-off: qc.analyst · 2026-05-16 14:15          │
│                                                          │
│ [Download PDF]              [Reprint]                    │
│                                                          │
│  ℹ Reprint adds watermark: "REPRINT — Originally         │
│    issued 2026-05-16 by qc.manager"                      │
└──────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Action code | Who |
|---|---|---|---|
| `QP_BATCH_RELEASE` | `WORKFLOW_ACTION` | `COA_ANALYST_SIGN` | QC Analyst |
| `QP_BATCH_RELEASE` | `WORKFLOW_ACTION` | `COA_ISSUED` | QC Manager |
| `QP_BATCH_RELEASE` | `WORKFLOW_ACTION` | `COA_REPRINT` | any authorized |

**E-sign events:**
| Action | Entity type | Meaning text |
|---|---|---|
| Analyst sign-off | `QP_BATCH_RELEASE` | `"I confirm all test results are accurate and valid"` |
| CoA issuance | `QP_BATCH_RELEASE` | `"I approve issuance of this Certificate of Analysis"` |

**Acceptance criteria:**
- [x] Issue blocked if `coa_locked = true` → HTTP 409 `"CoA already issued"`
- [x] Issue blocked if any mandatory test result is not PASS → HTTP 409 `"All mandatory results must pass before CoA issuance"`
- [x] Issue blocked if analyst has not signed → HTTP 409 `"Analyst sign-off required before CoA issuance"`
- [x] `coa_number` format: `COA-YYYY-NNNNN`, no duplicates under concurrent issuance
- [x] Reprint PDF has watermark text on each page
- [x] CoA PDF includes: batch info, all parameters with limits, results, pass/fail, both signatures

---

### LIMS-4 — Reagent & Reference Standard Management ✅ DONE
**Priority:** P1 | **Effort:** 2.5 days | **Migration:** V99

**Backend — also add to `qc_test_result` in this sprint (G-2 resolution):**
- V99 adds `lab_reagent_lot` table → then `ALTER TABLE qc_test_result ADD COLUMN reagent_lot_id UUID REFERENCES lab_reagent_lot(id)`
- `QcTestResult` entity: add `reagentLotId UUID`
- `RecordQcTestResultRequest`: add `reagentLotId UUID`
- `QcTestResultResponse`: add `reagentLotId`
- Reagent lot selector added to worksheet result row (optional field — not gated by `requiresInstrument`)

**Backend endpoints — Reagent:**
- `GET /api/lims/reagents` — list with active lot counts + expiry status
- `POST /api/lims/reagents` — create master
- `GET /api/lims/reagents/{id}/lots` — lots with computed `status` (EXPIRED if past date)
- `POST /api/lims/reagents/{id}/lots` — add lot
- `PUT /api/lims/reagents/{id}/lots/{lotId}` — update (status, quantity used)
- `GET /api/lims/reagents/expiring` — lots expiring within 30 days

**Backend endpoints — Reference Standard:**
- Same pattern under `/api/lims/reference-standards`

**Frontend `/lims/reagents`:**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Reagent & Solution Inventory                         [+ New Reagent]     │
│ ──────────────────────────────────────────────────────────────────────── │
│ ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
│ │ 24          │  │ 3            │  │ 1            │  │ 8             │  │
│ │ Active Lots │  │ Expiring     │  │ Expired      │  │ Low Stock     │  │
│ │             │  │ ≤ 30 days    │  │ (unarchived) │  │               │  │
│ └─────────────┘  └──────────────┘  └──────────────┘  └───────────────┘  │
│                                                                          │
│ ┌────────────────────────────┐  ┌──────────────────────────────────────┐ │
│ │ Reagent Master             │  │ Lots — Acetonitrile HPLC Grade       │ │
│ │ ─────────────────────────  │  │ ──────────────────────────────────── │ │
│ │ ● Acetonitrile HPLC  [>]  │  │ Lot       Supplier  Expiry    Status  │ │
│ │ ● Methanol AR        [>]  │  │ LOT-001   Merck     2026-08   ● ACTIVE│ │
│ │ ● HCl Reagent Grade  [>]  │  │ LOT-002   Sigma     2026-05  ⚠EXPIRING│ │
│ │ ⚠ Triethylamine HPLC [>]  │  │ LOT-003   Merck     2026-03  ✗ EXPIRED│ │
│ │   (lot expiring soon)     │  │                                       │ │
│ │                           │  │                      [+ Add Lot]      │ │
│ └────────────────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Frontend `/lims/reference-standards` (same pattern):**
```
┌──────────────────────────────────────────────────────────────────────────┐
│ Reference Standards                              [+ New Standard]        │
│ ──────────────────────────────────────────────────────────────────────── │
│ ┌────────────────────────────┐  ┌──────────────────────────────────────┐ │
│ │ Standard Master            │  │ Lots — Paracetamol RS (USP)          │ │
│ │ ─────────────────────────  │  │ ──────────────────────────────────── │ │
│ │ Paracetamol RS (USP) [>]  │  │ Lot      Potency  Expiry    Status    │ │
│ │ Caffeine RS (EP)     [>]  │  │ RS-2024  99.87%   2026-12   ● ACTIVE  │ │
│ │ Metronidazole RS     [>]  │  │ RS-2023  99.91%   2026-03  ✗ EXPIRED  │ │
│ │                           │  │                                       │ │
│ └────────────────────────────┘  └──────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger |
|---|---|---|
| `LAB_REAGENT_LOT` | `CREATE` | New lot received |
| `LAB_REAGENT_LOT` | `UPDATE` | Quantity used / status change |
| `LAB_REFERENCE_STANDARD_LOT` | `CREATE` | New lot received |

**Acceptance criteria:**
- [x] Lot with `expiry_date < today` → computed `status = EXPIRED` in response (not stored)
- [x] `/expiring` endpoint returns only lots where `expiry_date BETWEEN today AND today + alertDays`
- [x] Quantity update rejected if `quantity_remaining < 0`
- [x] Expired lot shows red badge in UI; cannot be selected as `reagentLotId` on test result entry

---

### LIMS-6 — Stability Study Module ✅ DONE
**Completed:** 2026-05-18
**Priority:** P1 | **Effort:** 5 days | **Migration:** V100

**Backend:**
- `POST /api/lims/stability` — create study; auto-generate timepoints from start date + protocol array `[0,3,6,9,12,18,24,36]`
- `GET /api/lims/stability` — list with KPI summary
- `GET /api/lims/stability/{id}` — full: study + timepoints + results
- `PUT /api/lims/stability/{id}/timepoints/{tpId}/pull` — mark PULLED
- `POST /api/lims/stability/{id}/timepoints/{tpId}/results` — record results; OOT flag logic runs on save
- `GET /api/lims/stability/due-soon` — timepoints due within 14 days
- `GET /api/lims/stability/{id}/trend` — `List<TrendSeries>` per parameter for chart
- `PUT /api/lims/stability/{id}/status` — ON_HOLD / COMPLETED / DISCONTINUED (e-sign required for COMPLETED)

**OOT service logic:**
```java
// On each result save: compare with previous timepoint value for same parameter
Optional<StabilityResult> prev = getPreviousTimepointResult(studyId, parameterId, currentMonthOffset);
if (prev.isPresent() && prev.get().getResultValue() != null && result.getResultValue() != null) {
    BigDecimal pctChange = result.getResultValue()
        .subtract(prev.get().getResultValue()).abs()
        .divide(prev.get().getResultValue(), 4, HALF_UP)
        .multiply(BigDecimal.valueOf(100));
    result.setOotFlag(pctChange.compareTo(study.getOotThresholdPct()) > 0);
}
```

**Frontend `/lims/stability`:**
```
┌───────────────────────────────────────────────────────────────────────┐
│ Stability Studies                                  [+ New Study]      │
│ ───────────────────────────────────────────────────────────────────── │
│ ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌────────────┐  │
│ │ 4 Active     │  │ 2 Pulls Due  │  │ 1 OOT Alert │  │ 1 On Hold  │  │
│ │ Studies      │  │ ≤ 14 days    │  │             │  │            │  │
│ └──────────────┘  └──────────────┘  └─────────────┘  └────────────┘  │
│                                                                       │
│ Study #        Product              Condition     Progress  Status    │
│ STB-2026-001  Paracetamol 500mg    Long Term     3/8 TP    ● ACTIVE  │
│ STB-2026-002  Amoxicillin 250mg    Accelerated   2/4 TP   ⚠ OOT     │
│ STB-2026-003  Metformin 500mg      Intermediate  0/5 TP    ● ACTIVE  │
└───────────────────────────────────────────────────────────────────────┘
```

**Frontend `/lims/stability/:id`:**
```
┌────────────────────────────────────────────────────────────────────────────┐
│ STB-2026-001 — Paracetamol 500mg Tablets                 ● ACTIVE          │
│ 25°C/60%RH  │  Started: 2026-01-01  │  OOT Threshold: 10%  │  [Edit Study] │
│ ──────────────────────────────────────────────────────────────────────────  │
│ Time-point Timeline                                                         │
│                                                                             │
│   T0            T3            T6           T9           T12                 │
│   ●─────────────●─────────────⚠────────────○────────────○                  │
│ COMPLETE      COMPLETE      OOT         SCHEDULED    SCHEDULED              │
│ Jan 2026      Apr 2026      Jul 2026     Oct 2026     Jan 2027              │
│                              ↑ selected                                     │
│                                                                             │
│ ── T6 Results (Pulled: 2026-07-03 by qc.analyst) ──────────────────────    │
│                                                [+ Record Results]           │
│ Parameter          T0      T3      T6      Spec          Flag               │
│ Assay (%)         99.5    99.2    ⚠96.0   98.0–102.0    ⚠ OOT             │
│ Dissolution (%)   98.0    97.5    97.0    NLT 85.0       ✓ PASS            │
│ Water Content (%) 0.30    0.31    0.40    NMT 0.5        ✓ PASS            │
│ Appearance        PASS    PASS    PASS    PASS/FAIL       ✓ PASS            │
│                                                                             │
│ ── Trend Chart — Assay (%) ─────────────────────────────────────────────   │
│                                                                             │
│  102.0 ┤ · · · · · · · · · · · · upper spec limit (102.0)                  │
│  101.0 ┤                                                                    │
│  100.0 ┤  ●                                                                 │
│   99.0 ┤      ●                                                             │
│   98.0 ┤ · · · · · · · · · · · · lower spec limit (98.0)                   │
│   97.0 ┤                                                                    │
│   96.0 ┤              ⚠ ← OOT                                              │
│        └────T0────────T3────────T6────────T9────────T12                     │
└────────────────────────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger |
|---|---|---|
| `STABILITY_STUDY` | `CREATE` | Study initiated |
| `STABILITY_TIMEPOINT` | `UPDATE` | Sample pulled |
| `STABILITY_RESULT` | `CREATE` | Result recorded |
| `STABILITY_RESULT` | `UPDATE` | OOT flag set |
| `STABILITY_STUDY` | `WORKFLOW_ACTION` | Status change (ON_HOLD / COMPLETED) |

**E-sign events:** COMPLETED closure requires QC Manager e-sign.

**Acceptance criteria:**
- [x] Create study with `startDate=2026-01-01` + protocol `[0,3,6,12]` → 4 timepoints generated with correct dates
- [x] Result value 10.1% change from previous → `ootFlag = true` (threshold 10%)
- [x] Result value 9.9% change → `ootFlag = false`
- [x] Pull action blocked if timepoint `status != SCHEDULED`
- [x] Result entry blocked if timepoint `status != PULLED`
- [x] Trend endpoint returns one series per parameter with `[{monthOffset, value, ootFlag}]`

---

### LIMS-7 — Instrument Logbook ✅ DONE
**Completed:** 2026-05-18
**Priority:** P2 | **Effort:** 1.5 days | **Migration:** V98 (table already created)

**Backend:**
- `POST /api/lims/logbook` — manual log entry; if `condition = ANOMALY` requires `anomalyDescription`
- `GET /api/lims/equipment/{id}/logbook` — all logs for equipment, newest first
- `GET /api/lims/logbook` — cross-instrument log with filter by date range / analyst
- Auto-create log entry from LIMS-A: when `equipmentId` recorded on test result, service calls `logbookService.logAutoUsage(equipmentId, samplingRequestId, actor)`

**Frontend — Logbook tab on `EquipmentDetailPage`:**
```
┌───────────────────────────────────────────────────────────────────────┐
│ HPLC-001 — Shimadzu LC-2040                                           │
│ [Details] [Qualifications] [Logbook ●3] [Calibration]                 │
│ ───────────────────────────────────────────────────────────────────── │
│ Logbook                                       [+ Log Manual Entry]    │
│                                                                       │
│ Date/Time          Used By       Purpose              Condition       │
│ ─────────────────  ────────────  ────────────────────  ─────────────  │
│ 2026-05-16 14:32  qc.analyst    Assay — SR-2026-023   ● Normal       │
│                   (auto-logged from worksheet import)                 │
│ 2026-05-14 09:15  qc.analyst    Dissolution SR-021     ● Normal       │
│ 2026-05-10 11:00  qc.manager    Calibration check      ● Normal       │
│ 2026-05-03 16:45  qc.analyst    Assay — SR-2026-018   ⚠ Anomaly      │
│                   Baseline noise high; peak broadening observed       │
│                                             [View Deviation DEV-0023] │
│                                                                       │
│ Manual Entry:                                                         │
│ ┌───────────────────────────────────────────────────────────────┐     │
│ │ Purpose:    [System suitability check              ]          │     │
│ │ Condition:  [● Normal  ○ Anomaly]                            │     │
│ │ Notes:      [                                      ]          │     │
│ │                                          [Save Entry]         │     │
│ └───────────────────────────────────────────────────────────────┘     │
└───────────────────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger |
|---|---|---|
| `INSTRUMENT_USAGE_LOG` | `CREATE` | Manual entry |
| `INSTRUMENT_USAGE_LOG` | `CREATE` | Auto-log from test result |
| `INSTRUMENT_USAGE_LOG` | `UPDATE` | Linked deviation added |

**Acceptance criteria:**
- [x] `condition = ANOMALY` without `anomalyDescription` → HTTP 400
- [x] Auto-log created when test result recorded with `equipmentId`
- [x] Logbook tab shows entry count badge
- [x] Anomaly entries show linked deviation link if `linked_deviation_id` is set

---

### LIMS-8 — Environmental Monitoring ✅ DONE
**Completed:** 2026-05-18
**Priority:** P2 | **Effort:** 2 days | **Migration:** V101

**Backend:**
- `GET/POST /api/lims/em-monitoring-points` — list + create points
- `POST /api/lims/em-results` — record result; auto-compute `alertBreached`, `actionBreached`; if action breached → response includes `suggestDeviation: true`
- `GET /api/lims/em-results?pointId=&from=&to=` — results for trend/report
- `GET /api/lims/em-results/breaches` — all action-limit breach records

**Frontend `/lims/env-monitoring`:**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ Environmental Monitoring                         [+ New Monitoring Point]│
│ ─────────────────────────────────────────────────────────────────────── │
│ ⛔ ACTION LIMIT BREACH — LAB-TEMP-01 · Temperature · Recorded 09:42     │
│    27.3°C > action limit 27.0°C · [Create Deviation]                    │
│                                                                         │
│ Monitoring Points        [Record Reading ▼]                             │
│ ┌────────────────┬───────────────┬──────────┬──────────┬─────────────┐  │
│ │ Point          │ Type          │ Location │ Last     │ Status      │  │
│ ├────────────────┼───────────────┼──────────┼──────────┼─────────────┤  │
│ │ LAB-TEMP-01    │ Temperature   │ Lab A    │ 27.3°C   │ ⛔ ACTION   │  │
│ │ LAB-HUM-01     │ Humidity      │ Lab A    │ 58% RH   │ ✓ Normal    │  │
│ │ STORE-TEMP-01  │ Temperature   │ Store-01 │ 24.8°C   │ ✓ Normal    │  │
│ │ CLEAN-PART-01  │ Particle      │ CleanB   │ 3,200/m³ │ ⚠ ALERT    │  │
│ └────────────────┴───────────────┴──────────┴──────────┴─────────────┘  │
│                                                                         │
│ Quick Record Reading                                                    │
│ ┌─────────────────────────────────────────────────────────────────┐    │
│ │ Point:   [LAB-TEMP-01            ▼]  Limits: Alert 26°C Action 27°C│  │
│ │ Value:   [____]  Unit: °C   Notes: [                         ]  │    │
│ │                                              [Record & Check]   │    │
│ └─────────────────────────────────────────────────────────────────┘    │
│                                                                         │
│ Monthly Trend — LAB-TEMP-01                                            │
│  28 ┤ · · · · · · · · · · action limit (27°C)                          │
│  27 ┤      ⛔                                                            │
│  26 ┤ · · · · · · · · · · alert limit (26°C)                           │
│  25 ┤ ●──●──●──●──●──●                                                  │
│     └── Week 1 ── Week 2 ── Week 3 ── Week 4                           │
└─────────────────────────────────────────────────────────────────────────┘
```

**Audit events:**
| Entity | Event | Trigger |
|---|---|---|
| `EM_RESULT` | `CREATE` | Reading recorded |
| `EM_RESULT` | `UPDATE` | Deviation linked |
| `EM_MONITORING_POINT` | `CREATE/UPDATE` | Point added or limits changed |

**Acceptance criteria:**
- [x] Result > `alertLimit` → `alertBreached = true`; amber badge in UI (`EnvironmentalMonitoringPage.statusBadge`, service `recordResult`)
- [x] Result > `actionLimit` → `actionBreached = true`; red badge + banner + `suggestDeviation: true` (red banner lists every open breach, `suggestDeviation` derived in service mapper)
- [x] Breach banner persists until linked deviation is created (or dismissed by QC Manager). `POST /api/lims/em-results/{id}/link-deviation` + `POST /api/lims/em-results/{id}/dismiss` (QC_MANAGER/SUPER_ADMIN only) — `/breaches` filter excludes linked + dismissed
- [x] Trend chart correctly plots weekly averages (`weeklyAverages` bucketing in `EnvironmentalMonitoringPage`)
- [x] `room_id` FK accepted — monitoring point shows room name from warehouse hierarchy (service joins to `RoomRepository`, `MonitoringPointResponse.roomName` rendered in points table)

---

## 8. Build Sequence

```
Pre-Sprint  ──────────────────────────────────────────────────── ~0.5 days
  G-1      requires_instrument on spec_parameter (V98 prep)

Sprint 1  ─────────────────────────────────────────────────────── ~5 days
  LIMS-A   Instrument linkage + calibration gate     1.5 days
  LIMS-B   CSV bulk result import                    1.5 days
  LIMS-3   Certificate of Analysis                   2 days

Sprint 2  ─────────────────────────────────────────────────────── ~7.5 days
  LIMS-4   Reagent + Reference Standard management   2.5 days
  LIMS-6   Stability Studies                         5 days

Sprint 3  ─────────────────────────────────────────────────────── ~3.5 days
  LIMS-7   Instrument Logbook                        1.5 days
  LIMS-8   Environmental Monitoring                  2 days
```

---

## 9. Security Config Additions

Add to `SecurityConfig.filterChain()` before the catch-all `/api/**`:

```java
.requestMatchers(HttpMethod.GET, "/api/equipment", "/api/equipment/*")
    .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")  // already exists — confirm
.requestMatchers("/api/lims/reagents/**", "/api/lims/reference-standards/**",
    "/api/lims/stability/**", "/api/lims/logbook/**",
    "/api/lims/em-monitoring-points/**", "/api/lims/em-results/**")
    .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")
.requestMatchers("/api/sampling-requests/*/worksheet/import-csv",
    "/api/sampling-requests/*/worksheet/csv-template")
    .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")
.requestMatchers(HttpMethod.GET,
    "/api/qp-batch-releases/*/coa", "/api/qp-batch-releases/*/coa/pdf",
    "/api/qp-batch-releases/*/coa/reprint")
    .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")
.requestMatchers("/api/qp-batch-releases/*/coa/analyst-sign")
    .hasAnyRole("SUPER_ADMIN", "QC_ANALYST", "QC_MANAGER")
.requestMatchers("/api/qp-batch-releases/*/coa/issue")
    .hasAnyRole("SUPER_ADMIN", "QC_MANAGER")
```

---

## 10. Decisions Log

| ID | Question | Decision | Date | Expert review |
|---|---|---|---|---|
| OQ-1 | Instrument mandatory? | YES — when `requiresInstrument = true` on spec param | 2026-05-16 | ⚠️ Confirm which param types |
| OQ-2 | CoA dual sign? | YES — Analyst sign results + Manager issues CoA | 2026-05-16 | ⚠️ Additional QA sign needed? |
| OQ-3 | OOT per study? | YES — `oot_threshold_pct`, default 10% | 2026-05-16 | ⚠️ 3-sigma vs % preference |
| OQ-4 | CSV atomic? | YES — all-or-nothing | 2026-05-16 | No |
| OQ-5 | Reagent at result level? | YES — `reagent_lot_id` on `qc_test_result` | 2026-05-16 | No |
| OQ-6 | EM linked to room? | YES — `room_id FK` on monitoring point | 2026-05-16 | No |

---

## 11. Proper Pharma Product Checklist

Verify before each module ships:

- [x] Every GMP record: `created_by`, `created_at`, `updated_by`, `updated_at` — **VERIFIED/MONITORED.** GMP record metadata gaps are covered by implementation evidence plus `AlcoaReadinessServiceImpl` metadata scan, which reports missing create/update actor-time gaps through `/api/compliance/alcoa-readiness/summary` and `/gaps`.
- [x] No hard deletes — `is_active = false` or status change only — **VERIFIED.** `rg "deleteAll\\(|\\.delete\\(" core/src/main/java` returns no GMP hard-delete service paths; draft GRN replacement and change-control affected-entity removal now use soft delete/status.
- [x] `isLocked` enforced — `RecordLockedException`, not silently ignored — **VERIFIED.** QC result entry blocks locked rows and amendment uses the e-sign/audit path.
- [x] Critical actions require e-signature with meaning text — **VERIFIED.** `core/docs/E_SIGNATURE_MATRIX.md` maps critical LIMS/QMS/GRN/CoA actions to role gate, e-sign, meaning, audit evidence, or documented no-e-sign justification; EM breach dismissal now requires username/password/meaning and writes e-sign + audit rows.
- [x] Spec limits validated server-side — client cannot bypass — **VERIFIED.** QC result evaluation applies stored numeric/text/pass-fail criteria server-side.
- [x] Calibration gate is hard block, not a UI warning — **VERIFIED.** QC result entry rejects inactive or overdue equipment before saving.
- [x] `AuditEventService.record()` called on every status change and data entry — **VERIFIED.** `core/docs/AUDIT_EVENT_MATRIX.md` covers LIMS/QMS/GRN/APQR rows with service methods, event type, actor source, and test evidence; remaining read-only projections are documented as non-GMP state changes.
- [x] Training gate checked before analyst enters results — **VERIFIED.** Worksheet result entry checks required analyst training before save.
- [x] OOT/OOS auto-flagged — cannot be cleared without investigation path — **VERIFIED.** Failing/OOS worksheet rows cannot be changed to PASS before closed investigation evidence; signed amendments recalculate status and audit e-sign; stability OOT completion requires QC Manager disposition + e-sign.
- [x] PDF reports: GMP header, record ID, `generatedBy`, `generatedAt` — **VERIFIED.** Report service adds GMP footer/meta and report-specific record identifiers.
- [x] CSV import atomic — no partial data ever committed — **VERIFIED.** Worksheet CSV import runs in a transaction and throws `CsvImportException` on row errors.
- [x] All endpoints role-secured — verified with wrong-role login returning HTTP 403 — **VERIFIED.** `AuthorizationIntegrationTest.protectedApiGroupsRejectWrongRoles()` covers every protected `SecurityConfig` API group with wrong-role HTTP 403 checks.
- [x] ALCOA++: ALCOA+ plus Integrity, Robustness, Transparency, Accountability, Reliability — **VERIFIED.** ALC-1 through ALC-8 evidence covers metadata monitoring, no-hard-delete, locks, server validation, training/calibration gates, audit/e-sign, OOS/OOT lock-down, report audit reference, role security, readiness dashboard, and full validation commands.

---

## 12. ALCOA++ Implementation Plan

**Goal:** make BatchSphere GMP data integrity inspection-ready across LIMS/QMS/warehouse/master data. Regulatory mapping stays **ALCOA+**; BatchSphere internal stricter label is **ALCOA++**.

### 12.1 ALCOA++ Principles Covered

| Principle | Product meaning | Main controls |
|---|---|---|
| Attributable | Every action shows actor | `created_by`, `updated_by`, `recorded_by`, e-sign user |
| Legible | Records readable and exportable | UI detail pages, PDF/CSV reports, status labels |
| Contemporaneous | Action time captured at source | server timestamps, audit event timestamps |
| Original | Original value preserved | audit old/new values, amendment path, no overwrite without trail |
| Accurate | Values validated server-side | spec limits, calibration/training/reagent gates |
| Complete | Required fields/process steps present | validation, workflow gates, missing-data dashboard |
| Consistent | Status/time sequence coherent | allowed status transitions, ordered audit trail |
| Enduring | Records retained | soft delete/status change only, immutable audit/e-sign rows |
| Available | Records retrievable | search/filter APIs, detail pages, PDFs/exports |
| Integrity | Data protected from tamper/delete | RBAC, lock checks, no hard delete, audit trail |
| Robustness | Controls survive errors/misuse | transactional imports, negative tests, gate tests |
| Transparency | Reviewer can see who/what/when/why | audit timeline, reason/meaning text, report appendix |
| Accountability | Responsibility clear | role gates, e-sign meanings, approval ownership |
| Reliability | Data trusted for release decisions | final readiness dashboard, cross-module tests |

---

### ALC-1 — GMP Metadata Baseline

**Priority:** P0 | **Effort:** 1.5 days | **Risk:** schema migration

**Problem:** Section 11 still has metadata gaps. Known gap: `instrument_usage_log` lacks full `created_by`, `updated_by`, `updated_at`, `is_active`.

**Backend:**
- Add missing metadata columns to GMP tables found by audit.
- Start with `instrument_usage_log`.
- Update entities/DTOs/service mappers.
- Populate actor from `AuthenticatedActorService`.
- Backfill existing rows with safe system actor, e.g. `SYSTEM_MIGRATION`.

**Migration:**
- New Flyway version:
  - add `created_by varchar(100)`
  - add `updated_by varchar(100)`
  - add `updated_at timestamp`
  - add `is_active boolean default true not null`
  - backfill nulls

**Tests:**
- Create logbook row -> metadata present.
- Auto-log from QC result -> metadata present.
- Update linked deviation -> `updated_by/updated_at` changes.

**Acceptance criteria:**
- [x] Every GMP table has create/update actor/time fields or documented equivalent via direct metadata columns or ALCOA++ readiness gap detection.
- [x] `instrument_usage_log` has full metadata + active flag.
- [x] Existing rows backfilled by `V103__instrument_logbook_metadata.sql`.
- [x] Integration test proves metadata on manual and auto-created log rows.

---

### ALC-2 — No Hard Deletes

**Priority:** P0 | **Effort:** 2 days | **Risk:** workflow behavior

**Problem:** hard-delete paths were found and closed:
- draft GRN item replacement now marks superseded items/documents inactive and keeps retained rows
- change-control affected entity removal now marks row inactive with actor/time metadata

**Backend:**
- [x] Replace hard deletes with `is_active = false` where entity has active flag.
- [x] If entity lacks active flag, add it by migration.
- [x] Update repository queries to exclude inactive records.
- [x] Record audit event with reason.
- [x] For draft replacement, mark old draft rows inactive before inserting replacements.
- [x] For change-control affected entity removal, mark inactive and retain original entity reference.

**Migration:**
- [x] Add `is_active`, `updated_by`, `updated_at` to affected tables if missing.
- [x] Backfill `is_active = true`.

**Tests:**
- [x] Remove affected entity -> not returned in active list, row remains in DB.
- [x] Replace draft GRN items -> old rows inactive, new rows active.
- [x] Audit events recorded for soft removal.

**Acceptance criteria:**
- [x] `rg "deleteAll\\(|\\.delete\\(" core/src/main/java` has no GMP hard-delete service path except documented technical cleanup.
- [x] Draft GRN replacement uses soft delete/status.
- [x] Change-control affected entity removal uses soft delete.
- [x] Audit trail captures removal actor/time/reason.

---

### ALC-3 — Audit Event Coverage Matrix

**Priority:** P0 | **Effort:** 2.5 days | **Risk:** broad coverage

**Problem:** many LIMS/QMS paths call `AuditEventService.record()`, but coverage is not proven for every status/data-entry action.

**Architecture:**
- [x] Create `docs/AUDIT_EVENT_MATRIX.md` or Section 12 table.
- [x] Matrix columns:
  - module
  - entity type
  - endpoint/service method
  - action type
  - old/new fields
  - actor source
  - test class

**Backend:**
- [x] Add missing audit events for create/update/status/result/amend/delete-soft actions.
- [x] Standardize entity type names.
- [x] Ensure old/new value present for critical field changes.

**Tests:**
- [x] Focused integration tests verify audit event row created after each critical action.
- [x] Add helper assertions where useful; existing audit endpoint assertions reused.

**Acceptance criteria:**
- [x] Matrix covers LIMS modules: equipment, reagent, reference standard, stability, logbook, EM.
- [x] Matrix covers QMS modules: deviation, CAPA, change control, complaint, risk, documents, APQR, QP release.
- [x] Each matrix row has test evidence or documented non-GMP reason.
- [x] Section 11 audit checklist moves to verified.

---

### ALC-4 — Critical Action E-Sign Matrix

**Priority:** P0 | **Effort:** 2 days | **Risk:** user workflow friction

**Problem:** key e-signs exist, but no full critical-action matrix. **Status: DONE.**

**Critical action categories:**
- approve
- reject
- release
- close
- amend
- override
- void/soft delete
- dismiss breach
- complete study
- issue/reprint controlled report

**Backend:**
- [x] Build e-sign requirement matrix.
- [x] Ensure each critical action requires where GMP-critical:
  - username/password verification
  - meaning text
  - role check
  - e-sign row
  - audit event linked to same entity
- [x] Consider e-sign for EM breach dismiss and any override-like action.

**Frontend:**
- [x] Workflow-bound e-sign prompt where state change must be atomic.
- [x] Meaning text shown before submit.
- [x] Clear failure message on invalid credentials.

**Tests:**
- [x] Wrong password -> 400/409, no state change.
- [x] Wrong role -> 403.
- [x] Valid e-sign -> state change + e-sign row + audit row.

**Acceptance criteria:**
- [x] Critical-action matrix exists.
- [x] Every critical action has e-sign or documented justification.
- [x] EM breach dismissal reviewed and hardened.
- [x] Section 11 e-sign checklist moves to verified.

---

### ALC-5 — OOS/OOT Lock-Down

**Priority:** P1 | **Effort:** 2 days | **Risk:** QC decision flow

**Problem:** OOS/OOT flags exist, but final clearing/closure rules need proof. **Status: DONE.**

**Backend:**
- [x] OOS result cannot be manually changed to PASS before investigation/audit path.
- [x] OOS investigation required before QC/QA final reject decision; approval requires passing worksheet and no open/pending investigation.
- [x] OOT stability result cannot be hidden or cleared; study completion requires manager disposition + e-sign.
- [x] EM action breach cannot be dismissed without manager reason, audit, and e-sign.

**Frontend:**
- [x] Show persistent OOS/OOT/EM breach banners.
- [x] Link to investigation/deviation/disposition.
- [x] Disable/block release/closure actions until required path completed.

**Tests:**
- [x] OOS result blocks final approval/clearance until investigation closed.
- [x] OOT study completion blocks until disposition done.
- [x] EM action breach dismissal requires manager and reason/e-sign.

**Acceptance criteria:**
- [x] OOS cannot be cleared without investigation/e-sign/audit evidence.
- [x] OOS investigation required before final disposition.
- [x] OOT cannot be hidden; disposition/deviation path required.
- [x] EM breach dismiss path is manager-controlled and audited.

---

### ALC-6 — Audit Trail Timeline and Report Appendix

**Priority:** P1 | **Effort:** 2.5 days | **Risk:** report size/UI scope | **Status:** DONE

**Problem:** audit records exist, but reviewers need easy inspection view.

**Backend/API:**
- [x] Existing `/api/audit-events` remains source.
- [x] Entity audit endpoint:
  - `GET /api/audit-events?entityType=X&entityId=Y`
- [x] Ensure sorting by `occurredAt asc`.

**Frontend:**
- [x] Reusable `AuditTrailPanel`.
- [x] Show:
  - timestamp
  - actor
  - action
  - field
  - old value
  - new value
  - reason
- [x] Add to critical detail pages already covered by current UI: sampling request/worksheet, stability, EM result, deviation, CAPA, change control, controlled documents, GRN.

**Reports:**
- [x] Add linked audit reference for GMP PDFs.
- [x] Include generated by/at, entity type, record ID, and exact audit endpoint.

**Acceptance criteria:**
- [x] Reviewer can view audit timeline from critical records.
- [x] Audit timeline includes old/new values and reason where available.
- [x] GMP PDFs can include audit appendix or linked audit reference.

---

### ALC-7 — ALCOA++ Readiness Dashboard

**Priority:** P1 | **Effort:** 3 days | **Risk:** aggregate queries | **Status:** DONE

**Purpose:** one screen showing data-integrity gaps before inspection/release.

**Backend:**
- [x] New service/controller:
  - `GET /api/compliance/alcoa-readiness/summary`
  - `GET /api/compliance/alcoa-readiness/gaps`
- [x] Export endpoint:
  - `GET /api/compliance/alcoa-readiness/export`
- [x] Summary cards:
  - missing metadata count
  - inactive/soft-deleted records count
  - open OOS investigations
  - open OOT results
  - open EM breaches
  - unsigned critical actions
  - expired training assignments
  - overdue calibration equipment
  - audit events missing reason/old-new values

**Frontend:**
- [x] New route: `/compliance/alcoa-readiness`
- [x] Role gate: `SUPER_ADMIN`, `QC_MANAGER`
- [x] Tables with drill-down links to source record.
- [x] CSV export from dashboard for QC Manager/SUPER_ADMIN.

**Tests:**
- [x] wrong role -> 403
- [x] summary counts seeded gaps
- [x] gap rows link to entity type/id

**Acceptance criteria:**
- [x] Dashboard shows ALCOA++ score/gaps.
- [x] Each gap links to source record.
- [x] QC Manager can export readiness report.
- [x] Section 11 ALCOA++ checklist can be reviewed from product evidence.

---

### ALC-8 — ALCOA++ Final Validation Pack

**Priority:** P1 | **Effort:** 1.5 days | **Risk:** documentation completeness | **Status:** DONE

**Deliverables:**
- [x] Update Section 11 final statuses.
- [x] Add evidence table:
  - checklist item
  - implementation files
  - test class
  - last verified date
- [x] Add final validation commands:
  - `./mvnw test`
  - `cd ui && npm run build`

**ALCOA++ Evidence Table (last verified: 2026-05-19):**

| Checklist item | Implementation files | Test / evidence | Last verified |
|---|---|---|---|
| GMP metadata actor/time | `core/src/main/java/com/batchsphere/core/lims/logbook/*`, `V103__instrument_logbook_metadata.sql`, `AlcoaReadinessServiceImpl` metadata scan | `InstrumentLogbookIntegrationTest`, `/api/compliance/alcoa-readiness/summary` metadata count | 2026-05-19 |
| No hard deletes | GRN soft replacement paths, change-control affected-entity soft delete, `V104__alc_no_hard_delete_cleanup.sql` | `GrnControllerIntegrationTest`, `ChangeControlControllerIntegrationTest`, `rg "deleteAll\\(|\\.delete\\(" core/src/main/java` | 2026-05-19 |
| Locked result protection | `QcTestResultServiceImpl` | `SamplingServiceIntegrationTest` locked/amendment cases | 2026-05-19 |
| Critical action e-sign | `core/docs/E_SIGNATURE_MATRIX.md`, EM dismissal service/UI, CoA/QP/APQR/QMS services | `EnvironmentalMonitoringControllerIntegrationTest`, `ApqrControllerIntegrationTest`, `ReagentInventoryIntegrationTest`, `GrnControllerIntegrationTest` | 2026-05-19 |
| Server-side spec limits | `QcTestResultServiceImpl`, `SpecParameter` criteria | `SamplingServiceIntegrationTest` result evaluation paths | 2026-05-19 |
| Calibration hard gate | `QcTestResultServiceImpl`, equipment repositories | `SamplingServiceIntegrationTest` overdue/inactive equipment paths | 2026-05-19 |
| Audit event coverage | `core/docs/AUDIT_EVENT_MATRIX.md`, service audit calls, `AuditEventServiceImpl` | `ApqrControllerIntegrationTest`, `ReagentInventoryIntegrationTest`, `GrnControllerIntegrationTest`, `ChangeControlControllerIntegrationTest` | 2026-05-19 |
| Training gate | `TrainingAssignmentRepository`, worksheet result entry checks | `SamplingServiceIntegrationTest` training gate paths | 2026-05-19 |
| OOS/OOT lock-down | `QcTestResultServiceImpl`, `StabilityServiceImpl`, stability UI disposition prompt | `SamplingServiceIntegrationTest`, `StabilityControllerIntegrationTest` | 2026-05-19 |
| GMP PDF metadata/audit reference | `PdfReportService` | Full backend test pass plus report service review | 2026-05-19 |
| CSV import atomicity | sampling CSV import service + `CsvImportException` | `SamplingServiceIntegrationTest` CSV failure/rollback paths | 2026-05-19 |
| Endpoint role security | `SecurityConfig` | `AuthorizationIntegrationTest.protectedApiGroupsRejectWrongRoles()` | 2026-05-19 |
| ALCOA++ dashboard/export | `AlcoaReadinessController`, `AlcoaReadinessServiceImpl`, `LimsNavigationPages.tsx` | `AlcoaReadinessControllerIntegrationTest`, `npm run build` | 2026-05-19 |

**Final Validation Commands (2026-05-19):**

| Command | Result |
|---|---|
| `cd core && ./mvnw test` | PASS — 156 tests, 0 failures, 0 errors |
| `cd core/ui && npm run build` | PASS — TypeScript + Vite production build |

**Acceptance criteria:**
- [x] All Section 11 ALCOA++ dependencies verified.
- [x] Evidence table complete.
- [x] Full backend tests pass.
- [x] Frontend build passes.
- [x] ALCOA++ item marked verified.

---

## 13. LIMS Navigation Architecture

**Goal:** make left-hand navigation match real lab workflow. LIMS should group all lab execution, lab masters, lab inventory, lab monitoring, and lab compliance screens. QMS stays separate for deviation/CAPA/change-control ownership, but LIMS records should deep-link into QMS when needed.

### 13.1 Current Implemented LIMS/Quality Routes

| Menu area today | Route | Status | Notes |
|---|---|---|---|
| Sampling & QC | `/qc/sampling` | Existing | Sampling requests, worksheets, result entry, investigations in one page |
| Specs | `/master/specs` | Existing | Currently under Master Data; LIMS needs shortcut or grouped nav |
| MoA | `/master/moa` | Existing | Currently under Master Data; LIMS needs shortcut or grouped nav |
| Sampling Tools | `/master/sampling-tools` | Existing | QC reference master |
| Equipment | `/lims/equipment` | Existing | Instrument master + calibration/qualification summary |
| Equipment Detail | `/lims/equipment/:equipmentId` | Existing | Qualifications and instrument detail |
| Reagents | `/lims/reagents` | Existing | Reagent master + reagent lots |
| Reference Standards | `/lims/reference-standards` | Existing | Reference standard master + lots |
| Instrument Logbook | `/lims/logbook` | Existing | Manual and auto-created equipment usage logs |
| Stability | `/lims/stability` | Existing | Study list/create/detail |
| Stability Detail | `/lims/stability/:studyId` | Existing | Same page in detail mode |
| Environmental Monitoring | `/lims/env-monitoring` | Existing | Monitoring points, EM results, breaches |
| Retention Samples | `/lims/retention-samples` | Existing | Retention inventory |
| Retention Sample Detail | `/lims/retention-samples/:id` | Existing | Retention lifecycle |
| QP Batch Release / CoA | `/qms/batch-release` | Existing | QMS route, but LIMS should expose CoA shortcut |
| Lot Traceability | `/qms/traceability` | Existing | QMS route, useful from LIMS reports/compliance |

---

### 13.2 Target LIMS Left Sidebar

Recommended left navigation under one **LIMS** group:

```text
LIMS
- Dashboard
- QC Sampling
- Worksheets
- OOS Investigations
- Specifications
- Methods / MoA
- Sampling Tools
- Equipment
- Instrument Logbook
- Reagents
- Reference Standards
- Stability
- Environmental Monitoring
- Retention Samples
- CoA / Lab Certificates
- Lab Reports
- Lab Compliance
```

### 13.3 Target Route Map

| Target menu | Route | Source/reuse | Implementation status |
|---|---|---|---|
| Dashboard | `/lims/dashboard` | New page | MVP done |
| QC Sampling | `/qc/sampling` or `/lims/sampling` | Existing `SamplingPage` | Existing + alias done |
| Worksheets | `/lims/worksheets` | Queue wrapper over sampling requests | MVP done |
| OOS Investigations | `/lims/oos-investigations` | Existing investigation APIs in sampling | MVP done |
| Specifications | `/lims/specifications` | Alias to `/master/specs` or reuse `SpecsPage` | Alias done |
| Methods / MoA | `/lims/methods` | Alias to `/master/moa` or reuse `MoaPage` | Alias done |
| Sampling Tools | `/lims/sampling-tools` | Alias to `/master/sampling-tools` | Alias done |
| Equipment | `/lims/equipment` | Existing | Done |
| Instrument Logbook | `/lims/logbook` | Existing | Done |
| Reagents | `/lims/reagents` | Existing | Done |
| Reference Standards | `/lims/reference-standards` | Existing | Done |
| Stability | `/lims/stability` | Existing | Done |
| Environmental Monitoring | `/lims/env-monitoring` | Existing | Done |
| Retention Samples | `/lims/retention-samples` | Existing | Done |
| CoA / Lab Certificates | `/lims/coa` | Reuse QP batch release CoA section | MVP done |
| Lab Reports | `/lims/reports` | New report hub | MVP done |
| Lab Compliance | `/lims/compliance` | ALCOA++ readiness + audit/e-sign/training/calibration gaps | MVP done |

---

### 13.4 Menu Grouping Rules

- **LIMS** owns lab execution and lab data:
  - sampling
  - worksheets/results
  - OOS/OOT lab follow-up
  - instruments/equipment/logbook
  - reagents/reference standards
  - stability
  - environmental monitoring
  - retention samples
  - CoA/lab reports
  - lab compliance evidence
- **QMS** owns quality system records:
  - deviations
  - CAPA
  - change control
  - complaints
  - risk
  - APQR
  - documents
- **Master Data** owns enterprise masters, but LIMS should expose shortcuts to QC-relevant masters:
  - specifications
  - MoA
  - sampling tools
  - materials as read-only context

---

### LNAV-1 — LIMS Sidebar Reorganization ✅ MVP DONE

**Priority:** P1 | **Effort:** 0.5 day | **Files:** `core/ui/src/shell/AppShell.tsx`, `core/ui/src/router.tsx`

**Work:**
- Create separate **LIMS** nav group in left sidebar.
- Move existing LIMS routes from mixed Quality group into LIMS group.
- Add route aliases for specs/MoA/sampling tools if UX needs them under LIMS.
- Keep QMS items in **Quality / QMS** group.

**Acceptance criteria:**
- [x] Left nav shows dedicated LIMS group.
- [x] Existing LIMS pages still open from old routes.
- [x] LIMS group includes Equipment, Reagents, Reference Standards, Logbook, Stability, EM, Retention Samples.
- [x] Specs/MoA/Sampling Tools reachable from LIMS group or clear Master Data shortcut.

---

### LNAV-2 — LIMS Dashboard ✅ MVP DONE

**Priority:** P1 | **Effort:** 1.5 days | **Route:** `/lims/dashboard`

**Purpose:** first lab screen for QC analyst/manager.

**Cards:**
- sampling requests awaiting collection
- worksheets pending result entry
- OOS investigations open
- stability timepoints due/overdue
- EM action breaches open
- equipment calibration overdue/soon due
- reagent/reference lots expiring soon
- retention samples due for disposal

**Acceptance criteria:**
- [x] Dashboard visible to `SUPER_ADMIN`, `QC_ANALYST`, `QC_MANAGER`.
- [x] Cards link to source pages.
- [x] Counts load from existing APIs where possible.

---

### LNAV-3 — Worksheets Page ✅ MVP DONE

**Priority:** P2 | **Effort:** 1.5 days | **Route:** `/lims/worksheets`

**Purpose:** faster result-entry queue separate from full sampling workflow.

**Work:**
- List sampling requests with worksheet status.
- Filters: pending, in progress, completed, OOS.
- Open worksheet/result entry directly.
- Reuse `SamplingPage` worksheet components where possible.

**Acceptance criteria:**
- [x] Analyst can find pending worksheets without opening full sampling workflow.
- [x] Result entry still uses same API and gates.
- [x] OOS rows clearly flagged.

---

### LNAV-4 — OOS Investigations Page ✅ MVP DONE

**Priority:** P2 | **Effort:** 1 day | **Route:** `/lims/oos-investigations`

**Purpose:** central OOS/OOT lab follow-up queue.

**Work:**
- List open QC investigations.
- Show sampling request, material, batch, result status, phase, owner, due date.
- Deep-link to sampling workflow and QMS deviation if linked.

**Acceptance criteria:**
- [x] QC Manager sees open OOS/OOT/general investigations from global investigation queue.
- [x] Analyst can filter own investigations with `Mine`.
- [x] Closed investigations remain searchable with `Include closed`.

---

### LNAV-5 — CoA / Lab Certificates Shortcut ✅ MVP DONE

**Priority:** P2 | **Effort:** 0.5 day | **Route:** `/lims/coa`

**Purpose:** lab users expect certificates under lab menu, even if QP release remains QMS-owned.

**Work:**
- Add LIMS nav item pointing to existing QP Batch Release page or filtered CoA section.
- Label: **CoA / Lab Certificates**.

**Acceptance criteria:**
- [x] LIMS sidebar has CoA entry.
- [x] Existing QP release permissions unchanged.
- [x] Breadcrumb/heading makes ownership clear: lab certificate evidence, QP final release.

---

### LNAV-6 — Lab Reports Hub ✅ MVP DONE

**Priority:** P2 | **Effort:** 2 days | **Route:** `/lims/reports`

**Reports:**
- QC worksheet report
- CoA report/reprint
- stability trend report
- EM trend/breach report
- equipment calibration/qualification report
- reagent/reference expiry report
- retention disposal report

**Acceptance criteria:**
- [x] Reports grouped by lab domain.
- [x] Each report has filters and export/PDF path/record handoff in `/lims/reports`.
- [x] GMP PDF metadata present on existing PDF reports (`PdfReportService` title/subject/author/creator/keywords).

---

### LNAV-7 — Lab Compliance Hub ✅ MVP DONE

**Priority:** P1 | **Effort:** 2 days | **Route:** `/lims/compliance`

**Purpose:** lab-facing ALCOA++ control center.

**Widgets:**
- audit trail search
- e-signature records
- training gate status
- calibration gate status
- OOS/OOT open items
- EM breaches
- ALCOA++ readiness link

**Acceptance criteria:**
- [x] `QC_MANAGER` can review compliance gaps by lab module.
- [x] Each gap links to source record.
- [x] Reuses ALCOA++ readiness summary API where possible.
- [x] Record-level ALCOA++ gap list API exists: `GET /api/compliance/alcoa-readiness/gaps`.
