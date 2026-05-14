# BatchSphere Spec Index

**Created:** 2026-05-14  
**Scope:** All enhancements identified from pharma regulatory analysis, global guidelines review, and technical improvement sessions.  
**Current migration baseline:** V79 (`create_capa_reassignment`). Phase 6G uses V80–V83. Phase 6H uses V84–V85. Phase 7 uses V86–V89.

---

## Planning Documents in This Folder

| File | Phase | Topics |
|---|---|---|
| [PHASE_6H_COMPLIANCE_GAPS.md](./PHASE_6H_COMPLIANCE_GAPS.md) | 6H | ALCOA+ data integrity, retention samples, complaint management, equipment qualification |
| [PHASE_7_ADVANCED_MODULES.md](./PHASE_7_ADVANCED_MODULES.md) | 7 | ICH Q9 risk management, APQR, supplier quality agreements, QP batch release |
| [TECH_IMPROVEMENTS.md](./TECH_IMPROVEMENTS.md) | Cross-cutting | Security, reporting, UX, architecture, performance, data quality |

## Cross-References to Active Planning Docs

| File | Contents |
|---|---|
| [../NEXT_DEVELOPMENT_PLAN_2026-05-11.md](../NEXT_DEVELOPMENT_PLAN_2026-05-11.md) | Phase 6A–6G tickets (active implementation plan) |
| [../CODEX_IMPLEMENTATION_EXECUTION_PLAN.md](../CODEX_IMPLEMENTATION_EXECUTION_PLAN.md) | Step-by-step execution plan with migration baselines |

---

## Full Ticket Registry

### Phase 6G — Pharma Compliance Gap Backfill (defined 2026-05-13)

| Ticket | Title | Migration | Status |
|---|---|---|---|
| 6G.1 | Fix pre-existing compile errors | None | Not started |
| 6G.2 | Audit timeline wiring — CAPA + Change Control | None | Not started |
| 6G.3 | Dashboard QMS/compliance KPI expansion | None | Not started |
| 6G.4 | Document review date tracking | V80 | Not started |
| 6G.5 | GRN rejection → deviation auto-creation | None | Not started |
| 6G.6 | MoA → controlled SOP document linkage | V81 | Not started |
| 6G.7 | Training gate enforcement (sampling + QC) | None | Not started |
| 6G.8 | OOS/OOT investigation two-phase workflow | V82 | Not started |
| 6G.9 | Lot/batch traceability view | None | Not started |
| 6G.10 | Change Control affected entity FK navigation | V83 | Not started |

### Phase 6H — Global Guidelines Compliance (defined 2026-05-14)

| Ticket | Title | Migration | Regulatory Basis | Mockup |
|---|---|---|---|---|
| 6H.1 | ALCOA+ data integrity controls | None | FDA DI Guidance 2018, Annex 11 §9 | — |
| 6H.2 | Retention sample lifecycle | V84 | EU GMP Annex 19 | [14-retention-samples.html](../../ux-mockups/14-retention-samples.html) |
| 6H.3 | Complaint and product defect management | V85 | EU GMP Chapter 8, FDA 21 CFR 211.198 | [12-complaint-management.html](../../ux-mockups/12-complaint-management.html) |
| 6H.4 | Equipment/instrument qualification (IQ/OQ/PQ) | V86 | EU GMP Annex 15 | [15-equipment-qualification.html](../../ux-mockups/15-equipment-qualification.html) |

### Phase 7 — Advanced QMS Modules (defined 2026-05-14)

| Ticket | Title | Migration | Regulatory Basis | Mockup |
|---|---|---|---|---|
| 7.1 | ICH Q9 Quality Risk Management (FMEA) | V87 | ICH Q9, EU GMP Chapter 1 | [13-risk-assessment.html](../../ux-mockups/13-risk-assessment.html) |
| 7.2 | Annual Product Quality Review (APQR) | V88 | ICH Q10 §3.2.1, EU GMP Ch.1.10 | [16-apqr.html](../../ux-mockups/16-apqr.html) |
| 7.3 | Supplier Quality Agreement management | V89 | PIC/S PE 009, WHO TRS 957 | — |
| 7.4 | QP batch release + batch certificate | V90 | EU GMP Annex 16, FDA 211.188 | [17-qp-batch-release.html](../../ux-mockups/17-qp-batch-release.html) |

---

## UX Mockup Index

| Mockup File | Module | Route | Phase |
|---|---|---|---|
| [12-complaint-management.html](../../ux-mockups/12-complaint-management.html) | Complaint Management | `/qms/complaints` | 6H.3 |
| [13-risk-assessment.html](../../ux-mockups/13-risk-assessment.html) | Risk Register (FMEA) | `/qms/risk-register` | 7.1 |
| [14-retention-samples.html](../../ux-mockups/14-retention-samples.html) | Retention Samples | `/lims/retention-samples` | 6H.2 |
| [15-equipment-qualification.html](../../ux-mockups/15-equipment-qualification.html) | Equipment Qualification | `/lims/equipment` | 6H.4 |
| [16-apqr.html](../../ux-mockups/16-apqr.html) | APQR | `/qms/apqr` | 7.2 |
| [17-qp-batch-release.html](../../ux-mockups/17-qp-batch-release.html) | QP Batch Release | `/qms/batch-release` | 7.4 |
| [18-lot-traceability.html](../../ux-mockups/18-lot-traceability.html) | Lot Traceability | `/qms/traceability` | 6G.9 |
| [19-supplier-scorecard.html](../../ux-mockups/19-supplier-scorecard.html) | Supplier Scorecard | `/master-data/partners/scorecard` | Tech |

---

## Regulatory Framework Coverage Matrix

| Framework | Current | After 6G | After 6H | After 7 |
|---|---|---|---|---|
| FDA 21 CFR Part 11 | 70% | 80% | 88% | 92% |
| EU GMP Vol.4 Ch. 1–6 | 60% | 70% | 82% | 88% |
| EU GMP Annex 8 (Sampling) | 80% | 85% | 95% | 95% |
| EU GMP Annex 11 (Computerised) | 60% | 72% | 83% | 88% |
| EU GMP Annex 15 (Qualification) | 5% | 5% | 40% | 50% |
| EU GMP Annex 19 (Retention) | 20% | 25% | 80% | 80% |
| EU GMP Chapter 8 (Complaints) | 0% | 0% | 70% | 75% |
| EU GMP Annex 16 (QP Release) | 0% | 0% | 0% | 65% |
| ICH Q9 (Risk Management) | 10% | 15% | 20% | 65% |
| ICH Q10 (PQS / APQR) | 40% | 45% | 50% | 75% |
| ICH Q1 (Stability) | 0% | 0% | 0% | 0% |
| WHO/PIC/S SQA | 0% | 0% | 0% | 50% |

---

## Implementation Priority Order

```
6G.1  ← compile blocker, do first
6G.2  ← quick win, audit trail wiring
6G.3  ← dashboard KPIs, quick win
6G.4  ← document review dates
6G.5  ← GRN→deviation auto-link
6G.6  ← MoA→SOP linkage
6H.1  ← ALCOA+ data lock (high FDA risk)
6G.7  ← training gates
6H.3  ← complaint management (inspector visible)
6G.8  ← OOS two-phase
6G.9  ← lot traceability (prereq for recall)
6H.2  ← retention samples (Annex 19)
6H.4  ← equipment qualification (Annex 15)
6G.10 ← CC entity navigation
7.1   ← ICH Q9 risk register
7.2   ← APQR (needs 1 year of data)
7.3   ← supplier quality agreement
7.4   ← QP batch release
```
