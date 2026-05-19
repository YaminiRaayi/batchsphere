# BatchSphere — Session Resume Guide
**Purpose:** Bring a new collaborator (engineer, AI session, future you) up to speed in one read.
**Last updated:** 2026-05-19

---

## 1. Paste-this prompt to resume with an AI assistant

Copy the block below into a new chat:

> I'm working on **BatchSphere**, a pharma platform under `/Users/induraghav/gitrepo/batchsphere/core/`. Before we work on anything new, read the five planning docs in this order: `core/docs/ENTERPRISE_PLATFORM_ROADMAP.md` (master strategy), `core/docs/PLATFORM_LAYER_PRD.md` (active Year 1 platform backlog), `core/docs/LIMS_MASTER_PLAN.md` (completed LIMS feature delivery + ALCOA++), `core/docs/PHARMA_DOMAIN_GAP_ANALYSIS.md` (domain depth reference), `core/docs/TECH_DEBT_BACKLOG.md` (engineering hygiene — currently deprioritized).
>
> **Confirmed scope:** LIMS + QMS + ERP integrated platform competing with LabWare + TrackWise + SAP S/4HANA Pharma. Five regulators (FDA, EMA, CDSCO, WHO, NMPA). Three modalities (OSD, Sterile, API). Seven languages (English, Hindi, Telugu, Kannada, Tamil, Mandarin, Spanish). Includes Distribution/O2C, Procurement/P2P, Cleaning Validation. 4-5 year, 15-20 person program. Sellable milestones each year. See `ENTERPRISE_PLATFORM_ROADMAP.md` for the master plan.
>
> **Standing decisions:** Tech debt is deprioritized (don't pull TD tickets ahead of feature work). LIMS Sprint 1-3, ALCOA++ readiness, and LIMS navigation MVP are closed. Phase-by-phase ticket creation — detailed tickets are written 6 months ahead of execution. The active planning artifact is `core/docs/PLATFORM_LAYER_PRD.md`, expanding PL-1 through PL-12 from the Roadmap Section 3 into implementation-ready platform tickets.
>
> Now confirm you've read those five docs and tell me what you'd recommend doing next based on current state.

---

## 2. Document hierarchy (read in this order)

| # | Document | Purpose | Length |
|---|---|---|---|
| 1 | `ENTERPRISE_PLATFORM_ROADMAP.md` | North-star strategic plan — scope, phases, team, timeline | ~700 lines |
| 2 | `PLATFORM_LAYER_PRD.md` | Active Year 1 platform backlog, PL-1 through PL-12 expanded into implementation tickets | ~800 lines |
| 3 | `LIMS_MASTER_PLAN.md` | Completed LIMS feature tickets + ALCOA++ + LIMS navigation MVP | ~1500 lines |
| 4 | `PHARMA_DOMAIN_GAP_ANALYSIS.md` | 30 PHA tickets for Indian OSD scope — superseded by Roadmap but useful tactical reference | ~700 lines |
| 5 | `TECH_DEBT_BACKLOG.md` | 19 TD tickets for engineering hygiene — **deprioritized for now** | ~500 lines |

After those five, optional deeper reading:
- `core/CLAUDE.md` — codebase quick reference (slightly out of date on migration count)
- `core/docs/ARCHITECTURE.md` — current architecture
- `core/docs/AUTH_USAGE.md` — auth implementation guide

---

## 3. Current state snapshot (2026-05-19)

### What's built and shipped
- LIMS Sprint 1-3 closed: G-1, LIMS-A (instrument linkage + calibration gate), LIMS-B (CSV import), LIMS-3 (CoA dual e-sign), LIMS-4 (reagent + reference standard), LIMS-6 (stability), LIMS-7 (instrument logbook), LIMS-8 (environmental monitoring with breach link/dismiss workflow).
- ALCOA++ ALC-1 through ALC-8 closed: metadata monitoring, no-hard-delete cleanup, audit matrix, e-sign matrix, OOS/OOT lock-down, audit timeline/report references, readiness dashboard/export, final validation pack.
- Section 11 Proper Pharma Product Checklist in `LIMS_MASTER_PLAN.md` is fully checked and verified.
- LIMS navigation MVP closed: dedicated LIMS sidebar, dashboard, worksheets, OOS investigations, CoA shortcut, reports hub, compliance hub.
- Last recorded validation in `LIMS_MASTER_PLAN.md`: `cd core && ./mvnw test` PASS (156 tests), `cd core/ui && npm run build` PASS.

### What's open
- **All 19 TD tickets** in `TECH_DEBT_BACKLOG.md` — deprioritized.
- **All 30 PHA tickets** in `PHARMA_DOMAIN_GAP_ANALYSIS.md` — subsumed by global Roadmap.
- **All Roadmap phases**: PL-1..12 (platform), L-A..D (LIMS depth), Q-A..E (Quality), M-A..H (Manufacturing), S-A..D (Supply Chain), E-A..D (Engineering), R-A..D (Regulatory). Outlined in Roadmap; full ticket detail to be written phase-by-phase as each phase approaches execution.

### Next concrete artifact to write
**Platform Layer PRD / implementation** — use `core/docs/PLATFORM_LAYER_PRD.md` as the Year 1 foundation backlog. First implementation track should start with PL-1 (multi-tenancy), PL-4 (audit/e-sign platform layer), and PL-12 (CSV validation pack generator), while keeping PHA-15 (inspection-ready audit-trail PDF) as a demo asset.

---

## 4. Cadence for future ticket creation

| When to write detailed tickets | What to write |
|---|---|
| Now | Platform Layer PRD (PL-1 → PL-12) and first platform implementation slice |
| 3 months before LIMS depth phase starts | LIMS Domain PRD (L-A → L-D expanded) |
| 3 months before Quality phase | Quality Domain PRD (Q-A → Q-E expanded) |
| 3 months before Manufacturing phase (after manufacturing SME hired) | Manufacturing Domain PRD (M-A → M-H) |
| 3 months before Supply Chain phase | Supply Chain PRD (S-A → S-D) |
| 3 months before Engineering / Regulatory | Engineering + Regulatory PRDs |

**Rule of thumb:** keep ~6 months of detailed tickets ahead, ~18 months of outlined work, anything beyond at thematic level. Writing 3-year tickets upfront is waterfall thinking and most will be rewritten.

---

## 5. Standing decisions to honor

| Decision | Made on | By |
|---|---|---|
| Scope = global LIMS+QMS+ERP, not Indian-OSD-only | 2026-05-18 | Yamini |
| Five regulators: FDA, EMA, CDSCO, WHO, NMPA | 2026-05-18 | Yamini |
| Three modalities: OSD, Sterile, API | 2026-05-18 | Yamini |
| Seven languages: en, hi, te, kn, ta, zh-CN, es | 2026-05-18 | Yamini |
| Tech debt deprioritized until core platform solid | 2026-05-18 | Yamini |
| Phase-by-phase ticket creation, not big-bang | 2026-05-18 | Yamini |
| Platform Layer PRD is next planning artifact | 2026-05-18 | Joint |
| LIMS Sprint 1-3 + ALCOA++ + LIMS navigation MVP are complete | 2026-05-19 | Implementation evidence |

---

## 6. Anti-patterns to avoid in any new session

- **Don't propose tech-debt work** ahead of feature work without explicit ask (Yamini pushed it back).
- **Don't suggest features outside confirmed scope** (biologics, medical devices, vet pharma) without flagging "out of v1 scope."
- **Don't write all 400+ future tickets upfront** — that's waterfall and they'd be wrong.
- **Don't pretend 100% pharma coverage is a real target** — it isn't; "85-90% of an OSD+Sterile+API plant under 5 regulators" is.
- **Don't drop the multi-language requirement** — it's a hard requirement, not optional.
- **Don't drop the China NMPA / data residency requirement** — it's the hardest single constraint and shapes platform architecture.

---

## 7. How to find what's true

| Question | Where the answer is |
|---|---|
| Is feature X built? | `LIMS_MASTER_PLAN.md` Section 2 (built table) + grep the codebase |
| What's the timeline? | `ENTERPRISE_PLATFORM_ROADMAP.md` Section 5 |
| What's the team size? | `ENTERPRISE_PLATFORM_ROADMAP.md` Section 6 |
| Why these regulators / modalities / languages? | `ENTERPRISE_PLATFORM_ROADMAP.md` Sections 8, 9 + Yamini's confirmed requirements |
| What's the next ticket to pick up? | This doc, Section 3 → "Next concrete artifact" |
| What architectural decisions are pending? | `ENTERPRISE_PLATFORM_ROADMAP.md` Section 7 |

---

## 8. Change log

| Date | Author | Change |
|---|---|---|
| 2026-05-18 | Planning pass | Initial draft to enable session continuity after strategic alignment |
