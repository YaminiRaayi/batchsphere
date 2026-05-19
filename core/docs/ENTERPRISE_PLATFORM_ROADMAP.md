# BatchSphere — Enterprise Pharma Platform Roadmap
**Author:** Strategic planning pass
**Date:** 2026-05-18
**Vision:** A global, multi-regulator, multi-modality pharma platform equivalent in scope to LabWare LIMS + TrackWise QMS + SAP S/4HANA Pharma — delivered as one integrated product.
**Status:** Strategic master plan (draft, to be reviewed by founders + pharma SMEs before commitment)

---

## 0. Executive summary in one paragraph

BatchSphere today is a strong QC LIMS + partial QMS for the Indian OSD market at ~55-60% completeness. The stated vision is to compete with **LabWare LIMS** (enterprise lab automation), **TrackWise / Sparta** (enterprise QMS, now part of Honeywell), and **SAP S/4HANA Pharma** (manufacturing ERP) — all in one product, across **US FDA + EU EMA + India CDSCO + WHO PQ + China NMPA**, supporting **OSD + Sterile + API** modalities, in **seven languages (English, Hindi, Telugu, Kannada, Tamil, Mandarin, Spanish)**, with full **Distribution / Order-to-Cash + Procurement / Purchase-to-Pay + Cleaning Validation**. This is a **4-5 year, 15-25 person platform program**. It is achievable, but only if the architecture, team, and phasing are sized to the ambition from the start. This document is the master roadmap.

---

## 1. What you're really building

### 1.1 Competitive frame

| Competitor | Category | Founded | Engineers (est.) | Annual revenue (est.) | Market focus |
|---|---|---|---|---|---|
| **LabWare LIMS** | Enterprise LIMS | 1987 | 400+ | $150M | Lab automation, pharma + clinical + food |
| **STARLIMS (Abbott Informatics)** | Enterprise LIMS | 1986 | 300+ | $90M | Pharma + environmental |
| **Veeva Vault QualityOne / QMS** | Quality Cloud | 2007 | 1500+ | $2.4B (Veeva total) | Cloud QMS for life sciences |
| **TrackWise / Sparta / Honeywell** | Enterprise QMS | 1994 | 250+ | $130M | Pharma QMS, complaint, audit |
| **ComplianceQuest** | Cloud QMS | 2014 | 200+ | $60M | Mid-market cloud QMS |
| **Werum PAS-X (Körber)** | MES | 1969 | 800+ | $200M | Pharma MES + batch records |
| **SAP S/4HANA Pharma** | ERP | 1972 | n/a (huge) | n/a (industry slice) | Multi-billion full-stack ERP |
| **Oracle Argus** | PV | 1992 | n/a | $200M+ | Drug safety / pharmacovigilance |
| **TraceLink** | Serialization | 2009 | 300+ | $100M | DSCSA/FMD track and trace |

BatchSphere's target is the **integrated alternative to procuring 4-6 of these from different vendors**. The competitive differentiation is not "we have more features than LabWare" — it's "one platform, one vendor, one validation pack, one integration story, modern stack, fair pricing, designed for emerging-market pharma but globally compliant."

### 1.2 Honest scale check

The scope you've defined is a **15-20 person engineering team for 4-5 years** to reach feature parity with the legacy enterprise tools in their respective domains. That's roughly:

- **60-100 engineering person-years** of build effort
- **8-15 pharma SME person-years** of domain encoding
- **$15-30M in fully-loaded cost** if done with in-house team in India + select US/EU hires
- **$30-60M** if done in US/EU primarily

That cost frame matters because it tells you the **market opportunity must justify the investment**. Mid-tier Indian pharma (~500 companies of relevant size) won't carry it alone. The credible business case is: serve Indian + emerging-market pharma at $50-200K ACV (Annual Contract Value), then upmarket to global mid-tier at $200-500K ACV, reaching 200-400 customers over 5 years for $40-100M ARR.

I'm putting this in the document not to slow you down but because **any roadmap that doesn't acknowledge the scale will fail at year 2 when burn outpaces ARR**. Better to know now.

---

## 2. Product structure

The platform is **one product** to the customer but internally organized as **four product domains** sharing a common platform layer:

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Common Platform Services                         │
│  Multi-tenancy │ i18n │ Audit+ESign │ RBAC │ Notif │ Storage │ Jobs │
└─────────────────────────────────────────────────────────────────────┘
        ▲              ▲              ▲              ▲
        │              │              │              │
