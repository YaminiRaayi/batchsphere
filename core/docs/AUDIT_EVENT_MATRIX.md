# Audit Event Coverage Matrix

Purpose: ALCOA++ proof that GMP create/update/status/result/e-sign/soft-delete actions call `AuditEventService.record()` or have a documented non-GMP/read-only reason.

## LIMS / Lab

| Module | Entity type | Service method / action | Audit type | Field | Actor source | Test evidence |
|---|---|---|---|---|---|---|
| Equipment | `LIMS_EQUIPMENT` | `EquipmentServiceImpl.create()` | `CREATE` | `status` | authenticated actor | `EquipmentControllerIntegrationTest` |
| Equipment | `LIMS_EQUIPMENT` | `EquipmentServiceImpl.update()` | `UPDATE` | `equipmentDetails` | authenticated actor | `EquipmentControllerIntegrationTest` |
| Equipment | `EQUIPMENT_QUALIFICATION_RECORD` | `EquipmentServiceImpl.addQualification()` | `CREATE` | `qualificationStatus` | authenticated actor | `EquipmentControllerIntegrationTest` |
| Instrument logbook | `INSTRUMENT_USAGE_LOG` | `InstrumentLogbookServiceImpl.createManualEntry()` | `CREATE` | `conditionAtUse` | authenticated actor | `InstrumentLogbookIntegrationTest` |
| Instrument logbook | `INSTRUMENT_USAGE_LOG` | `InstrumentLogbookServiceImpl.recordUsage()` | `CREATE` | `conditionAtUse` | authenticated actor | `InstrumentLogbookIntegrationTest` |
| Reagents | `LAB_REAGENT` | `ReagentInventoryServiceImpl.createReagent()` | `CREATE` | `reagentCode` | request actor | `ReagentInventoryIntegrationTest` |
| Reagents | `LAB_REAGENT_LOT` | `ReagentInventoryServiceImpl.addLot()` | `CREATE` | `status` | request actor | `ReagentInventoryIntegrationTest` |
| Reagents | `LAB_REAGENT_LOT` | `ReagentInventoryServiceImpl.updateLot()` | `UPDATE` | `quantityUsed` | request actor | `ReagentInventoryIntegrationTest` |
| Reference standards | `LAB_REFERENCE_STANDARD` | `ReagentInventoryServiceImpl.createReferenceStandard()` | `CREATE` | `standardCode` | request actor | `ReagentInventoryIntegrationTest` |
| Reference standards | `LAB_REFERENCE_STANDARD_LOT` | `ReagentInventoryServiceImpl.addReferenceStandardLot()` | `CREATE` | `status` | request actor | `ReagentInventoryIntegrationTest` |
| Reference standards | `LAB_REFERENCE_STANDARD_LOT` | `ReagentInventoryServiceImpl.updateReferenceStandardLot()` | `UPDATE` | `quantityUsed` | request actor | `ReagentInventoryIntegrationTest.referenceStandardLotUpdateRecordsAuditEvent()` |
| Stability | `STABILITY_STUDY` | `StabilityServiceImpl.createStudy()` | `CREATE` | `status` | request actor | `StabilityIntegrationTest` |
| Stability | `STABILITY_TIMEPOINT` | `StabilityServiceImpl.pullTimepoint()` | `UPDATE` | `status` | request actor | `StabilityIntegrationTest` |
| Stability | `STABILITY_TIMEPOINT` | `StabilityServiceImpl.recordResult()` | `UPDATE` | `status` | request actor | `StabilityIntegrationTest` |
| Stability | `STABILITY_RESULT` | `StabilityServiceImpl.recordResult()` | `CREATE` / `UPDATE` | `resultValue`, `ootFlag` | request actor | `StabilityIntegrationTest` |
| Stability | `STABILITY_STUDY` | `StabilityServiceImpl.completeStudy()` | `WORKFLOW_ACTION` | `status` | e-sign actor | `StabilityIntegrationTest` |
| Environmental monitoring | `EM_MONITORING_POINT` | `EnvironmentalMonitoringServiceImpl.createPoint()` | `CREATE` | `pointCode` | request actor | `EnvironmentalMonitoringIntegrationTest` |
| Environmental monitoring | `EM_RESULT` | `EnvironmentalMonitoringServiceImpl.recordResult()` | `CREATE` | `resultValue` | request actor | `EnvironmentalMonitoringIntegrationTest` |
| Environmental monitoring | `EM_RESULT` | `EnvironmentalMonitoringServiceImpl.linkDeviation()` | `UPDATE` | `linkedDeviationId` | request actor | `EnvironmentalMonitoringIntegrationTest` |
| Environmental monitoring | `EM_RESULT` | `EnvironmentalMonitoringServiceImpl.dismissBreach()` | `UPDATE` | `breachDismissed` | request actor | `EnvironmentalMonitoringIntegrationTest` |
| Sampling worksheet | `QC_WORKSHEET` | `QcWorksheetServiceImpl.generateWorksheet()` | `CREATE` | `status` | authenticated actor | `SamplingServiceIntegrationTest` |
| Sampling worksheet | `QC_WORKSHEET` | `QcWorksheetServiceImpl.importResultsCsv()` | `UPDATE` | row result fields | authenticated actor | `SamplingServiceIntegrationTest` |
| QC result | `QC_TEST_RESULT` | `QcTestResultServiceImpl.recordResult()` | `UPDATE` | `resultValue` | authenticated actor | `SamplingServiceIntegrationTest` |
| QC result | `QC_TEST_RESULT` | `QcTestResultServiceImpl.amendResult()` | `WORKFLOW_ACTION` | `amendment` | e-sign actor | `SamplingServiceIntegrationTest` |
| Sampling | `SAMPLING_REQUEST` | `SamplingServiceImpl.*workflow*()` | `STATUS_CHANGE` / `WORKFLOW_ACTION` | `requestStatus` | authenticated actor | `SamplingServiceIntegrationTest` |
| QC investigation | `QC_INVESTIGATION` | `SamplingServiceImpl.escalate/closeInvestigation()` | `STATUS_CHANGE` | `status` | authenticated actor | `SamplingServiceIntegrationTest` |
| GRN | `GRN` | `GrnServiceImpl.createGrn()` | `CREATE` | `status` | authenticated actor | `GrnControllerIntegrationTest` |
| GRN | `GRN` | `GrnServiceImpl.reviewCoa()` | `STATUS_CHANGE` | `coaReviewStatus` | authenticated actor | `GrnControllerIntegrationTest` |
| GRN | `GRN` | `GrnServiceImpl.updateGrn()` | `UPDATE` | `draftItems` | authenticated actor | `GrnControllerIntegrationTest.updatingDraftGrnDeactivatesSupersededItemsAndDocuments()` |
| GRN | `GRN` | `GrnServiceImpl.receiveGrn()` | `STATUS_CHANGE` | `status` | authenticated actor | `GrnControllerIntegrationTest` |
| GRN | `GRN` | `GrnServiceImpl.cancelGrn()` | `STATUS_CHANGE` | `status` | authenticated actor | `GrnControllerIntegrationTest` |
| GRN | `GRN` | `GrnServiceImpl.deactivateGrn()` | `UPDATE` | `isActive` | authenticated actor | `GrnControllerIntegrationTest.deactivatingDraftGrnAlsoDeactivatesItemsAndDocuments()` |
| GRN | `GRN_DOCUMENT` | `GrnServiceImpl.uploadDocument()` | `CREATE` | `documentType` | authenticated actor | `GrnControllerIntegrationTest` |
| GRN | `GRN_CONTAINER` | `GrnServiceImpl.applySamplingLabel()` | `WORKFLOW_ACTION` | `labelStatus` | authenticated actor | `GrnControllerIntegrationTest` |
| CoA / QP release | `QP_BATCH_RELEASE` | `QpBatchReleaseServiceImpl.*` | `CREATE` / `E_SIGNATURE` / `STATUS_CHANGE` / `WORKFLOW_ACTION` | status, checks, CoA | authenticated/e-sign actor | `QpBatchReleaseControllerIntegrationTest` |

