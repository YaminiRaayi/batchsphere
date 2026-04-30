import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppShellStore } from "../../stores/appShellStore";
import {
  completeSamplingInvestigationQaReview,
  completeSampling,
  destroySamplingRetainedSample,
  escalateSamplingInvestigationToPhaseTwo,
  executeSamplingResample,
  executeSamplingRetest,
  createSamplingPlan,
  fetchBatches,
  fetchGrnItemContainers,
  fetchMaterials,
  fetchMoas,
  fetchPallets,
  fetchSamplingCycles,
  fetchSamplingInvestigations,
  fetchSamplingRequests,
  fetchSpecParameters,
  fetchSamplingSummary,
  fetchSamplingWorksheet,
  fetchSamplingTools,
  fetchSpecs,
  handoffSamplingToQc,
  openSamplingInvestigation,
  recordQcDecision,
  recordSamplingWorksheetResult,
  receiveSamplingInQc,
  resolveSamplingInvestigation,
  startSampling,
  startSamplingQcReview,
  updateSamplingPlan
} from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { Batch } from "../../types/batch";
import type { GrnContainer } from "../../types/grn";
import type { Pallet } from "../../types/location";
import type { Material } from "../../types/material";
import type { Moa } from "../../types/moa";
import type { SamplingTool } from "../../types/sampling-tool";
import type { Spec, SpecParameter } from "../../types/spec";
import type {
  CompleteQaInvestigationReviewRequest,
  DestroyRetainedSampleRequest,
  EscalateQcInvestigationRequest,
  QcDecisionRequest,
  QcReceiptRequest,
  QcInvestigation,
  QcWorksheetRow,
  ExecuteResampleRequest,
  ExecuteRetestRequest,
  OpenQcInvestigationRequest,
  RecordQcWorksheetResultRequest,
  ResolveQcInvestigationRequest,
  SampleType,
  SamplingContainerSampleRequest,
  SamplingMethod,
  SamplingPlanRequest,
  SamplingRequest,
  StartQcReviewRequest,
  SamplingSummary
} from "../../types/sampling";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDotColor(status: string) {
  switch (status) {
    case "APPROVED":    return "bg-green-500";
    case "REJECTED":    return "bg-rose-500";
    case "UNDER_INVESTIGATION": return "bg-fuchsia-500";
    case "RETEST_REQUIRED": return "bg-yellow-500";
    case "RESAMPLE_REQUIRED": return "bg-amber-500";
    case "RESAMPLED":   return "bg-slate-500";
    case "UNDER_REVIEW":return "bg-violet-500";
    case "RECEIVED":    return "bg-cyan-500";
    case "HANDED_TO_QC":return "bg-indigo-500";
    case "SAMPLED":     return "bg-orange-500";
    case "IN_PROGRESS": return "bg-orange-400";
    case "COMPLETED":   return "bg-amber-500";
    case "PLAN_DEFINED":return "bg-amber-400";
    case "REQUESTED":   return "bg-blue-400";
    default:            return "bg-slate-400";
  }
}

function statusPillCls(status: string) {
  switch (status) {
    case "APPROVED":    return "bg-green-100 text-green-700";
    case "REJECTED":    return "bg-rose-100 text-rose-700";
    case "UNDER_INVESTIGATION": return "bg-fuchsia-100 text-fuchsia-700";
    case "RETEST_REQUIRED": return "bg-yellow-100 text-yellow-700";
    case "RESAMPLE_REQUIRED": return "bg-amber-100 text-amber-700";
    case "RESAMPLED":   return "bg-slate-100 text-slate-700";
    case "UNDER_REVIEW":return "bg-violet-100 text-violet-700";
    case "RECEIVED":    return "bg-cyan-100 text-cyan-700";
    case "HANDED_TO_QC":return "bg-indigo-100 text-indigo-700";
    case "SAMPLED":     return "bg-orange-100 text-orange-700";
    case "IN_PROGRESS": return "bg-orange-100 text-orange-700";
    case "COMPLETED":   return "bg-amber-100 text-amber-700";
    case "PLAN_DEFINED":return "bg-amber-100 text-amber-700";
    case "REQUESTED":   return "bg-blue-100 text-blue-700";
    default:            return "bg-slate-100 text-slate-500";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":    return "Approved";
    case "REJECTED":    return "Rejected";
    case "UNDER_INVESTIGATION": return "Investigation";
    case "RETEST_REQUIRED": return "Retest Required";
    case "RESAMPLE_REQUIRED": return "Resample Required";
    case "RESAMPLED":   return "Resampled";
    case "UNDER_REVIEW":return "QC Review";
    case "RECEIVED":    return "QC Received";
    case "HANDED_TO_QC":return "Handed to QC";
    case "SAMPLED":     return "Sampled";
    case "IN_PROGRESS": return "Sampling";
    case "COMPLETED":   return "QC Complete";
    case "PLAN_DEFINED":return "Plan Set";
    case "REQUESTED":   return "Pending";
    default:            return status;
  }
}

function isActiveInvestigationStatus(status: string) {
  return status === "PHASE_I" || status === "PHASE_II";
}

function isPendingQaInvestigationStatus(status: string) {
  return status === "QA_REVIEW_PENDING";
}

function isClosedInvestigationStatus(status: string) {
  return status === "CLOSED_INVALID" || status === "CLOSED_CONFIRMED" || status === "CLOSED_RETEST" || status === "CLOSED_RESAMPLE";
}

function isReturnedInvestigation(item: QcInvestigation) {
  return isActiveInvestigationStatus(item.status) && item.qaReviewDecision === "RETURNED";
}

function phaseSummaryLabel(phase: QcInvestigation["phase"]) {
  return phase === "PHASE_II" ? "Phase II summary" : "Phase I summary";
}

function closureCategoryLabel(category: NonNullable<QcInvestigation["closureCategory"]>) {
  switch (category) {
    case "INVALIDATED_NO_ASSIGNABLE_CAUSE": return "Invalidated";
    case "RETEST_FROM_RETAINED_SAMPLE": return "Retest from retained sample";
    case "FRESH_RESAMPLE_REQUIRED": return "Fresh resample required";
    case "MATERIAL_REJECTION_CONFIRMED": return "Material rejection confirmed";
    default: return category;
  }
}

function getChecklist(status: string, hasPlan: boolean) {
  const isTesting = status === "UNDER_TEST" || status === "APPROVED" || status === "REJECTED";
  const isDone    = status === "APPROVED"   || status === "REJECTED";
  return [
    { label: "Label verified against GRN",              done: hasPlan   },
    { label: "Container integrity checked (no damage)", done: hasPlan   },
    { label: "COA received and verified",               done: hasPlan   },
    { label: "Sample collected and labelled",           done: isTesting },
    { label: "Quarantine label applied to containers",  done: isTesting },
    { label: "LIMS test request submitted",             done: isDone    }
  ];
}

const sampleTypes: SampleType[] = ["INDIVIDUAL", "COMPOSITE"];
const requestStatuses = ["ALL", "REQUESTED", "PLAN_DEFINED", "IN_PROGRESS", "SAMPLED", "HANDED_TO_QC", "RECEIVED", "UNDER_REVIEW", "UNDER_INVESTIGATION", "RETEST_REQUIRED", "RESAMPLE_REQUIRED", "RESAMPLED", "APPROVED", "REJECTED"] as const;
const qaReviewApprovalConfirmation = "I APPROVE THIS QA REVIEW";
const qaReviewReturnConfirmation = "I RETURN THIS INVESTIGATION TO QC";
const qcDecisionApprovalConfirmation = "I APPROVE THIS FINAL QC DECISION";
const qcDecisionRejectionConfirmation = "I REJECT THIS FINAL QC DECISION";

function formatDateInputValue(value?: string | null) {
  return value ? value.slice(0, 10) : "";
}

function createInitialPlanForm(currentUserName: string): SamplingPlanRequest {
  return {
    samplingMethod: "SQRT_N_PLUS_1",
    sampleType: "COMPOSITE",
    specId: "",
    moaId: "",
    totalContainers: 1,
    containersToSample: 1,
    individualSampleQuantity: 0,
    compositeSampleQuantity: 0,
    samplingLocation: "",
    analystEmployeeCode: "",
    samplingToolId: "",
    photosensitiveHandlingRequired: false,
    hygroscopicHandlingRequired: false,
    coaBasedRelease: false,
    rationale: "",
    containerSamples: [],
    createdBy: currentUserName,
    updatedBy: currentUserName
  };
}

function computeRequiredContainers(method: SamplingMethod, totalContainers: number) {
  switch (method) {
    case "HUNDRED_PERCENT":   return totalContainers;
    case "SQRT_N_PLUS_1":     return Math.min(totalContainers, Math.ceil(Math.sqrt(totalContainers) + 1));
    case "COA_BASED_RELEASE": return 0;
    default:                  return totalContainers;
  }
}

// ─── SamplingPage ─────────────────────────────────────────────────────────────