┌───────┴──────┐ ┌─────┴─────┐ ┌──────┴───────┐ ┌────┴──────────┐
│  Quality &   │ │  LIMS     │ │ Manufacturing│ │ Supply Chain  │
│  Compliance  │ │  Lab Ops  │ │   MBR/eBMR   │ │  Procurement  │
│ (vs Vault/   │ │  (vs Lab- │ │  Dispensing  │ │  Distribution │
│  TrackWise)  │ │  Ware)    │ │  IPC, Yield  │ │  Serialization│
└──────────────┘ └───────────┘ └──────────────┘ └───────────────┘
```

Why four domains and not one monolith:

- **Saleable independently.** A customer might buy LIMS in year 1, add QMS in year 2, ERP in year 3. Each domain must stand alone as a product.
- **Parallelizable teams.** Each domain becomes a 4-5 person squad once the platform is stable.
- **Regulator + modality variation surfaces per domain.** OSD vs Sterile differs mostly in Manufacturing and LIMS — separating clarifies where complexity lives.
- **Pricing flexibility.** Per-domain or per-module pricing is normal in enterprise pharma.

---

## 3. Common Platform Layer — the first 6 months of work

Every domain depends on these. Building them first removes 80% of future rework. **This phase is non-negotiable before deep domain work resumes.**

### PL-1 — Multi-Tenancy
**Effort:** 6 weeks | **Why:** can't ship globally without this

- Schema-per-tenant or row-level-security model
- Tenant provisioning + de-provisioning
- Tenant configuration registry (per-regulator, per-modality settings)
- Tenant-aware logging, metrics, billing

### PL-2 — Data Residency & Regional Deployment
**Effort:** 4 weeks | **Why:** EU GDPR, China data law, Russia, Brazil

- Region-pinned tenants (EU, US, IN, CN regions)
- Cross-region replication off for sensitive tenants
- Region-aware request routing

### PL-3 — Internationalization (i18n) Framework + 7 Languages
**Effort:** 8 weeks | **Why:** explicit user requirement

- Full i18n framework (key-based translation, ICU MessageFormat for plurals/dates/numbers)
- Initial coverage: **English, Hindi (हिन्दी), Telugu (తెలుగు), Kannada (ಕನ್ನಡ), Tamil (தமிழ்), Mandarin (中文 simplified), Spanish (Spain + LATAM variants)**
- Translation memory + glossary for pharma terms (regulator-specific)
- Right-to-left support (future-ready for Arabic, even if not Phase 1)
- Locale-aware date/time/number/currency formatting
- Content translation: SOPs, labels, CoAs, notifications in tenant's primary language(s)
- Per-user UI language vs per-tenant document language (these differ)

### PL-4 — Audit + E-Signature Platform Layer
**Effort:** 5 weeks | **Why:** TD-1 done right at platform level

- `@Auditable` annotation + AOP interceptor (one place to write/maintain)
- Domain-event-driven audit (every status change emits a typed event consumed by audit listener)
- E-signature service with meaning text, password + (optional) MFA second factor
- Tamper-evident: hash-chained audit rows (each row's hash includes previous row's hash)
- Audit trail review (ATR) workflow as a first-class platform feature

### PL-5 — Configurable RBAC + Approval Workflow Engine
**Effort:** 6 weeks | **Why:** different regulators require different role separations

- Permission registry (resource × action × condition)
- Per-tenant role definitions on top of permission registry
- Delegated approval (vacation cover) — partially exists, deepen it
- Workflow engine: configurable state machines per entity type
- Different state machines for OSD vs Sterile vs API where regulator demands

### PL-6 — Multi-Regulator Configuration Framework
**Effort:** 4 weeks | **Why:** FDA vs EMA vs NMPA vs CDSCO have different e-sign + audit + retention rules

- `RegulatoryProfile` per tenant: which regulators apply
- Per-regulator feature toggles (e.g., FDA requires 21 CFR Part 11 manifestation on PDF; CDSCO under Schedule M requires specific batch numbering format; NMPA requires Chinese data residency + Chinese audit logs)
- Profile-driven validation rules at service layer

### PL-7 — Multi-Modality Data Model
**Effort:** 6 weeks | **Why:** OSD, Sterile, API workflows diverge in 30%+ of process

- Modality enum on product master
- Modality-specific extension tables (e.g., `SterileBatchAttributes` with media-fill ref, gowning records; `ApiBatchAttributes` with intermediate genealogy)
- Process steps + IPC parameters configured per modality template

### PL-8 — Notification Channel
**Effort:** 3 weeks | **Why:** TD-7 / PHA-23; cross-domain

- In-app + email + SMS + webhook destinations
- Tenant-configurable channel preferences per notification topic
- Digest mode (daily roll-up vs real-time)

### PL-9 — Object Storage + Document Service
**Effort:** 4 weeks | **Why:** TD-9 + foundational for SOP control

- S3-compatible backend (MinIO, Wasabi, native AWS S3) with object lock for retention
- Document service: versioning, watermarks, retention policy, signed-URL access
- Per-region buckets respecting PL-2

### PL-10 — Integration Platform
**Effort:** 5 weeks | **Why:** instrument + ERP integrations needed for every customer

- API gateway with OAuth 2.0 + API keys
- Webhook subscribers (out-bound)
- Connector framework for: OPC-UA (instruments), Empower/Chromeleon/OpenLab (chromatography data systems), SAP (ERP), Argus (PV)
- Connector marketplace concept

### PL-11 — Observability + DR
**Effort:** 4 weeks | **Why:** enterprise customers require it

- Structured logging, correlation IDs, OpenTelemetry, Prometheus metrics
- Centralized error monitoring (Sentry or equivalent)
- Backup + restore tested per region, RPO/RTO defined per region
- Health/readiness probes

### PL-12 — Computer System Validation (CSV) Pack Generator
**Effort:** 4 weeks | **Why:** every customer wants the pack on day one

- Auto-generated URS, FS, DS from OpenAPI + this roadmap
- IQ/OQ scripted into CI; results published as evidence
- Traceability matrix auto-maintained
- Customer-specific pack export

**Platform Layer total: ~59 weeks = ~14 person-months. With 4 engineers in parallel: ~16 weeks calendar (4 months).**

---

## 4. Domain Roadmaps

Each domain follows the same pattern: depth on existing, then global extensions, then modality variants.

### 4.1 LIMS / Lab Operations (vs LabWare)

Already at the strongest position. The expansion is **depth** rather than **breadth**.

#### Phase L-A — Global LIMS Depth (4 months)
- **Multi-pharmacopoeial spec** (USP + EP + BP + IP + JP + ChP simultaneously on one molecule with per-market limits)
- **Stability with bracketing & matrixing** (ICH Q1D), climatic-zone awareness (I/II/III/IVa/IVb), shelf-life statistical extrapolation (linear regression with 95% CI)
- **OOS investigation deep workflow** per USP <1010> + FDA OOS Guidance + MHRA — with statistical outlier tests (Dixon, Grubbs), instrument-vs-method-vs-analyst attribution
- **Method validation (ICH Q2)** — full parameter set with acceptance criteria
- **Method transfer** dossiers between sites and instruments
- **Raw data attachment** (PHA-4) for HPLC chromatograms / FTIR spectra
- **Solution preparation** (PHA-5) + **column logbook** (PHA-6) + **volumetric standardisation** (PHA-7)
- **Stability protocol library** with ICH Q1A/Q1B/Q1D pre-built protocols

#### Phase L-B — Instrument Data Acquisition (3 months)
- **Empower (Waters)** integration via Empower Toolkit / SDK
- **Chromeleon (Thermo)** integration via Chromeleon eWorkflow
- **OpenLab (Agilent)** integration
- **Generic OPC-UA** for balances, pH meters, dissolution apparatus
- Direct chromatogram + integration result import into `QcTestResult`

#### Phase L-C — Sterile / Biologics LIMS Extension (3 months)
- **Bioburden + endotoxin testing** workflows
- **Media fill** records + acceptance criteria
- **Environmental monitoring at sterile grade** (Grade A/B/C/D, particle counting, viable air sampling, settle plates, contact plates)
- **Personnel monitoring** records (gowning, finger dabs)

#### Phase L-D — API LIMS Extension (2 months)
- **API genealogy** across multi-step synthesis
- **In-process testing** at each synthesis step
- **API impurity profile** specific tests (related substances, residual solvents — ICH Q3A/Q3B/Q3C)
- **DMF reference linkage** to vendor master

**LIMS Phase total: 12 months with 2-3 engineers + 1 LIMS SME.**

---

### 4.2 Quality & Compliance (vs Vault / TrackWise)

This is where you can leapfrog. TrackWise is 30 years old and shows it; Veeva Vault QMS is modern but expensive. Mid-market is open.

#### Phase Q-A — Document Control + Training Foundation (3 months)
- **SOP / Controlled Document Management** (PHA-1) — full lifecycle, controlled-copy issuance, retired-version archive, periodic review trigger
- **Training-to-task gate** (PHA-2) — enforce at every GMP action
- **Role-based training curriculum** (PHA-3) — auto-assign on hire / role-change
- **SOP-training linkage** — SOP revision auto-creates retraining task
- **Competency assessment** — written tests, observation-based qualification

#### Phase Q-B — Quality Event Depth (3 months)
- **Deviation** depth: severity-driven workflow with regulator-notification triggers, FAR auto-draft for FDA
- **CAPA** depth: 5-Why + Ishikawa + FMEA tooling, effectiveness review with statistical validation
- **Change control** depth: impact assessment matrix (regulatory, validation, training, supplier impact), staged approval
- **Risk management** (ICH Q9): FMEA library, risk register portfolio view
- **OOS / OOT** workflow polish per USP <1010>
- **Trend analysis** across deviation, CAPA, complaint with chi-square + Pareto

#### Phase Q-C — Audit & Inspection (3 months)
- **Internal audit module** (PHA-14) — annual plan, execution, observation, CAPA linkage
- **External audit / inspection tracker** — FDA-483 response, EU GMP inspection observation, customer audit
- **Inspection-ready audit-trail PDF** (PHA-15) — single-record consolidated PDF
- **User-access historical view** (PHA-17)
- **ATR workflow** (PHA-30) — MHRA-compliant audit trail review

#### Phase Q-D — Complaint, Recall & Pharmacovigilance Interface (2 months)
- **Complaint management** depth — already partial; add regulatory-notification thresholds
- **Recall / batch withdrawal** (PHA-13) — Class I/II/III, regulator-report PDFs
- **Pharmacovigilance interface** — bridge to Argus or in-house adverse-event log + MedDRA coding

#### Phase Q-E — Annual Reviews & CPV (1 month)
- **Annual Product Quality Review** (APQR) — already partial; deepen
- **Continued Process Verification** (PHA-21) — Cpk dashboards, drift alerts
- **Periodic review calendar** (PHA-27)

**Quality Phase total: 12 months with 3 engineers + 1 QA SME.**

---

### 4.3 Manufacturing / MES (vs Werum PAS-X)

The single biggest scope expansion. Without this you're competing with LabWare + Vault QMS, not with PAS-X.

#### Phase M-A — Master Batch Record (MBR) Library (2 months)
PHA-8 expanded: product-specific templates, ingredient master with grade hierarchy, step library with reusable instructions, IPC parameter master per modality.

#### Phase M-B — Executed Batch Manufacturing Record (eBMR) (4 months)
PHA-9 expanded: full operator-verifier dual-confirm workflow, electronic logbook integration with instruments (granulator, blender, compression, coater), yield reconciliation with theoretical-vs-actual variance investigation, deviation linkage on IPC excursion.

#### Phase M-C — Batch Packaging Record (BPR) (2 months)
PHA-10 expanded: primary + secondary + tertiary packaging records, label reconciliation, leaflet/insert tracking, serialization integration point.

#### Phase M-D — Dispensing + Material Issue (1.5 months)
PHA-11 — barcode-scanner-driven dispensing with balance integration, mix-up prevention, allocation to specific batch.

#### Phase M-E — Cleaning Verification + Cleaning Validation (2 months)
- **Cleaning verification** per batch (rinse sample, swab sample, visual inspection)
- **Cleaning validation** — formal protocol with worst-case rationale (most insoluble actives, smallest equipment ratio), recovery studies, MACO (Maximum Allowable Carry-Over) calculations
- **Cleaning matrix** per shared equipment train

#### Phase M-F — Line Clearance (0.5 months)
Pre-batch line-clearance checklist enforced before BMR can start.

#### Phase M-G — Sterile Manufacturing Extension (3 months)
- **Aseptic process simulation / media fill** — periodic full-cycle media fills with acceptance per Annex 1
- **Environmental monitoring during run** with real-time data
- **Personnel intervention log** in aseptic core
- **Gowning qualification + intervention training** linked to training module

#### Phase M-H — API Manufacturing Extension (3 months)
- **Multi-step synthesis** with intermediate-handling records
- **Solvent recovery + reuse** tracking
- **Reactor cycle log** with cleaning between campaigns
- **API genealogy** — see L-D

**Manufacturing Phase total: 18 months with 3-4 engineers + 1 manufacturing SME + 1 sterile SME (during M-G).**

---

### 4.4 Supply Chain — Procurement + Distribution

#### Phase S-A — Procurement / Purchase-to-Pay (3 months)
- **Material Requisition** generated from MRP based on planned batches
- **Purchase Order** with vendor catalog, negotiated price lists
- **Goods Receipt** — already exists (GRN); link to PO
- **Vendor Invoice + Three-Way Match** (PO + GRN + invoice)
- **Vendor performance scorecard** — on-time, in-spec rate, quality incidents
- **Drug Master File (DMF) tracking** for API vendors

#### Phase S-B — Distribution / Order-to-Cash (4 months)
- **Customer Master** with tier, payment terms, regulatory market
- **Sales Order** with product allocation, shelf-life check
- **Shipment** with cold-chain temperature monitor integration
- **Customer Invoice + AR**
- **Customer Returns** workflow
- **Distribution channel partner** management

#### Phase S-C — Serialization & Track-and-Trace (4 months)
- **DSCSA (US)** — 2D barcode (GS1), serial number generation, EPCIS event reporting, aggregation/disaggregation
- **EU FMD** — unique identifier + tamper-evident seal verification
- **Russia Chestny Znak** — direct connection to MDLP
- **India BCD (Barcode Compliance)** — manufacturer-level serialization
- **China track-and-trace** — NMPA requirements
- **EPCIS event store** + regulator gateway adapters

#### Phase S-D — Good Distribution Practice (GDP) (2 months)
- **Transport temperature monitoring** with data logger integration
- **Cold-chain excursion handling** with deviation auto-creation
- **Distribution audit trail** end-to-end

**Supply Chain Phase total: 13 months with 3 engineers + 1 supply chain SME.**

---

### 4.5 Engineering / Maintenance / Facilities

#### Phase E-A — Preventive + Breakdown Maintenance (2 months)
PHA-18 expanded.

#### Phase E-B — Calibration Master + Reminder (1 month)
PHA-22 expanded.

#### Phase E-C — Utility eLogbook (2 months)
PHA-19 expanded: Water Purification System (WPS), HVAC, Compressed Air, Nitrogen, Steam, with online sensor data acquisition where present.

#### Phase E-D — Asset Management Lite (1 month)
- Asset register, spare parts inventory, AMC contracts, asset lifecycle

**Engineering Phase total: 6 months with 1-2 engineers + 1 engineering SME.**

---

### 4.6 HR Extension

#### Phase H-A — Curriculum + Training Records (already covered above in Q-A)

#### Phase H-B — Operator Certification Tests (1 month)
- Written assessment, observation checklist
- Pass/fail thresholds per role

#### Phase H-C — Visitor & Contractor Management (1 month)
- GMP induction tracking before entry
- Sign-in/sign-out logs
- Confidentiality agreement tracking

**HR extension total: 2 months with 1 engineer.**

---

### 4.7 Regulatory & Validation Deliverables

#### Phase R-A — CSV Pack Generator (already PL-12)

#### Phase R-B — Inspection Readiness Dashboard (2 months)
- Aggregates: training compliance, calibration status, periodic review status, open deviations/CAPAs, ATR status
- Pre-inspection self-assessment with scoring

#### Phase R-C — eCTD Submission Support (3 months)
- Module 1 (administrative), Module 2 (summary), Module 3 (CMC) generation from system data
- Region-specific eCTD variants (US, EU, India, China)

#### Phase R-D — Pharmacovigilance Module (3 months)
- Adverse event capture
- MedDRA dictionary
- Causality assessment
- Regulator gateway adapters (FAERS, EudraVigilance, EMA, CDSCO)
- Or: Argus/ArisGlobal integration if customer already uses one

**Regulatory Phase total: 8 months with 2 engineers + 1 RA SME.**

---

## 5. Calendar timeline

Two scenarios.

### 5.1 Aggressive — 15-20 engineer team, 4 calendar years

```
Year 1 (months 1-12):    Platform Layer + Domain L (LIMS) + Domain Q (Quality)
                         Result: enterprise LIMS + QMS for OSD, single regulator (FDA)
                         Sellable: yes — competes with LabWare+TrackWise mid-market