## QMS

| Module | Entity type | Service method / action | Audit type | Field | Actor source | Test evidence |
|---|---|---|---|---|---|---|
| Deviation | `QMS_DEVIATION` | `DeviationServiceImpl.create()` | `CREATE` | `status` | authenticated actor | `DeviationControllerIntegrationTest` |
| Deviation | `QMS_DEVIATION` | `DeviationServiceImpl.update()` | `UPDATE` | `deviationDetails` | authenticated actor | `DeviationControllerIntegrationTest` |
| Deviation | `QMS_DEVIATION` | `DeviationServiceImpl.updateStatus()` | `STATUS_CHANGE` / `E_SIGNATURE` | `status`, closure e-sign | authenticated/e-sign actor | `DeviationControllerIntegrationTest` |
| Deviation | `QMS_DEVIATION` | `DeviationServiceImpl.createAutoDeviation()` | `CREATE` | `status` | system/trigger actor | `GrnControllerIntegrationTest` |
| CAPA | `QMS_CAPA` | `CapaServiceImpl.create()` | `CREATE` | `status` | authenticated actor | `CapaControllerIntegrationTest` |
| CAPA | `QMS_CAPA` | `CapaServiceImpl.update()` | `UPDATE` | `capaDetails` | authenticated actor | `CapaControllerIntegrationTest` |
| CAPA | `QMS_CAPA` | `CapaServiceImpl.close()` | `STATUS_CHANGE` / `E_SIGNATURE` | `status`, closure e-sign | authenticated/e-sign actor | `CapaControllerIntegrationTest` |
| CAPA | `QMS_CAPA` | `CapaServiceImpl.approve/reject/effectiveness*()` | `STATUS_CHANGE` / `E_SIGNATURE` / `UPDATE` | approval/effectiveness fields | authenticated/e-sign actor | `CapaControllerIntegrationTest` |
| CAPA attachments | `QMS_CAPA` | `CapaAttachmentServiceImpl.add/remove()` | `UPDATE` | `attachment` | authenticated actor | `CapaControllerIntegrationTest` |
| Change control | `QMS_CHANGE_CONTROL` | `ChangeControlServiceImpl.create/update()` | `CREATE` / `UPDATE` | status/details | authenticated actor | `ChangeControlControllerIntegrationTest` |
| Change control | `QMS_CHANGE_CONTROL` | submit/approve/reject/start/move/close/cancel | `STATUS_CHANGE` / `E_SIGNATURE` | status, e-sign ids | authenticated/e-sign actor | `ChangeControlControllerIntegrationTest.closureGeneratesAuditEventsVisibleInTimeline()` |
| Change control | `QMS_CHANGE_CONTROL` | affected entity add/remove | `UPDATE` | `affectedEntity` | authenticated actor | `ChangeControlControllerIntegrationTest.removingAffectedEntitySoftDeletesRowAndRecordsAudit()` |
| Change control | `QMS_CHANGE_CONTROL` | task add/update/remove | `WORKFLOW_ACTION` / `STATUS_CHANGE` | task/taskStatus | authenticated actor | `ChangeControlControllerIntegrationTest` |
| Complaint | `QMS_COMPLAINT` | `ComplaintServiceImpl.*` | `CREATE` / `UPDATE` / `STATUS_CHANGE` | status/details | authenticated actor | `ComplaintControllerIntegrationTest` |
| Risk assessment | `QMS_RISK_ASSESSMENT` | `RiskAssessmentServiceImpl.*` | `CREATE` / `UPDATE` / `STATUS_CHANGE` / `E_SIGNATURE` | status/risk/e-sign fields | authenticated/e-sign actor | `RiskAssessmentControllerIntegrationTest` |
| Controlled document | `CONTROLLED_DOCUMENT` | `ControlledDocumentServiceImpl.create/revise/submit/approve/distribute/acknowledge/retire()` | `CREATE` / `UPDATE` / `STATUS_CHANGE` / `WORKFLOW_ACTION` | status/revision/distribution | authenticated actor | `ControlledDocumentControllerIntegrationTest` |
| APQR | `APQR` | `ApqrServiceImpl.createApqr()` | `CREATE` | `status` | authenticated actor | `ApqrControllerIntegrationTest.createsCompilesApprovesAndClosesApqr()` |
| APQR | `APQR` | `ApqrServiceImpl.compileApqr()` | `STATUS_CHANGE` | `status` | authenticated actor | `ApqrControllerIntegrationTest.createsCompilesApprovesAndClosesApqr()` |
| APQR | `APQR` | `ApqrServiceImpl.updateConclusions()` | `UPDATE` | `conclusions` | authenticated actor | `ApqrControllerIntegrationTest.createsCompilesApprovesAndClosesApqr()` |
| APQR | `APQR` | `ApqrServiceImpl.approveApqr()` | `E_SIGNATURE` / `STATUS_CHANGE` | approval e-sign/status | e-sign actor | `ApqrControllerIntegrationTest.createsCompilesApprovesAndClosesApqr()` |
| APQR | `APQR` | `ApqrServiceImpl.closeApqr()` | `STATUS_CHANGE` | `status` | authenticated actor | `ApqrControllerIntegrationTest.createsCompilesApprovesAndClosesApqr()` |
| Supplier quality agreement | `SUPPLIER_QUALITY_AGREEMENT` | `SupplierQualityAgreementServiceImpl.*` | `CREATE` / `UPDATE` / `STATUS_CHANGE` | status/details | authenticated actor | `SupplierQualityAgreementControllerIntegrationTest` |

## Read-Only / Non-GMP Rows

| Area | Reason no audit event required |
|---|---|
| Dashboard count endpoints | Read-only projections; source records already audited. |
| Report list/filter endpoints | Read-only retrieval; generated PDF/CSV carries metadata. |
| Summary endpoints | Read-only aggregate views; no persisted GMP state change. |
| ALCOA readiness summary/gaps | Read-only compliance projection; gap source records hold audit trail. |
