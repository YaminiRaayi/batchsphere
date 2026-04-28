# Spec and Method of Analysis (MOA) Design

Last updated: 2026-04-25
Research expanded: 2026-04-25 — multi-region regulatory framework added

## Purpose

This document defines the pharma-aligned design for `Specification` and `Method of Analysis` in BatchSphere.

It covers:

- regulatory requirements for specifications and analytical methods
- what spec and MOA mean in practice for incoming raw material QC
- how they link to sampling
- what the current backend already has and what is missing
- the recommended entity model, including the critical missing `SpecParameter` concept
- API and UI design direction
- phase mapping aligned to the existing QC sampling plan

This is a design document to guide the next implementation phase.

---

## Regulatory Basis

### ICH Q6A — Specifications: Test Procedures and Acceptance Criteria for New Drug Substances

ICH Q6A is the primary global standard for material and product specifications.

Key definitions:

- A **specification** is a list of tests, references to analytical procedures, and appropriate acceptance criteria.
- Specifications establish the criteria to which a material must conform to be considered acceptable for its intended use.
- Acceptance criteria can be: numerical limits, ranges, or other criteria.

ICH Q6A defines required test categories for drug substances (APIs):

| Test Category | Examples |
|---|---|
| Description / Appearance | color, form, odor |
| Identity | IR, UV, chemical test, HPLC RT |
| Assay | HPLC, UV, titration |
| Impurities | related substances, residual solvents, heavy metals |
| Physical | particle size, bulk density, water content, LOD |
| Microbiological | total aerobic count, yeasts/molds, specified organisms |

Source: https://www.ich.org/page/quality-guidelines

### ICH Q6B — Specifications for Biotechnological/Biological Products

Similar structure to Q6A but for biologics.

### EU GMP Chapter 6 — Quality Control

EU GMP Chapter 6, Section 6.20–6.26 states:

- Specifications shall be approved, signed, and dated by authorized personnel, including the QC head.
- Specifications for starting and packaging materials shall be available and reviewed periodically.
- Initial and periodic revision of specifications shall follow relevant pharmacopoeia monographs.
- Reference standards (primary and working) shall be established and documented.
- Sampling, testing, and release must follow written approved procedures.

Source: https://health.ec.europa.eu/system/files/2016-11/mallet_gmp_chapter_6_0.pdf

### ICH Q2(R1) — Validation of Analytical Procedures

Every MOA used to test against a specification must be validated.

ICH Q2 defines the analytical performance characteristics that must be validated:

| Characteristic | Required for Assay | Required for Impurities | Required for Identification |
|---|---|---|---|
| Specificity | Yes | Yes | Yes |
| Linearity | Yes | Yes | No |
| Range | Yes | Yes | No |
| Accuracy | Yes | Yes | No |
| Precision (Repeatability) | Yes | Yes | No |
| Precision (Intermediate) | Yes | Yes | No |
| Limit of Detection | No | Yes | No |
| Limit of Quantitation | No | Yes | No |
| Robustness | Yes | Yes | No |

Source: https://www.ich.org/page/quality-guidelines

### USP General Chapter <1225> — Validation of Compendial Procedures

The USP equivalent of ICH Q2. Defines the same analytical performance parameters for compendial methods.

### Ph. Eur. 2.2 Series — Analytical Methods

European Pharmacopoeia Chapter 2.2 series defines validated compendial methods including:

- 2.2.29 — Liquid chromatography (HPLC)
- 2.2.27 — Gas chromatography
- 2.2.48 — Raman spectroscopy
- 2.2.10 — Potentiometric determination of pH
- 2.2.32 — Loss on drying
- 2.6 series — Microbiological examination

### USP <61>, <62> — Microbiological Limits

Defines TAMC (Total Aerobic Microbial Count), TYMC (Total Yeast and Mold Count), and specified microorganism testing requirements.

### ICH Q3C — Residual Solvents

Defines limits for residual solvents in drug substances and excipients.

### ICH Q3D — Elemental Impurities

Defines permitted daily exposures for elemental impurities including heavy metals.

---

## Multi-Region Regulatory Framework

### The Short Answer

BatchSphere should NOT be designed for one country's laws.

The correct answer is:

> **Design to ICH as the backbone. Support multiple pharmacopoeias as configurable references. Add `targetMarket` to Spec so each spec declares which regulatory region it targets.**

Reason: ICH (International Council for Harmonisation) is the global harmonization framework. It is adopted by the EU, US FDA, Japan PMDA, Canada, UK, Switzerland, South Korea, Australia, Singapore, China, and Brazil. Designing to ICH means the core logic is already valid across 60+ markets.

What differs between markets is:

- **pharmacopoeia-specific acceptance criteria** for the same test and material
- **sampling rules** for identity testing
- **OOS investigation procedures**
- **microbiological limit categories and test procedures**
- **heavy metal and elemental impurity methods** (transition from old colorimetric to ICH Q3D/ICP-MS)

---

### ICH as the Global Backbone

ICH is not a country's law. It is a multilateral harmonization initiative whose guidelines are adopted as binding guidance by:

| Authority | Region |
|---|---|
| EMA | European Union |
| FDA | United States |
| PMDA | Japan |
| Health Canada | Canada |
| MHRA | United Kingdom |
| Swissmedic | Switzerland |
| TGA | Australia |
| NMPA | China (joined 2017, implementing) |
| CDSCO / DCGI | India (adhering member since 2016) |
| ANVISA | Brazil (observer/affiliated) |

ICH guidelines relevant to Spec and MOA:

| Guideline | Scope |
|---|---|
| ICH Q6A | Specifications for new drug substances (APIs) |
| ICH Q6B | Specifications for biologics |
| ICH Q2(R1) | Analytical method validation |
| ICH Q3C | Residual solvents limits |
| ICH Q3D | Elemental impurities (heavy metals) — new PDE-based approach |
| ICH Q8 | Pharmaceutical development — links spec to process design space |
| ICH Q9 | Quality risk management — applies to spec setting |
| ICH Q10 | Pharmaceutical quality system — governs spec lifecycle |

---

### Region-by-Region: Laws and Pharmacopoeias

#### EU — EMA / EU GMP / Ph. Eur.

- **GMP Law**: EudraLex Volume 4, EU GMP Chapters 1–9 and Annexes
- **Pharmacopoeia**: European Pharmacopoeia (Ph. Eur.), published by EDQM (Council of Europe, not just EU)
- **Key requirement**: EU GMP Chapter 6 mandates written and approved specifications. If a Ph. Eur. monograph exists for the material, the spec must at minimum comply with it.
- **Sampling rule**: EU GMP Annex 8 — identity must be tested from ALL containers for starting materials unless a validated reduced-sampling procedure is justified. SQRT(n)+1 is only acceptable after supplier qualification.
- **Acceptance criteria**: Ph. Eur. values are binding in EU. Different from USP for the same material.
- **Microbiological limits**: Ph. Eur. 5.1.4 (categories 1, 2, 3A, 3B, 4) + 2.6.12 / 2.6.13. Different from USP <61>/<62>.
- **Heavy metals**: Transitioning from old Ph. Eur. 2.4.8 (colorimetric) to ICH Q3D / Ph. Eur. 2.4.20 (ICP-MS). Many specs still use old method.
- **OOS**: EU GMP Chapter 6.33 — written OOS procedure required. Investigation required before result invalidation.

#### USA — FDA / 21 CFR / USP

- **GMP Law**: 21 CFR Part 211 (finished pharmaceuticals), 21 CFR Part 212 (positronium), 21 CFR Part 314 (NDA/ANDA)
- **Pharmacopoeia**: USP-NF (United States Pharmacopeia and National Formulary)
- **Key requirement**: 21 CFR 211.84 requires testing of each shipment of each component. Identity for every container or statistically valid sampling plan.
- **Sampling rule**: 21 CFR 211.84(d) — at least three containers for identity, more for other tests. Less prescriptive than EU Annex 8 on count, but stricter on identity frequency.
- **Acceptance criteria**: USP values differ from Ph. Eur. (e.g., Paracetamol assay: USP 98.0–101.0% vs Ph. Eur. 98.5–101.5% on dried basis).
- **Microbiological limits**: USP <61>/<62> — TAMC, TYMC, plus specific organism absence tests. Procedure differs from Ph. Eur.
- **OOS Investigation**: FDA 2006 OOS Guidance ("Investigating Out-of-Specification (OOS) Test Results for Pharmaceutical Production") — the most detailed OOS guidance globally. Defines a 3-phase investigation model: Phase I (lab investigation), Phase II (full investigation), Phase III (quality review and batch disposition). Most companies globally follow this even for non-FDA markets.
- **Elemental impurities**: USP <232>/<233> implements ICH Q3D.

#### UK — MHRA / UK GMP / BP

- **GMP Law**: UK GMP (post-Brexit, derived from EU GMP, maintained separately from Jan 2021)
- **Pharmacopoeia**: British Pharmacopoeia (BP). UK GMP recognizes BP as the primary reference.
- **Note**: BP often has the same or similar limits to Ph. Eur. because EDQM's work was incorporated into BP for years. Post-Brexit some divergence is expected.
- **For BatchSphere**: UK market → use BP or Ph. Eur. (BP contains many Ph. Eur. texts). Mark specs as BP or Ph. Eur. origin.

#### India — CDSCO / Schedule M 2023 / Indian Pharmacopoeia (IP)

- **GMP Law**: Schedule M 2023 (revised under Drugs and Cosmetics Act). Significant update — now broadly aligned with WHO GMP and ICH.
- **Pharmacopoeia**: Indian Pharmacopoeia (IP), published by Indian Pharmacopoeia Commission (IPC). IP 2022 is the current edition.
- **Key requirement**: Where an IP monograph exists, compliance with IP is mandatory for the Indian market. Where no IP monograph, Ph. Eur. or USP may be cited.
- **Sampling rule**: Schedule M 2023 aligns with WHO Annex 4 (TRS 929) — SQRT(n)+1 for incoming starting materials from approved suppliers, identity from all containers for new suppliers.
- **Acceptance criteria differences**: IP assay limits may differ from Ph. Eur. and USP. For some materials IP is stricter.
- **Important for BatchSphere**: Given the Indian pharma market context, IP is a critical pharmacopoeia to support explicitly. Do not treat it as secondary.
- **Microbiological limits**: IP 2.7.1 (generally aligned with Ph. Eur. 5.1.4 categories).
- **OOS**: Schedule M 2023 requires OOS investigation. Follows WHO TRS 929 Annex 6 guidance, which is aligned with FDA OOS guidance structure.

#### Japan — PMDA / JP

- **GMP Law**: Pharmaceutical and Medical Device Act (PMDA)
- **Pharmacopoeia**: Japanese Pharmacopoeia (JP), 18th edition. ICH-aligned.
- **Note**: JP sometimes specifies different drying temperatures for LOD (e.g., 105°C for 3 hours where Ph. Eur. says 100–105°C to constant mass).
- **For BatchSphere**: JP market → mark compendialRef as JP.