Year 2 (months 13-24):   Domain M (Manufacturing) + Multi-regulator + Sterile modality
                         Result: full LIMS+QMS+MES for OSD+Sterile, FDA+EMA+CDSCO
                         Sellable: yes — competes with Werum PAS-X for OSD/sterile

Year 3 (months 25-36):   Domain S (Supply Chain) + API modality + China (NMPA)
                         Result: full platform for OSD+Sterile+API, all five regulators
                         Sellable: yes — competes head-on with SAP S/4HANA Pharma mid-tier

Year 4 (months 37-48):   Domain E (Engineering) + Domain R (Regulatory) + Integrations + Mobility
                         Result: complete platform with regulatory submission support
                         Sellable: yes — full Veeva+LabWare+PAS-X+SAP alternative
```

### 5.2 Realistic — 5-8 engineer team, 5 calendar years

```
Year 1:  Platform Layer + LIMS Depth (L-A only)
Year 2:  LIMS Phase L-B/L-C + Quality Phase Q-A/Q-B
Year 3:  Quality Phase Q-C/Q-D/Q-E + Manufacturing Phase M-A/M-B
Year 4:  Manufacturing M-C through M-F + Supply Chain S-A
Year 5:  Manufacturing M-G/M-H + Supply Chain S-B/S-C/S-D + Engineering + Regulatory
```

Both scenarios assume ramping team. Year 1 starts with 5 engineers; year 2 ramps to 8; year 3 to 12-15.

---

## 6. Team & Hiring

| Role | Year 1 | Year 2 | Year 3 | Year 4-5 |
|---|---|---|---|---|
| Backend engineers | 3 | 5 | 8 | 10 |
| Frontend engineers | 2 | 3 | 4 | 5 |
| Platform/DevOps | 1 | 1 | 2 | 2 |
| QA / SDET | 1 | 2 | 3 | 3 |
| Pharma SME (QC) | 1 | 1 | 1 | 1 |
| Pharma SME (QA) | 1 (shared) | 1 | 1 | 1 |
| Pharma SME (Manufacturing) | - | 1 | 1 | 1 |
| Pharma SME (Sterile) | - | - | 1 | 1 |
| Pharma SME (Regulatory) | shared | 1 | 1 | 1 |
| Product Manager | 1 | 1 | 2 | 2 |
| Technical Writer | - | 1 | 1 | 1 |
| Translator/Linguist pool | shared | shared | shared | shared |
| **Total** | **~10** | **~16** | **~25** | **~28** |

**Critical hires to make in Year 1**: a pharma QC SME with 10+ years (preferably ex-Cipla / Sun / Dr. Reddy's QC Manager), a QA SME with audit experience, and a Senior Platform Engineer who's built multi-tenant SaaS before. Without these three the architecture decisions made in PL-1 through PL-12 will be wrong and you'll rework them in Year 2.

---

## 7. Architectural decisions to lock in Year 1

The platform layer (Section 3) makes or breaks the next 4 years. The five decisions that have the biggest blast radius:

1. **Multi-tenancy model**: schema-per-tenant vs shared-schema-with-RLS. Pick early because it touches every query. Recommendation: shared-schema with PostgreSQL Row Level Security for ease of operations + schema-per-tenant option for enterprise customers requiring physical isolation.
2. **Workflow engine**: build vs adopt (Camunda / Flowable). Build is faster short-term, adopt scales better. Recommendation: adopt Camunda or Flowable for QMS workflows, build only for LIMS-specific state machines.
3. **i18n approach**: gettext-style key-value vs ICU MessageFormat. Recommendation: ICU MessageFormat throughout (handles pluralization, gender, date formatting properly across all 7 target languages).
4. **Audit storage**: same-DB vs separate audit DB. Recommendation: separate audit DB sized for 50-100x volume of operational DB, append-only, hash-chained.
5. **Document storage**: blob in DB vs S3-compatible. Recommendation: S3-compatible from day one (PL-9), never blob.

Get these wrong and rework is months. Get them right and you can move fast.

---

## 8. Compliance scope expansion

The five regulators (FDA, EMA, CDSCO, WHO, NMPA) plus seven pharmacopoeias (USP, EP, BP, IP, JP, ChP, IndPC) mean BatchSphere needs to handle:

| Concern | FDA | EMA | CDSCO | WHO | NMPA |
|---|---|---|---|---|---|
| Audit trail granularity | every field change | every field change | every field change | every field change | every field change + Chinese language |
| E-signature meaning | mandatory text on every sign | mandatory text | mandatory text | mandatory text | mandatory text + Chinese citizen ID for signatures |
| Data residency | US (HIPAA-adjacent) | EU (GDPR) | India (sensitive personal data per DPDP) | n/a | **China (mandatory in-country)** |
| Submission format | eCTD | eCTD | eCTD (since 2026) | adapted regional | eCTD + Chinese translation |
| Batch record retention | 1 year past expiry | 5 years past distribution | 1 year past expiry | per market | 5 years past expiry |
| Inspection notice | 5 days typical | scheduled | usually unannounced | n/a | usually announced |

The **NMPA + China data residency requirement** is the single hardest constraint. You may need a separate deployment of BatchSphere in mainland China (in partnership with a Chinese cloud provider — Alibaba Cloud, Tencent Cloud, or Huawei Cloud) that's network-isolated from the rest of the platform. Plan for this in PL-2.

---

## 9. Language strategy

You asked for 7 languages: English, Hindi, Telugu, Kannada, Tamil, Mandarin, Spanish. Practical considerations:

| Language | Script | Native speakers | Pharma market relevance | Localization difficulty |
|---|---|---|---|---|
| English | Latin | global | universal | baseline |
| Hindi | Devanagari | 600M+ | Indian pharma frontline | medium — script + pharma terminology |
| Telugu | Telugu script | 80M+ | Hyderabad (Aurobindo, Dr. Reddy's, Divis) | medium — script complexity |
| Kannada | Kannada script | 50M+ | Bangalore (Biocon, Strides) | medium — script complexity |
| Tamil | Tamil script | 80M+ | Chennai (Orchid, Caplin Point) | medium — script complexity |
| Mandarin (zh-CN) | Simplified Chinese | 1B+ | mandatory for China market | hard — pharma terminology + IME |
| Spanish (es-ES + es-MX) | Latin | 500M+ | LATAM + Spain | low |

**Recommendations**:
- **Phase 1 (PL-3)**: en + hi + es + zh-CN. Most impact for least effort.
- **Phase 2 (Year 2)**: te + kn + ta. Recruit native-speaker translators (one per language) for ongoing maintenance.
- **Phase 3 (Year 3+)**: ar (Arabic for Middle East), pt-BR (Brazilian Portuguese), ru (Russia/CIS), fr (French Africa), de (German for EU operations) on demand.

**Critical for pharma**: regulatory terminology must be translated by someone with pharma background, not a general translator. Maintain a controlled glossary per language (PL-3 deliverable).

---

## 10. Comparison: BatchSphere vs each competitor at platform completion

This is the "why we win" pitch at Year 4-5.

### vs LabWare LIMS
- BatchSphere wins on: modern stack, integrated QMS (LabWare needs separate QMS), better cloud-native model, multi-language including Indian regional, modern UX
- LabWare wins on: 35 years of installed base, deeper instrument integration library (300+ connectors), regulator familiarity
- **Strategy**: target Indian + Southeast Asian mid-tier where LabWare is too expensive and too legacy

### vs TrackWise / Sparta
- BatchSphere wins on: integrated LIMS+QMS (TrackWise is QMS-only), modern UX, lower TCO, Indian regional language
- TrackWise wins on: enterprise installed base, regulatory familiarity
- **Strategy**: undercut on price for mid-market; over-deliver on integration

### vs Veeva Vault QMS
- BatchSphere wins on: integrated LIMS+ERP (Veeva is QMS+RIM only), lower price, on-prem option
- Veeva wins on: cloud trust, scale, sales motion
- **Strategy**: target customers who want one vendor for the full pharma stack; or sell where Veeva is priced out

### vs SAP S/4HANA Pharma
- BatchSphere wins on: pharma-native design, faster onboarding, lower TCO, integrated quality
- SAP wins on: enterprise gravitas, financial integration depth, partner ecosystem
- **Strategy**: target customers under $500M revenue who don't need SAP's complexity

### vs Werum PAS-X
- BatchSphere wins on: integrated platform, modern stack, lower TCO
- Werum wins on: deep MES expertise, 50-year batch-record heritage
- **Strategy**: target sites that need MES but can't afford Werum

---

## 11. Money & milestones

You'll need funding milestones aligned to phase completion. A typical Series-A→C path for this scope:

| Stage | When | Milestone | Funding | Engineers |
|---|---|---|---|---|
| Seed | now | First 2 customers signed, current 60% LIMS+QMS | $1-3M | 5-7 |
| Series A | end Year 1 | Platform Layer done, 5-10 customers, $500K-$1M ARR | $8-15M | 10-15 |
| Series B | end Year 2 | LIMS+QMS+early MES, 20-30 customers, $3-5M ARR | $25-40M | 20-30 |
| Series C | end Year 3-4 | Full platform, 50+ customers, $15-25M ARR | $50-100M | 40-60 |

If self-funded or bootstrapped, double every timeline. If acquired by a larger pharma-software player (TraceLink, Honeywell-Sparta, etc.) along the way, the team operates as their pharma quality cloud division.

---

## 12. Risks ranked

1. **Scope creep without prioritization.** Mitigation: ruthless phase gates. No "let's also add X" until phase done.
2. **Pharma SME bandwidth.** Mitigation: hire 3-5 SMEs in Year 1 even before you "need" them. They drive the design.
3. **Validation cost.** Each release needs CSV. Mitigation: PL-12 generator + CI-driven OQ from day one. Manual CSV doesn't scale past 5 customers.
4. **China NMPA requirement.** Mitigation: defer to Year 3 unless China is target customer Year 1. Building two deployments is expensive.
5. **Single-vendor concentration in early customers.** If your first 3 customers all want different things, you'll drift. Mitigation: pick a single anchor customer profile (e.g., "mid-tier OSD Indian generic, 50-200 person plant"), serve them well, expand from there.
6. **Talent retention.** 4-5 years is long. Equity packages must reflect that.
7. **Regulatory change during build.** EU GMP Annex 11 revision is expected; FDA Computer Software Assurance (CSA) guidance is recent; ICH Q9(R1) was revised in 2023. Mitigation: have an RA SME who tracks these.
8. **Multi-language quality.** A bad Hindi translation in a regulated UI is worse than English-only. Mitigation: native-speaker pharma reviewer per language.

---

## 13. What to do in the next 90 days

If you adopt this roadmap as the program of record, the practical next 90 days look like:

| Week | Action |
|---|---|
| 1-2 | Founder + product owner align on roadmap; decide aggressive (4yr) vs realistic (5yr) scenario; commit team size for Year 1 |
| 2-4 | Hire / contract: Senior Platform Engineer, QC SME (Yamini can lead this), QA SME |
| 3-6 | Lock the five Year-1 architectural decisions (Section 7) with the new Platform Engineer |
| 4-8 | Begin PL-1 (multi-tenancy), PL-4 (audit+esign platform), PL-12 (CSV pack generator) in parallel |
| 6-12 | Finish closing PHA-15 (inspection-ready audit-trail PDF) — best demo asset for fundraising |
| 8-12 | First customer conversation with this roadmap as the pitch |
| 12 | Series A conversation if not yet funded |

Within 90 days you should have: roadmap signed off, Year 1 team hired, first three platform tickets in motion, and at least one inspection-ready demo asset (the audit-trail PDF).

---

## 14. What this document is not

- **Not a guarantee.** Software estimates at this scale are uncertain. Treat the 4-5 year as a +30% / -10% range.
- **Not a contractual commitment to any feature.** Customer engagement will reshape priority within each phase.
- **Not a substitute for a proper Product Requirements Doc per phase.** Each phase needs its own deep PRD before engineering starts.
- **Not a market strategy.** Go-to-market, pricing, partnerships, and sales motion are separate documents — equally important, not in scope here.

---

## 15. Document hierarchy

After this doc is committed, the doc set becomes:

| Doc | Role | Maintainer |
|---|---|---|
| `ENTERPRISE_PLATFORM_ROADMAP.md` (this) | North-star strategy | Founders + PM |
| `PLATFORM_LAYER_PRD.md` | Active Year 1 platform backlog, PL-1 through PL-12 in implementation-ticket form | Platform lead |
| `LIMS_MASTER_PLAN.md` | LIMS feature delivery (legacy, will be subsumed into LIMS domain plan) | LIMS squad lead |
| `TECH_DEBT_BACKLOG.md` | Engineering hygiene | Platform lead |
| `PHARMA_DOMAIN_GAP_ANALYSIS.md` | Domain gaps for OSD Indian scope (now superseded by this doc for global scope) | Archive once platform plan adopted |

Future docs to create per phase as committed:
- `LIMS_DOMAIN_PRD_2027.md` (Phase L-A through L-D)
- `QUALITY_DOMAIN_PRD_2027.md` (Phase Q-A through Q-E)
- `MANUFACTURING_DOMAIN_PRD_2027.md` (Phase M-A through M-H)
- `SUPPLY_CHAIN_DOMAIN_PRD.md`
- `REGULATORY_AND_VALIDATION_PRD.md`

---

## 16. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-18 | Strategic planning pass | Initial draft following founder ambition reframe to global enterprise platform |

---

## 17. Closing note

You said "wholesome product, not just demo." This is the document for that. It's intentionally ambitious — building a platform-class pharma product is intentionally hard, and pretending it's not won't make it easier. What this gives you is **a credible structure** to evaluate decisions against ("does this serve Year 2 LIMS depth or is it scope creep?"), **a hiring blueprint**, **a phasing that produces sellable product at every milestone** (not a 5-year stealth build), and **a clear competitive framing** so you know what you're winning at every phase.

If you want, I can next:
1. Draft the **Platform Layer PRD** (PL-1 through PL-12 in deep ticket form, ~50 tickets) — this is what engineering would start on day 1
2. Draft a **Year 1 OKRs document** with specific quarterly milestones tied to this roadmap
3. Build a **first customer pitch deck outline** that uses the competitive frame in Section 10
4. Run a depth-first pass on one chosen domain (LIMS Phase L-A) with full ticket breakdown

Whichever is most useful — but I'd recommend (1) Platform Layer PRD first, because that's the work you should actually start.
