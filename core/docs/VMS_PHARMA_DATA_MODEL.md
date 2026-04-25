# Pharma Vendor Management System — Full Data Model & Design

**Module:** Master Data → Partners → Vendors + Vendor Business Units  
**Context:** In pharma, regulatory qualification happens at the **manufacturing site** level, not the corporate vendor level.  
**Date:** April 2026

---

## The Core Concept: Why Vendor ≠ Vendor Business Unit

In GMP pharma, a vendor (company) can operate **multiple manufacturing sites**. Each site is independently:
- GMP certified (site-specific certificate, site-specific audit)
- Qualified by your QA team (site audit, approval)
- Approved to supply specific materials (Approved Vendor List per site)
- Tracked for quality performance (rejections, CAPAs, delivery data)

**Example:**
```
Sun Pharma Ltd.  (Vendor — corporate entity)
├── Sun Pharma - Ankleshwar API Plant       (VBU 1 — WHO-GMP, API only)
├── Sun Pharma - Halol Formulations Plant   (VBU 2 — USFDA registered)
└── Sun Pharma - Panoli Packaging Division  (VBU 3 — packaging only)
```

A GRN is received from **VBU 1** (a specific site), not from "Sun Pharma" generically.  
A site audit is conducted at **VBU 2**, not at the corporate level.

---

## Entity Relationship

```
Vendor (1) ──────────────── (*) VendorBusinessUnit
                                    │
                     ┌──────────────┼──────────────┐
                     │              │               │
              VendorDocument   VendorAudit   ApprovedMaterial
             (certs, licenses) (audit history) (AVL — BU × Material)
                                    │
                               VendorCapa
                             (CAPA per audit)
```

GRN links to **VendorBusinessUnit**, not Vendor directly.

---

## 1. Vendor (Corporate Entity)

> Represents the company. Holds corporate identity, contact, and financial terms.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | PK |
| `vendorCode` | VARCHAR(100) | Yes | Unique, e.g. VEN-0042 |
| `vendorName` | VARCHAR(200) | Yes | Legal company name |
| `vendorCategory` | ENUM | Yes | See below |
| `corporateAddress` | TEXT | No | Registered office address |
| `city` | VARCHAR(100) | No | |
| `state` | VARCHAR(100) | No | |
| `country` | VARCHAR(100) | No | Country of origin |
| `pincode` | VARCHAR(20) | No | |
| `website` | VARCHAR(255) | No | |
| `gstin` | VARCHAR(15) | No | India GST number |
| `pan` | VARCHAR(10) | No | India PAN |
| `contactPerson` | VARCHAR(255) | No | Primary contact name |
| `email` | VARCHAR(255) | No | |
| `phone` | VARCHAR(50) | No | |
| `paymentTermsDays` | INTEGER | No | e.g. 30, 45, 60 |
| `isApproved` | BOOLEAN | Yes | True if ≥1 VBU is qualified |
| `isActive` | BOOLEAN | Yes | False = suspended |
| `createdBy` | VARCHAR(100) | Yes | |
| `createdAt` | TIMESTAMP | Yes | |
| `updatedBy` | VARCHAR(100) | No | |
| `updatedAt` | TIMESTAMP | No | |

### vendorCategory Enum
```java
public enum VendorCategory {
    API_SUPPLIER,          // Active Pharmaceutical Ingredient
    EXCIPIENT_SUPPLIER,    // Binders, fillers, coatings
    SOLVENT_SUPPLIER,      // Organic/inorganic solvents
    PACKAGING_SUPPLIER,    // Primary/secondary packaging
    LABELING_SUPPLIER,     // Labels, inserts
    TESTING_LAB,           // Contract analytical/testing labs
    EQUIPMENT_SUPPLIER     // Machinery (optional)
}
```

---

## 2. VendorBusinessUnit (Manufacturing Site)

