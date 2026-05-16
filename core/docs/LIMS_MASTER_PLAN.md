# LIMS Master Plan — BatchSphere
**Author:** Yamini Raayi (QC Manager)  
**Date:** 2026-05-16  
**Status:** Approved for Sprint 1 — Items marked ⚠️ pending pharma expert validation

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
- [ ] `requires_instrument = true` → instrument selector shown + mandatory in worksheet row
- [ ] `requires_instrument = false` → instrument selector optional (not shown by default)
- [ ] Default `false` on all existing parameters after migration
- [ ] API rejects result entry for `requiresInstrument=true` parameter without `equipmentId`

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
- [ ] `requiresInstrument=true` param + no equipmentId → HTTP 409 `"Instrument required for parameter: {name}"`
- [ ] `equipmentId` with `nextCalibrationDue` in past → HTTP 409 `"Instrument {ID} calibration expired {date}"`
- [ ] `equipmentId` with valid calibration → result saves; `instrument_ref` populated in DB
- [ ] Result response includes `instrumentRef` and `equipmentId`
- [ ] Equipment dropdown only shows `status = ACTIVE` instruments
- [ ] Expired instruments shown in dropdown with ⚠ label and disabled for selection

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
- [ ] One invalid row → zero rows saved, HTTP 400 with per-row error list
- [ ] All valid → all rows saved in single transaction, HTTP 200
- [ ] Unknown `parameter_name` → error row `"Parameter not found in spec"`
- [ ] CSV with no header row → HTTP 400 `"CSV must include header row"`
- [ ] Template download returns CSV with correct parameter names from worksheet
- [ ] Import respects calibration gate (same validation as manual entry)

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
- [ ] Issue blocked if `coa_locked = true` → HTTP 409 `"CoA already issued"`
- [ ] Issue blocked if any mandatory test result is not PASS → HTTP 409 `"All mandatory results must pass before CoA issuance"`
- [ ] Issue blocked if analyst has not signed → HTTP 409 `"Analyst sign-off required before CoA issuance"`
- [ ] `coa_number` format: `COA-YYYY-NNNNN`, no duplicates under concurrent issuance
- [ ] Reprint PDF has watermark text on each page
- [ ] CoA PDF includes: batch info, all parameters with limits, results, pass/fail, both signatures

---

### LIMS-4 — Reagent & Reference Standard Management
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
- [ ] Lot with `expiry_date < today` → computed `status = EXPIRED` in response (not stored)
- [ ] `/expiring` endpoint returns only lots where `expiry_date BETWEEN today AND today + alertDays`
- [ ] Quantity update rejected if `quantity_remaining < 0`
- [ ] Expired lot shows red badge in UI; cannot be selected as `reagentLotId` on test result entry

---

### LIMS-6 — Stability Study Module
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
- [ ] Create study with `startDate=2026-01-01` + protocol `[0,3,6,12]` → 4 timepoints generated with correct dates
- [ ] Result value 10.1% change from previous → `ootFlag = true` (threshold 10%)
- [ ] Result value 9.9% change → `ootFlag = false`
- [ ] Pull action blocked if timepoint `status != SCHEDULED`
- [ ] Result entry blocked if timepoint `status != PULLED`
- [ ] Trend endpoint returns one series per parameter with `[{monthOffset, value, ootFlag}]`

---

### LIMS-7 — Instrument Logbook
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
- [ ] `condition = ANOMALY` without `anomalyDescription` → HTTP 400
- [ ] Auto-log created when test result recorded with `equipmentId`
- [ ] Logbook tab shows entry count badge
- [ ] Anomaly entries show linked deviation link if `linked_deviation_id` is set

---

### LIMS-8 — Environmental Monitoring
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
- [ ] Result > `alertLimit` → `alertBreached = true`; amber badge in UI
- [ ] Result > `actionLimit` → `actionBreached = true`; red badge + banner + `suggestDeviation: true`
- [ ] Breach banner persists until linked deviation is created (or dismissed by QC Manager)
- [ ] Trend chart correctly plots weekly averages
- [ ] `room_id` FK accepted — monitoring point shows room name from warehouse hierarchy

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

- [ ] Every GMP record: `created_by`, `created_at`, `updated_by`, `updated_at`
- [ ] No hard deletes — `is_active = false` or status change only
- [ ] `isLocked` enforced — `RecordLockedException`, not silently ignored
- [ ] Critical actions require e-signature with meaning text
- [ ] Spec limits validated server-side — client cannot bypass
- [ ] Calibration gate is hard block, not a UI warning
- [ ] `AuditEventService.record()` called on every status change and data entry
- [ ] Training gate checked before analyst enters results
- [ ] OOT/OOS auto-flagged — cannot be cleared without investigation path
- [ ] PDF reports: GMP header, record ID, `generatedBy`, `generatedAt`
- [ ] CSV import atomic — no partial data ever committed
- [ ] All endpoints role-secured — verified with wrong-role login returning HTTP 403
- [ ] ALCOA+: Attributable, Legible, Contemporaneous, Original, Accurate, Complete, Consistent, Enduring, Available