#### China — NMPA / ChP

- **GMP Law**: China GMP (revised 2010, updated continuously)
- **Pharmacopoeia**: Chinese Pharmacopoeia (ChP) 2020. Increasingly ICH-aligned since China joined ICH in 2017.
- **Note**: China joined ICH but implementation of guidelines is phased. Some ICH guidelines adopted, some still under review.
- **For BatchSphere**: China market → compendialRef = CHN_PHARMACOPOEIA. Criteria may differ.

#### WHO — Developing / UN-Funded Markets

- **GMP**: WHO TRS 992 Annex 2 (GMP for pharmaceutical products)
- **Pharmacopoeia**: International Pharmacopoeia (Ph. Int.), 10th edition. Used in countries without their own.
- **WHO Prequalification**: Required for procurement by UN agencies (UNICEF, UNDP, PEPFAR). Covers HIV, TB, malaria, reproductive health medicines.
- **Sampling**: WHO Annex 4 (TRS 929) for sampling of pharmaceutical products — separate from GMP sampling, used for regulatory inspections and batch release.
- **For BatchSphere**: WHO prequalification market → compendialRef = WHO_INT_PHARMACOPOEIA or Ph. Eur./USP (WHO accepts either for APIs with no Ph. Int. monograph).

---

### Where Acceptance Criteria Literally Differ by Pharmacopoeia

This is why `compendialRef` is a critical field — not cosmetic metadata.

| Material | Test | Ph. Eur. Limit | USP Limit | IP Limit |
|---|---|---|---|---|
| Paracetamol API | Assay | 98.5 – 101.5% (dried) | 98.0 – 101.0% (dried) | 99.0 – 101.0% |
| Paracetamol API | Related substances | NMT 0.1% each, NMT 0.5% total | NMT 0.1% any single, NMT 0.3% total | Aligned with Ph. Eur. |
| Ascorbic Acid | Water content | NMT 0.1% (KF) | NMT 0.1% (KF) | NMT 0.3% |
| Microbiological (oral solid) | TAMC | NMT 10³ CFU/g (Category 3A) | NMT 10³ CFU/g | Aligned |
| Microbiological (oral solid) | TYMC | NMT 10² CFU/g | NMT 10² CFU/g | Aligned |
| Ibuprofen API | Assay | 98.5 – 101.0% | 97.0 – 103.0% | 98.5 – 101.5% |

Key takeaway: using the wrong pharmacopoeia reference in the spec will produce wrong acceptance criteria. The `compendialRef` on each `SpecParameter` must be explicit.

---

### Where Sampling Rules Differ by Region

| Rule | EU GMP Annex 8 | 21 CFR 211.84 (FDA) | WHO Annex 4 | India Schedule M 2023 |
|---|---|---|---|---|
| Identity (unknown/new supplier) | ALL containers | ALL containers | ALL containers | ALL containers |
| Identity (approved supplier, validated procedure) | Reduced sampling permitted (justified) | Statistical plan acceptable | SQRT(n)+1 or similar | SQRT(n)+1 permitted |
| Assay / other tests | Per sampling plan | Per written procedure | Per WHO guidance | Per approved procedure |

This means BatchSphere's `SamplingMethod` enum maps to these rules:

| BatchSphere Method | Regulatory Basis |
|---|---|
| `HUNDRED_PERCENT` | EU GMP Annex 8 default, FDA for new suppliers |
| `SQRT_N_PLUS_1` | WHO Annex 4, Schedule M 2023 for approved suppliers, general statistical plan |
| `MILITARY` | MIL-STD-1916 — used in some defense/industrial pharma contexts |
| `COA_BASED_RELEASE` | Reduced sampling — only with validated reduced-sampling procedure and approved supplier. Requires documented justification per EU GMP Annex 8 / ICH Q10. |

---

### OOS Investigation — Which Guidance to Follow

The FDA 2006 OOS Guidance is the most prescriptive. Most companies globally follow it regardless of target market because it provides the most defensible documentation structure.

Summary of FDA OOS 3-phase model:

```
Phase I — Laboratory Investigation (by analyst, immediately)
  └── Check: instrument calibration, calculation, sample preparation error
  └── If assignable cause found and documented: result can be invalidated
  └── If no assignable cause: result stands → OOS confirmed

Phase II — Full Investigation (by QA/QC Manager)
  └── Re-sampling (not retest of same sample)
  └── Re-testing of retained original sample
  └── Expanded investigation to other batches if needed
  └── Statistical evaluation

Phase III — Batch Disposition Decision (by QA)
  └── Release, reject, or additional testing
  └── All documentation must be filed
```

EU GMP Chapter 6.33 and WHO TRS 929 align with this structure but are less prescriptive about documentation at each phase.

For BatchSphere Phase 3 (OOS/investigation) — design the investigation workflow to follow FDA OOS guidance structure. This makes it valid globally.

---

### PIC/S — What It Is and Why It Matters

PIC/S (Pharmaceutical Inspection Co-operation Scheme) is a 55-member authority network that harmonizes GMP inspection standards. Members include EMA, TGA (Australia), Health Canada, MHRA, Swissmedic, and ANVISA.

PIC/S membership means:
- Mutual recognition of GMP inspections between member countries
- Harmonized GMP standards (PIC/S GMP guides = essentially EU GMP)
- If a manufacturer is GMP-certified in one PIC/S country, the certificate is generally accepted by other PIC/S members