> Represents a specific manufacturing/testing site. All GMP qualification, audits, documents, and performance tracking happen here.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | PK |
| `vendorId` | UUID | Yes | FK → Vendor |
| `buCode` | VARCHAR(100) | Yes | Unique, e.g. VEN-0042-BU-01 |
| `buName` | VARCHAR(200) | Yes | Site name, e.g. "Ankleshwar API Plant" |
| `siteType` | ENUM | Yes | See below |
| `address` | TEXT | No | Physical site address |
| `city` | VARCHAR(100) | No | |
| `state` | VARCHAR(100) | No | |
| `country` | VARCHAR(100) | No | |
| `pincode` | VARCHAR(20) | No | |
| `siteContactPerson` | VARCHAR(255) | No | Site QA/procurement contact |
| `siteEmail` | VARCHAR(255) | No | |
| `sitePhone` | VARCHAR(50) | No | |
| `drugLicenseNumber` | VARCHAR(100) | No | India: Form 28 / CDSCO |
| `drugLicenseExpiry` | DATE | No | |
| `gmpCertBody` | VARCHAR(100) | No | WHO, USFDA, EU-EMA, TGA, etc. |
| `gmpCertNumber` | VARCHAR(100) | No | |
| `gmpCertExpiry` | DATE | No | Red alert if expired |
| `isWhoGmpCertified` | BOOLEAN | No | Quick filter flag |
| `isUsfda` | BOOLEAN | No | |
| `isEuGmp` | BOOLEAN | No | |
| `qualificationStatus` | ENUM | Yes | See below |
| `qualifiedDate` | DATE | No | Date QA first approved this site |
| `nextRequalificationDue` | DATE | No | Typically qualifiedDate + 2 years |
| `lastAuditDate` | DATE | No | Auto-updated from VendorAudit |
| `qaRating` | NUMERIC(3,1) | No | 0.0 – 5.0 |
| `deliveryScore` | NUMERIC(5,2) | No | % on-time delivery |
| `rejectionRate` | NUMERIC(5,2) | No | % rejected batches (12-month rolling) |
| `openCapaCount` | INTEGER | No | Count of open CAPAs |
| `isApproved` | BOOLEAN | Yes | Site-level qualification approval |
| `isActive` | BOOLEAN | Yes | |
| `createdBy` | VARCHAR(100) | Yes | |
| `createdAt` | TIMESTAMP | Yes | |
| `updatedBy` | VARCHAR(100) | No | |
| `updatedAt` | TIMESTAMP | No | |

### siteType Enum
```java
public enum SiteType {
    MANUFACTURING,      // Primary drug manufacturing
    TESTING_LAB,        // Analytical/QC testing
    PACKAGING,          // Secondary/tertiary packaging
    DISTRIBUTION,       // Warehousing & distribution
    CORPORATE_OFFICE    // Admin only, no manufacturing
}
```

### qualificationStatus Enum
```java
public enum QualificationStatus {
    NOT_STARTED,              // Newly added, no process begun
    APPLICATION_SUBMITTED,    // Questionnaire received
    DOCUMENT_REVIEW,          // QA reviewing certs/licenses
    AUDIT_SCHEDULED,          // Site audit booked
    AUDIT_IN_PROGRESS,        // Audit ongoing
    CAPA_PENDING,             // Audit done, awaiting CAPA closure
    QUALIFIED,                // Fully approved, on AVL
    RE_QUALIFICATION_DUE,     // Past nextRequalificationDue
    SUSPENDED,                // Quality issue — site suspended
    DISQUALIFIED              // Permanently removed from AVL
}
```

---

## 3. VendorDocument (Per Business Unit)

> GMP certificates, drug licenses, quality agreements — all site-specific.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `buId` | UUID | Yes | FK → VendorBusinessUnit |
| `documentType` | ENUM | Yes | See below |
| `documentTitle` | VARCHAR(255) | Yes | |
| `fileName` | VARCHAR(255) | Yes | Original file name |
| `storagePath` | VARCHAR(500) | Yes | Local path or S3 key |
| `uploadedAt` | DATE | Yes | |
| `expiryDate` | DATE | No | Null = no expiry |
| `status` | ENUM | Yes | VALID / EXPIRING_SOON / EXPIRED |
| `uploadedBy` | VARCHAR(100) | Yes | |

