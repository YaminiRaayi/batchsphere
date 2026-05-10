# Implemented Work Summary

Date updated: 2026-04-23

This document summarizes what has been implemented in the current codebase based on the VMS, Material, GRN, Sampling, and Warehouse discussions.

## Vendor Management

- Enabled `Vendor Management` in the left sidebar.
- Wired the live route to the active Vendor Management screen.
- Implemented vendor CRUD on the active vendor flow.
- Implemented vendor category support.
- Implemented vendor performance and audit summary fields.
- Implemented real vendor approval at vendor level.
- Removed the old mocked 4-step qualification tick flow from the vendor page.
- Replaced it with a real summary using:
  - vendor approval
  - site count
  - qualified site count
  - latest site qualification status

## Vendor Documents and VBU Documents

- Implemented vendor-level corporate document management.
- Implemented VBU-level site compliance document management.
- Both levels now support:
  - upload
  - list
  - delete
  - download/open
- Document model is intentionally split:
  - `Vendor` documents = corporate/legal/commercial records
  - `VendorBusinessUnit` documents = site qualification/compliance records
- Vendor documents do not auto-qualify sites.

## Vendor and VBU Form Flow

- Vendor create/edit now supports staging corporate documents locally in the form.
- VBU create/edit now supports staging site documents locally in the form.
- Files are queued in the UI first.
- Files are uploaded only when the main form `Save` button is clicked.
- Detail cards now behave as view/download/delete areas, not instant-upload areas.

## Vendor Business Units

- Switched site qualification, audits, and site documents to `VendorBusinessUnit` to align with `VMS_PHARMA_DATA_MODEL.md`.
- Implemented VBU create/edit/deactivate.
- Implemented VBU audit management:
  - create
  - update
  - list
- Audit completion updates VBU qualification state.
- Updated the VBU page to show vendor-grouped hierarchy.
- Added pagination to the hierarchy panel instead of long scrolling.

## Vendor Page Layout

- Reworked the vendor page so these cards sit under the vendor list column:
  - `Qualification Status`
  - `Corporate Documents`
  - `Recent Transactions`
- Kept the vendor header and detail summary on the right.

## GRN

- Moved vendor and site selection into GRN.
- Kept `VendorBusinessUnit` optional for GRN for now.
- Implemented live GRN lookup on the vendor page instead of static recent transaction rows.

## Material Master

- Clarified material reference fields:
  - `HSN Code`
  - `CAS Number`
  - `Pharmacopoeial Ref.`
- Made `Specification & Testing` required.
- Added real Material-to-Spec linkage using `specId`.
- If `Vendor CoA Release` is enabled:
  - Material only allows CoA-based specs
- Material flow updated so:
  - `Material Type` comes first
  - `Material Name` comes next
  - `Material Code` is system-generated after save
- Implemented server-side material code generation by material type.
- Cleaned up Material wording so it clearly reflects warehouse/storage rules, not vendor linkage.

## Sampling and QC

- Sampling/QC now automatically uses the specification linked in Material Master.
- Sampling no longer allows spec override.
- Sampling UI shows the spec as read-only.
- Backend rejects sampling requests that do not match the material-linked spec.

## Warehouse and Test Environment Cleanup

- Removed active Warehouse page mock fallback data.
- Cleaned the development database for fresh testing.
- Cleared local `storage/` files for fresh testing.

## Current Working Rules

- Material owns the specification.
- Sampling/QC must use the material-linked specification automatically.
- Vendor/site selection belongs in GRN, not in Material Master.
- Vendor approval is tracked at `Vendor` level.
- Corporate/legal documents are tracked at `Vendor` level.
- Site qualification, site documents, and site audits are tracked at `VendorBusinessUnit` level.
- `VendorBusinessUnit` is optional in GRN for now.

## Verification Completed

- `npm run build` passed after the latest UI changes.
- `./mvnw -DskipTests package` passed.

## Remaining Items

- Add deeper backend/integration tests for:
  - vendor approval
  - vendor corporate documents
  - VBU documents and audits
  - material-spec enforcement
  - GRN to sampling/QC transitions
- Implement fuller QC disposition handling such as `Quarantine`.
- Later define proper controlled document management for:
  - specifications
  - method of analysis references
  - revision/effective-date lifecycle
