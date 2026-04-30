# Material Master Data Gaps

Last updated: 2026-04-28

## Purpose

This note captures the current gaps between the `Create Material` UI and the backend persistence model.

These are not fixed in the current pass. They should be handled in a later backend + DB alignment pass.

## Confirmed Gap

The `Create Material` UI currently exposes fields that are not persisted by the backend.

Confirmed after checking:

- frontend create page:
  [MaterialCreatePage.tsx](/Users/induraghav/gitrepo/batchsphere/core/ui/src/features/master-data/materials/MaterialCreatePage.tsx:1)
- frontend request types:
  [material.ts](/Users/induraghav/gitrepo/batchsphere/core/ui/src/types/material.ts:1)
- backend request DTO:
  [MaterialRequest.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/masterdata/material/dto/MaterialRequest.java:1)
- backend entity:
  [Material.java](/Users/induraghav/gitrepo/batchsphere/core/src/main/java/com/batchsphere/core/masterdata/material/entity/Material.java:1)

## Fields Currently Shown In UI But Not Stored In DB

- `hsnCode`
- `casNumber`
- `pharmacopoeialRef`

## Additional UI Fields To Recheck In The Same Pass

These are present in the frontend model/UI and should be explicitly checked during the same backend-alignment task:

- `materialCategory`
- `genericNames`
- `maxHumidity`
- `lightSensitivity`
- `shelfLifeMonths`
- `retestPeriodMonths`
- `reorderLevel`
- `leadTimeDays`
- `controlledSubstance`

Note: this document only confirms the persistence gap for `hsnCode`, `casNumber`, and `pharmacopoeialRef`.
The remaining fields should be verified one by one in the later pass before implementation.

## Fields Already Confirmed As Persisted

These are already backed by the backend model:

- `materialCode`
- `materialName`
- `materialType`
- `uom`
- `specId`
- `storageCondition`
- `photosensitive`
- `hygroscopic`
- `hazardous`
- `selectiveMaterial`
- `vendorCoaReleaseAllowed`
- `samplingRequired`
- `description`
- `createdBy`

## Impact

Current behavior means a user can enter some values in the `Create Material` UI, but those values are dropped before DB persistence.

Practical impact:

- data appears captured in UI flow
- data is not available after reload
- material master data is incomplete for regulatory/commercial usage
- UAT can produce false confidence if testers assume those fields are saved

## Recommended Fix Scope

Handle this as one small end-to-end material master data alignment task:

1. add DB columns in `material`
2. update `Material` entity
3. update `MaterialRequest`
4. update service mapping create/update flows
5. update API response DTO if needed
6. verify edit flow reloads persisted values
7. add focused backend and UI regression tests later

## Minimum Fields To Add In The First Fix Pass

If the fix is kept narrow, start with:

- `hsnCode`
- `casNumber`
- `pharmacopoeialRef`

That is the confirmed mismatch from this review.

## Suggested UAT Note Until Fixed

During current UAT, do not treat these fields as part of accepted material persistence:

- `HSN Code`
- `CAS Number`
- `Pharmacopoeial Ref`

They should be considered display/input-only until the backend alignment is completed.