### documentType Enum
```java
public enum DocumentType {
    GMP_CERTIFICATE,          // WHO-GMP, USFDA, EU-GMP
    DRUG_MANUFACTURING_LICENSE,
    COA_TEMPLATE,             // Certificate of Analysis sample
    MSDS,                     // Material Safety Data Sheet
    VENDOR_QUESTIONNAIRE,     // Self-assessment form
    SITE_MASTER_FILE,         // SMF / Dossier
    QUALITY_AGREEMENT,        // Bilateral QA contract
    NDA,                      // Confidentiality agreement
    AVL_AGREEMENT,            // Approved Vendor List contract
    AUDIT_REPORT              // Post-audit report
}
```

**Status auto-logic:**
- `VALID` — expiryDate is null or > today + 60 days
- `EXPIRING_SOON` — expiryDate within 60 days
- `EXPIRED` — expiryDate < today

---

## 4. VendorAudit (Per Business Unit)

> Full audit history per site. Drives qualification workflow step dates and next requalification.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `buId` | UUID | Yes | FK → VendorBusinessUnit |
| `auditType` | ENUM | Yes | See below |
| `scheduledDate` | DATE | Yes | |
| `completedDate` | DATE | No | Filled when audit closes |
| `auditedBy` | VARCHAR(255) | Yes | QA officer name |
| `status` | ENUM | Yes | SCHEDULED / IN_PROGRESS / COMPLETED / CANCELLED |
| `outcome` | ENUM | No | Null until completed |
| `observationCount` | INTEGER | No | Total observations raised |
| `criticalObservationCount` | INTEGER | No | Critical findings |
| `notes` | TEXT | No | Summary/remarks |
| `createdAt` | TIMESTAMP | Yes | |

### auditType Enum
```java
public enum AuditType {
    INITIAL_QUALIFICATION,   // First-ever audit for new vendor
    PERIODIC,                // Scheduled requalification (every 2 yrs)
    FOR_CAUSE,               // Triggered by quality event / complaint
    POST_CAPA,               // Follow-up after CAPA closure
    REMOTE                   // Document-based review (no site visit)
}
```

### outcome Enum
```java
public enum AuditOutcome {
    APPROVED,                       // No major findings
    APPROVED_WITH_OBSERVATIONS,     // Minor issues, CAPA required
    REJECTED,                       // Critical findings, not qualified
    PENDING_CAPA                    // Decision deferred pending CAPA
}
```

**On audit completion — auto-update:**
- If outcome = `APPROVED` or `APPROVED_WITH_OBSERVATIONS`:
  - Set `VendorBusinessUnit.lastAuditDate = completedDate`
  - Set `VendorBusinessUnit.nextRequalificationDue = completedDate + 2 years`
  - Set `VendorBusinessUnit.qualificationStatus = QUALIFIED`

---

## 5. ApprovedMaterial (Approved Vendor List — Per BU × Material)

> The AVL (Approved Vendor List) — which BU is approved to supply which material.  
> This is the core compliance record in pharma procurement.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `buId` | UUID | Yes | FK → VendorBusinessUnit |
| `materialId` | UUID | Yes | FK → Material |
| `approvedDate` | DATE | Yes | Date QA approved this combination |
| `validUntil` | DATE | No | Null = indefinite (until next audit) |
| `approvedBy` | VARCHAR(100) | Yes | QA officer |
| `status` | ENUM | Yes | APPROVED / SUSPENDED / WITHDRAWN |
| `notes` | TEXT | No | e.g. "Only batch size ≤ 500 kg" |
| `createdAt` | TIMESTAMP | Yes | |

**Business rule:** A GRN can only be created if the selected VBU has an `APPROVED` `ApprovedMaterial` record for the material being received.

---

## 6. VendorCapa (Optional — CAPA per Audit)

> Corrective and Preventive Action tracking. Linked to an audit observation.

### Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `id` | UUID | Yes | |
| `buId` | UUID | Yes | FK → VendorBusinessUnit |
| `auditId` | UUID | No | FK → VendorAudit (nullable for non-audit CAPAs) |
| `capaNumber` | VARCHAR(50) | Yes | e.g. CAPA-2026-004 |
| `observationRef` | VARCHAR(100) | No | Audit observation number |
| `description` | TEXT | Yes | What went wrong |
| `rootCause` | TEXT | No | Root cause analysis |
| `correctiveAction` | TEXT | No | Immediate fix |
| `preventiveAction` | TEXT | No | Long-term prevention |
| `dueDate` | DATE | Yes | |
| `closedDate` | DATE | No | Null = still open |
| `status` | ENUM | Yes | OPEN / IN_PROGRESS / CLOSED / OVERDUE |
| `createdBy` | VARCHAR(100) | Yes | |
| `createdAt` | TIMESTAMP | Yes | |

---

## Qualification Workflow (4 Steps — per VBU)

```
Step 1              Step 2              Step 3              Step 4
─────────────       ─────────────       ─────────────       ─────────────
Vendor              Document            Site Audit          QA Approved
Application         Review              QA Visit            (On AVL)
─────────────       ─────────────       ─────────────       ─────────────
qualStatus =        qualStatus =        qualStatus =        qualStatus =
APPLICATION_        DOCUMENT_           AUDIT_              QUALIFIED
SUBMITTED           REVIEW              SCHEDULED /
                                        IN_PROGRESS /
                                        CAPA_PENDING
```

Step dates are derived from `VendorAudit` records:
- Step 1 date = `VendorBusinessUnit.createdAt`
- Step 2 date = first `VendorDocument` of type `VENDOR_QUESTIONNAIRE`
- Step 3 date = `VendorAudit` with type `INITIAL_QUALIFICATION`
- Step 4 date = `VendorAudit.completedDate` where outcome = `APPROVED`

---

## GRN Linkage

Current: `GRN.vendorId` → Vendor (corporate)  
**Needed:** `GRN.buId` → VendorBusinessUnit (specific site)

**Why:** Regulatory traceability requires knowing *which plant* produced and shipped the material, not just which company.

**Migration path:**
1. Add `bu_id` column to `grn` table (nullable initially)
2. Add `vendorId` foreign key reference from VBU for backward compatibility
3. GRN form — when vendor is selected, show BU dropdown filtered by that vendor's qualified BUs
4. Enforce AVL check: warn/block if selected BU+Material is not in `approved_material`

---

## What's Currently Built vs What's Missing

### Vendor Entity — Current vs Target

| Field | Current | Need |
|---|---|---|
| vendorCode, vendorName | ✅ | — |
| contactPerson, email, phone | ✅ | — |
| isApproved, isActive | ✅ | — |
| **vendorCategory** | ❌ Missing | ENUM column |
| **corporateAddress, city, state, country** | ❌ Missing | Address fields |
| **gstin, pan** | ❌ Missing | India compliance |
| **website, paymentTermsDays** | ❌ Missing | Commercial info |

### VendorBusinessUnit Entity — Current vs Target

| Field | Current | Need |
|---|---|---|
| vendorId (FK) | ✅ | — |
| unitName | ✅ | — |
| address, city, state, country | ✅ | — |
| **buCode** | ❌ Missing | Unique site code |
| **siteType** | ❌ Missing | ENUM |
| **siteContactPerson, siteEmail, sitePhone** | ❌ Missing | |
| **drugLicenseNumber, drugLicenseExpiry** | ❌ Missing | India compliance |
| **gmpCertBody, gmpCertNumber, gmpCertExpiry** | ❌ Missing | GMP tracking |
| **isWhoGmpCertified, isUsfda, isEuGmp** | ❌ Missing | Quick filter flags |
| **qualificationStatus** | ❌ Missing | ENUM workflow state |
| **qualifiedDate, nextRequalificationDue** | ❌ Missing | |
| **lastAuditDate** | ❌ Missing | |
| **qaRating, deliveryScore, rejectionRate** | ❌ Missing | |
| **openCapaCount** | ❌ Missing | |
| **isApproved** | ❌ Missing | Site-level approval |