For BatchSphere: a spec that is EU GMP compliant will generally be acceptable in any PIC/S country. The main remaining variable is the pharmacopoeia reference (Ph. Eur. vs USP vs BP vs local).

---

### Practical Design Recommendations for BatchSphere

#### 1. Add `targetMarket` to Spec entity

```
targetMarket  ENUM:
  EU              → Ph. Eur. primary, EU GMP Annex 8 sampling
  US_FDA          → USP primary, 21 CFR 211 sampling
  UK_MHRA         → BP or Ph. Eur. primary
  INDIA_CDSCO     → IP primary, Schedule M 2023
  JAPAN_PMDA      → JP primary
  CHINA_NMPA      → ChP primary
  WHO_PREQUALIFICATION → Ph. Int. or Ph. Eur./USP
  GLOBAL          → multi-compendial, strictest limit applies
  INTERNAL        → in-house testing standard, not for regulatory submission
```

This single field answers "which country's law" for each spec. A global company with EU + US markets creates two specs (or one GLOBAL spec with the stricter criteria).

#### 2. Expand `compendialRef` from varchar to structured enum

```
compendialRef  ENUM:
  PH_EUR            European Pharmacopoeia
  USP               United States Pharmacopeia
  BP                British Pharmacopoeia
  JP                Japanese Pharmacopoeia
  IP                Indian Pharmacopoeia
  CHN_PHARMACOPOEIA Chinese Pharmacopoeia
  WHO_INT           International Pharmacopoeia (WHO)
  MULTI_COMPENDIAL  Meets both Ph. Eur. and USP (strictest of both)
  IN_HOUSE          Company-specific method/criteria
  NONE              No pharmacopoeia reference
```

This applies at both the Spec header level (primary reference standard) and optionally at the SpecParameter level (where the acceptance criteria value came from).

#### 3. SpecParameter: add `compendialChapterRef` for COMPLIES criteria

When `criteriaType = COMPLIES`, the system needs to know which pharmacopoeia chapter to reference.

```
compendialChapterRef  VARCHAR
  Example values:
    "Ph. Eur. 5.1.4 Category 3A"
    "USP <61>/<62>"
    "IP 2.7.1 Category A"
    "Ph. Eur. 2.6.12"
    "USP <231>"   (old heavy metals — being phased out)
    "USP <232>/<233>"  (elemental impurities — ICH Q3D)
    "Ph. Eur. 2.4.20"  (elemental impurities — ICH Q3D)
```

This is how you distinguish "Complies with Ph. Eur. 2.6.12 Cat 3A" from "Complies with USP <61>/<62>" — they are the same concept (microbial limits) but different test procedures.

#### 4. OOS investigation (Phase 3) must follow FDA OOS 3-phase model

Design the investigation workflow using the FDA 2006 OOS 3-phase structure. This is globally accepted and most defensible.

#### 5. Sampling method `regulatoryBasis` note

The `samplingMethod` on a Spec should be set in context of the `targetMarket`:

| targetMarket | Recommended Default samplingMethod |
|---|---|
| EU | HUNDRED_PERCENT (Annex 8 default; SQRT only with justified reduced-sampling procedure) |
| US_FDA | Per 21 CFR 211.84 (at least 3 containers identity + statistical plan for other tests) |
| INDIA_CDSCO | SQRT_N_PLUS_1 for approved suppliers |
| WHO_PREQUALIFICATION | SQRT_N_PLUS_1 (WHO Annex 4 default) |
| INTERNAL | Any method |

---

### Summary: What Changes in the Data Model

From this research, one new field and one enum expansion are needed beyond the existing design:

| Change | Field | Location |
|---|---|---|
| New | `targetMarket` (enum) | Spec header |
| Expand | `compendialRef` (varchar → enum) | Spec header + SpecParameter |
| New (optional Phase 2) | `compendialChapterRef` (varchar) | SpecParameter (for COMPLIES type) |

The rest of the entity model (specType, status, effectiveDate, approvedBy, SpecParameter, MOA validationStatus) stays as designed. These additions make the model market-aware without major structural change.

---

## What Specification and MOA Mean In Practice

For BatchSphere incoming raw material QC, every received batch must be tested against:

1. A **Specification** — which says what tests to run and what results are acceptable
2. A **Method of Analysis** — per test parameter — which says how each test is performed

### Specification Structure

A specification is not just a name and code.

It is a structured document composed of:

```
Spec Header
  └── specCode, specName, revision, type, status, effective date
  └── linked material(s)
  └── sampling method (how many containers to sample)
  └── compendial reference (EP, USP, in-house)

Spec Parameters (one row per test)
  └── parameterName (e.g., "Assay", "Loss on Drying", "Identification (IR)")
  └── testType (Identity / Assay / Purity / Physical / Chemical / Microbiological)
  └── linked MOA (which method to use)
  └── acceptanceCriteriaType (NLT / NMT / Range / PassFail / Complies / Text)
  └── lowerLimit (e.g., 98.0)
  └── upperLimit (e.g., 102.0)
  └── unit (%, ppm, mg/mL, --)
  └── isMandatory (true/false — some may be conditional)
  └── sequence (display/test order)
```

### Example Spec: Paracetamol API (EP/USP grade)

