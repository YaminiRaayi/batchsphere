# Supplier Module Enhancement Requirements

## Context

Current `Supplier` entity is a thin contact card — code, name, contact, email, phone, isActive.
In the GRN model, `supplierId` represents the **manufacturer** of the material (distinct from `vendorId` = commercial purchaser).
That distinction is correct for pharma but the entity has no pharma-relevant data to back it up.

---

## New Enums Required

### `SupplierType`
```java
package com.batchsphere.core.masterdata.supplier.entity;

public enum SupplierType {
    MANUFACTURER,
    CONTRACT_MANUFACTURER,
    DISTRIBUTOR,
    BROKER
}
```

**Why:** ICH Q7 requires different qualification depth per type. A manufacturer site requires a physical audit; a broker requires document qualification only.

### `SupplierQualificationStatus`
```java
package com.batchsphere.core.masterdata.supplier.entity;

public enum SupplierQualificationStatus {
    PENDING_QUALIFICATION,
    QUALIFIED,
    CONDITIONALLY_QUALIFIED,
    SUSPENDED,
    DISQUALIFIED
}
```

**Why:** `isActive` boolean is not sufficient for pharma. A `SUSPENDED` or `DISQUALIFIED` supplier should block new GRN creation. A `CONDITIONALLY_QUALIFIED` supplier may be allowed with extra CoA review. These states are meaningfully different — collapsing them to a boolean loses traceability.

---

## Entity Changes — `Supplier.java`

Add the following fields to the existing entity:

```java
@Enumerated(EnumType.STRING)
@Column(name = "supplier_type", length = 50)
private SupplierType supplierType;

@Enumerated(EnumType.STRING)
@Column(name = "qualification_status", length = 50, nullable = false)
private SupplierQualificationStatus qualificationStatus;

@Column(name = "country_of_manufacture", length = 100)
private String countryOfManufacture;

@Column(name = "gmp_cert_number", length = 100)
private String gmpcertNumber;

@Column(name = "gmp_cert_issuing_authority", length = 200)
private String gmpcertIssuingAuthority;   // e.g. WHO-GMP, USFDA, EU-GMP, Schedule-M

@Column(name = "gmp_cert_expiry_date")
private LocalDate gmpcertExpiryDate;

@Column(name = "approved_since")
private LocalDate approvedSince;

@Column(name = "last_audit_date")
private LocalDate lastAuditDate;

@Column(name = "next_audit_due")
private LocalDate nextAuditDue;

@Column(name = "rejection_rate", precision = 5, scale = 2)
private BigDecimal rejectionRate;

@Column(name = "open_capa_count")
private Integer openCapaCount;
```

**Default on create:** `qualificationStatus = PENDING_QUALIFICATION`

---

## DTO Changes

### `SupplierRequest.java` — add fields

```java
private SupplierType supplierType;                    // required
private SupplierQualificationStatus qualificationStatus;  // optional, defaults to PENDING_QUALIFICATION
private String countryOfManufacture;
private String gmpcertNumber;
private String gmpcertIssuingAuthority;
private LocalDate gmpcertExpiryDate;
private LocalDate approvedSince;
private LocalDate lastAuditDate;
private LocalDate nextAuditDue;
```

### `SupplierResponse.java` — create new response DTO

Controller currently returns entity directly. Create a proper response DTO that includes all fields including the new ones.

```java
package com.batchsphere.core.masterdata.supplier.dto.supplier.dto;

// All existing fields +
private SupplierType supplierType;
private SupplierQualificationStatus qualificationStatus;
private String countryOfManufacture;
private String gmpcertNumber;
private String gmpcertIssuingAuthority;
private LocalDate gmpcertExpiryDate;
private LocalDate approvedSince;
private LocalDate lastAuditDate;
private LocalDate nextAuditDue;
private BigDecimal rejectionRate;
private Integer openCapaCount;
```

Update `SupplierService` interface and `SupplierController` to return `SupplierResponse` instead of `Supplier` entity.

---

## Service Logic Changes

### `createSupplier` in `SupplierServiceImpl`
- If `qualificationStatus` not provided → default to `PENDING_QUALIFICATION`
- Map all new fields from request to entity

### `updateSupplier`
- Allow updating all new fields including `qualificationStatus`

### GRN validation (future enforcement)
When creating a GRN, check:
```
supplier.qualificationStatus NOT IN (SUSPENDED, DISQUALIFIED)
```
If check fails → throw `BusinessRuleException("Supplier is not qualified for receipt")`

---

## Flyway Migration — `V56__enhance_supplier_pharma_fields.sql`

```sql
ALTER TABLE supplier
    ADD COLUMN supplier_type          VARCHAR(50),
    ADD COLUMN qualification_status   VARCHAR(50) NOT NULL DEFAULT 'PENDING_QUALIFICATION',
    ADD COLUMN country_of_manufacture VARCHAR(100),
    ADD COLUMN gmp_cert_number        VARCHAR(100),
    ADD COLUMN gmp_cert_issuing_authority VARCHAR(200),
    ADD COLUMN gmp_cert_expiry_date   DATE,
    ADD COLUMN approved_since         DATE,
    ADD COLUMN last_audit_date        DATE,
    ADD COLUMN next_audit_due         DATE,
    ADD COLUMN rejection_rate         NUMERIC(5,2),
    ADD COLUMN open_capa_count        INTEGER DEFAULT 0;
```

---

## Frontend Changes

### `types/supplier.ts`

Update `Supplier` type and `CreateSupplierRequest` type:

```ts
export type SupplierType =
  | 'MANUFACTURER'
  | 'CONTRACT_MANUFACTURER'
  | 'DISTRIBUTOR'
  | 'BROKER';

export type SupplierQualificationStatus =
  | 'PENDING_QUALIFICATION'
  | 'QUALIFIED'
  | 'CONDITIONALLY_QUALIFIED'
  | 'SUSPENDED'
  | 'DISQUALIFIED';

export type Supplier = {
  id: string;
  supplierCode: string;
  supplierName: string;
  contactPerson: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  supplierType: SupplierType | null;
  qualificationStatus: SupplierQualificationStatus;
  countryOfManufacture: string | null;
  gmpcertNumber: string | null;
  gmpcertIssuingAuthority: string | null;
  gmpcertExpiryDate: string | null;   // ISO date string
  approvedSince: string | null;
  lastAuditDate: string | null;
  nextAuditDue: string | null;
  rejectionRate: number | null;
  openCapaCount: number | null;
  createdBy: string;
  createdAt: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type CreateSupplierRequest = {
  supplierCode: string;
  supplierName: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  supplierType?: SupplierType;
  qualificationStatus?: SupplierQualificationStatus;
  countryOfManufacture?: string;
  gmpcertNumber?: string;
  gmpcertIssuingAuthority?: string;
  gmpcertExpiryDate?: string;
  approvedSince?: string;
  lastAuditDate?: string;
  nextAuditDue?: string;
  createdBy: string;
};
```

### `MasterDataPage.tsx` — form additions

#### `createInitialSupplierForm` — add new fields with defaults:
```ts
supplierType: "" as SupplierType | "",
qualificationStatus: "PENDING_QUALIFICATION" as SupplierQualificationStatus,
countryOfManufacture: "",
gmpcertNumber: "",
gmpcertIssuingAuthority: "",
gmpcertExpiryDate: "",
approvedSince: "",
lastAuditDate: "",
nextAuditDue: "",
```

#### `startEditingSupplier` — map new fields from existing record:
```ts
supplierType: supplier.supplierType ?? "",
qualificationStatus: supplier.qualificationStatus ?? "PENDING_QUALIFICATION",
countryOfManufacture: supplier.countryOfManufacture ?? "",
gmpcertNumber: supplier.gmpcertNumber ?? "",
gmpcertIssuingAuthority: supplier.gmpcertIssuingAuthority ?? "",
gmpcertExpiryDate: supplier.gmpcertExpiryDate ?? "",
approvedSince: supplier.approvedSince ?? "",
lastAuditDate: supplier.lastAuditDate ?? "",
nextAuditDue: supplier.nextAuditDue ?? "",
```

#### `handleSubmit` payload — include new fields:
```ts
supplierType: form.supplierType || undefined,
qualificationStatus: form.qualificationStatus || undefined,
countryOfManufacture: form.countryOfManufacture?.trim() || undefined,
gmpcertNumber: form.gmpcertNumber?.trim() || undefined,
gmpcertIssuingAuthority: form.gmpcertIssuingAuthority?.trim() || undefined,
gmpcertExpiryDate: form.gmpcertExpiryDate || undefined,
approvedSince: form.approvedSince || undefined,
lastAuditDate: form.lastAuditDate || undefined,
nextAuditDue: form.nextAuditDue || undefined,
```

#### New form fields to add in JSX (after phone field, before createdBy):

```
Row 1: Supplier Type (select, required) | Qualification Status (select)
Row 2: Country of Manufacture (text)
Row 3: GMP Cert Number (text) | GMP Cert Issuing Authority (text)
Row 4: GMP Cert Expiry Date (date) | Approved Since (date)
Row 5: Last Audit Date (date) | Next Audit Due (date)
```

GMP Cert Issuing Authority hint/placeholder: `WHO-GMP / USFDA / EU-GMP / Schedule-M`

#### Table display (registry popup) — update columns:

| Code | Name | Type | Status | GMP Cert Expiry | Actions |

Status badge colors:
- `QUALIFIED` → green (`moss`)
- `CONDITIONALLY_QUALIFIED` → yellow/amber
- `PENDING_QUALIFICATION` → gray
- `SUSPENDED` → orange
- `DISQUALIFIED` → red (`redoxide`)

---

## Qualification Status Badge — Suggested Labels

| Status | Display label | Color |
|---|---|---|
| PENDING_QUALIFICATION | Pending | gray |
| QUALIFIED | Qualified | green |
| CONDITIONALLY_QUALIFIED | Conditional | amber |
| SUSPENDED | Suspended | orange |
| DISQUALIFIED | Disqualified | red |

---

## GRN Enforcement (Optional — future)

After supplier qualification is in place, add a guard in `GrnServiceImpl.createGrn()`:

```java
Supplier supplier = supplierRepository.findById(request.getSupplierId())
    .orElseThrow(() -> new ResourceNotFoundException("Supplier not found"));

if (supplier.getQualificationStatus() == SupplierQualificationStatus.SUSPENDED
    || supplier.getQualificationStatus() == SupplierQualificationStatus.DISQUALIFIED) {
    throw new BusinessRuleException(
        "Supplier " + supplier.getSupplierCode() + " is not qualified for receipt (status: "
        + supplier.getQualificationStatus() + ")");
}
```

---

## Related Documents

- [PHARMA_IMPROVEMENTS_AND_ROADMAP.md](PHARMA_IMPROVEMENTS_AND_ROADMAP.md)
- [NEXT_MODULES_ARCHITECTURE.md](NEXT_MODULES_ARCHITECTURE.md)
