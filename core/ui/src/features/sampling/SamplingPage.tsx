import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import {
  completeSampling,
  createSamplingPlan,
  fetchBatches,
  fetchGrnItemContainers,
  fetchMaterials,
  fetchMoas,
  fetchPallets,
  fetchSamplingRequests,
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
  SamplingRequest
} from "../../types/sampling";

function requestTone(status: string) {
  switch (status) {
    case "APPROVED":
      return "bg-moss/15 text-moss";
    case "REJECTED":
      return "bg-redoxide/15 text-redoxide";
    case "UNDER_TEST":
      return "bg-amber/15 text-amber";
    case "PLAN_DEFINED":
      return "bg-steel/15 text-steel";
    case "REQUESTED":
    default:
      return "bg-teal/15 text-teal";
  }
}

const sampleTypes: SampleType[] = ["INDIVIDUAL", "COMPOSITE"];

const initialPlanForm: SamplingPlanRequest = {
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
  createdBy: "admin",
  updatedBy: "admin"
};

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
  const [requests, setRequests] = useState<SamplingRequest[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [samplingTools, setSamplingTools] = useState<SamplingTool[]>([]);
  const [containersByRequest, setContainersByRequest] = useState<Record<string, GrnContainer[]>>({});
  const [selectedRequestId, setSelectedRequestId] = useState<string>("");
  const [planForm, setPlanForm] = useState<SamplingPlanRequest>(initialPlanForm);
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
        const [requestPage, materialPage, batchPage, palletPage, specData, moaData, toolData] =
          await Promise.all([
            fetchSamplingRequests(),
            fetchMaterials(),
            fetchBatches(),
            fetchPallets(),
            fetchSpecs(),
            fetchMoas(),
            fetchSamplingTools()
          ]);

        if (!cancelled) {
          setRequests(requestPage.content);
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
        createdBy: "admin",
        updatedBy: "admin"
      });
      return;
    }

    setPlanForm({
      ...initialPlanForm,
      totalContainers: selectedRequest.totalContainers,
      containersToSample: selectedRequest.totalContainers,
      photosensitiveHandlingRequired: selectedRequest.photosensitiveMaterial,
      hygroscopicHandlingRequired: selectedRequest.hygroscopicMaterial
    });
  }, [selectedRequest]);

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
        createdBy: (planForm.createdBy ?? "admin").trim(),
        updatedBy: (planForm.updatedBy ?? "admin").trim()
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
      const updatedRequest = await completeSampling(selectedRequest.id, planForm.updatedBy ?? "admin");
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
        updatedBy: planForm.updatedBy ?? "admin"
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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="QC"
        title="Sampling and QC should operate from one controlled workbench"
        description="Sampling plans are now tied to Spec, MoA, analyst, tool, container-level quantities, and QC decision status."
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          {isLoading ? <article className="panel px-5 py-5 text-sm text-slate">Loading sampling queue...</article> : null}
          {!isLoading && error ? <article className="panel px-5 py-5 text-sm text-redoxide">{error}</article> : null}
          {!isLoading && !error && requests.length === 0 ? (
            <article className="panel px-5 py-5 text-sm text-slate">
              No sampling requests yet. Receive a GRN to populate this queue.
            </article>
          ) : null}

          {!isLoading &&
            !error &&
            requests.map((request) => {
              const material = materialMap.get(request.materialId);
              const batch = request.batchId ? batchMap.get(request.batchId) : null;

              return (
                <article
                  key={request.id}
                  className={`panel px-5 py-5 ${selectedRequestId === request.id ? "ring-2 ring-steel/40" : ""}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate">
                      {request.id.slice(0, 8)}
                    </p>
                    <span className={`status-pill ${requestTone(request.requestStatus)}`}>
                      {request.requestStatus}
                    </span>
                  </div>
                  <p className="mt-4 text-lg font-semibold text-ink">
                    {material ? `${material.materialCode} - ${material.materialName}` : request.materialId}
                  </p>
                  <p className="mt-1 text-sm text-slate">Batch: {batch ? batch.batchNumber : request.batchId}</p>
                  <p className="mt-1 text-sm text-slate">Containers: {request.totalContainers}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRequestId(request.id);
                      setPlanError(null);
                      setSuccessMessage(null);
                    }}
                    className="mt-4 rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white"
                  >
                    {selectedRequestId === request.id ? "Opened" : "Open workbench"}
                  </button>
                </article>
              );
            })}
        </div>

        <article className="panel px-6 py-6">
          {!selectedRequest ? (
            <div className="rounded-2xl border border-ink/10 bg-mist/80 px-4 py-4 text-sm text-slate">
              Select a request from the queue to define sampling and QC actions.
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handlePlanSubmit}>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-ink/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate">Material</p>
                  <p className="mt-2 text-sm font-semibold text-ink">
                    {selectedMaterial?.materialName ?? selectedRequest.materialId}
                  </p>
                  <p className="mt-1 text-sm text-slate">Type: {selectedMaterial?.materialType}</p>
                </div>
                <div className="rounded-2xl border border-ink/10 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate">Stock reference</p>
                  <p className="mt-2 text-sm text-ink">Batch: {selectedBatch?.batchNumber ?? "Not set"}</p>
                  <p className="mt-1 text-sm text-ink">Pallet: {selectedPallet?.palletCode ?? selectedRequest.palletId}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Spec</span>
                  <select
                    required
                    value={planForm.specId}
                    onChange={(event) => setPlanForm((current) => ({ ...current, specId: event.target.value }))}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    <option value="">Select spec</option>
                    {availableSpecs.map((spec) => (
                      <option key={spec.id} value={spec.id}>
                        {spec.specCode} - {spec.specName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">MoA</span>
                  <select
                    required
                    value={planForm.moaId}
                    onChange={(event) => setPlanForm((current) => ({ ...current, moaId: event.target.value }))}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    <option value="">Select MoA</option>
                    {moas.map((moa) => (
                      <option key={moa.id} value={moa.id}>
                        {moa.moaCode} - {moa.moaName}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Sampling method</span>
                  <input
                    readOnly
                    value={planForm.samplingMethod}
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Total containers</span>
                  <input
                    readOnly
                    value={planForm.totalContainers}
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Containers to sample</span>
                  <input
                    readOnly
                    value={planForm.containersToSample}
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Sample type</span>
                  <select
                    value={planForm.sampleType}
                    onChange={(event) =>
                      setPlanForm((current) => ({ ...current, sampleType: event.target.value as SampleType }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    {sampleTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Composite sample qty</span>
                  <input
                    readOnly
                    value={planForm.compositeSampleQuantity}
                    className="w-full rounded-2xl border border-ink/10 bg-mist px-4 py-3 text-sm text-ink outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Sampling location</span>
                  <input
                    required
                    value={planForm.samplingLocation}
                    onChange={(event) =>
                      setPlanForm((current) => ({ ...current, samplingLocation: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Analyst employee code</span>
                  <input
                    required
                    value={planForm.analystEmployeeCode}
                    onChange={(event) =>
                      setPlanForm((current) => ({ ...current, analystEmployeeCode: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Sampling tool</span>
                  <select
                    required
                    value={planForm.samplingToolId}
                    onChange={(event) =>
                      setPlanForm((current) => ({ ...current, samplingToolId: event.target.value }))
                    }
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  >
                    <option value="">Select tool</option>
                    {samplingTools.map((tool) => (
                      <option key={tool.id} value={tool.id}>
                        {tool.toolCode} - {tool.toolName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                <div className="rounded-3xl border border-ink/10 bg-mist/70 p-5">
                  <p className="text-sm font-semibold text-ink">Container-wise sample quantity</p>
                  <p className="mt-1 text-sm text-slate">
                    Enter one sample quantity per container. The same quantity will be applied to all selected containers.
                    {sampleQuantityUom ? ` UOM: ${sampleQuantityUom}` : ""}
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-[1fr_0.7fr]">
                    <input
                      readOnly
                      value={`${planForm.containersToSample} selected containers`}
                      className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={planForm.individualSampleQuantity}
                      onChange={(event) => {
                        const sampledQuantity = Number(event.target.value);
                        const nextSamples = planForm.containerSamples.map((sample) => ({
                          ...sample,
                          sampledQuantity
                        }));
                        const compositeSampleQuantity = nextSamples.reduce(
                          (sum, item) => sum + Number(item.sampledQuantity || 0),
                          0
                        );
                        setPlanForm((current) => ({
                          ...current,
                          individualSampleQuantity: sampledQuantity,
                          containerSamples: nextSamples,
                          compositeSampleQuantity
                        }));
                      }}
                      className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                      placeholder={`Sample qty${sampleQuantityUom ? ` (${sampleQuantityUom})` : ""}`}
                    />
                  </div>
                  <div className="mt-4 grid gap-3">
                    {planForm.containerSamples.map((sample, index) => {
                      const container = requestContainers.find(
                        (entry) => entry.id === sample.grnContainerId
                      );
                      return (
                        <div key={sample.grnContainerId} className="grid gap-3 md:grid-cols-[1.2fr_0.8fr]">
                          <input
                            readOnly
                            value={`${container?.containerNumber ?? `Container ${index + 1}`} - ${sample.sampledQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`}
                            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none"
                          />
                          <input
                            readOnly
                            value={`${sample.sampledQuantity}${sampleQuantityUom ? ` ${sampleQuantityUom}` : ""}`}
                            className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                  Vendor CoA based release selected. Sampling calculations and container-wise quantities are not required; QC can approve or reject directly.
                </div>
              )}

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Rationale</span>
                <textarea
                  value={planForm.rationale}
                  onChange={(event) => setPlanForm((current) => ({ ...current, rationale: event.target.value }))}
                  className="min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Created by</span>
                  <input
                    value={planForm.createdBy}
                    onChange={(event) => setPlanForm((current) => ({ ...current, createdBy: event.target.value }))}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Updated by</span>
                  <input
                    value={planForm.updatedBy}
                    onChange={(event) => setPlanForm((current) => ({ ...current, updatedBy: event.target.value }))}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  />
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:bg-ink/50"
                >
                  {selectedRequest.plan ? "Update sampling plan" : "Create sampling plan"}
                </button>
                {selectedRequest.plan && planForm.samplingMethod !== "COA_BASED_RELEASE" ? (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCompleteSampling}
                    className="rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white disabled:bg-steel/50"
                  >
                    Mark Sampling Complete
                  </button>
                ) : null}
              </div>

              <div className="rounded-3xl border border-ink/10 bg-white/60 p-5">
                <p className="text-sm font-semibold text-ink">QC decision</p>
                <textarea
                  value={qcRemarks}
                  onChange={(event) => setQcRemarks(event.target.value)}
                  className="mt-4 min-h-24 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
                  placeholder="Mandatory QC remarks"
                />
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting || !selectedRequest.plan}
                    onClick={() => void handleQcDecision(true)}
                    className="rounded-2xl bg-moss px-4 py-3 text-sm font-medium text-white disabled:bg-moss/50"
                  >
                    QC Approve
                  </button>
                  <button
                    type="button"
                    disabled={isSubmitting || !selectedRequest.plan}
                    onClick={() => void handleQcDecision(false)}
                    className="rounded-2xl bg-redoxide px-4 py-3 text-sm font-medium text-white disabled:bg-redoxide/50"
                  >
                    QC Reject
                  </button>
                </div>
              </div>

              {successMessage ? (
                <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                  {successMessage}
                </div>
              ) : null}

              {planError ? (
                <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                  {planError}
                </div>
              ) : null}
            </form>
          )}
        </article>
      </section>
    </div>
  );
}