| # | Test | Type | MOA | Acceptance Criteria | Unit | Mandatory |
|---|---|---|---|---|---|---|
| 1 | Description | Physical | MOA-VISUAL-001 | White/off-white crystalline powder | Text | Yes |
| 2 | Identification (IR) | Identity | MOA-IR-001 | Concordant with reference | Pass/Fail | Yes |
| 3 | Identification (HPLC) | Identity | MOA-HPLC-003 | RT matches reference ± 2% | Pass/Fail | Yes |
| 4 | Assay | Assay | MOA-HPLC-003 | 98.0 – 102.0% | % | Yes |
| 5 | Related Substances | Purity | MOA-HPLC-004 | NMT 0.1% each, NMT 0.5% total | % | Yes |
| 6 | Loss on Drying | Physical | MOA-LOD-001 | NMT 0.5% | % | Yes |
| 7 | Residue on Ignition | Chemical | MOA-ROI-001 | NMT 0.1% | % | Yes |
| 8 | Heavy Metals | Chemical | MOA-HM-001 | NMT 20 ppm | ppm | Yes |
| 9 | Particle Size (D90) | Physical | MOA-PSD-001 | NMT 180 µm | µm | Conditional |
| 10 | Microbial Limits | Microbiological | MOA-MICRO-001 | Complies with USP <61>/<62> | — | Yes |

### MOA Structure

An MOA is not just a name and code.

It should carry enough information for the analyst to execute the test correctly.

```
MOA Header
  └── moaCode, moaName, revision
  └── moaType (HPLC / GC / Karl_Fischer / UV_Vis / IR / Titrimetry / Physical / Microbiological / Visual)
  └── principle (brief description of analytical principle)
  └── compendialReference (USP / Ph.Eur. / BP / In-house / None)
  └── instrumentType (HPLC system, KF apparatus, IR spectrometer, etc.)
  └── reagentsAndStandards (reference standard, mobile phase, titrant)
  └── systemSuitabilityCriteria (e.g., RSD ≤ 2.0% for 5 injections)
  └── calculationFormula (assay calculation)
  └── reportableRange (min–max range the method is validated for)
  └── validationStatus (NOT_VALIDATED / IN_VALIDATION / VALIDATED / VALIDATED_COMPENDIAL)
  └── referenceAttachment (SOP document link)
```

### Acceptance Criteria Types

| Type | Description | Example |
|---|---|---|
| `NLT` | Not Less Than | NLT 98.0% |
| `NMT` | Not More Than | NMT 0.5% |
| `RANGE` | Between two limits | 98.0 – 102.0% |
| `PASS_FAIL` | Qualitative pass or fail | IR concordant with reference |
| `COMPLIES` | Complies with pharmacopoeia | Complies with Ph. Eur. 2.6.12 |
| `TEXT` | Descriptive characteristic | White crystalline powder |

---

## How Spec and MOA Link to QC Sampling

The operational chain in BatchSphere:

```
Material Master
  └── linked Spec (active approved spec for this material)

GRN Receive
  └── creates SamplingRequest for each GRN line item
  └── links SamplingRequest to Spec via material

SamplingRequest
  └── sampling plan defines containers to sample
  └── sampling method comes from Spec (SQRT_N_PLUS_1, HUNDRED_PERCENT, etc.)

Sample Collected
  └── sample is handed to QC

QC Testing (Phase 2 of QC_SAMPLING_IMPLEMENTATION_PLAN)
  └── tests are driven by Spec.parameters
  └── each test uses Spec.parameter.linkedMoa for procedure
  └── analyst enters result against Spec.parameter.acceptanceCriteria
  └── system validates NLT / NMT / RANGE / PASS_FAIL automatically

QC Disposition
  └── all mandatory parameters passed → eligible for APPROVED
  └── any mandatory parameter failed → REJECTED or UNDER_INVESTIGATION
  └── OOS result on assay → UNDER_INVESTIGATION before disposition
```

Key rule: **the Spec drives what QC does. The MOA drives how QC does it.**

Without `SpecParameter` as a first-class entity, there is no way to track which tests were run, which passed, which failed, or which MOA was used. QC disposition remains one undifferentiated approval/rejection event.

---

## Current BatchSphere State

### What exists

**Spec entity (`spec_master` table)**

```java
specCode        // unique code
specName        // name
revision        // version string
samplingMethod  // SQRT_N_PLUS_1 | HUNDRED_PERCENT | MILITARY | COA_BASED_RELEASE
referenceAttachment
isActive
createdBy, createdAt, updatedBy, updatedAt
```

**Moa entity (`moa_master` table)**

```java
moaCode
moaName
revision
referenceAttachment
isActive
createdBy, createdAt, updatedBy, updatedAt
```

**SpecController**: `POST/GET/PUT/DELETE /api/specs`

**MoaController**: `POST/GET/PUT/DELETE /api/moas`

### Critical gaps

| Gap | Impact |
|---|---|
| No `SpecParameter` table | Cannot define what tests a spec requires |
| No acceptance criteria model | Cannot validate test results automatically |
| No MOA linkage per test parameter | Cannot trace which method was used per test |
| No spec type (Material/Finished/In-Process) | Cannot distinguish raw material spec from product spec |
| No spec status lifecycle (DRAFT/APPROVED/OBSOLETE) | Cannot enforce revision control or approval workflow |
| No material-to-spec linkage | Cannot drive sampling plan from material's active spec |
| MOA has no type field | Cannot filter methods by technique |
| MOA has no validation status | Cannot enforce use of validated methods only |
| MOA has no compendial reference | Cannot trace whether method is USP/EP/in-house |
| MOA has no system suitability criteria | Analyst has no system check guidance in the system |
| No spec version history | Cannot audit which spec version was used for a given batch |

---

## Recommended Entity Model

### 1. Spec (enhanced)

