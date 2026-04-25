import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAppShellStore } from "../../stores/appShellStore";
import {
  completeSampling,
  createSamplingPlan,
  fetchBatches,
  fetchGrnItemContainers,
  fetchMaterials,
  fetchMoas,
  fetchPallets,
  fetchSamplingRequests,
  fetchSamplingSummary,
  fetchSamplingTools,
  fetchSpecs,
  recordQcDecision,
  updateSamplingPlan
} from "../../lib/api";
import type { Batch } from "../../types/batch";
import type { GrnContainer } from "../../types/grn";
import type { Pallet } from "../../types/location";
import type { Material } from "../../types/material";
import type { Moa } from "../../types/moa";
import type { SamplingTool } from "../../types/sampling-tool";
import type { Spec } from "../../types/spec";
import type {
  SampleType,
  SamplingContainerSampleRequest,
  SamplingMethod,
  SamplingPlanRequest,
  SamplingRequest,
  SamplingSummary
} from "../../types/sampling";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDotColor(status: string) {
  switch (status) {
    case "APPROVED":    return "bg-green-500";
    case "REJECTED":    return "bg-rose-500";
    case "UNDER_TEST":  return "bg-amber-400";
    case "PLAN_DEFINED":return "bg-amber-400";
    case "REQUESTED":   return "bg-blue-400";
    default:            return "bg-slate-400";
  }
}

