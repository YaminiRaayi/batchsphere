# Phase 6H — Global Pharma Guidelines Compliance Gaps

**Defined:** 2026-05-14  
**Regulatory sources:** FDA Data Integrity Guidance (2018), EU GMP Annex 15, EU GMP Annex 19, EU GMP Chapter 8, FDA 21 CFR 211.198  
**Migration baseline entering Phase 6H:** V83 (last 6G migration)

---

## Ticket 6H.1: ALCOA+ Data Integrity Controls

**Status:** Not implemented.  
**Priority:** High — FDA inspectors cite data integrity violations as the #1 reason for Warning Letters.

### Regulatory Basis

FDA Data Integrity Guidance (2018) and EU GMP Chapter 4 require all GMP records to follow ALCOA+ principles:
- **A**ttributable — who created/changed the record
- **L**egible — readable, permanent
- **C**ontemporaneous — recorded at time of action
- **O**riginal — first capture preserved
- **A**ccurate — reflects what actually happened
- **C**omplete — no missing data
- **C**onsistent — consistent date/time, units
- **E**nduring — not erasable
- **A**vailable — retrievable on demand

### Backend

**Data lock after QC disposition:**
- After a `SamplingRequest` reaches `RELEASED` or `REJECTED` disposition, block any `PUT` on `QcTestResult` records linked to that sampling request.
- Only `QC_MANAGER` or `SUPER_ADMIN` can unlock with a written justification; create audit event `DATA_AMENDMENT` with justification text and e-sign.
- Add `isLocked: boolean` to `QcTestResult` entity; set true on disposition finalize.
- Return `423 Locked` with message `"QC results are locked after disposition. Contact QC Manager to amend."` if non-authorized edit attempted.