Add to existing `spec_master`:

```
specType         ENUM: MATERIAL / IN_PROCESS / FINISHED_PRODUCT / PACKAGING
status           ENUM: DRAFT / UNDER_REVIEW / APPROVED / OBSOLETE
targetMarket     ENUM: EU / US_FDA / UK_MHRA / INDIA_CDSCO / JAPAN_PMDA / CHINA_NMPA / WHO_PREQUALIFICATION / GLOBAL / INTERNAL
effectiveDate    DATE
expiryDate       DATE (optional, for time-limited specs)
compendialRef    ENUM: PH_EUR / USP / BP / JP / IP / CHN_PHARMACOPOEIA / WHO_INT / MULTI_COMPENDIAL / IN_HOUSE / NONE
                 — primary pharmacopoeia for this spec
referenceDocumentNo VARCHAR(100) (nullable — controlled spec or source document reference)
referenceAttachment VARCHAR(500) (nullable — attachment path / document link)
approvedBy       VARCHAR
approvedAt       TIMESTAMP
submittedBy      VARCHAR
submittedAt      TIMESTAMP
reviewedBy       VARCHAR
reviewedAt       TIMESTAMP
reviewRemarks    TEXT
reviewRoute      ENUM: QC_ONLY / QC_THEN_QA / QA_ONLY
previousSpecId   UUID (FK to self — for version chain)
```

`targetMarket` drives:
- which sampling method defaults are appropriate
- which pharmacopoeia is primary
- which OOS investigation standard applies
- which regulatory submission format to use (future)

`compendialRef` is the primary pharmacopoeia. Does NOT replace the edition reference (store edition as a separate varchar like "Ph. Eur. 11th Ed."). The enum is for filtering and validation logic.

### 2. Moa (enhanced)

Add to existing `moa_master`:

```
moaType          ENUM: HPLC / GC / UV_VIS / IR / TITRATION / KARL_FISCHER / LOD_OVEN / PHYSICAL / MICROBIOLOGICAL / VISUAL / OTHER
principle        TEXT (brief description of analytical principle)
compendialRef    VARCHAR: USP / Ph.Eur. / In-house
instrumentType   VARCHAR
reagentsStandards TEXT
systemSuitabilityCriteria TEXT
reportableRange  VARCHAR (e.g., "0.05% – 2.0%")
validationReferenceNo VARCHAR (nullable — protocol/report/control number for method validation)
validationAttachment VARCHAR (nullable — validation document link or attachment path)
sampleSolutionStabilityValue DECIMAL (nullable)
sampleSolutionStabilityUnit ENUM: MINUTES / HOURS / DAYS
sampleSolutionStabilityCondition VARCHAR (nullable — e.g. "2-8C", "room temperature", "protect from light")
validationStatus ENUM: NOT_VALIDATED / IN_VALIDATION / VALIDATED / VALIDATED_COMPENDIAL
status           ENUM: DRAFT / APPROVED / OBSOLETE
approvedBy       VARCHAR
approvedAt       TIMESTAMP
submittedBy      VARCHAR
submittedAt      TIMESTAMP
reviewedBy       VARCHAR
reviewedAt       TIMESTAMP
reviewRemarks    TEXT
reviewRoute      ENUM: QC_ONLY / QC_THEN_QA / QA_ONLY
```

### 3. SpecParameter (new — the critical missing entity)

New table `spec_parameter`:

```
id                     UUID PK
specId                 UUID FK → spec_master
parameterName          VARCHAR (e.g., "Assay", "Loss on Drying", "Identification (IR)")
testType               ENUM: IDENTITY / ASSAY / PURITY / PHYSICAL / CHEMICAL / MICROBIOLOGICAL / DESCRIPTION
moaId                  UUID FK → moa_master
criteriaType           ENUM: NLT / NMT / RANGE / PASS_FAIL / COMPLIES / TEXT
lowerLimit             DECIMAL (nullable)
upperLimit             DECIMAL (nullable)
textCriteria           VARCHAR (nullable — for COMPLIES and TEXT types)
compendialChapterRef   VARCHAR (nullable — for COMPLIES type: "Ph. Eur. 5.1.4 Cat. 3A", "USP <61>/<62>", "IP 2.7.1")
unit                   VARCHAR (%, ppm, µm, mg/mL, etc.)
isMandatory            BOOLEAN
sequence               INT (display and execution order)
notes                  TEXT (special instructions for this test)
createdBy              VARCHAR
createdAt              TIMESTAMP
```

`compendialChapterRef` is critical for microbiological and elemental impurity tests where different pharmacopoeias define different test procedures for the same concept. Without this field, "Complies" means nothing — complies with what and which chapter?

### 4. MaterialSpecLink (new)

New table `material_spec_link`:

```
id              UUID PK
materialId      UUID FK → material_master
specId          UUID FK → spec_master
isActive        BOOLEAN (only one active spec per material at a time)
linkedBy        VARCHAR
linkedAt        TIMESTAMP
notes           TEXT
```

This replaces the current practice of selecting a spec by name during sampling plan creation. The material's active spec is auto-resolved at GRN receive time.

---

## Spec Status Lifecycle

```
DRAFT → UNDER_REVIEW → APPROVED → OBSOLETE
         ↑
    (revert to draft if review fails)
```

Rules:

