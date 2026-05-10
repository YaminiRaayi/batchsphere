# Phase 2 Plan

## Current Position

- Phase 0: done
- Phase 1: done
- Current roadmap position: 2.0

Phase 2 in the roadmap is **Backend API Completeness**.

## Goal

Complete the missing backend workflow/API pieces so the existing frontend modules can become fully functional without workaround logic.

## Phase 2 Scope

### 2.1 Inventory — Status Transitions & Movements

Check and complete:

- inventory status transition APIs
- inventory movement / adjustment APIs if missing
- validation rules for allowed transitions
- audit consistency using authenticated actor
- test coverage for transition behavior

### 2.2 Sampling — Complete the QC Decision Workflow

Check and complete:

- full QC decision lifecycle
- approval / rejection edge cases
- inventory status updates after QC decision
- CoA-based release behavior
- service and integration tests for full sampling workflow

### 2.3 GRN — Multi-Item & Improvements

Check and complete:

- multi-item GRN behavior against roadmap expectations
- document upload flow validation
- receive / cancel / deactivate edge cases
- label generation and downstream triggers
- integration coverage for complete GRN flow

### 2.4 Warehouse Location — Enhancements

Check and complete:

- hierarchy enhancements requested by roadmap
- any missing retrieval / tree-friendly APIs
- warehouse usability gaps for frontend
- validation coverage for hierarchy updates and deactivation

### 2.5 Cross-Cutting Backend Improvements

Check and complete:

- endpoint-by-endpoint review for missing APIs
- DTO / validation consistency
- exception/message consistency
- audit behavior consistency
- integration tests for major workflows

## Recommended Order

1. Inventory gap review
2. Sampling QC workflow review
3. GRN review
4. Warehouse enhancement review
5. Cross-cutting cleanup and tests

## Suggested First Task Tomorrow

Start with an inventory and sampling API review against the roadmap, because those are the most workflow-critical backend areas after authentication.

## Definition Of Done For Phase 2

Phase 2 should be considered done when:

- all current core backend workflows required by frontend are available
- status transitions are validated and tested
- sampling and GRN flows behave end-to-end correctly
- warehouse APIs support intended frontend usage
- major backend workflow gaps are closed before Phase 3 frontend completion