**Security / session audit log:**
- Add `SecurityAuditEvent` entity:
  - `eventType` enum: `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `SESSION_TIMEOUT`, `PASSWORD_CHANGED`, `ACCOUNT_LOCKED`, `ACCOUNT_UNLOCKED`
  - `username`, `ipAddress`, `userAgent`, `sessionId`, `timestamp`
- Record events in `AuthController` for login/fail and in Spring Security logout handler for logout.
- Add `GET /api/audit/security-events?username=&from=&to=` endpoint (SUPER_ADMIN only).

**Timezone-aware timestamps:**
- Audit all Flyway migrations V1–V83: confirm all `TIMESTAMP` columns are `TIMESTAMPTZ`.
- For any plain `TIMESTAMP` column found: create a corrective migration `Vxx__fix_timestamp_timezone.sql`.
- Spring Boot JPA: set `spring.jpa.properties.hibernate.jdbc.time_zone=UTC` in `application.yaml`.

**Free-text field minimum length validation:**
- `Deviation.rootCause` — minimum 20 characters when status moves past `OPEN`.
- `Capa.correctiveAction` — minimum 30 characters on create.
- `QcInvestigation.description` — minimum 20 characters.
- Enforce in service layer with `BusinessConflictException` for too-short critical fields.

### Frontend

- QC test result entry: disable edit fields on results where `isLocked = true`; show lock icon with tooltip "Results locked after disposition. Amendment requires QC Manager authorization."
- Security events log: SUPER_ADMIN page at `/admin/security-audit` — table of login/logout/fail events with date, user, IP, event type filter.
- Validation: show character count helper below free-text mandatory fields; show red border if under minimum on submit attempt.

### Tests

- `PUT /api/sampling/{id}/results/{resultId}` returns 423 after disposition is finalized.
- `QC_MANAGER` with justification + e-sign can amend a locked result; audit event `DATA_AMENDMENT` created.
- Unauthorized role attempting amendment gets 403.
- Login event appears in security audit log.
- Failed login increments `failedLoginAttempts` and appears in security log.

### Done Means

- QC test results are immutable after disposition without a QA-authorized data amendment trail.
- Every login, logout, and failed login is recorded with IP and timestamp.
- Timezone-aware timestamps throughout all audit records.
- Critical GMP free-text fields cannot be submitted with placeholder content.

### UX Mockup

No dedicated mockup — changes are inline on existing QC Sampling page and new Admin Security Audit sub-page.

---

## Ticket 6H.2: Retention Sample Lifecycle Management

**Status:** Not implemented. Sampling has `RETENTION` draw purpose (V61) but no lifecycle entity.  
**Priority:** High — EU GMP Annex 19 compliance gap visible in any sampling audit.

### Regulatory Basis

EU GMP Annex 19 requires:
- Retention (reference) samples kept for each batch — minimum 2× full test quantity.
- Storage location tracked with temperature/condition requirements.
- Retention period: minimum 1 year past product expiry date.
- Chain of custody when moving to retention storage.
- Retrieval and testing records if sample is pulled during investigation.
- Disposal record at end of retention period.

### Migration

`V84__create_retention_sample.sql`

```sql
CREATE TABLE retention_sample (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sampling_request_id UUID NOT NULL REFERENCES sampling_request(id),
  lot_number VARCHAR(100) NOT NULL,
  material_id UUID REFERENCES material(id),
  material_name VARCHAR(255),
  quantity NUMERIC(14,4) NOT NULL,
  uom VARCHAR(20) NOT NULL,
  container_description VARCHAR(255),
  storage_location VARCHAR(255) NOT NULL,
  storage_condition VARCHAR(100),           -- e.g. "2-8°C", "15-25°C"
  retention_until DATE NOT NULL,            -- expiry_date + 12 months minimum
  status VARCHAR(30) NOT NULL DEFAULT 'STORED',  -- STORED, RETRIEVED, TESTED, DISPOSED
  received_by VARCHAR(100) NOT NULL,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  retrieval_reason TEXT,
  retrieved_by VARCHAR(100),
  retrieved_at TIMESTAMP WITH TIME ZONE,
  test_result_reference VARCHAR(255),       -- reference to investigation that used sample
  disposal_reason TEXT,
  disposed_by VARCHAR(100),
  disposed_at TIMESTAMP WITH TIME ZONE,
  disposal_method VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `lims/retentionsample`

Entities and DTOs:
- `RetentionSample` entity mapping above table.
- `CreateRetentionSampleRequest`: `samplingRequestId`, `quantity`, `uom`, `containerDescription`, `storageLocation`, `storageCondition`, `retentionUntil`.
- `RetrieveRetentionSampleRequest`: `reason`.
- `DisposeRetentionSampleRequest`: `disposalReason`, `disposalMethod`.
- `RetentionSampleResponse`: full fields + `daysUntilExpiry` (computed).

Service — `RetentionSampleService` / `RetentionSampleServiceImpl`:
- `createRetentionSample(request)`: validate `samplingRequestId` exists and has a RETENTION draw. Calculate `retentionUntil` if not provided: use material expiry + 12 months. Record audit event.
- `retrieveSample(id, request)`: set status `RETRIEVED`, record actor, reason, timestamp. Audit event.
- `disposeSample(id, request)`: set status `DISPOSED`, record disposal details. Require QC Manager role. Audit event.
- `findDueForDisposal()`: samples where `retentionUntil < today` and status `STORED`. For dashboard alert.
- `findExpiringSoon(daysAhead)`: samples where `retentionUntil <= today + daysAhead`.

Controller — `GET/POST /api/retention-samples`:
- `GET /api/retention-samples?status=&materialId=&lotNumber=`
- `POST /api/retention-samples`
- `GET /api/retention-samples/{id}`
- `POST /api/retention-samples/{id}/retrieve`
- `POST /api/retention-samples/{id}/dispose`
- `GET /api/retention-samples/expiring-soon?days=30`

### Frontend

Route: `/lims/retention-samples`  
Mockup: `core/ux-mockups/14-retention-samples.html`

Left list (filtered by status: STORED / RETRIEVED / DISPOSED):
- Columns: Lot No., Material, Storage Location, Stored Qty, Retention Until, Status pill, Days Remaining.
- Color coding: green >60d, amber 30–60d, red <30d, grey if disposed.
- KPI strip: Total Stored, Expiring 30d, Overdue Disposal, Retrieved This Month.

Right detail panel for selected retention sample:
- Header: lot number, material name, sampling request number link.
- Storage section: location, condition, quantity, container.
- Timeline: Stored → Retrieved (if applicable) → Disposed.
- Action buttons: "Record Retrieval" (for investigators), "Record Disposal" (QC Manager only).
- Audit trail using `<AuditTimeline entityType="RETENTION_SAMPLE" entityId={...} />`.

### Tests

- `POST /api/retention-samples` creates record linked to valid sampling request with RETENTION draw.
- Retrieval sets status to `RETRIEVED` with actor and reason.
- Disposal restricted to `QC_MANAGER` role.
- `expiring-soon?days=30` returns samples within 30 days of `retentionUntil`.

### Done Means

- Every batch's retention samples are tracked from storage through retrieval to disposal.
- Overdue retention samples surface in dashboard.
- Annex 19 chain of custody is auditable.

---

## Ticket 6H.3: Complaint and Product Defect Management

**Status:** Not implemented.  
**Priority:** High — EU GMP Chapter 8 is one of the first areas an inspector reviews. Absence = critical finding.

### Regulatory Basis

EU GMP Chapter 8 and FDA 21 CFR 211.198 require:
- Written procedure for handling product complaints from market/customers/clinical.
- Complaint classification: product quality defect, adverse event, labeling error, packaging defect.
- Investigation with root cause, impact assessment, recall consideration.
- Regulatory reporting decision (whether reportable to authority).
- Link to deviation, CAPA if systemic.
- Trending of complaint types per product per period.

### Migration

`V85__create_complaint_management.sql`

```sql
CREATE TYPE complaint_source AS ENUM ('CUSTOMER', 'MARKET', 'CLINICAL', 'INTERNAL', 'DISTRIBUTOR', 'REGULATORY_AUTHORITY');
CREATE TYPE complaint_category AS ENUM ('PRODUCT_QUALITY', 'ADVERSE_EVENT', 'LABELING_ERROR', 'PACKAGING_DEFECT', 'EFFICACY', 'CONTAMINATION', 'OTHER');
CREATE TYPE complaint_severity AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'INFORMATIONAL');
CREATE TYPE complaint_status AS ENUM ('RECEIVED', 'UNDER_INVESTIGATION', 'PENDING_CLOSURE', 'CLOSED', 'WITHDRAWN');
CREATE TYPE regulatory_reportability AS ENUM ('NOT_ASSESSED', 'REPORTABLE', 'NOT_REPORTABLE', 'REPORTED');

CREATE TABLE complaint (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_number VARCHAR(30) UNIQUE NOT NULL,      -- AUTO: COMP-2026-001
  received_date DATE NOT NULL,
  source complaint_source NOT NULL,
  category complaint_category NOT NULL,
  severity complaint_severity NOT NULL,
  status complaint_status NOT NULL DEFAULT 'RECEIVED',
  product_name VARCHAR(255),
  lot_number VARCHAR(100),
  batch_number VARCHAR(100),
  reported_by VARCHAR(255),                          -- customer/reporter name
  description TEXT NOT NULL,
  initial_assessment TEXT,
  root_cause TEXT,
  impact_assessment TEXT,
  recall_required BOOLEAN DEFAULT FALSE,
  regulatory_reportability regulatory_reportability DEFAULT 'NOT_ASSESSED',
  regulatory_report_date DATE,
  regulatory_authority VARCHAR(100),
  linked_deviation_id UUID REFERENCES qms_deviation(id),
  linked_capa_id UUID REFERENCES qms_capa(id),
  closed_by VARCHAR(100),
  closed_at TIMESTAMP WITH TIME ZONE,
  closure_summary TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Backend

**Package:** `qms/complaint`

Enums: `ComplaintSource`, `ComplaintCategory`, `ComplaintSeverity`, `ComplaintStatus`, `RegulatoryReportability`

Entities: `Complaint` entity

DTOs:
- `CreateComplaintRequest`: `receivedDate`, `source`, `category`, `severity`, `productName`, `lotNumber`, `reportedBy`, `description`.
- `UpdateComplaintRequest`: all investigation fields including `rootCause`, `impactAssessment`, `recallRequired`, `regulatoryReportability`.
- `LinkComplaintRequest`: `deviationId`, `capaId`.
- `CloseComplaintRequest`: `closureSummary`, `username`, `password`, `meaning`.
- `ComplaintResponse`: full fields + linked entity summary.
- `ComplaintSummary`: counts by status, by category, by severity, overdue (>30 days in `UNDER_INVESTIGATION`).

Service — `ComplaintService` / `ComplaintServiceImpl`:
- Auto-generate `complaintNumber` = `"COMP-" + year + "-" + sequence`.
- `linkToDeviation(complaintId, deviationId)`: validate deviation exists; update `linkedDeviationId`; add audit event.
- `linkToCapa(complaintId, capaId)`: similar.
- `closeComplaint(complaintId, request)`: require e-sign, set status `CLOSED`, record closure details.
- `getSummary()`: counts for dashboard.

Controller — `/api/complaints`:
- `GET /api/complaints?status=&category=&severity=&from=&to=`
- `POST /api/complaints`
- `GET /api/complaints/{id}`
- `PUT /api/complaints/{id}`
- `PUT /api/complaints/{id}/status`
- `POST /api/complaints/{id}/link-deviation`
- `POST /api/complaints/{id}/link-capa`
- `GET /api/complaints/summary`

### Frontend

Route: `/qms/complaints`  
Mockup: `core/ux-mockups/12-complaint-management.html`

List page:
- KPI strip: Total Open, Critical (severity), Under Investigation, Regulatory Reportable.
- Filters: source, category, severity, status, date range.
- Table: Complaint No., Received Date, Source, Category, Severity pill, Status pill, Product/Lot, Linked Deviation.
- "New Complaint" button.

Detail panel / page (right side or full page):
- Overview: complaint metadata, reporter, product/lot.
- Investigation section: initial assessment, root cause, impact assessment, recall flag, regulatory reportability.
- Linked Records section: deviation link, CAPA link (with navigate buttons).
- Regulatory Reporting section: reportable toggle, authority, report date.
- Closure: e-sign closure with summary.
- Audit timeline.

### Tests

- `POST /api/complaints` creates with auto-generated `complaintNumber`.
- `PUT /api/complaints/{id}/status` to `CLOSED` requires e-sign.
- Link to non-existent deviation returns 404.
- `GET /api/complaints/summary` returns correct counts by status.
- QC_ANALYST can create; QC_MANAGER can close.

### Done Means

- Every product complaint has a traceable investigation record.
- Complaints link to deviations and CAPAs for systemic issue tracking.
- Regulatory reportability decision is documented.
- EU GMP Chapter 8 complaint procedure is system-enforced.

---

## Ticket 6H.4: Equipment and Instrument Qualification (IQ/OQ/PQ)

**Status:** Not implemented. LIMS planned (Phase 8) but no qualification record entity.  
**Priority:** Medium-High — prerequisite for LIMS Phase 8 and Annex 15 compliance.

### Regulatory Basis

EU GMP Annex 15 requires all equipment used in QC testing to be formally qualified:
- **IQ** (Installation Qualification): equipment installed per manufacturer specifications.
- **OQ** (Operational Qualification): equipment operates within defined parameters.
- **PQ** (Performance Qualification): equipment consistently produces acceptable results under routine conditions.
- Requalification required after significant maintenance, relocation, or failure.
- Calibration certificates must be linked and tracked for expiry.

### Migration

`V86__create_equipment_qualification.sql`

```sql
CREATE TYPE equipment_type AS ENUM (
  'BALANCE', 'HPLC', 'GC', 'UV_SPECTROPHOTOMETER', 'IR_SPECTROPHOTOMETER',
  'DISSOLUTION', 'PARTICLE_SIZE', 'KF_TITRATOR', 'PH_METER', 'TOC_ANALYZER',
  'STABILITY_CHAMBER', 'REFRIGERATOR', 'AUTOCLAVE', 'LAB_COMPUTER', 'OTHER'
);
CREATE TYPE equipment_status AS ENUM ('ACTIVE', 'UNDER_MAINTENANCE', 'RETIRED', 'PENDING_QUALIFICATION');
CREATE TYPE qualification_type AS ENUM ('IQ', 'OQ', 'PQ', 'REQUALIFICATION', 'CALIBRATION');
CREATE TYPE qualification_result AS ENUM ('PASS', 'FAIL', 'CONDITIONAL_PASS', 'PENDING');

CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id VARCHAR(50) UNIQUE NOT NULL,          -- EQ-HPLC-001
  name VARCHAR(255) NOT NULL,
  equipment_type equipment_type NOT NULL,
  manufacturer VARCHAR(255),
  model VARCHAR(255),
  serial_number VARCHAR(100),
  location VARCHAR(255) NOT NULL,                    -- Lab room/bench
  status equipment_status NOT NULL DEFAULT 'PENDING_QUALIFICATION',
  installation_date DATE,
  last_qualification_date DATE,
  next_qualification_due DATE,
  last_calibration_date DATE,
  next_calibration_due DATE,
  calibration_interval_months INT DEFAULT 12,
  responsible_analyst VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by VARCHAR(100),
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE equipment_qualification_record (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  qualification_type qualification_type NOT NULL,
  protocol_reference VARCHAR(255) NOT NULL,          -- SOP or protocol document number
  protocol_document_id UUID REFERENCES controlled_document(id),
  performed_by VARCHAR(100) NOT NULL,
  performed_at DATE NOT NULL,
  reviewed_by VARCHAR(100),
  reviewed_at DATE,
  result qualification_result NOT NULL DEFAULT 'PENDING',
  deviation_noted TEXT,
  next_requalification_due DATE,
  calibration_certificate_number VARCHAR(255),
  calibration_certificate_expiry DATE,
  report_document_id UUID REFERENCES controlled_document(id),
  e_signature_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### Backend

**Package:** `lims/equipment`

Entities: `Equipment`, `EquipmentQualificationRecord`

DTOs:
- `CreateEquipmentRequest`, `UpdateEquipmentRequest`
- `CreateQualificationRecordRequest`: `qualificationType`, `protocolReference`, `performedAt`, `result`, `nextRequalificationDue`, `calibrationCertificateNumber`, `calibrationCertificateExpiry`.
- `EquipmentResponse`: full fields + `calibrationOverdue: boolean`, `qualificationOverdue: boolean`, `daysUntilCalibrationDue: int`.
- `EquipmentSummary`: counts by status, overdue calibration count, overdue qualification count.

Service — `EquipmentService` / `EquipmentServiceImpl`:
- Auto-generate `equipmentId` = `"EQ-" + type abbreviation + "-" + sequence`.
- On qualification record approved (result PASS): update `equipment.lastQualificationDate`, `equipment.nextQualificationDue`, set status `ACTIVE`.
- On FAIL result: set equipment status `UNDER_MAINTENANCE`.
- `findCalibrationDueSoon(days)`, `findQualificationDueSoon(days)` for dashboard alerts.

Controller — `/api/equipment`:
- `GET /api/equipment?status=&type=`
- `POST /api/equipment`
- `GET /api/equipment/{id}`
- `PUT /api/equipment/{id}`
- `GET /api/equipment/{id}/qualifications`
- `POST /api/equipment/{id}/qualifications`
- `PUT /api/equipment/{id}/qualifications/{qrId}` (update result)
- `GET /api/equipment/summary`

### Frontend

Route: `/lims/equipment`  
Mockup: `core/ux-mockups/15-equipment-qualification.html`

Equipment list (left panel):
- KPI strip: Total Active, Calibration Due 30d, Qualification Due, Under Maintenance.
- Table: Equipment ID, Name, Type, Location, Status pill, Last Calibration, Next Calibration, Qualification Status.
- Color-coded rows: amber = due within 30d, red = overdue, green = current.

Equipment detail (right panel or full page):
- Header: equipment ID, name, type badge, status pill.
- Specs section: manufacturer, model, serial, location, responsible analyst.
- Qualification History tab: table of IQ/OQ/PQ records with result, date, protocol reference, reviewer.
- Calibration tab: calibration records with certificate number, expiry, document link.
- "Add Qualification Record" action (QC_MANAGER + SUPER_ADMIN).
- Audit timeline.

### Tests

- `POST /api/equipment` creates with auto-generated equipment ID.
- Approved PQ record updates `equipment.status` to `ACTIVE` and sets `nextQualificationDue`.
- Failed qualification sets status to `UNDER_MAINTENANCE`.
- `GET /api/equipment/summary` returns correct overdue counts.

### Done Means

- Every QC instrument/equipment has a traceable IQ/OQ/PQ qualification history.
- Calibration and requalification due dates surface in dashboard alerts.
- Equipment qualification records link to controlling SOPs via `ControlledDocument`.
- EU GMP Annex 15 equipment qualification requirement is met.