- Only APPROVED specs can be linked as active on a material.
- When a new revision is approved, the previous revision is automatically set to OBSOLETE.
- A SamplingRequest records `specId` + `specRevision` at creation time so historical reports remain accurate even after spec upgrade.
- DRAFT specs are visible to QC team only.
- OBSOLETE specs remain readable for audit; cannot be linked to new materials.
- `Submit for Review` moves the record to `UNDER_REVIEW` and places it in a review queue.
- For the current implementation, the default route should be `QC_ONLY`, meaning QC Manager reviews first.
- QA review can be introduced later without changing the lifecycle by enabling `QC_THEN_QA` or `QA_ONLY`.
- `Reject` returns the record to `DRAFT` with mandatory review remarks.

---

## MOA Validation Status

```
NOT_VALIDATED → IN_VALIDATION → VALIDATED
                                     ↓
                           VALIDATED_COMPENDIAL (for pharmacopoeia methods)
```

Rules:

- Only VALIDATED or VALIDATED_COMPENDIAL MOAs should be linkable to APPROVED specs.
- VALIDATED_COMPENDIAL means the MOA is based on a pharmacopoeia chapter (USP/Ph.Eur.) — treated as pre-validated by regulatory default.
- System should warn when a DRAFT spec uses a NOT_VALIDATED MOA.
- `validationReferenceNo` is the primary searchable audit field for method validation evidence.
- `validationAttachment` stores the linked validation document or controlled file reference.
- `sampleSolutionStability*` fields are operationally important because they determine how long a prepared sample remains valid for testing.
- MOA submit/review follows the same review-queue concept as Spec. For now, the default routing should be QC review first.

---

## Spec-MOA-Sampling Linkage Model

At material setup:

```
Material → MaterialSpecLink → Spec (APPROVED, active)
```

At GRN receive:

```
GRN Line Item → Material → active Spec → samplingMethod drives container count
SamplingRequest.specId = Material's active Spec.id
SamplingRequest.specRevision = Spec.revision (snapshot at receipt time)
```

At sampling plan creation:

```
SamplingPlan knows which Spec applies
Spec.samplingMethod → drives how many containers to select
Spec.parameters → list of tests QC must run when sample is received
```

At QC receipt (Phase 2):

```
QC analyst sees list of tests from Spec.parameters
For each test: procedure from linked MOA
Analyst enters result per parameter
System validates against criteriaType + limits
All mandatory parameters pass → eligible for APPROVED disposition
Any mandatory parameter fail → flag for review / UNDER_INVESTIGATION
```

---

## API Design Direction

### Phase 1 additions (Spec & MOA)

These are spec/MOA master data APIs that should exist before the sampling test-entry flow is built.

**Spec**:

```
POST   /api/specs                         create spec header
GET    /api/specs                         list active specs
GET    /api/specs/{id}                    get full spec with parameters
PUT    /api/specs/{id}                    update spec header
DELETE /api/specs/{id}                    deactivate

POST   /api/specs/{id}/parameters         add test parameter to spec
PUT    /api/specs/{id}/parameters/{pid}   update parameter
DELETE /api/specs/{id}/parameters/{pid}   remove parameter

POST   /api/specs/{id}/submit             → UNDER_REVIEW
POST   /api/specs/{id}/approve            → APPROVED
POST   /api/specs/{id}/reject             → UNDER_REVIEW → DRAFT
POST   /api/specs/{id}/obsolete           → OBSOLETE
POST   /api/specs/{id}/revise             create new DRAFT revision linked to this one
GET    /api/specs/review-queue            list specs pending review
```

**MOA**:

```
POST   /api/moas                          create MOA
GET    /api/moas                          list active MOAs
GET    /api/moas/{id}                     get MOA detail
PUT    /api/moas/{id}                     update MOA
DELETE /api/moas/{id}                     deactivate

POST   /api/moas/{id}/submit              → UNDER_REVIEW
POST   /api/moas/{id}/approve             → APPROVED
POST   /api/moas/{id}/reject              → UNDER_REVIEW → DRAFT
POST   /api/moas/{id}/obsolete            → OBSOLETE
GET    /api/moas/{id}/linked-specs        which specs use this MOA (impact analysis before retire)
GET    /api/moas/review-queue             list MOAs pending review
```

**Material-Spec link**:

```
POST   /api/materials/{id}/spec           link active spec
GET    /api/materials/{id}/spec           get current active spec
GET    /api/materials/{id}/spec/history   spec version history for this material
```

---

## UI Design Direction

### Specs & MOA screen (`11-spec-moa.html`)

Should be a dedicated screen in master data, not linked to `05-documents.html`.

**Two-tab layout**:

1. **Specifications** tab
2. **Methods of Analysis** tab

---

### Specifications tab

**List panel (left or full width with expandable detail)**:

- Filter: status, specType, compendialRef, search by code/name
- Table columns: specCode | specName | revision | type | compendialRef | status | effective date | actions
- Status pills: `DRAFT` (amber) · `UNDER_REVIEW` (blue) · `APPROVED` (green) · `OBSOLETE` (slate)
- Click row → slide-in detail panel

**Spec detail panel**:

Header row:
- specCode, specName, revision badge
- specType pill, status pill
- approved by / at
- effective date / expiry date
- compendialRef
- sampling method

Material links section:
- Which materials use this spec (from MaterialSpecLink)
- Each material shows: materialCode, materialName, linked date

Test Parameters section (the core content):
- Table: # | Test Name | Type | MOA | Criteria | Unit | Mandatory
- Type pills: Identity (violet), Assay (blue), Purity (amber), Physical (slate), Chemical (teal), Microbiological (red)
- Acceptance criteria displayed as: "98.0 – 102.0%" or "NMT 0.5%" or "Passes Test" or "Complies Ph.Eur. 2.6.12"
- MOA shown as clickable pill that opens MOA detail
- Mandatory: checkmark or dash