### Entities Completely Missing

| Entity | Purpose |
|---|---|
| `VendorDocument` | GMP certs, drug licenses, quality agreements per site |
| `VendorAudit` | Site audit history and scheduling |
| `ApprovedMaterial` | AVL — which BU can supply which material |
| `VendorCapa` | CAPA tracking per audit (optional Phase) |

---

## Phased Implementation Order

| Phase | Scope | Effort |
|---|---|---|
| **A** | Add `vendorCategory` to Vendor + filter tabs in UI | 0.5 day |
| **B** | Expand VendorBU — add buCode, siteType, siteContact, GMP fields, qualificationStatus | 1 day |
| **C** | VendorDocument entity + upload UI per BU | 1.5 days |
| **D** | VendorAudit entity + Schedule Audit modal + qualification workflow dates | 1.5 days |
| **E** | ApprovedMaterial (AVL) entity + enforcement in GRN | 1 day |
| **F** | GRN → BU linkage (add `buId` to GRN) | 1 day |
| **G** | VendorCapa entity + CAPA tracking UI | 1.5 days |
| **H** | Performance metrics dashboard (deliveryScore, rejectionRate trend) | 1 day |

**Total: ~9 days**

---

## Key Business Rules (Pharma-Specific)

1. **A GRN must link to a VBU, not just a Vendor.**
2. **A VBU can only receive a material if there is an APPROVED ApprovedMaterial record** (AVL check).
3. **GMP certificate expiry = site disqualification.** Auto-flag VBU when `gmpCertExpiry < today`.
4. **Qualification expires.** If `nextRequalificationDue < today`, set `qualificationStatus = RE_QUALIFICATION_DUE` and block new GRNs.
5. **Each VBU has its own qualification workflow**, independent of the parent Vendor or sibling VBUs.
6. **Drug license must be valid** at the time of GRN (India regulatory requirement).
7. **Open CAPAs can block re-qualification.** A site with `openCapaCount > 0` from a critical finding should not pass Step 4.
8. **Vendor-level approval** is derived — `Vendor.isApproved = true` if at least one VBU has `qualificationStatus = QUALIFIED`.

---

## Files to Create/Modify

### Backend
```
masterdata/vendor/
├── entity/Vendor.java                        → Add category, address, gstin, pan, website, paymentTermsDays
└── dto/VendorRequest.java                    → Add new fields

masterdata/vendorbusinessunit/
├── entity/VendorBusinessUnit.java            → Add buCode, siteType, GMP fields, qualification fields
├── entity/VendorDocument.java                (NEW)
├── entity/VendorAudit.java                   (NEW)
├── entity/ApprovedMaterial.java              (NEW)
├── entity/VendorCapa.java                    (NEW — optional)
├── dto/...                                   (NEW for each entity)
├── controller/VendorBusinessUnitController   → Expand with new endpoints
└── repository/...                            (NEW for each entity)

db/migration/
├── V{n}__add_vendor_category_address.sql
├── V{n}__expand_vendor_bu.sql
├── V{n}__create_vendor_document.sql
├── V{n}__create_vendor_audit.sql
├── V{n}__create_approved_material.sql
└── V{n}__create_vendor_capa.sql
```

### Frontend
```
ui/src/
├── types/vendor.ts                           → Add category, address fields
├── types/vendorbu.ts                         (NEW — full VBU type with all new fields)
├── features/master-data/partners/
│   ├── VendorsPage.tsx                       → Category filter, derived isApproved logic
│   ├── VendorFormDrawer.tsx                  → Add category dropdown, address fields
│   ├── VendorBUsPage.tsx                     → Full redesign (currently just placeholder)
│   ├── VendorBUFormDrawer.tsx                (NEW — add/edit BU with GMP fields)
│   ├── VendorBUDetailPanel.tsx               (NEW — docs, audits, AVL, CAPAs)
│   └── ScheduleAuditModal.tsx                (NEW)
└── lib/api.ts                                → New API calls for BU, docs, audits, AVL
```
