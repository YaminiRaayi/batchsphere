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

function requestTone(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-green-100 text-green-700";
    case "REJECTED":
      return "bg-red-100 text-red-700";
    case "UNDER_TEST":
      return "bg-amber-100 text-amber-700";
    case "PLAN_DEFINED":
      return "bg-teal-100 text-teal-700";
    case "REQUESTED":
    default:
      return "bg-sky-100 text-sky-700";
  }
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
    case "HUNDRED_PERCENT":
      return totalContainers;
    case "SQRT_N_PLUS_1":
      return Math.min(totalContainers, Math.ceil(Math.sqrt(totalContainers) + 1));
    case "COA_BASED_RELEASE":
      return 0;
    default:
      return totalContainers;
  }
}

export function SamplingPage() {
  const currentUserName = useAppShellStore((state) => state.currentUser.name);
  const [requests, setRequests] = useState<SamplingRequest[]>([]);
  const [summary, setSummary] = useState<SamplingSummary | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [samplingTools, setSamplingTools] = useState<SamplingTool[]>([]);
  const [containersByRequest, setContainersByRequest] = useState<Record<string, GrnContainer[]>>({});
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<(typeof requestStatuses)[number]>("ALL");
  const [planForm, setPlanForm] = useState<SamplingPlanRequest>(() => createInitialPlanForm(currentUserName));
  const [qcRemarks, setQcRemarks] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planError, setPlanError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unknown error while loading sampling requests";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSamplingQueue();

    return () => {
      cancelled = true;
    };
  }, []);

  const materialMap = useMemo(
    () => new Map(materials.map((material) => [material.id, material])),
    [materials]
  );
  const batchMap = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);
  const palletMap = useMemo(
    () => new Map(pallets.map((pallet) => [pallet.id, pallet])),
    [pallets]
  );
  const specMap = useMemo(() => new Map(specs.map((spec) => [spec.id, spec])), [specs]);
  const selectedRequest = requests.find((request) => request.id === selectedRequestId) ?? null;
  const selectedMaterial = selectedRequest ? materialMap.get(selectedRequest.materialId) ?? null : null;
  const requestContainers = selectedRequest ? containersByRequest[selectedRequest.id] ?? [] : [];
  const sampleQuantityUom = selectedMaterial?.uom ?? "";

  useEffect(() => {
    if (!selectedRequest || containersByRequest[selectedRequest.id]) {
      return;
    }

    const request = selectedRequest;
    let cancelled = false;
    async function loadContainers() {
      const containers = await fetchGrnItemContainers(request.grnItemId);
      if (!cancelled) {
        setContainersByRequest((current) => ({ ...current, [request.id]: containers }));
      }
    }

    void loadContainers();
    return () => {
      cancelled = true;
    };
  }, [containersByRequest, selectedRequest]);

  useEffect(() => {
    if (!selectedRequest) {
      return;
    }

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
        containerSamples: selectedRequest.plan.containerSamples.map((sample) => ({
          grnContainerId: sample.grnContainerId,
          sampledQuantity: sample.sampledQuantity
        })),
        createdBy: currentUserName,
        updatedBy: currentUserName
      });
      return;
    }

    setPlanForm({
      ...createInitialPlanForm(currentUserName),
      totalContainers: selectedRequest.totalContainers,
      containersToSample: selectedRequest.totalContainers,
      photosensitiveHandlingRequired: selectedRequest.photosensitiveMaterial,
      hygroscopicHandlingRequired: selectedRequest.hygroscopicMaterial
    });
  }, [currentUserName, selectedRequest]);

  useEffect(() => {
    if (!selectedMaterial) {
      return;
    }

    const selectedSpec = specMap.get(planForm.specId);
    const method =
      selectedMaterial.materialType === "CRITICAL"
        ? "HUNDRED_PERCENT"
        : (selectedSpec?.samplingMethod ?? "SQRT_N_PLUS_1");
    const requiredContainers = computeRequiredContainers(method, planForm.totalContainers);
    const nextSamples =
      method === "COA_BASED_RELEASE"
        ? []
        : requestContainers.slice(0, requiredContainers).map((container) => {
            const existing = planForm.containerSamples.find(
              (sample) => sample.grnContainerId === container.id
            );
            return {
              grnContainerId: container.id,
              sampledQuantity: existing?.sampledQuantity ?? 0
            };
          });
    const compositeSampleQuantity = nextSamples.reduce(
      (sum, sample) => sum + Number(sample.sampledQuantity || 0),
      0
    );

    setPlanForm((current) => ({
      ...current,
      samplingMethod: method,
      containersToSample: requiredContainers,
      coaBasedRelease: method === "COA_BASED_RELEASE",
      containerSamples: nextSamples,
      individualSampleQuantity: method === "COA_BASED_RELEASE" ? 0 : current.individualSampleQuantity,
      compositeSampleQuantity: method === "COA_BASED_RELEASE" ? 0 : compositeSampleQuantity,
      sampleType: method === "COA_BASED_RELEASE" ? "COMPOSITE" : current.sampleType
    }));
  }, [planForm.specId, planForm.totalContainers, requestContainers, selectedMaterial, specMap]);

  const availableSpecs = useMemo(() => {
    if (!selectedMaterial) {
      return specs;
    }
    if (selectedMaterial.materialType === "CRITICAL") {
      return specs.filter((spec) => spec.samplingMethod === "HUNDRED_PERCENT");
    }
    return specs.filter((spec) =>
      spec.samplingMethod === "SQRT_N_PLUS_1" || spec.samplingMethod === "COA_BASED_RELEASE"
    );
  }, [selectedMaterial, specs]);

  const filteredRequests =
    statusFilter === "ALL"
      ? requests
      : requests.filter((request) => request.requestStatus === statusFilter);
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
    if (!selectedRequest) {
      setPlanError("Select a sampling request first.");
      return;
    }

    setIsSubmitting(true);
    setPlanError(null);
    setSuccessMessage(null);

    try {
      const isCoaBasedRelease = planForm.samplingMethod === "COA_BASED_RELEASE";
      const payload: SamplingPlanRequest = {
        ...planForm,
        containersToSample: isCoaBasedRelease ? 0 : planForm.containersToSample,
        individualSampleQuantity: isCoaBasedRelease ? 0 : planForm.individualSampleQuantity,
        compositeSampleQuantity: isCoaBasedRelease ? 0 : planForm.compositeSampleQuantity,
        containerSamples: isCoaBasedRelease ? [] : planForm.containerSamples,
        coaBasedRelease: isCoaBasedRelease,
        sampleType: isCoaBasedRelease ? "COMPOSITE" : planForm.sampleType,
        samplingLocation: planForm.samplingLocation.trim(),
        analystEmployeeCode: planForm.analystEmployeeCode.trim(),
        rationale: planForm.rationale?.trim() || undefined,
        createdBy: (planForm.createdBy ?? currentUserName).trim(),
        updatedBy: (planForm.updatedBy ?? currentUserName).trim()
      };

      const updatedRequest = selectedRequest.plan
        ? await updateSamplingPlan(selectedRequest.id, selectedRequest.plan.id, payload)
        : await createSamplingPlan(selectedRequest.id, payload);

      setRequests((current) =>
        current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request))
      );
      setSuccessMessage(
        selectedRequest.plan
          ? "Sampling plan updated successfully."
          : "Sampling plan created successfully."
      );
    } catch (submitError) {
      setPlanError(
        submitError instanceof Error ? submitError.message : "Unknown error while saving sampling plan"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCompleteSampling() {
    if (!selectedRequest) {
      return;
    }
    setIsSubmitting(true);
    setPlanError(null);
    try {
      const updatedRequest = await completeSampling(selectedRequest.id, planForm.updatedBy ?? currentUserName);
      setRequests((current) =>
        current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request))
      );
      setSuccessMessage("Sampling completed. Inventory moved to UNDER_TEST.");
    } catch (submitError) {
      setPlanError(
        submitError instanceof Error ? submitError.message : "Unknown error while completing sampling"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleQcDecision(approved: boolean) {
    if (!selectedRequest) {
      return;
    }
    if (!qcRemarks.trim()) {
      setPlanError("QC remarks are required.");
      return;
    }

    setIsSubmitting(true);
    setPlanError(null);
    try {
      const updatedRequest = await recordQcDecision(selectedRequest.id, {
        approved,
        remarks: qcRemarks.trim(),
        updatedBy: planForm.updatedBy ?? currentUserName
      });
      setRequests((current) =>
        current.map((request) => (request.id === updatedRequest.id ? updatedRequest : request))
      );
      setSuccessMessage(
        approved ? "QC approved. Inventory moved to RELEASED." : "QC rejected. Inventory moved to REJECTED."
      );
    } catch (submitError) {
      setPlanError(
        submitError instanceof Error ? submitError.message : "Unknown error while recording QC decision"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const selectedBatch = selectedRequest?.batchId ? batchMap.get(selectedRequest.batchId) : null;
  const selectedPallet = selectedRequest ? palletMap.get(selectedRequest.palletId) : null;

  const fieldCls = "w-full rounded-2xl border border-teal-100 bg-white px-4 py-3 text-sm text-slate-800 outline-none focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-500";
  const readonlyCls = "w-full rounded-2xl border border-teal-50 bg-slate-50 px-4 py-3 text-sm text-slate-700 outline-none";
  const labelCls = "mb-2 block text-sm font-medium text-slate-700";

  return (
    <div className="space-y-5">
      {/* Page header */}
      <section className="rounded-[28px] border border-teal-100 bg-white px-6 py-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-slate-400">
              Quality / <span className="font-medium text-teal-700">Sampling & QC</span>
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-800">QC Sampling Queue</h1>
            <p className="mt-1 text-sm text-slate-500">
              Sampling plans · container tracking · QC approve / reject
            </p>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </section>
      ) : null}

      {/* Status KPI row */}
      {summary ? (
        <section className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {requestStatuses
            .filter((s) => s !== "ALL")
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-2xl border px-4 py-4 text-left transition ${
                  statusFilter === s
                    ? "border-teal-400 bg-teal-50 ring-1 ring-teal-300"
                    : "border-teal-100 bg-white hover:border-teal-200"
                }`}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{s.replace(/_/g, " ")}</p>
                <p className="mt-2 text-2xl font-bold text-slate-800">
                  {summary.countsByStatus[s] ?? 0}
                </p>
              </button>
            ))}
        </section>
      ) : null}

      {/* Main split layout */}
      <section className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left: sampling queue */}
        <aside className="overflow-hidden rounded-[24px] border border-teal-100 bg-white shadow-sm">
          <div className="border-b border-teal-100 px-4 py-4">
            <p className="text-sm font-semibold text-slate-700">Sampling Queue</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {requestStatuses.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setStatusFilter(f)}
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                    statusFilter === f
                      ? "bg-teal-600 text-white"
                      : "bg-teal-50 text-slate-500 hover:bg-teal-100"
                  }`}
                >
                  {f === "ALL" ? "All" : f.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[780px] overflow-y-auto">
            {isLoading ? (
              <p className="px-4 py-6 text-sm text-slate-500">Loading sampling queue...</p>
            ) : filteredRequests.length === 0 ? (
              <p className="px-4 py-6 text-sm text-slate-500">
                {requests.length === 0
                  ? "No sampling requests yet. Receive a GRN to populate this queue."
                  : "No requests match the current filter."}
              </p>
            ) : (
              filteredRequests.map((request) => {
                const material = materialMap.get(request.materialId);
                const batch = request.batchId ? batchMap.get(request.batchId) : null;
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
                      "w-full border-b border-slate-100 px-4 py-4 text-left transition",
                      isSelected ? "border-l-[3px] border-l-teal-600 bg-teal-50" : "hover:bg-slate-50"
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-teal-700">
                        {request.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${requestTone(request.requestStatus)}`}>
                        {request.requestStatus.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-800">
                      {material ? material.materialName : request.materialId.slice(0, 16)}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {batch ? batch.batchNumber : "Batch pending"} · {request.totalContainers} containers
                    </p>
                    {request.plan?.coaBasedRelease ? (
                      <p className="mt-1 text-[11px] font-semibold text-teal-600">CoA-based release</p>
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Right: workbench */}
        <section className="overflow-hidden rounded-[24px] border border-teal-100 bg-white shadow-sm">
          {!selectedRequest ? (
            <div className="flex min-h-[420px] items-center justify-center rounded-[22px] border border-dashed border-teal-200 bg-teal-50/40 px-6 text-center m-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Select a sampling request</p>
                <p className="mt-2 text-sm text-slate-500">
                  The workbench will show the sampling plan, container quantities, and QC decision controls.
                </p>
              </div>
            </div>
          ) : (
            <form className="space-y-5 p-6" onSubmit={handlePlanSubmit}>
              {/* Workbench header */}
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-teal-100 pb-5">
                <div>
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="font-mono text-lg font-bold text-slate-800">
                      {selectedRequest.id.slice(0, 8).toUpperCase()}
                    </h2>
                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${requestTone(selectedRequest.requestStatus)}`}>
                      {selectedRequest.requestStatus.replace(/_/g, " ")}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-slate-500">
                    {selectedMaterial?.materialName ?? "Material"} · {selectedRequest.totalContainers} containers
                  </p>
                </div>
              </div>

              {/* Material + Stock info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    <div className="h-4 w-1 rounded bg-teal-500" />
                    Material
                  </div>
                  <p className="text-sm font-semibold text-slate-800">
                    {selectedMaterial ? `${selectedMaterial.materialCode} - ${selectedMaterial.materialName}` : selectedRequest.materialId}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">Type: {selectedMaterial?.materialType ?? "—"}</p>
                  {selectedMaterial?.storageCondition ? (
                    <p className="mt-0.5 text-xs text-slate-500">Storage: {selectedMaterial.storageCondition}</p>
                  ) : null}
                </div>
                <div className="rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                  <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                    <div className="h-4 w-1 rounded bg-indigo-500" />
                    Stock Reference
                  </div>
                  <p className="text-sm text-slate-800">
                    Batch: <span className="font-semibold">{selectedBatch?.batchNumber ?? "Not set"}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-800">
                    Pallet: <span className="font-semibold">{selectedPallet?.palletCode ?? selectedRequest.palletId}</span>
                  </p>
                </div>
              </div>

              {/* Sampling plan fields */}
              <div className="rounded-2xl border border-teal-100 bg-white p-5">
                <p className="mb-4 text-sm font-semibold text-slate-700">Sampling Plan</p>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="block">
                    <span className={labelCls}>Spec</span>
                    <select required disabled={!canEditPlan || isSubmitting} value={planForm.specId}
                      onChange={(e) => setPlanForm((c) => ({ ...c, specId: e.target.value }))}
                      className={fieldCls}>
                      <option value="">Select spec</option>
                      {availableSpecs.map((spec) => (
                        <option key={spec.id} value={spec.id}>{spec.specCode} - {spec.specName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>MoA</span>
                    <select required disabled={!canEditPlan || isSubmitting} value={planForm.moaId}
                      onChange={(e) => setPlanForm((c) => ({ ...c, moaId: e.target.value }))}
                      className={fieldCls}>
                      <option value="">Select MoA</option>
                      {moas.map((moa) => (
                        <option key={moa.id} value={moa.id}>{moa.moaCode} - {moa.moaName}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Sampling method</span>
                    <input readOnly value={planForm.samplingMethod} className={readonlyCls} />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                      {sampleTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className={labelCls}>Composite sample qty</span>
                    <input readOnly value={planForm.compositeSampleQuantity} className={readonlyCls} />
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                      {samplingTools.map((tool) => (
                        <option key={tool.id} value={tool.id}>{tool.toolCode} - {tool.toolName}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {/* Container-wise quantities */}
              {planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                <div className="rounded-2xl border border-teal-100 bg-teal-50/30 p-5">
                  <p className="text-sm font-semibold text-slate-700">Container-wise sample quantity</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Applies the same sample quantity to all selected containers.
                    {sampleQuantityUom ? ` UOM: ${sampleQuantityUom}` : ""}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.7fr]">
                    <input readOnly value={`${planForm.containersToSample} selected containers`} className={readonlyCls} />
                    <input
                      type="number" min="0" step="0.001"
                      disabled={!canEditPlan || isSubmitting}
                      value={planForm.individualSampleQuantity}
                      onChange={(event) => {
                        const sampledQuantity = Number(event.target.value);
                        const nextSamples = planForm.containerSamples.map((sample) => ({ ...sample, sampledQuantity }));
                        const compositeSampleQuantity = nextSamples.reduce((sum, item) => sum + Number(item.sampledQuantity || 0), 0);
                        setPlanForm((current) => ({ ...current, individualSampleQuantity: sampledQuantity, containerSamples: nextSamples, compositeSampleQuantity }));
                      }}
                      className={fieldCls}
                      placeholder={`Sample qty${sampleQuantityUom ? ` (${sampleQuantityUom})` : ""}`}
                    />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {planForm.containerSamples.map((sample, index) => {
                      const container = requestContainers.find((entry) => entry.id === sample.grnContainerId);
                      return (
                        <div key={sample.grnContainerId} className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                          <input readOnly value={`${container?.containerNumber ?? `Container ${index + 1}`} - ${sample.sampledQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`} className={readonlyCls} />
                          <input readOnly value={`${sample.sampledQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`} className={readonlyCls} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-teal-200 bg-teal-50 px-4 py-4 text-sm text-teal-700">
                  Vendor CoA based release selected. Sampling calculations and container-wise quantities are not required; QC can approve or reject directly.
                </div>
              )}

              {/* Rationale */}
              <label className="block">
                <span className={labelCls}>Rationale</span>
                <textarea
                  disabled={!canEditPlan || isSubmitting}
                  value={planForm.rationale}
                  onChange={(e) => setPlanForm((c) => ({ ...c, rationale: e.target.value }))}
                  className={`min-h-24 ${fieldCls}`}
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>Created by</span>
                  <input disabled={!canEditPlan || isSubmitting} value={planForm.createdBy}
                    onChange={(e) => setPlanForm((c) => ({ ...c, createdBy: e.target.value }))}
                    className={fieldCls} />
                </label>
                <label className="block">
                  <span className={labelCls}>Updated by</span>
                  <input value={planForm.updatedBy}
                    onChange={(e) => setPlanForm((c) => ({ ...c, updatedBy: e.target.value }))}
                    className={fieldCls} />
                </label>
              </div>

              {/* Plan actions */}
              <div className="flex flex-wrap gap-3 border-t border-teal-100 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting || !canEditPlan}
                  className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-teal-300"
                >
                  {selectedRequest.plan ? "Update sampling plan" : "Create sampling plan"}
                </button>
                {selectedRequest.plan && planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                  <button
                    type="button"
                    disabled={isSubmitting || !canCompleteSampling}
                    onClick={handleCompleteSampling}
                    className="rounded-xl border border-teal-200 px-5 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 disabled:cursor-not-allowed disabled:text-slate-300"
                  >
                    Mark Sampling Complete
                  </button>
                ) : null}
              </div>

              {/* QC decision */}
              <div className="rounded-2xl border border-teal-100 bg-white p-5">
                <p className="mb-1 text-sm font-semibold text-slate-700">QC Decision</p>
                <p className="mb-4 text-xs text-slate-500">Remarks are mandatory before approving or rejecting.</p>
                <textarea
                  value={qcRemarks}
                  onChange={(e) => setQcRemarks(e.target.value)}
                  className={`min-h-24 ${fieldCls}`}
                  placeholder="Enter QC remarks (required)"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting || !canRecordQcDecision}
                    onClick={() => void handleQcDecision(true)}
                    className="rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-200"
                  >
                    ✓ QC Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !canRecordQcDecision}
                    onClick={() => void handleQcDecision(false)}
                    className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-200"
                  >
                    ✗ QC Reject
                  </button>
                </div>
              </div>

              {successMessage ? (
                <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {successMessage}
                </div>
              ) : null}

              {planError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {planError}
                </div>
              ) : null}
            </form>
          )}
        </section>
      </section>
    </div>
  );
}
