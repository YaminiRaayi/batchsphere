# Critical Action E-Signature Matrix

ALC-4 evidence file. Scope: GMP-impacting LIMS, QMS, GRN, CoA/QP, and report actions.

| Area | Critical action | API / service path | Required role | E-sign required | Meaning text | Audit event | Test evidence / status |
|---|---|---|---|---|---|---|---|
| QC results | Amend locked result | `QcTestResultServiceImpl.amendResult()` | QC analyst / manager | Yes | Request `eSignatureMeaning` | `QC_TEST_RESULT` `E_SIGNATURE` + `UPDATE` | Existing sampling integration coverage |
| QC investigations | Complete Phase 2 | `SamplingServiceImpl.completePhase2()` | QC manager | Yes | Request `eSignatureMeaning` | `QC_INVESTIGATION` `E_SIGNATURE` | Existing sampling integration coverage |
| Sampling request | QC approve/reject decision | `SamplingServiceImpl.recordQcDecision()` | QC manager | Yes | Request `eSignatureMeaning` | `SAMPLING_REQUEST` `E_SIGNATURE` + status audit | Existing sampling integration coverage |
| Stability | Complete study | `StabilityServiceImpl.updateStatus()` | QC manager | Yes for `COMPLETED` | Request meaning/default | `STABILITY_STUDY` e-sign/audit | Existing stability integration coverage |
| Environmental monitoring | Dismiss action-limit breach | `EnvironmentalMonitoringServiceImpl.dismissBreach()` | SUPER_ADMIN / QC_MANAGER | Yes | Request `meaning` | `EM_RESULT` `E_SIGNATURE` + `UPDATE` | `EnvironmentalMonitoringControllerIntegrationTest.dismissingBreachRequiresReasonAndRemovesFromOpenList()` |
| Environmental monitoring | Link breach to deviation | `EnvironmentalMonitoringServiceImpl.linkDeviation()` | LIMS allowed role | No | Not applicable | `EM_RESULT` `UPDATE` | Justification: creates traceable QMS linkage, not closure/override |
| Equipment | Qualification failure/critical status sign-off | `EquipmentServiceImpl` qualification record path | QC manager | Yes when result requires sign-off | Request/default meaning | Qualification e-sign/audit | Existing equipment coverage |
| Deviation | Close deviation | `DeviationServiceImpl.updateStatus()` | QC manager / QA role path | Yes | Request meaning/default | `QMS_DEVIATION` `E_SIGNATURE` + status audit | Existing deviation integration coverage |
| CAPA | Approve plan | `CapaServiceImpl.approve()` | QC manager | Yes | Request `meaning` | `QMS_CAPA` `E_SIGNATURE` | Existing CAPA integration coverage |
| CAPA | Close CAPA | `CapaServiceImpl.updateStatus()` | QC manager | Yes for `CLOSED` | Request `meaning` | `QMS_CAPA` `E_SIGNATURE` | Existing CAPA integration coverage |
| CAPA | Effectiveness review | `CapaServiceImpl.reviewEffectiveness()` | QC manager | Yes | Request `meaning` | `QMS_CAPA` `E_SIGNATURE` | Existing CAPA integration coverage |
| Change control | Approve / reject | `ChangeControlServiceImpl.approve()` / `reject()` | QC manager | Yes | Request/default meaning | `QMS_CHANGE_CONTROL` `E_SIGNATURE` | Existing change-control coverage |
| Change control | Close implementation | `ChangeControlServiceImpl.close()` | QC manager | Yes | Request/default meaning | `QMS_CHANGE_CONTROL` `E_SIGNATURE` | Existing change-control coverage |
| Controlled documents | Approve document revision | `ControlledDocumentServiceImpl.approve()` | QC manager | Yes | Request meaning | `CONTROLLED_DOCUMENT` e-sign/audit | Existing document integration coverage |
| Controlled documents | Acknowledge effective document | `ControlledDocumentServiceImpl.acknowledge()` | Assigned user | Yes | Request meaning | `DOCUMENT_ACKNOWLEDGEMENT` e-sign/audit | Existing document integration coverage |
| Complaint | Close complaint | `ComplaintServiceImpl.close()` | QC manager | Yes | Request meaning/default | `QMS_COMPLAINT` `E_SIGNATURE` | Existing complaint coverage |
| Risk assessment | Accept / approve risk | `RiskAssessmentServiceImpl.accept()` | QC manager | Yes | Request meaning/default | `QMS_RISK_ASSESSMENT` `E_SIGNATURE` | Existing risk coverage |
| APQR | Approve APQR | `ApqrServiceImpl.approveApqr()` | QC manager | Yes | Request meaning/default | `APQR` `E_SIGNATURE` + status audit | `ApqrControllerIntegrationTest` |
| APQR | Close APQR after approval | `ApqrServiceImpl.closeApqr()` | QC manager | No | Not applicable | `APQR` status audit | Justification: close is post-approval administrative lifecycle state |
| QP batch release | Certify batch | `QpBatchReleaseServiceImpl.certify()` | QC manager / QP path | Yes | Request meaning/default | `QP_BATCH_RELEASE` `E_SIGNATURE` | Existing QP release coverage |
| CoA | Analyst sign CoA | `QpBatchReleaseServiceImpl.analystSignCoa()` | QC analyst / manager | Yes | Default action meaning | `QP_BATCH_RELEASE` e-sign/audit | Existing CoA coverage |
| CoA | Issue CoA | `QpBatchReleaseServiceImpl.issueCoa()` | QC manager | Yes | Default action meaning | `QP_BATCH_RELEASE` e-sign/audit | Existing CoA coverage |
| GRN | CoA review decision | `GrnServiceImpl.reviewCoa()` | Warehouse/QC workflow role | No current e-sign | Not applicable | `GRN` audit | Justification: upstream CoA/QP release has dual signatures; GRN review records warehouse disposition |
| GRN | Cancel/deactivate draft GRN | `GrnServiceImpl.cancelGrn()` / `deactivateGrn()` | Warehouse role | No current e-sign | Not applicable | `GRN` status/update audit | Justification: draft/cancel warehouse record lifecycle, no GMP result override |

## Enforcement Pattern

- Critical action endpoint is role-gated in `SecurityConfig` or controller/service role path.
- Request requires username/password and meaning where e-sign is mandatory.
- `ESignatureService.sign()` verifies current authenticated user credentials and writes immutable e-signature row.
- Service records an `E_SIGNATURE` audit event on same GMP entity, then records status/update audit.
- Wrong password fails before state change.