function statusPillCls(status: string) {
  switch (status) {
    case "APPROVED":    return "bg-green-100 text-green-700";
    case "REJECTED":    return "bg-rose-100 text-rose-700";
    case "UNDER_TEST":  return "bg-amber-100 text-amber-700";
    case "PLAN_DEFINED":return "bg-amber-100 text-amber-700";
    case "REQUESTED":   return "bg-blue-100 text-blue-700";
    default:            return "bg-slate-100 text-slate-500";
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "APPROVED":    return "Approved";
    case "REJECTED":    return "Rejected";
    case "UNDER_TEST":  return "Testing";
    case "PLAN_DEFINED":return "Plan Set";
    case "REQUESTED":   return "Pending";
    default:            return status;
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
const requestStatuses = ["ALL", "REQUESTED", "PLAN_DEFINED", "UNDER_TEST", "APPROVED", "REJECTED"] as const;

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
  const [isLoading, setIsLoading]             = useState(true);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [error, setError]                     = useState<string | null>(null);
  const [planError, setPlanError]             = useState<string | null>(null);
  const [successMessage, setSuccessMessage]   = useState<string | null>(null);

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
        if (!cancelled) {
          setRequests(requestPage.content);
          setSummary(summaryData);
          setMaterials(materialPage.content);
          setBatches(batchPage.content);
          setPallets(palletPage.content);
          setSpecs(specData);
          setMoas(moaData);
          setSamplingTools(toolData);
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
      totalContainers: selectedRequest.totalContainers,
      containersToSample: selectedRequest.totalContainers,
      photosensitiveHandlingRequired: selectedRequest.photosensitiveMaterial,
      hygroscopicHandlingRequired: selectedRequest.hygroscopicMaterial
    });
  }, [currentUserName, selectedMaterial, selectedRequest]);

  useEffect(() => {
    if (!selectedMaterial) return;
    const sel = specMap.get(planForm.specId);
    const method =
      selectedMaterial.materialType === "CRITICAL"
        ? "HUNDRED_PERCENT"
        : (sel?.samplingMethod ?? "SQRT_N_PLUS_1");
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
      sampleType: method === "COA_BASED_RELEASE" ? "COMPOSITE" : c.sampleType
    }));
  }, [planForm.specId, planForm.totalContainers, requestContainers, selectedMaterial, specMap]);

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
      selectedRequest.requestStatus === "PLAN_DEFINED" &&
      planForm.samplingMethod !== "COA_BASED_RELEASE"
  );
  const canRecordQcDecision = Boolean(
    selectedRequest &&
      selectedRequest.plan &&
      ((planForm.samplingMethod === "COA_BASED_RELEASE" && selectedRequest.requestStatus === "PLAN_DEFINED") ||
        (planForm.samplingMethod !== "COA_BASED_RELEASE" && selectedRequest.requestStatus === "UNDER_TEST"))
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

  async function handleQcDecision(approved: boolean) {
    if (!selectedRequest) return;
    if (!qcRemarks.trim()) { setPlanError("QC remarks are required."); return; }
    setIsSubmitting(true); setPlanError(null);
    try {
      const updatedRequest = await recordQcDecision(selectedRequest.id, {
        approved,
        remarks:   qcRemarks.trim(),
        updatedBy: planForm.updatedBy ?? currentUserName
      });
      setRequests((c) => c.map((r) => (r.id === updatedRequest.id ? updatedRequest : r)));
      setSuccessMessage(approved ? "QC approved. Inventory moved to RELEASED." : "QC rejected. Inventory moved to REJECTED.");
    } catch (err) {
      setPlanError(err instanceof Error ? err.message : "Unknown error while recording QC decision");
    } finally {
      setIsSubmitting(false);
    }
  }

  // ─── Derived counts ─────────────────────────────────────────────────────────
  const pendingCount  = summary?.countsByStatus["REQUESTED"]   ?? 0;
  const testingCount  = summary?.countsByStatus["UNDER_TEST"]  ?? 0;
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
            onClick={() => setStatusFilter("UNDER_TEST")}
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
                  { key: "UNDER_TEST",label: `Testing (${testingCount})` }
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
                          {request.plan?.analystEmployeeCode
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
                      {selectedRequest.plan?.analystEmployeeCode ?? "Unassigned"}
                    </div>
                  </div>
                  <div className="rounded-xl bg-green-50 p-3">
                    <div className="text-[10px] text-slate-500 mb-0.5">Sampling Location</div>
                    <div className="text-xs font-bold text-slate-800">
                      {selectedRequest.plan?.samplingLocation ?? "—"}
                    </div>
                  </div>
                </div>

                {/* Sampling Checklist */}
                <div className="border-t border-green-50 px-5 pb-5">
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
                        <option value="">Select MoA</option>
                        {moas.map((m) => (
                          <option key={m.id} value={m.id}>{m.moaCode} - {m.moaName}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelCls}>Sampling Method</span>
                      <input readOnly value={planForm.samplingMethod.replace(/_/g, " ")} className={readonlyCls} />
                    </label>
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
                  </div>

                  {successMessage ? (
                    <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-xs text-green-700">{successMessage}</div>
                  ) : null}
                  {planError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">{planError}</div>
                  ) : null}
                </form>
              </div>

              {/* ── QC Disposition Decision ────────────────────────────── */}
              <div className="overflow-hidden rounded-2xl border border-green-100 bg-white shadow-sm">
                <div className="border-b border-green-100 bg-gradient-to-r from-green-50 to-white px-5 py-3">
                  <span className="text-sm font-semibold text-slate-700">QC Disposition Decision</span>
                </div>
                <div className="p-5 space-y-4">
                  {!canRecordQcDecision && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                      {selectedRequest.requestStatus === "APPROVED" || selectedRequest.requestStatus === "REJECTED"
                        ? "QC decision already recorded for this request."
                        : "Complete the sampling plan and mark sampling complete before recording a QC decision."}
                    </div>
                  )}
                  <div>
                    <label className={labelCls}>QC Remarks <span className="text-red-500">*</span></label>
                    <textarea
                      rows={3}
                      value={qcRemarks}
                      onChange={(e) => setQcRemarks(e.target.value)}
                      className={fieldCls}
                      placeholder="Enter QC remarks (required before approve / reject)"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      disabled={isSubmitting || !canRecordQcDecision}
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
                      disabled={isSubmitting || !canRecordQcDecision}
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