export function SamplingPage() {
  const currentUserName = useAppShellStore((state) => state.currentUser.name);
  const authUser = useAuthStore((state) => state.user);
  const authenticatedUsername = authUser?.username ?? "";
  const canQaReviewInvestigations = authUser?.role === "QC_MANAGER" || authUser?.role === "SUPER_ADMIN";
  const canRecordFinalQcDecision = canQaReviewInvestigations;
  const [requests, setRequests]               = useState<SamplingRequest[]>([]);
  const [summary, setSummary]                 = useState<SamplingSummary | null>(null);
  const [materials, setMaterials]             = useState<Material[]>([]);
  const [batches, setBatches]                 = useState<Batch[]>([]);
  const [pallets, setPallets]                 = useState<Pallet[]>([]);
  const [specs, setSpecs]                     = useState<Spec[]>([]);
  const [moas, setMoas]                       = useState<Moa[]>([]);
  const [samplingTools, setSamplingTools]     = useState<SamplingTool[]>([]);
  const [containersByRequest, setContainersByRequest] = useState<Record<string, GrnContainer[]>>({});
  const [selectedRequestId, setSelectedRequestId]     = useState<string>("");
  const [statusFilter, setStatusFilter]       = useState<(typeof requestStatuses)[number]>("ALL");
  const [planForm, setPlanForm]               = useState<SamplingPlanRequest>(() => createInitialPlanForm(currentUserName));
  const [qcRemarks, setQcRemarks]             = useState("");
  const [qcDecisionSignoff, setQcDecisionSignoff] = useState({ confirmedBy: "", confirmationText: "" });
  const [qcReceiptForm, setQcReceiptForm]     = useState<QcReceiptRequest>({ receivedBy: currentUserName, receiptCondition: "", sampleStorageLocation: "", retainedFlag: false });
  const [qcReviewForm, setQcReviewForm]       = useState<StartQcReviewRequest>({ analystCode: "" });
  const [worksheet, setWorksheet]             = useState<QcWorksheetRow[]>([]);
  const [worksheetInputs, setWorksheetInputs] = useState<Record<string, RecordQcWorksheetResultRequest>>({});
  const [cycles, setCycles]                   = useState<SamplingRequest[]>([]);
  const [investigations, setInvestigations]   = useState<QcInvestigation[]>([]);
  const [investigationForm, setInvestigationForm] = useState<OpenQcInvestigationRequest>({ qcTestResultId: "", reason: "", initialAssessment: "", investigationType: "OOS" });
  const [resolveForms, setResolveForms]       = useState<Record<string, ResolveQcInvestigationRequest>>({});
  const [phaseTwoForms, setPhaseTwoForms]     = useState<Record<string, EscalateQcInvestigationRequest>>({});
  const [qaReviewForms, setQaReviewForms]     = useState<Record<string, CompleteQaInvestigationReviewRequest>>({});
  const [retestForm, setRetestForm]           = useState<ExecuteRetestRequest>({ analystCode: "", remarks: "" });
  const [resampleForm, setResampleForm]       = useState<ExecuteResampleRequest>({ reason: "" });
  const [destroyRetainedForm, setDestroyRetainedForm] = useState<DestroyRetainedSampleRequest>({ remarks: "" });
  const [isLoading, setIsLoading]             = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [planError, setPlanError]             = useState<string | null>(null);
  const [successMessage, setSuccessMessage]   = useState<string | null>(null);
  const [specParametersBySpecId, setSpecParametersBySpecId] = useState<Record<string, SpecParameter[]>>({});

  useEffect(() => {
    if (!authenticatedUsername) {
      return;
    }
    setQcDecisionSignoff((current) => current.confirmedBy === authenticatedUsername ? current : {
      ...current,
      confirmedBy: authenticatedUsername
    });
  }, [authenticatedUsername]);

  useEffect(() => {
    let cancelled = false;
    async function loadSamplingQueue() {
      setIsLoading(true);
      setError(null);
      try {
        const [requestPage, summaryData, materialPage, batchPage, palletPage, specData, moaData, toolData] =
          await Promise.all([
            fetchSamplingRequests(),
            fetchSamplingSummary(),
            fetchMaterials(),
            fetchBatches(),
            fetchPallets(),
            fetchSpecs(),
            fetchMoas(),
            fetchSamplingTools()
          ]);
        const specParameterEntries = await Promise.all(
          specData.map(async (spec) => [spec.id, await fetchSpecParameters(spec.id)] as const)
        );
        if (!cancelled) {
          setRequests(requestPage.content);
          setSummary(summaryData);
          setMaterials(materialPage.content);
          setBatches(batchPage.content);
          setPallets(palletPage.content);
          setSpecs(specData);
          setMoas(moaData);
          setSamplingTools(toolData);
          setSpecParametersBySpecId(Object.fromEntries(specParameterEntries));
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unknown error while loading sampling requests");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadSamplingQueue();
    return () => { cancelled = true; };
  }, []);

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const batchMap    = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const palletMap   = useMemo(() => new Map(pallets.map((p) => [p.id, p])), [pallets]);
  const specMap     = useMemo(() => new Map(specs.map((s) => [s.id, s])), [specs]);

  const selectedRequest  = requests.find((r) => r.id === selectedRequestId) ?? null;
  const selectedMaterial = selectedRequest ? materialMap.get(selectedRequest.materialId) ?? null : null;
  const requestContainers = selectedRequest ? containersByRequest[selectedRequest.id] ?? [] : [];
  const sampleQuantityUom = selectedMaterial?.uom ?? "";
  const selectedBatch  = selectedRequest?.batchId ? batchMap.get(selectedRequest.batchId) : null;
  const selectedPallet = selectedRequest ? palletMap.get(selectedRequest.palletId) : null;
  const selectedSpec   = selectedRequest?.plan ? specMap.get(selectedRequest.plan.specId) : null;
  const selectedPlanSpecParameters = planForm.specId ? specParametersBySpecId[planForm.specId] ?? [] : [];
  const selectedPlanMoaIds = useMemo(
    () => Array.from(new Set(selectedPlanSpecParameters.map((parameter) => parameter.moaId).filter((value): value is string => Boolean(value)))),
    [selectedPlanSpecParameters]
  );
  const selectedPlanMoas = useMemo(
    () => (selectedPlanMoaIds.length > 0 ? moas.filter((moa) => selectedPlanMoaIds.includes(moa.id)) : moas),
    [moas, selectedPlanMoaIds]
  );

  useEffect(() => {
    if (!selectedRequest || containersByRequest[selectedRequest.id]) return;
    const request = selectedRequest;
    let cancelled = false;
    async function loadContainers() {
      const containers = await fetchGrnItemContainers(request.grnItemId);
      if (!cancelled) setContainersByRequest((c) => ({ ...c, [request.id]: containers }));
    }
    void loadContainers();
    return () => { cancelled = true; };
  }, [containersByRequest, selectedRequest]);

  useEffect(() => {
    if (!selectedRequest) return;
    setQcRemarks(selectedRequest.qcDecisionRemarks ?? "");
    setQcReceiptForm({
      receivedBy: selectedRequest.sample?.receivedByQc ?? currentUserName,
      receiptCondition: selectedRequest.sample?.receiptCondition ?? "",
      sampleStorageLocation: selectedRequest.sample?.qcStorageLocation ?? "",
      retainedFlag: selectedRequest.sample?.retainedFlag ?? false,
      retainedQuantity: selectedRequest.sample?.retainedQuantity ?? undefined,
      retainedUntil: formatDateInputValue(selectedRequest.sample?.retainedUntil) || undefined
    });
    setQcReviewForm({ analystCode: selectedRequest.plan?.analystEmployeeCode ?? "" });
    setRetestForm({
      analystCode: selectedRequest.plan?.analystEmployeeCode ?? "",
      remarks: ""
    });
    setQcDecisionSignoff({ confirmedBy: authenticatedUsername, confirmationText: "" });
    setResampleForm({ reason: selectedRequest.resampleReason ?? "" });
    setDestroyRetainedForm({ remarks: "" });
    if (selectedRequest.plan) {
      setPlanForm({
        samplingMethod: selectedRequest.plan.samplingMethod as SamplingMethod,
        sampleType: selectedRequest.plan.sampleType as SampleType,
        specId: selectedRequest.plan.specId,
        moaId: selectedRequest.plan.moaId,
        totalContainers: selectedRequest.plan.totalContainers,
        containersToSample: selectedRequest.plan.containersToSample,
        individualSampleQuantity: selectedRequest.plan.individualSampleQuantity ?? 0,
        compositeSampleQuantity: selectedRequest.plan.compositeSampleQuantity ?? 0,
        samplingLocation: selectedRequest.plan.samplingLocation,
        analystEmployeeCode: selectedRequest.plan.analystEmployeeCode,
        samplingToolId: selectedRequest.plan.samplingToolId,
        photosensitiveHandlingRequired: selectedRequest.plan.photosensitiveHandlingRequired,
        hygroscopicHandlingRequired: selectedRequest.plan.hygroscopicHandlingRequired,
        coaBasedRelease: selectedRequest.plan.coaBasedRelease,
        rationale: selectedRequest.plan.rationale ?? "",
        containerSamples: selectedRequest.plan.containerSamples.map((s) => ({
          grnContainerId: s.grnContainerId,
          sampledQuantity: s.sampledQuantity
        })),
        createdBy: currentUserName,
        updatedBy: currentUserName
      });
      return;
    }
    setPlanForm({
      ...createInitialPlanForm(currentUserName),
      specId: selectedMaterial?.specId ?? "",
      moaId: selectedMaterial?.specId
        ? (() => {
            const specParameters = specParametersBySpecId[selectedMaterial.specId] ?? [];
            const uniqueMoaIds = Array.from(new Set(specParameters.map((parameter) => parameter.moaId).filter((value): value is string => Boolean(value))));
            return uniqueMoaIds.length === 1 ? uniqueMoaIds[0] : "";
          })()
        : "",
      totalContainers: selectedRequest.totalContainers,
      containersToSample: selectedRequest.totalContainers,
      photosensitiveHandlingRequired: selectedRequest.photosensitiveMaterial,
      hygroscopicHandlingRequired: selectedRequest.hygroscopicMaterial
    });
  }, [authenticatedUsername, currentUserName, selectedMaterial, selectedRequest, specParametersBySpecId]);

  useEffect(() => {
    if (!selectedRequest?.sample || planForm.samplingMethod === "COA_BASED_RELEASE") {
      setWorksheet([]);
      setWorksheetInputs({});
      return;
    }
    if (!["RECEIVED", "UNDER_REVIEW", "COMPLETED", "APPROVED", "REJECTED", "RESAMPLED"].includes(selectedRequest.requestStatus)) {
      setWorksheet([]);
      setWorksheetInputs({});
      return;
    }
    const samplingRequestId = selectedRequest.id;
    let cancelled = false;
    async function loadWorksheet() {
      try {
        const rows = await fetchSamplingWorksheet(samplingRequestId);
        if (cancelled) return;
        setWorksheet(rows);
        setWorksheetInputs(Object.fromEntries(rows.map((row) => [row.id, {
          resultValue: row.resultValue ?? undefined,
          resultText: row.resultText ?? undefined,
          moaIdUsed: row.moaIdUsed ?? row.specMoaId ?? undefined,
          remarks: row.remarks ?? undefined
        }])));
      } catch {
        if (!cancelled) {
          setWorksheet([]);
          setWorksheetInputs({});
        }
      }
    }
    void loadWorksheet();
    return () => { cancelled = true; };
  }, [currentUserName, planForm.samplingMethod, selectedRequest]);

  useEffect(() => {
    if (!selectedRequest) {
      setCycles([]);
      setInvestigations([]);
      setResolveForms({});
      setPhaseTwoForms({});
      setQaReviewForms({});
      return;
    }
    const request = selectedRequest;
    let cancelled = false;
    async function loadCycleData() {
      try {
        const [cycleRows, investigationRows] = await Promise.all([
          fetchSamplingCycles(request.id),
          fetchSamplingInvestigations(request.id)
        ]);
        if (cancelled) return;
        setCycles(cycleRows);
        setInvestigations(investigationRows);
        setResolveForms(Object.fromEntries(investigationRows.map((item) => [item.id, {
          outcome: "RESUME_REVIEW",
          phaseSummary: item.phase === "PHASE_II" ? (item.phaseTwoSummary ?? "") : (item.phaseOneSummary ?? ""),
          rootCause: item.rootCause ?? "",
          resolutionRemarks: item.resolutionRemarks ?? "",
          capaRequired: item.capaRequired,
          capaReference: item.capaReference ?? ""
        }])));
        setPhaseTwoForms(Object.fromEntries(investigationRows.map((item) => [item.id, {
          phaseOneSummary: item.phaseOneSummary ?? "",
          phaseTwoAssessment: item.phaseTwoAssessment ?? ""
        }])));
        setQaReviewForms(Object.fromEntries(investigationRows.map((item) => [item.id, {
          approved: true,
          qaReviewRemarks: item.qaReviewRemarks ?? "",
          confirmedBy: item.qaReviewedBy ?? authenticatedUsername,
          confirmationText: ""
        }])));
      } catch {
        if (!cancelled) {
          setCycles([]);
          setInvestigations([]);
          setResolveForms({});
          setPhaseTwoForms({});
          setQaReviewForms({});
        }
      }
    }
    void loadCycleData();
    return () => { cancelled = true; };
  }, [authenticatedUsername, selectedRequest]);

  useEffect(() => {
    if (!selectedMaterial) return;
    const sel = specMap.get(planForm.specId);
    const method = sel?.samplingMethod ?? "SQRT_N_PLUS_1";
    const requiredContainers = computeRequiredContainers(method, planForm.totalContainers);
    const nextSamples =
      method === "COA_BASED_RELEASE"
        ? []
        : requestContainers.slice(0, requiredContainers).map((container) => {
            const existing = planForm.containerSamples.find((s) => s.grnContainerId === container.id);
            return { grnContainerId: container.id, sampledQuantity: existing?.sampledQuantity ?? 0 };
          });
    const compositeSampleQuantity = nextSamples.reduce((sum, s) => sum + Number(s.sampledQuantity || 0), 0);
    setPlanForm((c) => ({
      ...c,
      samplingMethod: method,
      containersToSample: requiredContainers,
      coaBasedRelease: method === "COA_BASED_RELEASE",
      containerSamples: nextSamples,
      individualSampleQuantity: method === "COA_BASED_RELEASE" ? 0 : c.individualSampleQuantity,
      compositeSampleQuantity: method === "COA_BASED_RELEASE" ? 0 : compositeSampleQuantity,
      sampleType: method === "COA_BASED_RELEASE" ? "COMPOSITE" : c.sampleType,
      photosensitiveHandlingRequired: selectedMaterial.photosensitive,
      hygroscopicHandlingRequired: selectedMaterial.hygroscopic
    }));
  }, [planForm.specId, planForm.totalContainers, requestContainers, selectedMaterial, specMap]);

  useEffect(() => {
    if (!planForm.specId || selectedPlanMoaIds.length === 0) {
      return;
    }
    setPlanForm((current) => {
      if (selectedPlanMoaIds.includes(current.moaId)) {
        return current;
      }
      return {
        ...current,
        moaId: selectedPlanMoaIds.length === 1 ? selectedPlanMoaIds[0] : ""
      };
    });
  }, [planForm.specId, selectedPlanMoaIds]);

  const selectedMaterialSpec = useMemo(
    () => specs.find((spec) => spec.id === selectedMaterial?.specId) ?? null,
    [selectedMaterial, specs]
  );

  const filteredRequests =
    statusFilter === "ALL" ? requests : requests.filter((r) => r.requestStatus === statusFilter);

  const canEditPlan = selectedRequest
    ? selectedRequest.requestStatus === "REQUESTED" || selectedRequest.requestStatus === "PLAN_DEFINED"
    : false;
  const canCompleteSampling = Boolean(
    selectedRequest &&
      selectedRequest.plan &&
      selectedRequest.requestStatus === "IN_PROGRESS" &&
      planForm.samplingMethod !== "COA_BASED_RELEASE"
  );
  const canStartSampling = Boolean(selectedRequest && selectedRequest.plan && selectedRequest.requestStatus === "PLAN_DEFINED" && planForm.samplingMethod !== "COA_BASED_RELEASE");
  const canHandoffToQc = Boolean(selectedRequest && selectedRequest.requestStatus === "SAMPLED" && planForm.samplingMethod !== "COA_BASED_RELEASE");
  const canReceiveInQc = Boolean(selectedRequest && selectedRequest.requestStatus === "HANDED_TO_QC" && planForm.samplingMethod !== "COA_BASED_RELEASE");
  const canStartQcReview = Boolean(selectedRequest && selectedRequest.requestStatus === "RECEIVED" && planForm.samplingMethod !== "COA_BASED_RELEASE");
  const canRecordQcDecision = Boolean(
    selectedRequest &&
      selectedRequest.plan &&
      ((planForm.samplingMethod === "COA_BASED_RELEASE" && selectedRequest.requestStatus === "PLAN_DEFINED") ||
        (planForm.samplingMethod !== "COA_BASED_RELEASE" && selectedRequest.requestStatus === "UNDER_REVIEW"))
  );
  const worksheetMandatoryCount = worksheet.filter((row) => row.mandatory).length;
  const worksheetPassCount = worksheet.filter((row) => row.mandatory && row.status === "PASS").length;
  const worksheetFailCount = worksheet.filter((row) => row.status === "FAIL" || row.status === "OOS").length;
  const worksheetReadyForApproval = worksheetMandatoryCount > 0 && worksheetPassCount === worksheetMandatoryCount;
  const activeOrPendingInvestigationExists = investigations.some((item) => isActiveInvestigationStatus(item.status) || isPendingQaInvestigationStatus(item.status));
  const completedInvestigationExists = investigations.some((item) => isClosedInvestigationStatus(item.status));
  const canApproveQcDecision = Boolean(
    canRecordQcDecision &&
      !activeOrPendingInvestigationExists &&
      (planForm.samplingMethod === "COA_BASED_RELEASE" || worksheetReadyForApproval)
  );
  const canRejectQcDecision = Boolean(
    canRecordQcDecision &&
      !activeOrPendingInvestigationExists &&
      (planForm.samplingMethod === "COA_BASED_RELEASE" || (worksheetFailCount > 0 && completedInvestigationExists))
  );
  const canExecuteResample = selectedRequest?.requestStatus === "RESAMPLE_REQUIRED";
  const hasRetainedSample = Boolean(
    selectedRequest?.sample?.retainedFlag &&
      !selectedRequest.sample?.destroyedFlag &&
      (selectedRequest.sample?.retainedQuantity ?? 0) > 0
  );
  const selectedRequestChildCycle = selectedRequest
    ? cycles.find((cycle) => cycle.parentSamplingRequestId === selectedRequest.id) ?? null
    : null;
  const retestBlockReason = !selectedRequest?.sample
    ? "No QC sample is available for retest."
    : selectedRequest.sample.destroyedFlag
      ? "Retest is blocked because the retained sample was destroyed."
      : selectedRequest.sample.consumedFlag
        ? "Retest is blocked because the retained sample has already been consumed."
        : selectedRequest.sample.retentionExpired
          ? "Retest is blocked because the retained sample retention period has expired."
          : !hasRetainedSample
            ? "Retest requires a retained sample quantity to be available."
            : null;
  const canExecuteRetest = selectedRequest?.requestStatus === "RETEST_REQUIRED" && !retestBlockReason;
  const canDestroyRetainedSample = Boolean(
    selectedRequest?.sample &&
      hasRetainedSample &&
      selectedRequest.requestStatus !== "HANDED_TO_QC" &&
      selectedRequest.requestStatus !== "SAMPLED" &&
      selectedRequest.requestStatus !== "IN_PROGRESS" &&
      selectedRequest.requestStatus !== "PLAN_DEFINED" &&
      selectedRequest.requestStatus !== "REQUESTED"
  );

  async function handlePlanSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRequest) { setPlanError("Select a sampling request first."); return; }
    setIsSubmitting(true); setPlanError(null); setSuccessMessage(null);
    try {
      const isCoaBasedRelease = planForm.samplingMethod === "COA_BASED_RELEASE";
      const payload: SamplingPlanRequest = {
        ...planForm,
        containersToSample:      isCoaBasedRelease ? 0 : planForm.containersToSample,
        individualSampleQuantity:isCoaBasedRelease ? 0 : planForm.individualSampleQuantity,
        compositeSampleQuantity: isCoaBasedRelease ? 0 : planForm.compositeSampleQuantity,
        containerSamples:        isCoaBasedRelease ? [] : planForm.containerSamples,
        coaBasedRelease:         isCoaBasedRelease,
        sampleType:              isCoaBasedRelease ? "COMPOSITE" : planForm.sampleType,
        samplingLocation:        planForm.samplingLocation.trim(),
        analystEmployeeCode:     planForm.analystEmployeeCode.trim(),
        rationale:               planForm.rationale?.trim() || undefined,
        createdBy:               (planForm.createdBy ?? currentUserName).trim(),
        updatedBy:               (planForm.updatedBy ?? currentUserName).trim()
      };
      const updatedRequest = selectedRequest.plan
        ? await updateSamplingPlan(selectedRequest.id, selectedRequest.plan.id, payload)
        : await createSamplingPlan(selectedRequest.id, payload);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage(selectedRequest.plan ? "Sampling plan updated." : "Sampling plan created.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while saving sampling plan");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteSampling() {
    if (!selectedRequest) return;
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await completeSampling(selectedRequest.id, planForm.updatedBy ?? currentUserName);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage("Sampling completed. Inventory moved to UNDER_TEST.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while completing sampling");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartSampling() {
    if (!selectedRequest) return;
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await startSampling(selectedRequest.id, planForm.updatedBy ?? currentUserName);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage("Sampling started.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while starting sampling");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleHandoffToQc() {
    if (!selectedRequest) return;
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await handoffSamplingToQc(selectedRequest.id, planForm.updatedBy ?? currentUserName);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage("Sample handed off to QC.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while handing off to QC");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQcReceipt() {
    if (!selectedRequest) return;
    if (!qcReceiptForm.receiptCondition.trim() || !qcReceiptForm.sampleStorageLocation.trim()) {
      setPlanError("Receipt condition and QC storage location are required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await receiveSamplingInQc(selectedRequest.id, qcReceiptForm);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage("QC receipt recorded and worksheet generated.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while recording QC receipt");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStartQcReview() {
    if (!selectedRequest) return;
    if (!qcReviewForm.analystCode.trim()) {
      setPlanError("Analyst code is required to start QC review.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await startSamplingQcReview(selectedRequest.id, qcReviewForm);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage("QC review started.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while starting QC review");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleWorksheetSave(rowId: string) {
    if (!selectedRequest) return;
    setIsSubmitting(true); setPlanError(null);
    try {
      const savedRow = await recordSamplingWorksheetResult(selectedRequest.id, rowId, worksheetInputs[rowId] ?? {});
      setWorksheet((current) => current.map((row) => row.id === savedRow.id ? savedRow : row));
      setWorksheetInputs((current) => ({
        ...current,
        [rowId]: {
          resultValue: savedRow.resultValue ?? undefined,
          resultText: savedRow.resultText ?? undefined,
          moaIdUsed: savedRow.moaIdUsed ?? savedRow.specMoaId ?? undefined,
          remarks: savedRow.remarks ?? undefined
        }
      }));
      setSuccessMessage("Worksheet result saved.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while saving worksheet result");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQcDecision(approved: boolean) {
    if (!selectedRequest) return;
    if (!qcRemarks.trim()) { setPlanError("QC remarks are required."); return; }
    if (!qcDecisionSignoff.confirmedBy.trim()) { setPlanError("Final QC sign-off username is required."); return; }
    const requiredConfirmation = approved ? qcDecisionApprovalConfirmation : qcDecisionRejectionConfirmation;
    if (qcDecisionSignoff.confirmationText.trim() !== requiredConfirmation) {
      setPlanError(`Type "${requiredConfirmation}" to confirm this QC decision.`);
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const payload: QcDecisionRequest = {
        approved,
        remarks:   qcRemarks.trim(),
        updatedBy: planForm.updatedBy ?? currentUserName,
        confirmedBy: qcDecisionSignoff.confirmedBy.trim(),
        confirmationText: qcDecisionSignoff.confirmationText.trim()
      };
      const updatedRequest = await recordQcDecision(selectedRequest.id, payload);
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setQcDecisionSignoff({ confirmedBy: authenticatedUsername, confirmationText: "" });
      setSuccessMessage(approved ? "QC approved. Inventory moved to RELEASED." : "QC rejected. Inventory moved to REJECTED.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while recording QC decision");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOpenInvestigation(rowId: string) {
    if (!selectedRequest || !investigationForm.reason.trim()) {
      setPlanError("Investigation reason is required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const created = await openSamplingInvestigation(selectedRequest.id, {
        qcTestResultId: rowId,
        reason: investigationForm.reason.trim(),
        initialAssessment: investigationForm.initialAssessment?.trim() || undefined,
        investigationType: investigationForm.investigationType
      });
      setInvestigations((current) => [...current, created]);
      setRequests((current) => current.map((r) => r.id === selectedRequest.id ? { ...r, requestStatus: "UNDER_INVESTIGATION", qcDisposition: r.qcDisposition ? { ...r.qcDisposition, status: "UNDER_INVESTIGATION" } : r.qcDisposition } : r));
      setResolveForms((current) => ({
        ...current,
        [created.id]: { outcome: "RESUME_REVIEW", phaseSummary: "", rootCause: "", resolutionRemarks: "", capaRequired: false, capaReference: "" }
      }));
      setPhaseTwoForms((current) => ({ ...current, [created.id]: { phaseOneSummary: "", phaseTwoAssessment: "" } }));
      setQaReviewForms((current) => ({
        ...current,
        [created.id]: { approved: true, qaReviewRemarks: "", confirmedBy: authenticatedUsername, confirmationText: "" }
      }));
      setInvestigationForm({ qcTestResultId: "", reason: "", initialAssessment: "", investigationType: "OOS" });
      setSuccessMessage("QC investigation opened.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while opening investigation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEscalateInvestigationToPhaseTwo(investigationId: string) {
    if (!selectedRequest) return;
    const payload = phaseTwoForms[investigationId];
    if (!payload?.phaseOneSummary.trim()) {
      setPlanError("Phase I summary is required before escalation.");
      return;
    }
    if (!payload?.phaseTwoAssessment.trim()) {
      setPlanError("Phase II assessment is required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const escalated = await escalateSamplingInvestigationToPhaseTwo(selectedRequest.id, investigationId, {
        phaseOneSummary: payload.phaseOneSummary.trim(),
        phaseTwoAssessment: payload.phaseTwoAssessment.trim()
      });
      setInvestigations((current) => current.map((item) => item.id === escalated.id ? escalated : item));
      setSuccessMessage("Investigation escalated to Phase II.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while escalating investigation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResolveInvestigation(investigationId: string) {
    if (!selectedRequest) return;
    const payload = resolveForms[investigationId];
    if (!payload?.phaseSummary.trim()) {
      setPlanError("Phase summary is required.");
      return;
    }
    if (!payload?.resolutionRemarks.trim()) {
      setPlanError("Resolution remarks are required.");
      return;
    }
    if (payload.capaRequired && !payload.capaReference?.trim()) {
      setPlanError("CAPA reference is required when CAPA linkage is marked as required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const resolved = await resolveSamplingInvestigation(selectedRequest.id, investigationId, {
        outcome: payload.outcome,
        phaseSummary: payload.phaseSummary.trim(),
        rootCause: payload.rootCause?.trim() || undefined,
        resolutionRemarks: payload.resolutionRemarks.trim(),
        capaRequired: payload.capaRequired,
        capaReference: payload.capaReference?.trim() || undefined
      });
      setInvestigations((current) => current.map((item) => item.id === resolved.id ? resolved : item));
      setSuccessMessage("Investigation submitted for QA review.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while resolving investigation");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteQaReview(investigationId: string, approved: boolean) {
    if (!selectedRequest) return;
    const payload = qaReviewForms[investigationId];
    if (!payload?.qaReviewRemarks.trim()) {
      setPlanError("QA review remarks are required.");
      return;
    }
    if (!payload.confirmedBy.trim()) {
      setPlanError("QA sign-off username is required.");
      return;
    }
    const requiredConfirmation = approved ? qaReviewApprovalConfirmation : qaReviewReturnConfirmation;
    if (payload.confirmationText.trim() !== requiredConfirmation) {
      setPlanError(`Type "${requiredConfirmation}" to confirm this QA review action.`);
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const reviewed = await completeSamplingInvestigationQaReview(selectedRequest.id, investigationId, {
        approved,
        qaReviewRemarks: payload.qaReviewRemarks.trim(),
        confirmedBy: payload.confirmedBy.trim(),
        confirmationText: payload.confirmationText.trim()
      });
      setInvestigations((current) => current.map((item) => item.id === reviewed.id ? reviewed : item));
      const refreshed = await fetchSamplingRequests();
      setRequests(refreshed.content);
      setSuccessMessage(approved ? "QA review approved and investigation closed." : "QA review returned the investigation to QC.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while completing QA review");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExecuteRetest() {
    if (!selectedRequest || !retestForm.analystCode.trim()) {
      setPlanError("Analyst code is required for retest.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const updated = await executeSamplingRetest(selectedRequest.id, {
        analystCode: retestForm.analystCode.trim(),
        remarks: retestForm.remarks?.trim() || undefined
      });
      setRequests((current) => current.map((r) => r.id === updated.id ? updated : r));
      setSuccessMessage("Retest started from retained sample.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while starting retest");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleExecuteResample() {
    if (!selectedRequest || !resampleForm.reason.trim()) {
      setPlanError("Resample reason is required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const child = await executeSamplingResample(selectedRequest.id, { reason: resampleForm.reason.trim() });
      const refreshed = await fetchSamplingRequests();
      setRequests(refreshed.content);
      setSelectedRequestId(child.id);
      setSuccessMessage("Resample child cycle created.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while creating resample cycle");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDestroyRetainedSample() {
    if (!selectedRequest || !destroyRetainedForm.remarks.trim()) {
      setPlanError("Destruction remarks are required.");
      return;
    }
    setIsSubmitting(true); setPlanError(null);
    try {
      const updated = await destroySamplingRetainedSample(selectedRequest.id, {
        remarks: destroyRetainedForm.remarks.trim()
      });
      setRequests((current) => current.map((r) => r.id === updated.id ? updated : r));
      setDestroyRetainedForm({ remarks: "" });
      setSuccessMessage("Retained sample marked as destroyed.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while destroying retained sample");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Derived counts ─────────────────────────────────────────────────────────
  const pendingCount  = summary?.countsByStatus["REQUESTED"]   ?? 0;
  const testingCount  = (summary?.countsByStatus["IN_PROGRESS"] ?? 0)
    + (summary?.countsByStatus["SAMPLED"] ?? 0)
    + (summary?.countsByStatus["HANDED_TO_QC"] ?? 0)
    + (summary?.countsByStatus["RECEIVED"] ?? 0)
    + (summary?.countsByStatus["UNDER_REVIEW"] ?? 0);
  const planSetCount  = summary?.countsByStatus["PLAN_DEFINED"]?? 0;
  const approvedCount = summary?.countsByStatus["APPROVED"]    ?? 0;
  const rejectedCount = summary?.countsByStatus["REJECTED"]    ?? 0;

  const fieldCls    = "w-full rounded-xl border border-green-100 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-green-400 disabled:bg-slate-50 disabled:text-slate-500";
  const readonlyCls = "w-full rounded-xl border border-green-50 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 outline-none";
  const labelCls    = "mb-1.5 block text-xs font-medium text-slate-600";

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">QC Sampling</h1>
          <p className="mt-0.5 text-sm text-slate-500">Sampling queue · Inbound material inspection decisions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            New Sample Request
          </button>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-white px-4 py-2 text-xs font-semibold text-green-700 hover:bg-green-50"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </button>
        </div>
      </div>

      {/* API error */}
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {/* Overdue alert */}
      {!isLoading && pendingCount > 0 ? (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm text-red-800">
            <strong>{pendingCount} sampling request{pendingCount !== 1 ? "s" : ""} pending</strong> — awaiting sampling plan assignment and QC disposition.
          </span>
          <button
            type="button"
            onClick={() => setStatusFilter("REQUESTED")}
            className="ml-auto text-xs font-medium text-red-700 underline"
          >
            Review Now
          </button>
        </div>
      ) : null}

      {/* KPI cards */}
      {summary ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
          <button
            type="button"
            onClick={() => setStatusFilter("REQUESTED")}
            className="rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm border-l-4 border-l-green-500 hover:bg-green-50/40 transition"
          >
            <div className="text-xs text-slate-500 mb-1">Pending Sampling</div>
            <div className="text-2xl font-bold text-green-600">{pendingCount}</div>
            <div className="text-xs text-slate-500 mt-1">Awaiting collection</div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("PLAN_DEFINED")}
            className="rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm border-l-4 border-l-amber-400 hover:bg-amber-50/40 transition"
          >
            <div className="text-xs text-slate-500 mb-1">Plan Defined</div>
            <div className="text-2xl font-bold text-amber-600">{planSetCount}</div>
            <div className="text-xs text-slate-500 mt-1">Ready to sample</div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("UNDER_REVIEW")}
            className="rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm border-l-4 border-l-orange-400 hover:bg-orange-50/40 transition"
          >
            <div className="text-xs text-slate-500 mb-1">Under Testing</div>
            <div className="text-2xl font-bold text-orange-600">{testingCount}</div>
            <div className="text-xs text-slate-500 mt-1">In LIMS queue</div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("APPROVED")}
            className="rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm border-l-4 border-l-emerald-400 hover:bg-emerald-50/40 transition"
          >
            <div className="text-xs text-slate-500 mb-1">Approved</div>
            <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
            <div className="text-xs text-slate-500 mt-1">Released to WMS</div>
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("REJECTED")}
            className="rounded-xl border border-green-200 bg-white p-4 text-left shadow-sm border-l-4 border-l-rose-400 hover:bg-rose-50/40 transition"
          >
            <div className="text-xs text-slate-500 mb-1">Rejected</div>
            <div className="text-2xl font-bold text-rose-600">{rejectedCount}</div>
            <div className="text-xs text-slate-500 mt-1">Returned / disposed</div>
          </button>
        </div>
      ) : null}

      {/* Main split: queue + detail */}
      <div className="flex gap-5 items-start">

        {/* Left: Sampling Queue */}
        <div className="w-96 shrink-0">
          <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
            {/* Header with tabs */}
            <div className="flex items-center justify-between border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">Sampling Queue</span>
              <div className="flex gap-1">
                {([
                  { key: "ALL",       label: `All (${requests.length})` },
                  { key: "REQUESTED", label: `Pending (${pendingCount})` },
                  { key: "UNDER_REVIEW",label: `QC Review (${summary?.countsByStatus["UNDER_REVIEW"] ?? 0})` }
                ] as const).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key)}
                    className={[
                      "rounded-lg px-2 py-1 text-[11px] font-medium transition",
                      statusFilter === tab.key
                        ? "bg-green-600 text-white"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    ].join(" ")}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="border-b border-green-50 px-3 py-2">
              <div className="flex items-center gap-2 rounded-lg border border-green-100 bg-green-50 px-3 py-1.5 text-xs text-slate-400">
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeWidth="2" d="m21 21-4.35-4.35" />
                </svg>
                Filter by batch, material, analyst…
              </div>
            </div>

            {/* List */}
            <div className="max-h-[720px] overflow-y-auto divide-y divide-green-50">
              {isLoading ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">Loading sampling queue…</p>
              ) : filteredRequests.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-slate-400">
                  {requests.length === 0
                    ? "No sampling requests yet. Receive a GRN to populate this queue."
                    : "No requests match the current filter."}
                </p>
              ) : (
                filteredRequests.map((request) => {
                  const material  = materialMap.get(request.materialId);
                  const batch     = request.batchId ? batchMap.get(request.batchId) : null;
                  const isSelected = selectedRequestId === request.id;
                  return (
                    <button
                      key={request.id}
                      type="button"
                      onClick={() => {
                        setSelectedRequestId(request.id);
                        setPlanError(null);
                        setSuccessMessage(null);
                      }}
                      className={[
                        "flex w-full items-center gap-3 px-4 py-3 text-left transition",
                        isSelected
                          ? "border-l-[3px] border-l-green-500 bg-green-100/60"
                          : "hover:bg-green-50/50"
                      ].join(" ")}
                    >
                      <div className={`h-2 w-2 shrink-0 rounded-full ${statusDotColor(request.requestStatus)}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-bold text-slate-800">
                            {batch?.batchNumber ?? request.id.slice(0, 8).toUpperCase()}
                          </span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillCls(request.requestStatus)}`}>
                            {statusLabel(request.requestStatus)}
                          </span>
                        </div>
                        <div className="mt-0.5 truncate text-[11px] text-slate-500">
                          {material?.materialName ?? "Unknown material"} · {request.totalContainers} containers
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {request.qcDisposition?.status ? `QC: ${statusLabel(request.qcDisposition.status)}` : request.plan?.analystEmployeeCode
                            ? `Analyst: ${request.plan.analystEmployeeCode}`
                            : "Unassigned"}
                          {request.plan?.coaBasedRelease ? " · CoA release" : ""}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right: Detail panel */}
        <div className="min-w-0 flex-1 space-y-4">
          {!selectedRequest ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-dashed border-green-200 bg-green-50/40 px-6 text-center">
              <div>
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.78 0-2.674-2.155-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-slate-700">Select a sampling request</p>
                <p className="mt-1 text-xs text-slate-500">The detail panel will show the sampling plan, checklist, and QC decision controls.</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── Detail header card ─────────────────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="font-mono text-lg font-bold text-slate-800">
                          {selectedBatch?.batchNumber ?? selectedRequest.id.slice(0, 8).toUpperCase()}
                        </h2>
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${statusPillCls(selectedRequest.requestStatus)}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotColor(selectedRequest.requestStatus)}`} />
                          {statusLabel(selectedRequest.requestStatus)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {selectedMaterial?.materialName ?? "Material"} · GRN item {selectedRequest.grnItemId.slice(0, 8).toUpperCase()}
                        {selectedPallet ? ` · Pallet ${selectedPallet.palletCode}` : ""}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="flex items-center gap-1.5 rounded-lg border border-green-200 px-3 py-1.5 text-xs font-semibold text-green-700 hover:bg-green-50"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print Label
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                      >
                        View COA
                      </button>
                    </div>
                  </div>
                </div>

                {/* Info grid */}
                <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4">
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Material Code</div>
                    <div className="text-xs font-bold text-slate-800">{selectedMaterial?.materialCode ?? "—"}</div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Containers</div>
                    <div className="text-xs font-bold text-slate-800">{selectedRequest.totalContainers}</div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Sample Qty</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.plan
                        ? `${selectedRequest.plan.compositeSampleQuantity ?? 0} ${sampleQuantityUom}`
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Spec</div>
                    <div className="text-xs font-bold text-slate-800">{selectedSpec?.specCode ?? "—"}</div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Containers to Sample</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.plan ? `${selectedRequest.plan.containersToSample} / ${selectedRequest.totalContainers}` : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Sampling Method</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.plan?.samplingMethod?.replace(/_/g, " ") ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Analyst</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.qcDisposition?.status ? statusLabel(selectedRequest.qcDisposition.status) : selectedRequest.plan?.analystEmployeeCode ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Sampling Location</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.plan?.samplingLocation ?? "—"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Cycle</div>
                    <div className="text-xs font-bold text-slate-800">
                      #{selectedRequest.cycleNumber}
                      {selectedRequest.parentSamplingRequestId ? " · Child cycle" : " · Root cycle"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Root Request</div>
                    <div className="text-xs font-bold text-slate-800">{selectedRequest.rootSamplingRequestId.slice(0, 8).toUpperCase()}</div>
                  </div>
                </div>

                {/* Sampling Checklist */}
                <div className="border-t border-green-50 px-5 pb-5">
                  {selectedRequest.requestStatus === "RESAMPLED" ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                      This cycle is historical and has been superseded by a resample child cycle.
                      {selectedRequestChildCycle ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRequestId(selectedRequestChildCycle.id)}
                          className="ml-2 font-semibold text-slate-800 underline"
                        >
                          Open cycle #{selectedRequestChildCycle.cycleNumber}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                  <p className="mb-3 mt-4 text-xs font-semibold text-slate-700">Sampling Checklist</p>
                  <div className="space-y-1.5">
                    {getChecklist(selectedRequest.requestStatus, !!selectedRequest.plan).map((item) => (
                      <div
                        key={item.label}
                        className={[
                          "flex items-center gap-3 rounded-lg border px-3 py-2",
                          item.done
                            ? "border-green-100 bg-green-50"
                            : "border-slate-200 bg-white"
                        ].join(" ")}
                      >
                        {item.done ? (
                          <svg className="h-4 w-4 shrink-0 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        ) : (
                          <div className="h-4 w-4 shrink-0 rounded-full border-2 border-slate-300" />
                        )}
                        <span className={`text-xs ${item.done ? "text-slate-700" : "text-slate-400"}`}>{item.label}</span>
                        {!item.done && (
                          <span className="ml-auto text-[10px] font-medium text-amber-500">Pending</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                  <span className="text-sm font-semibold text-slate-700">Cycle History</span>
                </div>
                <div className="p-5">
                  {cycles.length === 0 ? (
                    <p className="text-xs text-slate-400">No cycle history available.</p>
                  ) : (
                    <div className="grid gap-2">
                      {cycles.map((cycle) => (
                        <button
                          key={cycle.id}
                          type="button"
                          onClick={() => setSelectedRequestId(cycle.id)}
                          className={[
                            "flex items-center justify-between rounded-xl border px-3 py-3 text-left transition",
                            cycle.id === selectedRequest.id ? "border-green-400 bg-green-50" : "border-green-100 hover:bg-green-50/40"
                          ].join(" ")}
                        >
                          <div>
                            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-800">
                              <span>Cycle #{cycle.cycleNumber}</span>
                              {cycle.id === selectedRequest.id ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Current</span>
                              ) : null}
                              {!cycle.parentSamplingRequestId ? (
                                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Root</span>
                              ) : null}
                            </div>
                            <div className="mt-0.5 text-[11px] text-slate-500">
                              {cycle.resampleReason ? `Reason: ${cycle.resampleReason}` : "Original sampling cycle"}
                            </div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusPillCls(cycle.requestStatus)}`}>
                            {statusLabel(cycle.requestStatus)}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── Sampling Plan form ─────────────────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                  <span className="text-sm font-semibold text-slate-700">Sampling Plan</span>
                  {canEditPlan && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-semibold text-amber-700">Editable</span>
                  )}
                </div>

                <form className="space-y-5 p-5" onSubmit={handlePlanSubmit}>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className={labelCls}>Specification</span>
                      <input
                        readOnly
                        value={selectedMaterialSpec ? `${selectedMaterialSpec.specCode} - ${selectedMaterialSpec.specName}` : "No specification linked in Material Master"}
                        className={readonlyCls}
                      />
                    </label>
                    <label className="block">
                      <span className={labelCls}>MoA</span>
                      <select required disabled={!canEditPlan || isSubmitting} value={planForm.moaId}
                        onChange={(e) => setPlanForm((c) => ({ ...c, moaId: e.target.value }))}
                        className={fieldCls}>
                        <option value="">{selectedPlanMoaIds.length > 1 ? "Select linked MoA" : "Select MoA"}</option>
                        {selectedPlanMoas.map((m) => (
                          <option key={m.id} value={m.id}>{m.moaCode} - {m.moaName}</option>
                        ))}
                      </select>
                      <span className="mt-1 block text-[11px] text-slate-400">
                        {selectedPlanMoaIds.length === 0
                          ? "No MoA is linked through the selected specification parameters yet."
                          : selectedPlanMoaIds.length === 1
                            ? "Auto-selected from the linked spec parameter."
                            : "Only MoAs linked in the selected specification are available here."}
                      </span>
                    </label>
                    <label className="block">
                      <span className={labelCls}>Sampling Method</span>
                      <input readOnly value={planForm.samplingMethod.replace(/_/g, " ")} className={readonlyCls} />
                      <span className="mt-1 block text-[11px] text-slate-400">
                        Driven by the approved specification linked in Material Master.
                      </span>
                    </label>
                  </div>

                  <div className="grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-slate-700 md:grid-cols-3">
                    <div>
                      <div className="font-semibold text-slate-800">Material Rule</div>
                      <div className="mt-1">{selectedMaterial?.materialType ?? "—"} material using spec method {selectedMaterialSpec?.samplingMethod?.replace(/_/g, " ") ?? "—"}.</div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Handling</div>
                      <div className="mt-1">
                        {selectedMaterial?.photosensitive ? "Photosensitive controls required" : "No light-protection rule"}
                        {" · "}
                        {selectedMaterial?.hygroscopic ? "Hygroscopic controls required" : "No desiccant rule"}
                      </div>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">Release Basis</div>
                      <div className="mt-1">
                        {selectedMaterial?.vendorCoaReleaseAllowed ? "Vendor CoA release allowed when the spec uses CoA mode." : "Vendor CoA release is blocked by Material Master."}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-4">
                    <label className="block">
                      <span className={labelCls}>Total containers</span>
                      <input readOnly value={planForm.totalContainers} className={readonlyCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Containers to sample</span>
                      <input readOnly value={planForm.containersToSample} className={readonlyCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Sample type</span>
                      <select
                        disabled={!canEditPlan || isSubmitting || planForm.samplingMethod === "COA_BASED_RELEASE"}
                        value={planForm.sampleType}
                        onChange={(e) => setPlanForm((c) => ({ ...c, sampleType: e.target.value as SampleType }))}
                        className={fieldCls}>
                        {sampleTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>Composite sample qty</span>
                      <input readOnly value={`${planForm.compositeSampleQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`} className={readonlyCls} />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block">
                      <span className={labelCls}>Sampling location</span>
                      <input required disabled={!canEditPlan || isSubmitting} value={planForm.samplingLocation}
                        onChange={(e) => setPlanForm((c) => ({ ...c, samplingLocation: e.target.value }))}
                        className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Analyst employee code</span>
                      <input required disabled={!canEditPlan || isSubmitting} value={planForm.analystEmployeeCode}
                        onChange={(e) => setPlanForm((c) => ({ ...c, analystEmployeeCode: e.target.value }))}
                        className={fieldCls} />
                    </label>
                    <label className="block">
                      <span className={labelCls}>Sampling tool</span>
                      <select required disabled={!canEditPlan || isSubmitting} value={planForm.samplingToolId}
                        onChange={(e) => setPlanForm((c) => ({ ...c, samplingToolId: e.target.value }))}
                        className={fieldCls}>
                        <option value="">Select tool</option>
                        {samplingTools.map((t) => (
                          <option key={t.id} value={t.id}>{t.toolCode} - {t.toolName}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* Container-wise quantities */}
                  {planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                    <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
                      <p className="mb-1 text-xs font-semibold text-slate-700">Container-wise sample quantity</p>
                      <p className="mb-3 text-[11px] text-slate-500">
                        Applies the same sample quantity to all selected containers.{sampleQuantityUom ? ` UOM: ${sampleQuantityUom}` : ""}
                      </p>
                      <div className="grid gap-3 md:grid-cols-[1fr_0.7fr]">
                        <input readOnly value={`${planForm.containersToSample} selected containers`} className={readonlyCls} />
                        <input
                          type="number" min="0" step="0.001"
                          disabled={!canEditPlan || isSubmitting}
                          value={planForm.individualSampleQuantity}
                          onChange={(event) => {
                            const sampledQuantity = Number(event.target.value);
                            const nextSamples = planForm.containerSamples.map((s) => ({ ...s, sampledQuantity }));
                            const compositeSampleQuantity = nextSamples.reduce((sum, item) => sum + Number(item.sampledQuantity || 0), 0);
                            setPlanForm((c) => ({ ...c, individualSampleQuantity: sampledQuantity, containerSamples: nextSamples, compositeSampleQuantity }));
                          }}
                          className={fieldCls}
                          placeholder={`Sample qty${sampleQuantityUom ? ` (${sampleQuantityUom})` : ""}`}
                        />
                      </div>
                      {planForm.containerSamples.length > 0 && (
                        <div className="mt-3 grid gap-2">
                          {planForm.containerSamples.map((sample, index) => {
                            const container = requestContainers.find((c) => c.id === sample.grnContainerId);
                            return (
                              <div key={sample.grnContainerId} className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                                <input readOnly value={container?.containerNumber ?? `Container ${index + 1}`} className={readonlyCls} />
                                <input readOnly value={`${sample.sampledQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`} className={readonlyCls} />
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">
                      Vendor CoA based release selected. Sampling calculations are not required — QC can approve or reject directly.
                    </div>
                  )}

                  <label className="block">
                    <span className={labelCls}>Rationale</span>
                    <textarea
                      disabled={!canEditPlan || isSubmitting}
                      value={planForm.rationale}
                      onChange={(e) => setPlanForm((c) => ({ ...c, rationale: e.target.value }))}
                      rows={3}
                      className={fieldCls}
                    />
                  </label>

                  {!selectedMaterialSpec ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      No specification is linked to this material in Material Master. Fix the material setup before creating the sampling plan.
                    </div>
                  ) : null}

                  {/* Plan action buttons */}
                  <div className="flex flex-wrap gap-3 border-t border-green-50 pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !canEditPlan}
                      className="rounded-xl bg-green-600 px-5 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-200"
                    >
                      {selectedRequest.plan ? "Update Sampling Plan" : "Create Sampling Plan"}
                    </button>
                    {canStartSampling ? (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleStartSampling}
                        className="rounded-xl border border-green-200 px-5 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Start Sampling
                      </button>
                    ) : null}
                    {selectedRequest.plan && planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                      <button
                        type="button"
                        disabled={isSubmitting || !canCompleteSampling}
                        onClick={handleCompleteSampling}
                        className="rounded-xl border border-green-200 px-5 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Mark Sampling Complete
                      </button>
                    ) : null}
                    {canHandoffToQc ? (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={handleHandoffToQc}
                        className="rounded-xl border border-indigo-200 px-5 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300"
                      >
                        Handoff to QC
                      </button>
                    ) : null}
                  </div>

                  {successMessage ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">{successMessage}</div>
                  ) : null}
                  {planError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{planError}</div>
                  ) : null}
                </form>
              </div>

              {planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                  <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                    <span className="text-sm font-semibold text-slate-700">QC Receipt & Review</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="grid gap-4 md:grid-cols-3">
                      <label className="block">
                        <span className={labelCls}>Received By</span>
                        <input value={qcReceiptForm.receivedBy} onChange={(e) => setQcReceiptForm((c) => ({ ...c, receivedBy: e.target.value }))} className={fieldCls} disabled={!canReceiveInQc || isSubmitting} />
                      </label>
                      <label className="block md:col-span-2">
                        <span className={labelCls}>Receipt Condition</span>
                        <input value={qcReceiptForm.receiptCondition} onChange={(e) => setQcReceiptForm((c) => ({ ...c, receiptCondition: e.target.value }))} className={fieldCls} placeholder="e.g. Sealed, intact, no visible damage" disabled={!canReceiveInQc || isSubmitting} />
                      </label>
                      <label className="block md:col-span-2">
                        <span className={labelCls}>QC Storage Location</span>
                        <input value={qcReceiptForm.sampleStorageLocation} onChange={(e) => setQcReceiptForm((c) => ({ ...c, sampleStorageLocation: e.target.value }))} className={fieldCls} placeholder="e.g. QC Cold Room Shelf A2" disabled={!canReceiveInQc || isSubmitting} />
                      </label>
                      <label className="flex items-center gap-2 rounded-xl border border-cyan-100 bg-cyan-50/50 px-3 py-2.5 text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(qcReceiptForm.retainedFlag)}
                          onChange={(e) => setQcReceiptForm((current) => ({
                            ...current,
                            retainedFlag: e.target.checked,
                            retainedQuantity: e.target.checked ? current.retainedQuantity : undefined,
                            retainedUntil: e.target.checked ? current.retainedUntil : undefined
                          }))}
                          disabled={!canReceiveInQc || isSubmitting}
                        />
                        Retained sample required
                      </label>
                      <div className="flex items-end">
                        <button type="button" onClick={handleQcReceipt} disabled={!canReceiveInQc || isSubmitting} className="w-full rounded-xl border border-cyan-200 px-4 py-2.5 text-xs font-semibold text-cyan-700 hover:bg-cyan-50 disabled:cursor-not-allowed disabled:text-slate-300">
                          Record QC Receipt
                        </button>
                      </div>
                    </div>

                    {qcReceiptForm.retainedFlag ? (
                      <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4">
                        <div className="mb-3 text-xs font-semibold text-cyan-900">Retained Sample Details</div>
                        <div className="grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className={labelCls}>Retained Quantity</span>
                            <input
                              type="number"
                              min="0"
                              step="0.001"
                              value={qcReceiptForm.retainedQuantity ?? ""}
                              onChange={(e) => setQcReceiptForm((current) => ({
                                ...current,
                                retainedQuantity: e.target.value ? Number(e.target.value) : undefined
                              }))}
                              className={fieldCls}
                              placeholder={sampleQuantityUom ? `e.g. 0.050 ${sampleQuantityUom}` : "e.g. 0.050"}
                              disabled={!canReceiveInQc || isSubmitting}
                            />
                          </label>
                          <label className="block">
                            <span className={labelCls}>Retained Until</span>
                            <input
                              type="date"
                              value={qcReceiptForm.retainedUntil ?? ""}
                              onChange={(e) => setQcReceiptForm((current) => ({ ...current, retainedUntil: e.target.value || undefined }))}
                              className={fieldCls}
                              disabled={!canReceiveInQc || isSubmitting}
                            />
                          </label>
                        </div>
                        <div className="mt-3 text-[11px] text-cyan-900">
                          Capture retained details here during QC receipt. These values appear later in the retained-sample panel.
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                      <label className="block">
                        <span className={labelCls}>QC Analyst Code</span>
                        <input value={qcReviewForm.analystCode} onChange={(e) => setQcReviewForm({ analystCode: e.target.value })} className={fieldCls} placeholder="Analyst code required before worksheet entry" disabled={!canStartQcReview || isSubmitting} />
                      </label>
                      <div className="flex items-end">
                        <button type="button" onClick={handleStartQcReview} disabled={!canStartQcReview || isSubmitting} className="rounded-xl border border-violet-200 px-5 py-2.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:text-slate-300">
                          Start QC Review
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {planForm.samplingMethod !== "COA_BASED_RELEASE" && selectedRequest.sample ? (
                <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                  <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                    <span className="text-sm font-semibold text-slate-700">Retained Sample</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="rounded-xl border border-green-100 bg-green-50/40 p-4">
                        <div className="text-[10px] text-slate-500">Retention Status</div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${selectedRequest.sample.retainedFlag ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}`}>
                            {selectedRequest.sample.retainedFlag ? "Retained" : "Not Retained"}
                          </span>
                          {selectedRequest.sample.consumedFlag ? (
                            <span className="rounded-full bg-yellow-100 px-2.5 py-1 text-[11px] font-semibold text-yellow-700">Consumed</span>
                          ) : null}
                          {selectedRequest.sample.destroyedFlag ? (
                            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">Destroyed</span>
                          ) : null}
                          {selectedRequest.sample.retentionExpired ? (
                            <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">Expired</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-white p-4">
                        <div className="text-[10px] text-slate-500">Retained Quantity</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {selectedRequest.sample.retainedQuantity != null
                            ? `${selectedRequest.sample.retainedQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`
                            : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-white p-4">
                        <div className="text-[10px] text-slate-500">Retained Until</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {selectedRequest.sample.retainedUntil ? new Date(selectedRequest.sample.retainedUntil).toLocaleDateString() : "—"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-green-100 bg-white p-4">
                        <div className="text-[10px] text-slate-500">QC Storage</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">
                          {selectedRequest.sample.qcStorageLocation ?? "—"}
                        </div>
                      </div>
                    </div>

                    {selectedRequest.sample.retentionExpired && !selectedRequest.sample.destroyedFlag ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        The retention period has expired. Retest will be blocked until a new sampling cycle is created.
                      </div>
                    ) : null}

                    {!canDestroyRetainedSample && selectedRequest.sample.retainedFlag && !selectedRequest.sample.destroyedFlag ? (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                        Retained sample destruction is unavailable while the sample is still in warehouse transit or active sampling steps.
                      </div>
                    ) : null}

                    {selectedRequest.sample.destroyedFlag ? (
                      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800">
                        This retained sample has already been destroyed. Retest is no longer possible for this cycle.
                      </div>
                    ) : null}

                    {selectedRequest.sample.consumedFlag ? (
                      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-xs text-yellow-800">
                        The retained sample was already consumed during retest execution. Additional retest attempts require a new sampling cycle.
                      </div>
                    ) : null}

                    {canDestroyRetainedSample ? (
                      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <label className="block">
                          <span className={labelCls}>Destruction Remarks</span>
                          <input
                            value={destroyRetainedForm.remarks}
                            onChange={(e) => setDestroyRetainedForm({ remarks: e.target.value })}
                            className={fieldCls}
                            placeholder="Reason for retained sample destruction"
                            disabled={isSubmitting}
                          />
                        </label>
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => void handleDestroyRetainedSample()}
                            disabled={isSubmitting || !destroyRetainedForm.remarks.trim()}
                            className="w-full rounded-xl border border-rose-200 px-4 py-2.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:text-slate-300"
                          >
                            Mark Retained Sample Destroyed
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {planForm.samplingMethod !== "COA_BASED_RELEASE" && (worksheet.length > 0 || ["RECEIVED", "UNDER_REVIEW", "COMPLETED", "APPROVED", "REJECTED", "RESAMPLED"].includes(selectedRequest.requestStatus)) ? (
                <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                  <div className="flex items-center justify-between border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                    <span className="text-sm font-semibold text-slate-700">QC Worksheet</span>
                    <span className={`rounded-full px-3 py-1 text-[11px] font-semibold ${worksheetReadyForApproval ? "bg-green-100 text-green-700" : worksheetFailCount > 0 ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                      {worksheetPassCount}/{worksheetMandatoryCount} mandatory pass · {worksheetFailCount} fail
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1180px] w-full text-xs">
                      <thead>
                        <tr className="border-b border-green-100 bg-green-50/40">
                          <th className="px-3 py-2 text-left">#</th>
                          <th className="px-3 py-2 text-left">Test</th>
                          <th className="px-3 py-2 text-left">Type</th>
                          <th className="px-3 py-2 text-left">MOA</th>
                          <th className="px-3 py-2 text-left">Criteria</th>
                          <th className="px-3 py-2 text-left">Result</th>
                          <th className="px-3 py-2 text-left">Remarks</th>
                          <th className="px-3 py-2 text-left">Status</th>
                          <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {worksheet.length === 0 ? (
                          <tr><td colSpan={9} className="px-4 py-4 text-center text-slate-400">Worksheet will appear after QC receipt.</td></tr>
                        ) : worksheet.map((row) => {
                          const input = worksheetInputs[row.id] ?? {};
                          const textBased = ["PASS_FAIL", "COMPLIES", "TEXT"].includes(row.criteriaTypeApplied);
                          return (
                            <tr key={row.id} className="border-b border-green-50 align-top">
                              <td className="px-3 py-3 font-mono text-slate-500">{row.sequence}</td>
                              <td className="px-3 py-3">
                                <div className="font-semibold text-slate-800">{row.parameterName}</div>
                                {row.mandatory ? <div className="text-[10px] text-rose-500">Mandatory</div> : <div className="text-[10px] text-slate-400">Optional</div>}
                              </td>
                              <td className="px-3 py-3 text-slate-600">{row.testType.replace(/_/g, " ")}</td>
                              <td className="px-3 py-3 text-slate-600">{row.specMoaCode ?? "—"}</td>
                              <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{row.criteriaDisplay}</td>
                              <td className="px-3 py-3">
                                {textBased ? (
                                  <input value={input.resultText ?? ""} onChange={(e) => setWorksheetInputs((current) => ({ ...current, [row.id]: { ...current[row.id], resultText: e.target.value } }))} className={fieldCls} disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting} placeholder="Enter textual result" />
                                ) : (
                                  <input type="number" step="0.0001" value={input.resultValue ?? ""} onChange={(e) => setWorksheetInputs((current) => ({ ...current, [row.id]: { ...current[row.id], resultValue: e.target.value ? Number(e.target.value) : undefined } }))} className={fieldCls} disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting} placeholder="Enter numeric result" />
                                )}
                              </td>
                              <td className="px-3 py-3">
                                <input value={input.remarks ?? ""} onChange={(e) => setWorksheetInputs((current) => ({ ...current, [row.id]: { ...current[row.id], remarks: e.target.value } }))} className={fieldCls} disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting} placeholder="Optional remarks" />
                              </td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex rounded-full px-2 py-1 text-[10px] font-semibold ${row.status === "PASS" ? "bg-green-100 text-green-700" : row.status === "FAIL" || row.status === "OOS" ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-600"}`}>
                                  {row.status}
                                </span>
                              </td>
                              <td className="px-3 py-3 text-right">
                                <div className="flex justify-end gap-2">
                                  <button type="button" onClick={() => void handleWorksheetSave(row.id)} disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting} className="rounded-lg border border-green-200 px-3 py-1.5 text-[11px] font-semibold text-green-700 hover:bg-green-50 disabled:cursor-not-allowed disabled:text-slate-300">
                                    Save Result
                                  </button>
                                  {(row.status === "FAIL" || row.status === "OOS" || row.status === "INCONCLUSIVE") ? (
                                    <button type="button" onClick={() => setInvestigationForm((current) => ({ ...current, qcTestResultId: row.id }))} disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting} className="rounded-lg border border-fuchsia-200 px-3 py-1.5 text-[11px] font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:text-slate-300">
                                      Select for Investigation
                                    </button>
                                  ) : null}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                  <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                    <span className="text-sm font-semibold text-slate-700">QC Investigation</span>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                      <label className="block">
                        <span className={labelCls}>Selected failing worksheet row</span>
                        <select
                          value={investigationForm.qcTestResultId}
                          onChange={(e) => setInvestigationForm((current) => ({ ...current, qcTestResultId: e.target.value }))}
                          className={fieldCls}
                          disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting}
                        >
                          <option value="">Select failed row</option>
                          {worksheet.filter((row) => row.status === "FAIL" || row.status === "OOS" || row.status === "INCONCLUSIVE").map((row) => (
                            <option key={row.id} value={row.id}>{row.sequence}. {row.parameterName} ({row.status})</option>
                          ))}
                        </select>
                      </label>
                      <label className="block">
                        <span className={labelCls}>Investigation Type</span>
                        <select
                          value={investigationForm.investigationType ?? "OOS"}
                          onChange={(e) => setInvestigationForm((current) => ({ ...current, investigationType: e.target.value as OpenQcInvestigationRequest["investigationType"] }))}
                          className={fieldCls}
                          disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting}
                        >
                          <option value="OOS">OOS</option>
                          <option value="OOT">OOT</option>
                          <option value="GENERAL">General</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={labelCls}>Investigation reason</span>
                        <input
                          value={investigationForm.reason}
                          onChange={(e) => setInvestigationForm((current) => ({ ...current, reason: e.target.value }))}
                          className={fieldCls}
                          disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting}
                          placeholder="Why is this result being investigated?"
                        />
                      </label>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => void handleOpenInvestigation(investigationForm.qcTestResultId)}
                          disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting || !investigationForm.qcTestResultId}
                          className="w-full rounded-xl border border-fuchsia-200 px-4 py-2.5 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:text-slate-300"
                        >
                          Open Investigation
                        </button>
                      </div>
                    </div>
                    <label className="block">
                      <span className={labelCls}>Initial assessment</span>
                      <textarea
                        rows={2}
                        value={investigationForm.initialAssessment ?? ""}
                        onChange={(e) => setInvestigationForm((current) => ({ ...current, initialAssessment: e.target.value }))}
                        className={fieldCls}
                        disabled={selectedRequest.requestStatus !== "UNDER_REVIEW" || isSubmitting}
                      />
                    </label>

                    {investigations.length > 0 ? (
                      <div className="space-y-3">
                        {investigations.map((item) => {
                          const resolveForm = resolveForms[item.id] ?? { outcome: "RESUME_REVIEW", phaseSummary: "", rootCause: "", resolutionRemarks: "", capaRequired: false, capaReference: "" };
                          const phaseTwoForm = phaseTwoForms[item.id] ?? { phaseOneSummary: "", phaseTwoAssessment: "" };
                          const qaReviewForm = qaReviewForms[item.id] ?? { approved: true, qaReviewRemarks: "", confirmedBy: authenticatedUsername, confirmationText: "" };
                          const qaReviewerIsSubmitter = item.outcomeSubmittedBy === authenticatedUsername;
                          const canCompleteThisQaReview = canQaReviewInvestigations && !qaReviewerIsSubmitter;
                          return (
                            <div key={item.id} className="rounded-xl border border-green-100 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs font-semibold text-slate-800">{item.reason}</div>
                                  <div className="mt-1 flex flex-wrap gap-2">
                                    <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">{item.investigationNumber}</span>
                                    <span className="inline-flex rounded-full bg-fuchsia-50 px-2 py-0.5 text-[10px] font-semibold text-fuchsia-700">{item.investigationType}</span>
                                    <span className="inline-flex rounded-full bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700">{item.phase.replace("_", " ")}</span>
                                  </div>
                                  <div className="mt-0.5 text-[11px] text-slate-500">Opened by {item.openedBy} · {new Date(item.openedAt).toLocaleString()}</div>
                                </div>
                                <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                  isActiveInvestigationStatus(item.status)
                                    ? "bg-fuchsia-100 text-fuchsia-700"
                                    : isPendingQaInvestigationStatus(item.status)
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-600"
                                }`}>
                                  {item.status}
                                </span>
                              </div>
                              {isReturnedInvestigation(item) ? (
                                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                                  <div className="font-semibold">Returned by QA</div>
                                  <div className="mt-1">
                                    {item.returnedToQcRemarks ?? item.qaReviewRemarks ?? "QA returned this investigation for QC updates before final review."}
                                  </div>
                                </div>
                              ) : null}
                              {isActiveInvestigationStatus(item.status) ? (
                                <>
                                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                                    {item.phase === "PHASE_I"
                                      ? 'Use "Phase I summary" and "Phase II assessment" before escalation. After escalation or closure, enter the final phase summary, root cause, and resolution remarks in the QC outcome section below.'
                                      : 'For Phase II investigations, enter the final phase summary, root cause, and resolution remarks in the QC outcome section below before submitting to QA.'}
                                  </div>
                                  <div className="mt-3 grid gap-4 md:grid-cols-3">
                                    <label className="block">
                                      <span className={labelCls}>Proposed outcome</span>
                                      <select
                                        value={resolveForm.outcome}
                                        onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, outcome: e.target.value as ResolveQcInvestigationRequest["outcome"] } }))}
                                        className={fieldCls}
                                        disabled={isSubmitting}
                                      >
                                        <option value="RESUME_REVIEW">Resume Review</option>
                                        <option value="RETEST_REQUIRED">Retest Required</option>
                                        <option value="RESAMPLE_REQUIRED">Resample Required</option>
                                        <option value="REJECTED">Reject</option>
                                      </select>
                                    </label>
                                    <label className="block md:col-span-2">
                                      <span className={labelCls}>Root cause</span>
                                      <input
                                        value={resolveForm.rootCause ?? ""}
                                        onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, rootCause: e.target.value } }))}
                                        className={fieldCls}
                                        disabled={isSubmitting}
                                        placeholder="e.g. Sampling or preparation variation suspected"
                                      />
                                    </label>
                                  </div>
                                  <label className="mt-3 block">
                                    <span className={labelCls}>{phaseSummaryLabel(item.phase)}</span>
                                    <textarea
                                      rows={2}
                                      value={resolveForm.phaseSummary}
                                      onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, phaseSummary: e.target.value } }))}
                                      className={fieldCls}
                                      disabled={isSubmitting}
                                      placeholder={item.phase === "PHASE_II" ? "e.g. Phase II confirms retained-sample retest is required" : "e.g. No assignable lab error found in Phase I"}
                                    />
                                  </label>
                                  <div className="mt-3 grid gap-4 md:grid-cols-[auto_1fr]">
                                    <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(resolveForm.capaRequired)}
                                        onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, capaRequired: e.target.checked, capaReference: e.target.checked ? (resolveForm.capaReference ?? "") : "" } }))}
                                        disabled={isSubmitting}
                                      />
                                      CAPA linkage required
                                    </label>
                                    <label className="block">
                                      <span className={labelCls}>CAPA reference</span>
                                      <input
                                        value={resolveForm.capaReference ?? ""}
                                        onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, capaReference: e.target.value } }))}
                                        className={fieldCls}
                                        disabled={isSubmitting || !resolveForm.capaRequired}
                                        placeholder="CAPA identifier or tracking reference"
                                      />
                                    </label>
                                  </div>
                                  <label className="mt-3 block">
                                    <span className={labelCls}>Resolution remarks</span>
                                    <textarea
                                      rows={2}
                                      value={resolveForm.resolutionRemarks}
                                      onChange={(e) => setResolveForms((current) => ({ ...current, [item.id]: { ...resolveForm, resolutionRemarks: e.target.value } }))}
                                      className={fieldCls}
                                      disabled={isSubmitting}
                                      placeholder="e.g. Move to retained-sample retest"
                                    />
                                  </label>
                                </>
                              ) : null}
                              {isActiveInvestigationStatus(item.status) && item.phase === "PHASE_I" ? (
                                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/50 p-3">
                                  <label className="block">
                                    <span className={labelCls}>Phase I summary for escalation</span>
                                    <textarea
                                      rows={2}
                                      value={phaseTwoForm.phaseOneSummary}
                                      onChange={(e) => setPhaseTwoForms((current) => ({ ...current, [item.id]: { ...phaseTwoForm, phaseOneSummary: e.target.value } }))}
                                      className={fieldCls}
                                      disabled={isSubmitting}
                                      placeholder="e.g. No assignable lab error found in Phase I"
                                    />
                                  </label>
                                  <label className="block">
                                    <span className={labelCls}>Phase II assessment</span>
                                    <textarea
                                      rows={2}
                                      value={phaseTwoForm.phaseTwoAssessment}
                                      onChange={(e) => setPhaseTwoForms((current) => ({ ...current, [item.id]: { ...phaseTwoForm, phaseTwoAssessment: e.target.value } }))}
                                      className={fieldCls}
                                      disabled={isSubmitting}
                                      placeholder="e.g. Extend investigation to full batch and process review"
                                    />
                                  </label>
                                  <div className="mt-3 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => void handleEscalateInvestigationToPhaseTwo(item.id)}
                                      disabled={isSubmitting || !phaseTwoForm.phaseOneSummary.trim() || !phaseTwoForm.phaseTwoAssessment.trim()}
                                      className="rounded-xl border border-cyan-200 px-4 py-2 text-xs font-semibold text-cyan-700 hover:bg-cyan-100 disabled:cursor-not-allowed disabled:text-slate-300"
                                    >
                                      Escalate to Phase II
                                    </button>
                                  </div>
                                </div>
                              ) : null}
                              {item.phaseOneSummary ? (
                                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                                  <span className="font-semibold">Phase I summary:</span> {item.phaseOneSummary}
                                </div>
                              ) : null}
                              {item.phase === "PHASE_II" && item.phaseTwoAssessment ? (
                                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3 text-xs text-cyan-900">
                                  <span className="font-semibold">Phase II assessment:</span> {item.phaseTwoAssessment}
                                </div>
                              ) : null}
                              {item.phaseTwoSummary ? (
                                <div className="mt-3 rounded-xl border border-cyan-100 bg-cyan-50/50 px-4 py-3 text-xs text-cyan-900">
                                  <span className="font-semibold">Phase II summary:</span> {item.phaseTwoSummary}
                                </div>
                              ) : null}
                              {item.capaRequired ? (
                                <div className="mt-3 rounded-xl border border-rose-100 bg-rose-50/60 px-4 py-3 text-xs text-rose-900">
                                  <span className="font-semibold">CAPA linkage:</span> {item.capaReference ?? "Required"}
                                </div>
                              ) : null}
                              {item.closureCategory ? (
                                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs text-emerald-900">
                                  <span className="font-semibold">Closure classification:</span> {closureCategoryLabel(item.closureCategory)}
                                </div>
                              ) : null}
                              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                                <div className="text-[11px] font-semibold text-slate-700">Audit Timeline</div>
                                <div className="mt-2 space-y-2 text-[11px] text-slate-600">
                                  <div>Opened by {item.openedBy} on {new Date(item.openedAt).toLocaleString()}</div>
                                  {item.phaseTwoEscalatedAt ? (
                                    <div>Escalated to Phase II by {item.phaseTwoEscalatedBy ?? "—"} on {new Date(item.phaseTwoEscalatedAt).toLocaleString()}</div>
                                  ) : null}
                                  {item.outcomeSubmittedAt ? (
                                    <div>Submitted to QA by {item.outcomeSubmittedBy ?? "—"} on {new Date(item.outcomeSubmittedAt).toLocaleString()}</div>
                                  ) : null}
                                  {item.returnedToQcAt ? (
                                    <div>Returned to QC by {item.returnedToQcBy ?? "—"} on {new Date(item.returnedToQcAt).toLocaleString()}</div>
                                  ) : null}
                                  {item.qaReviewedAt ? (
                                    <div>
                                      QA {item.qaReviewDecision === "RETURNED" ? "returned" : "approved"} by {item.qaReviewedBy ?? "—"} on {new Date(item.qaReviewedAt).toLocaleString()}
                                    </div>
                                  ) : null}
                                  {item.qaReviewConfirmationAt ? (
                                    <div>QA sign-off captured from {item.qaReviewConfirmedBy ?? "—"} on {new Date(item.qaReviewConfirmationAt).toLocaleString()}</div>
                                  ) : null}
                                  {item.closedAt ? (
                                    <div>Closed by {item.closedBy ?? "—"} on {new Date(item.closedAt).toLocaleString()}</div>
                                  ) : null}
                                </div>
                              </div>
                              {isPendingQaInvestigationStatus(item.status) ? (
                                <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50/70 p-3">
                                  <div className="text-xs font-semibold text-amber-900">Pending QA review</div>
                                  <div className="mt-1 text-[11px] text-amber-800">
                                    QC submitted outcome <span className="font-semibold">{item.outcome ?? "—"}</span>. Final disposition stays blocked until QA review completes.
                                  </div>
                                  {canCompleteThisQaReview ? (
                                    <>
                                      <label className="mt-3 block">
                                        <span className={labelCls}>QA review remarks</span>
                                        <textarea
                                          rows={2}
                                          value={qaReviewForm.qaReviewRemarks}
                                          onChange={(e) => setQaReviewForms((current) => ({ ...current, [item.id]: { ...qaReviewForm, qaReviewRemarks: e.target.value } }))}
                                          className={fieldCls}
                                          disabled={isSubmitting}
                                          placeholder="Record QA approval or return comments"
                                        />
                                      </label>
                                      <div className="mt-3 grid gap-4 md:grid-cols-2">
                                        <label className="block">
                                          <span className={labelCls}>QA sign-off username</span>
                                          <input
                                            value={qaReviewForm.confirmedBy}
                                            readOnly
                                            className={readonlyCls}
                                            disabled
                                          />
                                        </label>
                                        <label className="block">
                                          <span className={labelCls}>Typed confirmation</span>
                                          <input
                                            value={qaReviewForm.confirmationText}
                                            onChange={(e) => setQaReviewForms((current) => ({ ...current, [item.id]: { ...qaReviewForm, confirmationText: e.target.value } }))}
                                            className={fieldCls}
                                            disabled={isSubmitting}
                                            placeholder={qaReviewApprovalConfirmation}
                                          />
                                        </label>
                                      </div>
                                      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
                                        QA sign-off username is taken from the logged-in account. Approval phrase: "{qaReviewApprovalConfirmation}". Return phrase: "{qaReviewReturnConfirmation}".
                                      </div>
                                      <div className="mt-3 flex flex-wrap justify-end gap-2">
                                        <button
                                          type="button"
                                          onClick={() => void handleCompleteQaReview(item.id, false)}
                                          disabled={isSubmitting || !qaReviewForm.qaReviewRemarks.trim()}
                                          className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                        >
                                          Return to QC
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleCompleteQaReview(item.id, true)}
                                          disabled={isSubmitting || !qaReviewForm.qaReviewRemarks.trim()}
                                          className="rounded-xl border border-amber-200 px-4 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:text-slate-300"
                                        >
                                          Approve QA Review
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="mt-3 rounded-xl border border-amber-200 bg-white px-4 py-3 text-xs text-amber-800">
                                      {qaReviewerIsSubmitter
                                        ? "Awaiting an independent QC manager or super admin review."
                                        : "Awaiting QC manager or super admin review."}
                                    </div>
                                  )}
                                </div>
                              ) : null}
                              {isActiveInvestigationStatus(item.status) ? (
                                <div className="mt-3 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => void handleResolveInvestigation(item.id)}
                                    disabled={isSubmitting}
                                    className="rounded-xl border border-fuchsia-200 px-4 py-2 text-xs font-semibold text-fuchsia-700 hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:text-slate-300"
                                  >
                                    Submit for QA Review
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-3 text-[11px] text-slate-500">
                                  {item.closedAt
                                    ? `Closed by ${item.closedBy ?? "—"} · ${new Date(item.closedAt).toLocaleString()}`
                                    : item.qaReviewedAt
                                      ? `QA reviewed by ${item.qaReviewedBy ?? "—"} · ${new Date(item.qaReviewedAt).toLocaleString()}`
                                      : "Closed"}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">No QC investigations recorded for this cycle.</p>
                    )}
                  </div>
                </div>
              ) : null}

              {(selectedRequest.requestStatus === "RETEST_REQUIRED" || canExecuteResample) ? (
                <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                  <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                    <span className="text-sm font-semibold text-slate-700">Exception Actions</span>
                  </div>
                  <div className="space-y-4 p-5">
                    {selectedRequest.requestStatus === "RETEST_REQUIRED" ? (
                      <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                        <label className="block">
                          <span className={labelCls}>Retest Analyst Code</span>
                          <input value={retestForm.analystCode} onChange={(e) => setRetestForm((current) => ({ ...current, analystCode: e.target.value }))} className={fieldCls} disabled={isSubmitting || !canExecuteRetest} />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Retest Remarks</span>
                          <input value={retestForm.remarks ?? ""} onChange={(e) => setRetestForm((current) => ({ ...current, remarks: e.target.value }))} className={fieldCls} disabled={isSubmitting || !canExecuteRetest} />
                        </label>
                        <div className="flex items-end">
                          <button type="button" onClick={handleExecuteRetest} disabled={isSubmitting || !canExecuteRetest} className="w-full rounded-xl border border-yellow-200 px-4 py-2.5 text-xs font-semibold text-yellow-700 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:text-slate-300">
                            Start Retest
                          </button>
                        </div>
                        {retestBlockReason ? (
                          <div className="md:col-span-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                            {retestBlockReason}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                    {canExecuteResample ? (
                      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                        <label className="block">
                          <span className={labelCls}>Resample Reason</span>
                          <input value={resampleForm.reason} onChange={(e) => setResampleForm({ reason: e.target.value })} className={fieldCls} disabled={isSubmitting} />
                        </label>
                        <div className="flex items-end">
                          <button type="button" onClick={handleExecuteResample} disabled={isSubmitting} className="w-full rounded-xl border border-amber-200 px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:text-slate-300">
                            Create Resample Cycle
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* ── QC Disposition Decision ────────────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                  <span className="text-sm font-semibold text-slate-700">QC Disposition Decision</span>
                </div>
                <div className="p-5 space-y-4">
                  {(!canRecordQcDecision || !canRecordFinalQcDecision || activeOrPendingInvestigationExists) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      {selectedRequest.requestStatus === "APPROVED" || selectedRequest.requestStatus === "REJECTED"
                        ? "QC decision already recorded for this request."
                        : !canRecordFinalQcDecision
                          ? "Only QC managers or super admins can record the final QC decision."
                        : activeOrPendingInvestigationExists
                          ? "QC decision is blocked until active and pending-QA investigations are complete."
                        : planForm.samplingMethod === "COA_BASED_RELEASE"
                          ? "CoA-based release can be decided once the sampling plan is defined."
                          : "Complete QC receipt, start review, and finish mandatory worksheet results before recording a QC decision."}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>QC Remarks <span className="text-red-500">*</span></label>
                    <textarea
                      rows={3}
                      value={qcRemarks}
                      onChange={(e) => setQcRemarks(e.target.value)}
                      className={fieldCls}
                      disabled={!canRecordFinalQcDecision || isSubmitting}
                      placeholder="Enter QC remarks (required before approve / reject)"
                    />
                  </div>
                  {canRecordFinalQcDecision ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="block">
                          <span className={labelCls}>Final QC sign-off username</span>
                          <input
                            value={qcDecisionSignoff.confirmedBy}
                            readOnly
                            className={readonlyCls}
                            disabled
                          />
                        </label>
                        <label className="block">
                          <span className={labelCls}>Typed confirmation</span>
                          <input
                            value={qcDecisionSignoff.confirmationText}
                            onChange={(e) => setQcDecisionSignoff((current) => ({ ...current, confirmationText: e.target.value }))}
                            className={fieldCls}
                            disabled={isSubmitting}
                            placeholder={qcDecisionApprovalConfirmation}
                          />
                        </label>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
                        Final QC sign-off username is taken from the logged-in account. Type "{qcDecisionApprovalConfirmation}" to confirm approval or "{qcDecisionRejectionConfirmation}" to confirm rejection.
                      </div>
                    </>
                  ) : null}
                  {selectedRequest.qcDecisionConfirmationAt ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                      Final QC sign-off captured from {selectedRequest.qcDecisionConfirmedBy ?? "—"} on {new Date(selectedRequest.qcDecisionConfirmationAt).toLocaleString()}.
                    </div>
                  ) : null}
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || !canRecordFinalQcDecision || !canApproveQcDecision}
                      onClick={() => void handleQcDecision(true)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Approve &amp; Release
                    </button>
                    <button
                      type="button"
                      disabled
                      className="flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white opacity-40"
                      title="Hold / Quarantine not yet supported"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                      </svg>
                      Hold / Quarantine
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting || !canRecordFinalQcDecision || !canRejectQcDecision}
                      onClick={() => void handleQcDecision(false)}
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 py-3 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-200"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Reject &amp; Return
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