Action bar:
- `Edit` (DRAFT only)
- `Add Parameter` (DRAFT only)
- `Submit for Review` (DRAFT → UNDER_REVIEW)
- `Approve` (UNDER_REVIEW → APPROVED, QA/QC Manager role)
- `Create New Revision` (APPROVED → new DRAFT)
- `Obsolete` (APPROVED → OBSOLETE)

**Create/Edit Spec slide-over**:

Section 1: Spec Header
- specCode (auto-generate suggestion: SP-YYYY-NNNN)
- specName
- specType (Material / In-Process / Finished Product / Packaging)
- revision (e.g., v1, v2, Rev.04)
- compendialRef
- effectiveDate
- sampling method (drives container rule in sampling plan)
- notes

Section 2: Test Parameters
- Add/remove rows
- Each row: test name, test type, MOA picker, criteria type, lower limit, upper limit, unit, mandatory toggle
- Reorder with drag or up/down arrows
- Preview line shows how criteria will be displayed to analyst

Section 3: Material Linkage
- Search and add materials
- Show: materialCode + materialName + storageCondition

Confirmation:
- Status after save: DRAFT (unless submitted inline)
- Submit for review toggle

---

### Methods of Analysis tab

**List**:
- Filter: moaType, validationStatus, compendialRef, search
- Table: moaCode | moaName | moaType | revision | compendialRef | validationStatus | actions
- Validation status pills: `NOT_VALIDATED` (red) · `IN_VALIDATION` (amber) · `VALIDATED` (green) · `VALIDATED_COMPENDIAL` (blue/purple)

**MOA detail panel**:

Header:
- moaCode, moaName, revision, moaType badge, validationStatus pill
- compendialRef, instrumentType
- approvedBy, approvedAt

Procedure section:
- principle (brief method description)
- system suitability criteria
- reportable range
- reagents and reference standards
- calculation formula
- notes

Linked Specs section:
- Which specs use this MOA (impact analysis)
- specCode | specName | parameterName | criteria

Actions:
- Edit | Approve | Obsolete | View Attachment

**Create/Edit MOA slide-over**:

Section 1: MOA Header
- moaCode (auto-suggest: MOA-TYPE-NNN e.g., MOA-HPLC-012)
- moaName
- moaType (HPLC / GC / UV-Vis / IR / Titration / Karl Fischer / LOD / Physical / Microbiological / Visual / Other)
- revision
- compendialRef (dropdown: Ph. Eur. / USP / BP / In-house / None)
- instrumentType (free text or predefined list)

Section 2: Procedure Details
- principle (text area)
- reagentsAndStandards
- systemSuitabilityCriteria
- reportableRange
- calculationFormula
- notes

Section 3: Validation
- validationStatus
- validated by / on
- reference attachment link

---

## Phase Mapping

### Phase 1 — Spec & MOA master data foundation

Scope:
- enhance Spec entity with type, status lifecycle, compendialRef, effectiveDate
- enhance MOA entity with moaType, validationStatus, compendialRef, principle, instrument
- add `SpecParameter` table
- add `MaterialSpecLink` table
- build Spec CRUD with parameter management UI
- build MOA CRUD UI
- display linked spec on material detail
- display samplingMethod from Spec in sampling plan creation

Why first:
- spec and MOA master data must exist before QC test result entry can be built
- sampling plan already needs to know the sampling method from the spec

### Phase 2 — QC test result entry against Spec

Scope (aligns with QC_SAMPLING_IMPLEMENTATION_PLAN Phase 2):
- when sample is received in QC, generate test worksheet from Spec.parameters
- analyst enters result per test parameter
- system validates against criteria automatically (NLT/NMT/RANGE pass/fail)
- OOS (out of spec) flagged automatically and blocks auto-approval
- QC disposition decision available only after all mandatory parameters have results

### Phase 3 — OOS investigation and result review

Scope:
- OOS investigation linked to specific failing test parameter
- retest authorization (per MOA, per parameter)
- result review and analyst/reviewer sign-off
- result history per sample per parameter

---

## What The Current Code Already Covers

| Feature | Status |
|---|---|
| Spec CRUD API | Done |
| MOA CRUD API | Done |
| Spec linked to sampling method enum | Done (limited — only top-level method, not per-parameter) |
| Spec parameters | Not done |
| Acceptance criteria | Not done |
| MOA type / validation status | Not done |
| Material-to-spec link | Not done |
| Spec status lifecycle | Not done |
| MOA linked per test parameter | Not done |
| QC test result entry against criteria | Not done |

---

## Key Design Rule

`Spec defines the what. MOA defines the how. SpecParameter links them with the when-to-accept.`

Without SpecParameter, BatchSphere cannot:
- generate a QC test worksheet from a specification
- validate test results automatically
- trace which method was used per test for a given batch
- flag OOS results that need investigation
- support a real QC approval decision backed by evidence

---

## Recommended Build Sequence

1. Enhance `Spec` entity (add type, status, effectiveDate, compendialRef, approvedBy/At)
2. Enhance `Moa` entity (add moaType, validationStatus, compendialRef, principle, instrument)
3. Add `SpecParameter` table and API
4. Add `MaterialSpecLink` table and API
5. Build `11-spec-moa.html` UI with both tabs
6. Wire `SamplingRequest` to resolve Spec via Material at GRN receive
7. Phase 2: build QC test worksheet generation from Spec.parameters
