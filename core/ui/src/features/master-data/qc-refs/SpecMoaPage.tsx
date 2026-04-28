import { type ChangeEvent, FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  approveMoa,
  approveSpec,
  createMoa,
  createSpec,
  createSpecParameter,
  deleteMoa,
  deleteSpec,
  deleteSpecParameter,
  fetchMaterials,
  fetchMoas,
  fetchMoaReviewQueue,
  fetchSpecMaterialLinks,
  fetchSpecParameters,
  fetchSpecReviewQueue,
  fetchSpecs,
  linkMaterialSpec,
  obsoleteMoa,
  obsoleteSpec,
  rejectMoa,
  rejectSpec,
  reviseSpec,
  submitMoa,
  submitSpec,
  updateMoa,
  updateSpec,
  updateSpecParameter
} from "../../../lib/api";
import { useAppShellStore } from "../../../stores/appShellStore";
import type { Material } from "../../../types/material";
import type {
  CreateMoaRequest,
  Moa,
  MoaStatus,
  MoaType,
  MoaValidationStatus,
  SampleSolutionStabilityUnit
} from "../../../types/moa";
import type {
  CompendialRef,
  CreateSpecRequest,
  MaterialSpecLink,
  RejectRequest,
  Spec,
  SpecParameter,
  SpecParameterCriteriaType,
  SpecParameterRequest,
  SpecParameterTestType,
  SpecStatus,
  SpecType,
  TargetMarket
} from "../../../types/spec";

type TabKey = "spec" | "moa" | "review";

type SpecMoaPageProps = {
  initialTab: TabKey;
};

type SpecParameterDraftRow = SpecParameterRequest & {
  localId: string;
  existingId?: string;
};

const specTypeLabels: Record<SpecType, string> = {
  MATERIAL: "Material",
  IN_PROCESS: "In-Process",
  FINISHED_PRODUCT: "Finished Product",
  PACKAGING: "Packaging"
};

const specTypeBadgeTone: Record<SpecType, string> = {
  MATERIAL: "bg-blue-100 text-blue-700",
  IN_PROCESS: "bg-emerald-100 text-emerald-700",
  FINISHED_PRODUCT: "bg-fuchsia-100 text-fuchsia-700",
  PACKAGING: "bg-orange-100 text-orange-700"
};

const specStatusTone: Record<SpecStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  OBSOLETE: "bg-slate-100 text-slate-600"
};

const moaStatusTone: Record<MoaStatus, string> = {
  DRAFT: "bg-amber-100 text-amber-700",
  UNDER_REVIEW: "bg-blue-100 text-blue-700",
  APPROVED: "bg-green-100 text-green-700",
  OBSOLETE: "bg-slate-100 text-slate-600"
};

const validationTone: Record<MoaValidationStatus, string> = {
  NOT_VALIDATED: "bg-rose-100 text-rose-700",
  IN_VALIDATION: "bg-amber-100 text-amber-700",
  VALIDATED: "bg-green-100 text-green-700",
  VALIDATED_COMPENDIAL: "bg-indigo-100 text-indigo-700"
};

const testTypeTone: Record<SpecParameterTestType, string> = {
  IDENTITY: "bg-violet-100 text-violet-700",
  ASSAY: "bg-blue-100 text-blue-700",
  PURITY: "bg-amber-100 text-amber-700",
  PHYSICAL: "bg-slate-100 text-slate-600",
  CHEMICAL: "bg-teal-100 text-teal-700",
  MICROBIOLOGICAL: "bg-rose-100 text-rose-700",
  DESCRIPTION: "bg-indigo-100 text-indigo-700"
};

const specTypes: SpecType[] = ["MATERIAL", "IN_PROCESS", "FINISHED_PRODUCT", "PACKAGING"];
const specStatuses: SpecStatus[] = ["DRAFT", "UNDER_REVIEW", "APPROVED", "OBSOLETE"];
const targetMarkets: TargetMarket[] = ["EU", "US_FDA", "UK_MHRA", "INDIA_CDSCO", "JAPAN_PMDA", "CHINA_NMPA", "WHO_PREQUALIFICATION", "GLOBAL", "INTERNAL"];
const compendialRefs: CompendialRef[] = ["PH_EUR", "USP", "BP", "JP", "IP", "CHN_PHARMACOPOEIA", "WHO_INT", "MULTI_COMPENDIAL", "IN_HOUSE", "NONE"];
const moaTypes: MoaType[] = ["HPLC", "GC", "UV_VIS", "IR", "TITRATION", "KARL_FISCHER", "LOD_OVEN", "PHYSICAL", "MICROBIOLOGICAL", "VISUAL", "OTHER"];
const moaValidationStatuses: MoaValidationStatus[] = ["NOT_VALIDATED", "IN_VALIDATION", "VALIDATED", "VALIDATED_COMPENDIAL"];
const sampleSolutionUnits: SampleSolutionStabilityUnit[] = ["MINUTES", "HOURS", "DAYS"];
const parameterTestTypes: SpecParameterTestType[] = ["IDENTITY", "ASSAY", "PURITY", "PHYSICAL", "CHEMICAL", "MICROBIOLOGICAL", "DESCRIPTION"];
const parameterCriteriaTypes: SpecParameterCriteriaType[] = ["NLT", "NMT", "RANGE", "PASS_FAIL", "COMPLIES", "TEXT"];
const samplingMethods = ["SQRT_N_PLUS_1", "HUNDRED_PERCENT", "MILITARY", "COA_BASED_RELEASE"] as const;
const samplingMethodLabels: Record<(typeof samplingMethods)[number], string> = {
  SQRT_N_PLUS_1: "√N+1 Containers",
  HUNDRED_PERCENT: "100% All Containers",
  MILITARY: "Military Standard MIL-STD-1916",
  COA_BASED_RELEASE: "CoA-based — No Physical Sampling"
};
const samplingMethodHints: Record<(typeof samplingMethods)[number], string> = {
  SQRT_N_PLUS_1: "Container count = √(total containers) + 1, rounded up. Standard for most raw materials.",
  HUNDRED_PERCENT: "Every container is sampled. Use for high-risk or critical materials that require complete physical verification.",
  MILITARY: "Sampling follows a statistical acceptance plan based on MIL-STD-1916 or an equivalent controlled standard.",
  COA_BASED_RELEASE: "Material is evaluated primarily against vendor CoA and qualification rules, with no routine physical sampling."
};

function humanizeStatus(value: string) {
  return value.replace(/_/g, " ");
}

function emptySpecForm(userName: string): CreateSpecRequest {
  return {
    specCode: "",
    specName: "",
    revision: "",
    specType: "MATERIAL",
    samplingMethod: "SQRT_N_PLUS_1",
    targetMarket: "GLOBAL",
    effectiveDate: "",
    expiryDate: "",
    compendialRef: "IN_HOUSE",
    compendialEdition: "",
    referenceDocumentNo: "",
    referenceAttachment: "",
    reviewRoute: "QC_ONLY",
    createdBy: userName
  };
}

function emptyMoaForm(userName: string): CreateMoaRequest {
  return {
    moaCode: "",
    moaName: "",
    revision: "",
    moaType: "HPLC",
    principle: "",
    compendialRef: "IN_HOUSE",
    instrumentType: "",
    reagentsAndStandards: "",
    systemSuitabilityCriteria: "",
    calculationFormula: "",
    reportableRange: "",
    referenceAttachment: "",
    validationReferenceNo: "",
    validationAttachment: "",
    sampleSolutionStabilityValue: undefined,
    sampleSolutionStabilityUnit: "HOURS",
    sampleSolutionStabilityCondition: "",
    validationStatus: "NOT_VALIDATED",
    reviewRoute: "QC_ONLY",
    createdBy: userName
  };
}

function emptyParameterForm(): SpecParameterRequest {
  return {
    parameterName: "",
    testType: "ASSAY",
    moaId: "",
    criteriaType: "RANGE",
    lowerLimit: undefined,
    upperLimit: undefined,
    textCriteria: "",
    compendialChapterRef: "",
    unit: "",
    isMandatory: true,
    sequence: 1,
    notes: ""
  };
}

function formatCriteria(parameter: SpecParameter) {
  switch (parameter.criteriaType) {
    case "NLT":
      return `NLT ${parameter.lowerLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "NMT":
      return `NMT ${parameter.upperLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "RANGE":
      return `${parameter.lowerLimit ?? "—"} – ${parameter.upperLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "PASS_FAIL":
    case "COMPLIES":
    case "TEXT":
      return parameter.textCriteria || "Text criteria";
    default:
      return "—";
  }
}

function formatDraftCriteria(parameter: SpecParameterRequest) {
  switch (parameter.criteriaType) {
    case "NLT":
      return `NLT ${parameter.lowerLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "NMT":
      return `NMT ${parameter.upperLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "RANGE":
      return `${parameter.lowerLimit ?? "—"} – ${parameter.upperLimit ?? "—"}${parameter.unit ? ` ${parameter.unit}` : ""}`;
    case "PASS_FAIL":
    case "COMPLIES":
    case "TEXT":
      return parameter.textCriteria || "Text criteria required";
    default:
      return "—";
  }
}

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString();
}

function cleanOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function statusDotTone(status: SpecStatus | MoaStatus) {
  switch (status) {
    case "APPROVED":
      return "bg-green-500";
    case "UNDER_REVIEW":
      return "bg-blue-500";
    case "DRAFT":
      return "bg-amber-500";
    case "OBSOLETE":
      return "bg-slate-400";
    default:
      return "bg-slate-400";
  }
}

function validationLabel(status: MoaValidationStatus) {
  if (status === "VALIDATED_COMPENDIAL") return "Compendial";
  if (status === "VALIDATED") return "Validated";
  if (status === "IN_VALIDATION") return "In Validation";
  return "Not Validated";
}

function groupByStatus<T extends { status: SpecStatus | MoaStatus }>(rows: T[]) {
  const order: Array<SpecStatus | MoaStatus> = ["APPROVED", "UNDER_REVIEW", "DRAFT", "OBSOLETE"];
  return order
    .map((status) => ({
      status,
      items: rows.filter((row) => row.status === status)
    }))
    .filter((entry) => entry.items.length > 0);
}

function fieldClassName() {
  return "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-[#7c3aed] focus:ring-4 focus:ring-[rgba(124,58,237,0.08)]";
}

function textAreaClassName() {
  return `${fieldClassName()} min-h-[88px]`;
}

function tabButtonClassName(active: boolean) {
  return active
    ? "rounded-[10px] bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white"
    : "rounded-[10px] bg-[#ede9fe] px-4 py-2 text-xs font-semibold text-[#6d28d9] hover:bg-[#ddd6fe]";
}

function createDraftRow(sequence: number): SpecParameterDraftRow {
  return {
    localId: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `row-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    parameterName: "",
    testType: "ASSAY",
    moaId: "",
    criteriaType: "RANGE",
    lowerLimit: undefined,
    upperLimit: undefined,
    textCriteria: "",
    compendialChapterRef: "",
    unit: "",
    isMandatory: true,
    sequence,
    notes: ""
  };
}

function selectedFileName(event: ChangeEvent<HTMLInputElement>) {
  return event.target.files?.[0]?.name ?? "";
}

export default function SpecMoaPage({ initialTab }: SpecMoaPageProps) {
  const navigate = useNavigate();
  const currentUserName = useAppShellStore((state) => state.currentUser.name);

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parameterMap, setParameterMap] = useState<Record<string, SpecParameter[]>>({});
  const [materialLinkMap, setMaterialLinkMap] = useState<Record<string, MaterialSpecLink[]>>({});
  const [reviewQueueCounts, setReviewQueueCounts] = useState({ spec: 0, moa: 0 });
  const [specReviewQueue, setSpecReviewQueue] = useState<Spec[]>([]);
  const [moaReviewQueue, setMoaReviewQueue] = useState<Moa[]>([]);
  const [reviewSelection, setReviewSelection] = useState<{ kind: "spec" | "moa"; id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState<string | null>(null);
  const [selectedMoaId, setSelectedMoaId] = useState<string | null>(null);
  const [specSearch, setSpecSearch] = useState("");
  const [moaSearch, setMoaSearch] = useState("");
  const [specStatusFilter, setSpecStatusFilter] = useState<SpecStatus | "ALL">("ALL");
  const [specTypeFilter, setSpecTypeFilter] = useState<SpecType | "ALL">("ALL");
  const [moaTypeFilter, setMoaTypeFilter] = useState<MoaType | "ALL">("ALL");
  const [moaValidationFilter, setMoaValidationFilter] = useState<MoaValidationStatus | "ALL">("ALL");
  const [specEditorOpen, setSpecEditorOpen] = useState(false);
  const [moaEditorOpen, setMoaEditorOpen] = useState(false);
  const [parameterEditorOpen, setParameterEditorOpen] = useState(false);
  const [draftParameterEditorOpen, setDraftParameterEditorOpen] = useState(false);
  const [linkMaterialOpen, setLinkMaterialOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Spec | null>(null);
  const [editingMoa, setEditingMoa] = useState<Moa | null>(null);
  const [editingParameter, setEditingParameter] = useState<SpecParameter | null>(null);
  const [specForm, setSpecForm] = useState<CreateSpecRequest>(() => emptySpecForm(currentUserName));
  const [moaForm, setMoaForm] = useState<CreateMoaRequest>(() => emptyMoaForm(currentUserName));
  const [parameterForm, setParameterForm] = useState<SpecParameterRequest>(emptyParameterForm);
  const [draftParameterRows, setDraftParameterRows] = useState<SpecParameterDraftRow[]>([]);
  const [editingDraftParameterId, setEditingDraftParameterId] = useState<string | null>(null);
  const [removedParameterIds, setRemovedParameterIds] = useState<string[]>([]);
  const [specMaterialSearch, setSpecMaterialSearch] = useState("");
  const [stagedMaterialIds, setStagedMaterialIds] = useState<string[]>([]);
  const [materialToLink, setMaterialToLink] = useState("");
  const [linkNotes, setLinkNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setSpecForm((current) => ({ ...current, createdBy: currentUserName }));
    setMoaForm((current) => ({ ...current, createdBy: currentUserName }));
  }, [currentUserName]);

  useEffect(() => {
    void loadPage();
  }, []);

  async function loadPage() {
    try {
      setIsLoading(true);
      setError(null);
      const [loadedSpecs, loadedMoas, materialPage, specReviewQueue, moaReviewQueue] = await Promise.all([
        fetchSpecs(),
        fetchMoas(),
        fetchMaterials(0, 200),
        fetchSpecReviewQueue(),
        fetchMoaReviewQueue()
      ]);
      const parameterEntries = await Promise.all(
        loadedSpecs.map(async (spec) => [spec.id, await fetchSpecParameters(spec.id)] as const)
      );
      const materialLinkEntries = await Promise.all(
        loadedSpecs.map(async (spec) => [spec.id, await fetchSpecMaterialLinks(spec.id)] as const)
      );
      const nextParameterMap = Object.fromEntries(parameterEntries);
      const nextMaterialLinkMap = Object.fromEntries(materialLinkEntries);
      setSpecs(loadedSpecs);
      setMoas(loadedMoas);
      setMaterials(materialPage.content);
      setParameterMap(nextParameterMap);
      setMaterialLinkMap(nextMaterialLinkMap);
      setSpecReviewQueue(specReviewQueue);
      setMoaReviewQueue(moaReviewQueue);
      setReviewQueueCounts({ spec: specReviewQueue.length, moa: moaReviewQueue.length });
      setSelectedSpecId((current) => current ?? loadedSpecs[0]?.id ?? null);
      setSelectedMoaId((current) => current ?? loadedMoas[0]?.id ?? null);
      setReviewSelection((current) => current ?? (specReviewQueue[0]
        ? { kind: "spec", id: specReviewQueue[0].id }
        : moaReviewQueue[0]
          ? { kind: "moa", id: moaReviewQueue[0].id }
          : null));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load specs and methods.");
    } finally {
      setIsLoading(false);
    }
  }

  const filteredSpecs = useMemo(() => {
    return specs.filter((spec) => {
      const matchesStatus = specStatusFilter === "ALL" || spec.status === specStatusFilter;
      const matchesType = specTypeFilter === "ALL" || spec.specType === specTypeFilter;
      const term = specSearch.toLowerCase();
      const matchesSearch = !term || spec.specCode.toLowerCase().includes(term) || spec.specName.toLowerCase().includes(term);
      return matchesStatus && matchesType && matchesSearch;
    });
  }, [specSearch, specStatusFilter, specTypeFilter, specs]);

  const filteredMoas = useMemo(() => {
    return moas.filter((moa) => {
      const matchesType = moaTypeFilter === "ALL" || moa.moaType === moaTypeFilter;
      const matchesValidation = moaValidationFilter === "ALL" || moa.validationStatus === moaValidationFilter;
      const term = moaSearch.toLowerCase();
      const matchesSearch = !term || moa.moaCode.toLowerCase().includes(term) || moa.moaName.toLowerCase().includes(term);
      return matchesType && matchesValidation && matchesSearch;
    });
  }, [moaSearch, moaTypeFilter, moaValidationFilter, moas]);

  const selectedSpec = filteredSpecs.find((spec) => spec.id === selectedSpecId) ?? specs.find((spec) => spec.id === selectedSpecId) ?? null;
  const selectedMoa = filteredMoas.find((moa) => moa.id === selectedMoaId) ?? moas.find((moa) => moa.id === selectedMoaId) ?? null;
  const selectedReviewSpec = reviewSelection?.kind === "spec" ? specReviewQueue.find((spec) => spec.id === reviewSelection.id) ?? null : null;
  const selectedReviewMoa = reviewSelection?.kind === "moa" ? moaReviewQueue.find((moa) => moa.id === reviewSelection.id) ?? null : null;
  const selectedSpecParameters = selectedSpec ? parameterMap[selectedSpec.id] ?? [] : [];
  const linkedMaterials = selectedSpec
    ? materials.filter((material) => (materialLinkMap[selectedSpec.id] ?? []).some((link) => link.materialId === material.id))
    : [];
  const stagedMaterials = useMemo(
    () => materials.filter((material) => stagedMaterialIds.includes(material.id)),
    [materials, stagedMaterialIds]
  );
  const filteredMaterialSuggestions = useMemo(() => {
    const term = specMaterialSearch.trim().toLowerCase();
    return materials
      .filter((material) => !stagedMaterialIds.includes(material.id))
      .filter((material) => {
        if (!term) return true;
        return material.materialCode.toLowerCase().includes(term) || material.materialName.toLowerCase().includes(term);
      })
      .slice(0, 6);
  }, [materials, specMaterialSearch, stagedMaterialIds]);

  const linkedSpecRows = useMemo(() => {
    if (!selectedMoa) return [];
    return specs.flatMap((spec) =>
      (parameterMap[spec.id] ?? [])
        .filter((parameter) => parameter.moaId === selectedMoa.id)
        .map((parameter) => ({
          specId: spec.id,
          specCode: spec.specCode,
          specName: spec.specName,
          parameterName: parameter.parameterName,
          status: spec.status,
          criteria: formatCriteria(parameter)
        }))
    );
  }, [parameterMap, selectedMoa, specs]);

  const moaUsageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const spec of specs) {
      const usedMoaIds = new Set(
        (parameterMap[spec.id] ?? [])
          .map((parameter) => parameter.moaId)
          .filter((value): value is string => Boolean(value))
      );
      for (const moaId of usedMoaIds) {
        counts[moaId] = (counts[moaId] ?? 0) + 1;
      }
    }
    return counts;
  }, [parameterMap, specs]);

  function openSpecEditor(spec?: Spec) {
    const existingLinkedMaterialIds = spec
      ? (materialLinkMap[spec.id] ?? []).map((link) => link.materialId)
      : [];
    const existingParameterRows = spec
      ? (parameterMap[spec.id] ?? []).map((parameter) => ({
          localId: parameter.id,
          existingId: parameter.id,
          parameterName: parameter.parameterName,
          testType: parameter.testType,
          moaId: parameter.moaId ?? "",
          criteriaType: parameter.criteriaType,
          lowerLimit: parameter.lowerLimit ?? undefined,
          upperLimit: parameter.upperLimit ?? undefined,
          textCriteria: parameter.textCriteria ?? "",
          compendialChapterRef: parameter.compendialChapterRef ?? "",
          unit: parameter.unit ?? "",
          isMandatory: parameter.isMandatory,
          sequence: parameter.sequence,
          notes: parameter.notes ?? ""
        }))
      : [];
    setEditingSpec(spec ?? null);
    setSpecForm(
      spec
        ? {
            specCode: spec.specCode,
            specName: spec.specName,
            revision: spec.revision ?? "",
            specType: spec.specType,
            samplingMethod: spec.samplingMethod,
            targetMarket: spec.targetMarket ?? undefined,
            effectiveDate: spec.effectiveDate ?? "",
            expiryDate: spec.expiryDate ?? "",
            compendialRef: spec.compendialRef ?? undefined,
            compendialEdition: spec.compendialEdition ?? "",
            referenceDocumentNo: spec.referenceDocumentNo ?? "",
            referenceAttachment: spec.referenceAttachment ?? "",
            reviewRoute: spec.reviewRoute,
            createdBy: currentUserName
          }
        : emptySpecForm(currentUserName)
    );
    setSpecMaterialSearch("");
    setStagedMaterialIds(existingLinkedMaterialIds);
    setDraftParameterRows(existingParameterRows);
    setRemovedParameterIds([]);
    setSpecEditorOpen(true);
  }

  function openMoaEditor(moa?: Moa) {
    setEditingMoa(moa ?? null);
    setMoaForm(
      moa
        ? {
            moaCode: moa.moaCode,
            moaName: moa.moaName,
            revision: moa.revision ?? "",
            moaType: moa.moaType ?? undefined,
            principle: moa.principle ?? "",
            compendialRef: moa.compendialRef ?? undefined,
            instrumentType: moa.instrumentType ?? "",
            reagentsAndStandards: moa.reagentsAndStandards ?? "",
            systemSuitabilityCriteria: moa.systemSuitabilityCriteria ?? "",
            calculationFormula: moa.calculationFormula ?? "",
            reportableRange: moa.reportableRange ?? "",
            referenceAttachment: moa.referenceAttachment ?? "",
            validationReferenceNo: moa.validationReferenceNo ?? "",
            validationAttachment: moa.validationAttachment ?? "",
            sampleSolutionStabilityValue: moa.sampleSolutionStabilityValue ?? undefined,
            sampleSolutionStabilityUnit: moa.sampleSolutionStabilityUnit ?? undefined,
            sampleSolutionStabilityCondition: moa.sampleSolutionStabilityCondition ?? "",
            validationStatus: moa.validationStatus,
            reviewRoute: moa.reviewRoute,
            createdBy: currentUserName
          }
        : emptyMoaForm(currentUserName)
    );
    setMoaEditorOpen(true);
  }

  function openParameterEditor(parameter?: SpecParameter) {
    if (!selectedSpec) {
      toast.error("Select a spec first.");
      return;
    }
    setEditingParameter(parameter ?? null);
    setParameterForm(
      parameter
        ? {
            parameterName: parameter.parameterName,
            testType: parameter.testType,
            moaId: parameter.moaId ?? "",
            criteriaType: parameter.criteriaType,
            lowerLimit: parameter.lowerLimit ?? undefined,
            upperLimit: parameter.upperLimit ?? undefined,
            textCriteria: parameter.textCriteria ?? "",
            compendialChapterRef: parameter.compendialChapterRef ?? "",
            unit: parameter.unit ?? "",
            isMandatory: parameter.isMandatory,
            sequence: parameter.sequence,
            notes: parameter.notes ?? ""
          }
        : {
            ...emptyParameterForm(),
            sequence: (selectedSpecParameters[selectedSpecParameters.length - 1]?.sequence ?? 0) + 1
          }
    );
    setParameterEditorOpen(true);
  }

  function handleAddParameterClick() {
    if (!selectedSpec) {
      toast.error("Select a spec first.");
      return;
    }
    if (selectedSpec.status !== "DRAFT") {
      toast.error("Parameters can be added only to draft specs. Create a new revision first.");
      return;
    }
    openParameterEditor();
  }

  function stageMaterial(materialId: string) {
    setStagedMaterialIds((current) => current.includes(materialId) ? current : [...current, materialId]);
    setSpecMaterialSearch("");
  }

  function removeStagedMaterial(materialId: string) {
    setStagedMaterialIds((current) => current.filter((id) => id !== materialId));
  }

  function addDraftParameterRow() {
    const nextRow = createDraftRow((draftParameterRows[draftParameterRows.length - 1]?.sequence ?? 0) + 1);
    setDraftParameterRows((current) => [...current, nextRow]);
    setEditingDraftParameterId(nextRow.localId);
    setDraftParameterEditorOpen(true);
  }

  function updateDraftParameterRow(localId: string, patch: Partial<SpecParameterDraftRow>) {
    setDraftParameterRows((current) =>
      current.map((row) => (row.localId === localId ? { ...row, ...patch } : row))
    );
  }

  function removeDraftParameterRow(localId: string) {
    const row = draftParameterRows.find((entry) => entry.localId === localId);
    if (row?.existingId) {
      setRemovedParameterIds((current) => [...current, row.existingId!]);
    }
    setDraftParameterRows((current) =>
      current
        .filter((entry) => entry.localId !== localId)
        .map((entry, index) => ({ ...entry, sequence: index + 1 }))
    );
  }

  function openDraftParameterEditor(localId: string) {
    setEditingDraftParameterId(localId);
    setDraftParameterEditorOpen(true);
  }

  function closeDraftParameterEditor() {
    setDraftParameterEditorOpen(false);
    setEditingDraftParameterId(null);
  }

  function openRejectModal() {
    setRejectReason("");
    setRejectModalOpen(true);
  }

  async function handleSpecSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyAction("spec-save");
      const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
      const submitter = nativeSubmitEvent.submitter as HTMLButtonElement | null;
      const shouldSubmitForReview = submitter?.value === "submit-review";
      const payload: CreateSpecRequest = {
        ...specForm,
        revision: cleanOptionalString(specForm.revision),
        targetMarket: specForm.targetMarket,
        effectiveDate: cleanOptionalString(specForm.effectiveDate),
        expiryDate: cleanOptionalString(specForm.expiryDate),
        compendialRef: specForm.compendialRef,
        compendialEdition: cleanOptionalString(specForm.compendialEdition),
        referenceDocumentNo: cleanOptionalString(specForm.referenceDocumentNo),
        referenceAttachment: cleanOptionalString(specForm.referenceAttachment),
        materialIds: stagedMaterialIds,
        createdBy: currentUserName
      };
      const parameterPayloads = draftParameterRows.map((row, index) => ({
        existingId: row.existingId,
        payload: {
          parameterName: row.parameterName.trim(),
          testType: row.testType,
          moaId: cleanOptionalString(row.moaId),
          criteriaType: row.criteriaType,
          lowerLimit: row.lowerLimit,
          upperLimit: row.upperLimit,
          textCriteria: cleanOptionalString(row.textCriteria),
          compendialChapterRef: cleanOptionalString(row.compendialChapterRef),
          unit: cleanOptionalString(row.unit),
          isMandatory: row.isMandatory,
          sequence: index + 1,
          notes: cleanOptionalString(row.notes)
        } satisfies SpecParameterRequest
      }));
      if (parameterPayloads.some((row) => !row.payload.parameterName)) {
        toast.error("Each test parameter needs a parameter name.");
        setBusyAction(null);
        return;
      }
      if (
        parameterPayloads.some((row) =>
          ["PASS_FAIL", "COMPLIES", "TEXT"].includes(row.payload.criteriaType) && !row.payload.textCriteria
        )
      ) {
        toast.error("textCriteria is required for text-based criteria.");
        setBusyAction(null);
        return;
      }

      let savedSpecId: string;
      if (editingSpec) {
        const updatedSpec = await updateSpec(editingSpec.id, payload);
        savedSpecId = updatedSpec.id;
        toast.success("Specification updated.");
      } else {
        const createdSpec = await createSpec(payload);
        savedSpecId = createdSpec.id;
        toast.success("Specification created.");
      }

      for (const parameterId of removedParameterIds) {
        await deleteSpecParameter(savedSpecId, parameterId);
      }
      for (const row of parameterPayloads) {
        if (row.existingId) {
          await updateSpecParameter(savedSpecId, row.existingId, row.payload);
        } else {
          await createSpecParameter(savedSpecId, row.payload);
        }
      }
      if (shouldSubmitForReview) {
        await submitSpec(savedSpecId, { reviewRoute: "QC_ONLY" });
        toast.success("Specification submitted for review.");
      }
      setSpecEditorOpen(false);
      await loadPage();
      if (shouldSubmitForReview) {
        setActiveTab("review");
        setReviewSelection({ kind: "spec", id: savedSpecId });
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save specification.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleMoaSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setBusyAction("moa-save");
      const nativeSubmitEvent = event.nativeEvent as SubmitEvent;
      const submitter = nativeSubmitEvent.submitter as HTMLButtonElement | null;
      const shouldSubmitForApproval = submitter?.value === "submit-approval";
      const payload: CreateMoaRequest = {
        ...moaForm,
        revision: cleanOptionalString(moaForm.revision),
        principle: cleanOptionalString(moaForm.principle),
        instrumentType: cleanOptionalString(moaForm.instrumentType),
        reagentsAndStandards: cleanOptionalString(moaForm.reagentsAndStandards),
        systemSuitabilityCriteria: cleanOptionalString(moaForm.systemSuitabilityCriteria),
        calculationFormula: cleanOptionalString(moaForm.calculationFormula),
        reportableRange: cleanOptionalString(moaForm.reportableRange),
        referenceAttachment: cleanOptionalString(moaForm.referenceAttachment),
        validationReferenceNo: cleanOptionalString(moaForm.validationReferenceNo),
        validationAttachment: cleanOptionalString(moaForm.validationAttachment),
        sampleSolutionStabilityCondition: cleanOptionalString(moaForm.sampleSolutionStabilityCondition),
        createdBy: currentUserName
      };
      let savedMoaId: string;
      if (editingMoa) {
        const updatedMoa = await updateMoa(editingMoa.id, payload);
        savedMoaId = updatedMoa.id;
        toast.success("Method of analysis updated.");
      } else {
        const createdMoa = await createMoa(payload);
        savedMoaId = createdMoa.id;
        toast.success("Method of analysis created.");
      }
      if (shouldSubmitForApproval) {
        await submitMoa(savedMoaId, { reviewRoute: "QC_ONLY" });
        toast.success("Method of analysis submitted for approval.");
      }
      setMoaEditorOpen(false);
      await loadPage();
      if (shouldSubmitForApproval) {
        setActiveTab("review");
        setReviewSelection({ kind: "moa", id: savedMoaId });
      }
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save method of analysis.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleParameterSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedSpec) return;
    try {
      setBusyAction("parameter-save");
      const payload: SpecParameterRequest = {
        ...parameterForm,
        moaId: cleanOptionalString(parameterForm.moaId),
        textCriteria: cleanOptionalString(parameterForm.textCriteria),
        compendialChapterRef: cleanOptionalString(parameterForm.compendialChapterRef),
        unit: cleanOptionalString(parameterForm.unit),
        notes: cleanOptionalString(parameterForm.notes)
      };
      if (editingParameter) {
        await updateSpecParameter(selectedSpec.id, editingParameter.id, payload);
        toast.success("Spec parameter updated.");
      } else {
        await createSpecParameter(selectedSpec.id, payload);
        toast.success("Spec parameter added.");
      }
      setParameterEditorOpen(false);
      await loadPage();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "Failed to save spec parameter.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runSpecAction(action: "submit" | "approve" | "revise" | "obsolete" | "delete") {
    if (!selectedSpec) return;
    try {
      setBusyAction(`spec-${action}`);
      if (action === "submit") await submitSpec(selectedSpec.id, { reviewRoute: selectedSpec.reviewRoute });
      if (action === "approve") await approveSpec(selectedSpec.id);
      if (action === "revise") {
        const revisedSpec = await reviseSpec(selectedSpec.id);
        toast.success("New draft revision created.");
        await loadPage();
        setSelectedSpecId(revisedSpec.id);
        setActiveTab("spec");
        return;
      }
      if (action === "obsolete") await obsoleteSpec(selectedSpec.id);
      if (action === "delete") await deleteSpec(selectedSpec.id);
      toast.success(`Specification ${action === "delete" ? "deactivated" : action}ed.`);
      await loadPage();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : `Failed to ${action} specification.`);
    } finally {
      setBusyAction(null);
    }
  }

  async function runMoaAction(action: "submit" | "approve" | "obsolete" | "delete") {
    if (!selectedMoa) return;
    try {
      setBusyAction(`moa-${action}`);
      if (action === "submit") await submitMoa(selectedMoa.id, { reviewRoute: selectedMoa.reviewRoute });
      if (action === "approve") await approveMoa(selectedMoa.id);
      if (action === "obsolete") await obsoleteMoa(selectedMoa.id);
      if (action === "delete") await deleteMoa(selectedMoa.id);
      toast.success(`Method ${action === "delete" ? "deactivated" : action}ed.`);
      await loadPage();
    } catch (actionError) {
      toast.error(actionError instanceof Error ? actionError.message : `Failed to ${action} method.`);
    } finally {
      setBusyAction(null);
    }
  }

  async function handleReject() {
    if (activeTab === "spec" && !selectedSpec) return;
    if (activeTab === "moa" && !selectedMoa) return;
    if (activeTab === "review" && !reviewSelection) return;
    try {
      setBusyAction(`${activeTab}-reject`);
      const payload: RejectRequest = { reviewRemarks: rejectReason.trim() };
      if (activeTab === "spec" && selectedSpec) await rejectSpec(selectedSpec.id, payload);
      if (activeTab === "moa" && selectedMoa) await rejectMoa(selectedMoa.id, payload);
      if (activeTab === "review" && reviewSelection?.kind === "spec" && selectedReviewSpec) await rejectSpec(selectedReviewSpec.id, payload);
      if (activeTab === "review" && reviewSelection?.kind === "moa" && selectedReviewMoa) await rejectMoa(selectedReviewMoa.id, payload);
      toast.success(
        activeTab === "spec"
          ? "Specification rejected back to draft."
          : activeTab === "moa"
            ? "Method rejected back to draft."
            : reviewSelection?.kind === "spec"
              ? "Specification rejected back to draft."
              : "Method rejected back to draft."
      );
      setRejectModalOpen(false);
      await loadPage();
    } catch (rejectError) {
      toast.error(rejectError instanceof Error ? rejectError.message : "Failed to reject record.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleDeleteParameter(parameter: SpecParameter) {
    if (!selectedSpec) return;
    if (!window.confirm(`Remove parameter "${parameter.parameterName}"?`)) return;
    try {
      setBusyAction("parameter-delete");
      await deleteSpecParameter(selectedSpec.id, parameter.id);
      toast.success("Spec parameter removed.");
      await loadPage();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "Failed to remove parameter.");
    } finally {
      setBusyAction(null);
    }
  }

  async function handleLinkMaterial() {
    if (!selectedSpec || !materialToLink) return;
    try {
      setBusyAction("material-link");
      await linkMaterialSpec(materialToLink, { specId: selectedSpec.id, notes: cleanOptionalString(linkNotes) });
      toast.success("Material linked to specification.");
      setLinkMaterialOpen(false);
      setMaterialToLink("");
      setLinkNotes("");
      await loadPage();
    } catch (linkError) {
      toast.error(linkError instanceof Error ? linkError.message : "Failed to link material.");
    } finally {
      setBusyAction(null);
    }
  }

  const editingDraftParameter = editingDraftParameterId
    ? draftParameterRows.find((row) => row.localId === editingDraftParameterId) ?? null
    : null;

  function changeTab(tab: TabKey) {
    setActiveTab(tab);
    if (tab === "spec") navigate("/master-data/qc-refs/specs");
    if (tab === "moa") navigate("/master-data/qc-refs/moa");
  }

  function openMoaFromParameter(moaId?: string | null) {
    if (!moaId) return;
    setSelectedMoaId(moaId);
    changeTab("moa");
  }

  const groupedSpecs = groupByStatus(filteredSpecs);
  const groupedMoas = groupByStatus(filteredMoas);

  async function handleReviewApprove() {
    if (!reviewSelection) return;
    try {
      setBusyAction("review-approve");
      if (reviewSelection.kind === "spec" && selectedReviewSpec) {
        await approveSpec(selectedReviewSpec.id);
        toast.success("Specification approved.");
      }
      if (reviewSelection.kind === "moa" && selectedReviewMoa) {
        await approveMoa(selectedReviewMoa.id);
        toast.success("Method of analysis approved.");
      }
      await loadPage();
    } catch (approveError) {
      toast.error(approveError instanceof Error ? approveError.message : "Failed to approve record.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-180px)] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className={tabButtonClassName(activeTab === "spec")} onClick={() => changeTab("spec")}>
              Specifications
            </button>
            <button type="button" className={tabButtonClassName(activeTab === "moa")} onClick={() => changeTab("moa")}>
              Methods of Analysis
            </button>
            <button type="button" className={tabButtonClassName(activeTab === "review")} onClick={() => changeTab("review")}>
              Review Queue
            </button>
          </div>

          <div className="ml-auto flex shrink-0 flex-nowrap items-center gap-2">
            {activeTab === "spec" ? (
              <>
                <select value={specTypeFilter} onChange={(event) => setSpecTypeFilter(event.target.value as SpecType | "ALL")} className={`${fieldClassName()} w-[150px]`}>
                  <option value="ALL">All Types</option>
                  {specTypes.map((value) => <option key={value} value={value}>{specTypeLabels[value]}</option>)}
                </select>
                <select value={specStatusFilter} onChange={(event) => setSpecStatusFilter(event.target.value as SpecStatus | "ALL")} className={`${fieldClassName()} w-[160px]`}>
                  <option value="ALL">All Status</option>
                  {specStatuses.map((value) => <option key={value} value={value}>{humanizeStatus(value)}</option>)}
                </select>
                <button type="button" onClick={() => openSpecEditor()} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  New Specification
                </button>
              </>
            ) : activeTab === "moa" ? (
              <>
                <select value={moaTypeFilter} onChange={(event) => setMoaTypeFilter(event.target.value as MoaType | "ALL")} className={`${fieldClassName()} w-[150px]`}>
                  <option value="ALL">All Types</option>
                  {moaTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
                <select value={moaValidationFilter} onChange={(event) => setMoaValidationFilter(event.target.value as MoaValidationStatus | "ALL")} className={`${fieldClassName()} w-[180px]`}>
                  <option value="ALL">All Validation</option>
                  {moaValidationStatuses.map((value) => <option key={value} value={value}>{validationLabel(value)}</option>)}
                </select>
                <button type="button" onClick={() => openMoaEditor()} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-[10px] bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]">
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  New Method (MOA)
                </button>
              </>
            ) : (
              <>
                <div className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700">
                  {reviewQueueCounts.spec} Specs under review
                </div>
                <div className="rounded-full bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700">
                  {reviewQueueCounts.moa} MOAs under review
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex w-full overflow-hidden">
          <div className="flex w-96 flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              {activeTab === "review" ? (
                <>
                  <div className="flex-1 text-xs font-semibold text-slate-600">Records waiting for QC review</div>
                  <span className="text-[10px] font-medium text-slate-400">{reviewQueueCounts.spec + reviewQueueCounts.moa} total</span>
                </>
              ) : (
                <>
                  <input
                    value={activeTab === "spec" ? specSearch : moaSearch}
                    onChange={(event) => activeTab === "spec" ? setSpecSearch(event.target.value) : setMoaSearch(event.target.value)}
                    placeholder={activeTab === "spec" ? "Search spec code or name…" : "Search MOA code or name…"}
                    className={`${fieldClassName()} flex-1`}
                  />
                  <span className="text-[10px] font-medium text-slate-400">
                    {activeTab === "spec" ? `${filteredSpecs.length} specs` : `${filteredMoas.length} methods`}
                  </span>
                </>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {isLoading ? <div className="px-4 py-6 text-xs text-slate-500">Loading records…</div> : null}
              {error ? <div className="mx-4 mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</div> : null}

              {activeTab === "spec" ? groupedSpecs.map((group) => (
                <div key={group.status}>
                  <div className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {humanizeStatus(group.status)} · {group.items.length}
                  </div>
                  {group.items.map((spec) => (
                    <button
                      key={spec.id}
                      type="button"
                      onClick={() => setSelectedSpecId(spec.id)}
                      className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-violet-50 ${selectedSpec?.id === spec.id ? "border-l-[3px] border-l-violet-600 bg-violet-100/80" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{spec.specCode}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${specStatusTone[spec.status]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDotTone(spec.status)}`} />
                            {humanizeStatus(spec.status)}
                          </span>
                          {spec.targetMarket ? <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700">{spec.targetMarket}</span> : null}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {spec.specName} {spec.compendialRef ? `· ${spec.compendialRef}` : ""}
                        </div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {specTypeLabels[spec.specType]} · Effective: {fmtDate(spec.effectiveDate)} · {(parameterMap[spec.id] ?? []).length} parameters
                        </div>
                      </div>
                      <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${specTypeBadgeTone[spec.specType]}`}>
                        {spec.specType === "MATERIAL" ? "API" : specTypeLabels[spec.specType]}
                      </span>
                    </button>
                  ))}
                </div>
              )) : null}

              {activeTab === "moa" ? groupedMoas.map((group) => (
                <div key={group.status}>
                  <div className="px-4 pb-1 pt-3 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    {group.status === "APPROVED" ? `${validationLabel("VALIDATED")} / ${validationLabel("VALIDATED_COMPENDIAL")}` : humanizeStatus(group.status)} · {group.items.length}
                  </div>
                  {group.items.map((moa) => (
                    <button
                      key={moa.id}
                      type="button"
                      onClick={() => setSelectedMoaId(moa.id)}
                      className={`flex w-full items-center gap-3 border-b border-slate-50 px-4 py-3 text-left transition hover:bg-violet-50 ${selectedMoa?.id === moa.id ? "border-l-[3px] border-l-violet-600 bg-violet-100/80" : ""}`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{moa.moaCode}</span>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${validationTone[moa.validationStatus]}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${moa.validationStatus.startsWith("VALIDATED") ? "bg-green-500" : moa.validationStatus === "IN_VALIDATION" ? "bg-amber-500" : "bg-rose-500"}`} />
                            {validationLabel(moa.validationStatus)}
                          </span>
                        </div>
                        <div className="truncate text-[11px] text-slate-500">{moa.moaName}</div>
                        <div className="mt-0.5 text-[10px] text-slate-400">
                          {moa.moaType ?? "Unclassified"} · {moa.compendialRef ?? "In-house"} · {moaUsageCounts[moa.id] ?? 0} specs linked
                        </div>
                      </div>
                      <span className="inline-flex rounded-md bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
                        {moa.moaType ?? "MOA"}
                      </span>
                    </button>
                  ))}
                </div>
              )) : null}

              {activeTab === "review" ? (
                <div className="space-y-4 px-3 py-3">
                  <div>
                    <div className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Specifications · {specReviewQueue.length}
                    </div>
                    <div className="space-y-2">
                      {specReviewQueue.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">No specs waiting for review.</div> : null}
                      {specReviewQueue.map((spec) => (
                        <button
                          key={spec.id}
                          type="button"
                          onClick={() => setReviewSelection({ kind: "spec", id: spec.id })}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${reviewSelection?.kind === "spec" && reviewSelection.id === spec.id ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:bg-violet-50"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">{spec.specCode}</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">UNDER REVIEW</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{spec.specName}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="px-1 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                      Methods of Analysis · {moaReviewQueue.length}
                    </div>
                    <div className="space-y-2">
                      {moaReviewQueue.length === 0 ? <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-400">No MOAs waiting for approval.</div> : null}
                      {moaReviewQueue.map((moa) => (
                        <button
                          key={moa.id}
                          type="button"
                          onClick={() => setReviewSelection({ kind: "moa", id: moa.id })}
                          className={`w-full rounded-xl border px-3 py-3 text-left transition ${reviewSelection?.kind === "moa" && reviewSelection.id === moa.id ? "border-violet-300 bg-violet-50" : "border-slate-200 bg-white hover:bg-violet-50"}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-800">{moa.moaCode}</span>
                            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold text-blue-700">UNDER REVIEW</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">{moa.moaName}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6">
            {activeTab === "spec" && selectedSpec ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">{selectedSpec.specName}</h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${specStatusTone[selectedSpec.status]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusDotTone(selectedSpec.status)}`} />
                          {humanizeStatus(selectedSpec.status)}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{selectedSpec.revision || "v1"}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-500">{selectedSpec.specCode}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSpec.status === "DRAFT" ? (
                        <button type="button" className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50" onClick={() => openSpecEditor(selectedSpec)}>
                          Edit
                        </button>
                      ) : null}
                      {selectedSpec.status === "APPROVED" ? (
                        <button type="button" className="rounded-lg border border-sky-200 px-3 py-1.5 text-[11px] font-semibold text-sky-700 hover:bg-sky-50" onClick={() => void runSpecAction("revise")} disabled={busyAction !== null}>
                          Create New Revision
                        </button>
                      ) : null}
                      {selectedSpec.status === "DRAFT" ? (
                        <button type="button" className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50" onClick={() => void runSpecAction("submit")} disabled={busyAction !== null}>
                          Submit
                        </button>
                      ) : null}
                      {selectedSpec.status === "UNDER_REVIEW" ? (
                        <>
                          <button type="button" className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700" onClick={() => void runSpecAction("approve")} disabled={busyAction !== null}>
                            Approve
                          </button>
                          <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" onClick={openRejectModal}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      {selectedSpec.status === "APPROVED" ? (
                        <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" onClick={() => void runSpecAction("obsolete")} disabled={busyAction !== null}>
                          Obsolete
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetaCell label="Spec Type">
                      <span className={`inline-flex rounded-md px-3 py-1 text-xs font-semibold ${specTypeBadgeTone[selectedSpec.specType]}`}>{specTypeLabels[selectedSpec.specType]}</span>
                    </MetaCell>
                    <MetaCell label="Target Market">{selectedSpec.targetMarket ?? "—"}</MetaCell>
                    <MetaCell label="Compendial Ref">{selectedSpec.compendialRef ?? "—"}{selectedSpec.compendialEdition ? <span className="ml-1 text-xs font-normal text-slate-400">{selectedSpec.compendialEdition}</span> : null}</MetaCell>
                    <MetaCell label="Sampling Method">{selectedSpec.samplingMethod}</MetaCell>
                    <MetaCell label="Effective Date">{fmtDate(selectedSpec.effectiveDate)}</MetaCell>
                    <MetaCell label="Approved By">{selectedSpec.approvedBy ?? "—"}</MetaCell>
                    <MetaCell label="Approved At">{fmtDate(selectedSpec.approvedAt)}</MetaCell>
                    <MetaCell label="Reference SOP">{selectedSpec.referenceAttachment ?? selectedSpec.referenceDocumentNo ?? "—"}</MetaCell>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Linked Materials</div>
                    {selectedSpec.status === "APPROVED" ? (
                      <button type="button" className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50" onClick={() => setLinkMaterialOpen(true)}>
                        + Link Material
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {linkedMaterials.length === 0 ? <div className="text-xs italic text-slate-400">No materials linked yet.</div> : null}
                    {linkedMaterials.map((material) => (
                      <div key={material.id} className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-2.5">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-blue-600">M</div>
                        <div>
                          <div className="text-xs font-bold text-slate-800">{material.materialCode}</div>
                          <div className="text-[10px] text-slate-500">{material.materialName} · Active spec</div>
                        </div>
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">Active</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
                    <div className="text-sm font-bold text-slate-700">Test Parameters</div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">{selectedSpecParameters.length} parameters</span>
                      <button type="button" className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50" onClick={handleAddParameterClick}>
                        + Add Parameter
                      </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-[1100px] w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50">
                          <th className="w-8 px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">#</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Test Name</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Type</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Method (MOA)</th>
                          <th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Acceptance Criteria</th>
                          <th className="w-12 px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-wide text-slate-400">Unit</th>
                          <th className="w-16 px-3 py-2.5 text-center text-[10px] font-bold uppercase tracking-wide text-slate-400">Mandatory</th>
                          <th className="w-28 px-3 py-2.5 text-right text-[10px] font-bold uppercase tracking-wide text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedSpecParameters.map((parameter) => {
                          const moa = moas.find((entry) => entry.id === parameter.moaId);
                          return (
                            <tr key={parameter.id} className={`border-b border-slate-100 hover:bg-violet-50/40 ${parameter.criteriaType === "RANGE" ? "bg-blue-50/30" : ""}`}>
                              <td className="px-4 py-3 font-mono text-slate-400">{parameter.sequence}</td>
                              <td className="px-3 py-3 font-semibold text-slate-800">{parameter.parameterName}</td>
                              <td className="px-3 py-3">
                                <span className={`inline-flex rounded-md px-2 py-1 text-[10px] font-bold ${testTypeTone[parameter.testType]}`}>
                                  {humanizeStatus(parameter.testType)}
                                </span>
                              </td>
                              <td className="px-3 py-3">
                                {moa ? (
                                  <button type="button" className="inline-flex rounded-md bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-200" onClick={() => openMoaFromParameter(moa.id)}>
                                    {moa.moaCode} · {moa.moaType ?? "MOA"}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                              <td className="px-3 py-3 font-mono text-[11px] text-slate-600">{formatCriteria(parameter)}</td>
                              <td className="px-3 py-3 font-semibold text-slate-600">{parameter.unit || "—"}</td>
                              <td className="px-3 py-3 text-center">
                                {parameter.isMandatory ? <span className="text-green-600">Yes</span> : <span className="text-slate-400">No</span>}
                              </td>
                              <td className="px-3 py-3">
                                <div className="flex justify-end gap-2">
                                  <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-700 hover:bg-slate-50" onClick={() => openParameterEditor(parameter)} disabled={selectedSpec.status !== "DRAFT"}>
                                    Edit
                                  </button>
                                  <button type="button" className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" onClick={() => void handleDeleteParameter(parameter)} disabled={selectedSpec.status !== "DRAFT"}>
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Revision History</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="w-32 font-mono font-bold text-violet-700">{selectedSpec.revision || "current"}</span>
                      <span className="text-slate-600">{selectedSpec.reviewRemarks || "Current active lifecycle record."}</span>
                      <span className="ml-auto text-slate-400">{fmtDate(selectedSpec.approvedAt || selectedSpec.effectiveDate)}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${specStatusTone[selectedSpec.status]}`}>{humanizeStatus(selectedSpec.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "moa" && selectedMoa ? (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-3">
                        <h2 className="text-lg font-bold text-slate-800">{selectedMoa.moaName}</h2>
                        <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${validationTone[selectedMoa.validationStatus]}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${selectedMoa.validationStatus.startsWith("VALIDATED") ? "bg-green-500" : selectedMoa.validationStatus === "IN_VALIDATION" ? "bg-amber-500" : "bg-rose-500"}`} />
                          {validationLabel(selectedMoa.validationStatus)}
                        </span>
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-600">{selectedMoa.revision || "Rev.1"}</span>
                      </div>
                      <div className="text-sm font-medium text-slate-500">{selectedMoa.moaCode}</div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedMoa.status === "DRAFT" ? (
                        <button type="button" className="rounded-lg border border-violet-200 px-3 py-1.5 text-[11px] font-semibold text-violet-700 hover:bg-violet-50" onClick={() => openMoaEditor(selectedMoa)}>
                          Edit
                        </button>
                      ) : null}
                      {selectedMoa.status === "DRAFT" ? (
                        <button type="button" className="rounded-lg border border-blue-200 px-3 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50" onClick={() => void runMoaAction("submit")} disabled={busyAction !== null}>
                          Submit
                        </button>
                      ) : null}
                      {selectedMoa.status === "UNDER_REVIEW" ? (
                        <>
                          <button type="button" className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700" onClick={() => void runMoaAction("approve")} disabled={busyAction !== null}>
                            Approve
                          </button>
                          <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" onClick={openRejectModal}>
                            Reject
                          </button>
                        </>
                      ) : null}
                      {selectedMoa.status === "APPROVED" ? (
                        <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[10px] font-semibold text-rose-700 hover:bg-rose-50" onClick={() => void runMoaAction("obsolete")} disabled={busyAction !== null}>
                          Obsolete
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <MetaCell label="Method Type">
                      <span className="inline-flex rounded-md bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{selectedMoa.moaType ?? "—"}</span>
                    </MetaCell>
                    <MetaCell label="Compendial Ref">{selectedMoa.compendialRef ?? "—"}</MetaCell>
                    <MetaCell label="Instrument">{selectedMoa.instrumentType ?? "—"}</MetaCell>
                    <MetaCell label="Reportable Range">{selectedMoa.reportableRange ?? "—"}</MetaCell>
                    <MetaCell label="Validation Status">{validationLabel(selectedMoa.validationStatus)}</MetaCell>
                    <MetaCell label="Validated By">{selectedMoa.approvedBy ?? "—"}</MetaCell>
                    <MetaCell label="Validated On">{fmtDate(selectedMoa.approvedAt)}</MetaCell>
                    <MetaCell label="Reference SOP">{selectedMoa.referenceAttachment ?? "—"}</MetaCell>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Procedure Details</div>
                  <div className="grid gap-5 md:grid-cols-2">
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Principle</div>
                      <p className="text-xs leading-relaxed text-slate-600">{selectedMoa.principle || "No analytical principle recorded yet."}</p>
                    </div>
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">System Suitability Criteria</div>
                      <p className="text-xs leading-relaxed text-slate-600">{selectedMoa.systemSuitabilityCriteria || "No system suitability criteria recorded yet."}</p>
                    </div>
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Reagents & Standards</div>
                      <p className="text-xs leading-relaxed text-slate-600">{selectedMoa.reagentsAndStandards || "No reagents or standards recorded yet."}</p>
                    </div>
                    <div>
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">Calculation Formula</div>
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 font-mono text-xs leading-relaxed text-slate-700">
                        {selectedMoa.calculationFormula || "No formula recorded yet."}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Validation Summary (ICH Q2(R1))</div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <ValidationChip title="Validation Status" value={validationLabel(selectedMoa.validationStatus)} active={selectedMoa.validationStatus.startsWith("VALIDATED")} />
                    <ValidationChip title="Validation Ref" value={selectedMoa.validationReferenceNo || "Not linked"} active={Boolean(selectedMoa.validationReferenceNo)} />
                    <ValidationChip title="Solution Stability" value={selectedMoa.sampleSolutionStabilityValue ? `${selectedMoa.sampleSolutionStabilityValue} ${selectedMoa.sampleSolutionStabilityUnit ?? ""}` : "Not captured"} active={Boolean(selectedMoa.sampleSolutionStabilityValue)} />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Used In Specifications</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="pb-2 text-left text-[10px] font-bold uppercase text-slate-400">Spec Code</th>
                          <th className="pb-2 text-left text-[10px] font-bold uppercase text-slate-400">Spec Name</th>
                          <th className="pb-2 text-left text-[10px] font-bold uppercase text-slate-400">Parameter</th>
                          <th className="pb-2 text-left text-[10px] font-bold uppercase text-slate-400">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {linkedSpecRows.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-4 text-slate-400">No loaded specifications currently use this MOA.</td>
                          </tr>
                        ) : linkedSpecRows.map((row) => (
                          <tr key={`${row.specId}-${row.parameterName}`} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2 font-mono font-bold text-violet-700">{row.specCode}</td>
                            <td className="py-2 text-slate-600">{row.specName}</td>
                            <td className="py-2 text-slate-500">{row.parameterName}</td>
                            <td className="py-2">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${specStatusTone[row.status]}`}>{humanizeStatus(row.status)}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "review" ? (
              <div className="space-y-5">
                {selectedReviewSpec ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="mb-1 flex items-center gap-3">
                            <h2 className="text-lg font-bold text-slate-800">{selectedReviewSpec.specName}</h2>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">UNDER REVIEW</span>
                          </div>
                          <div className="text-sm text-slate-500">{selectedReviewSpec.specCode}</div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" onClick={openRejectModal}>Reject</button>
                          <button type="button" className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700" onClick={() => void handleReviewApprove()} disabled={busyAction !== null}>Approve</button>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <MetaCell label="Spec Type">{specTypeLabels[selectedReviewSpec.specType]}</MetaCell>
                        <MetaCell label="Target Market">{selectedReviewSpec.targetMarket ?? "—"}</MetaCell>
                        <MetaCell label="Compendial Ref">{selectedReviewSpec.compendialRef ?? "—"}</MetaCell>
                        <MetaCell label="Sampling Method">{samplingMethodLabels[selectedReviewSpec.samplingMethod]}</MetaCell>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Review Notes</div>
                      <div className="text-sm text-slate-500">Submitted by {selectedReviewSpec.submittedBy ?? selectedReviewSpec.createdBy} on {fmtDate(selectedReviewSpec.submittedAt ?? selectedReviewSpec.createdAt)}.</div>
                    </div>
                  </div>
                ) : null}

                {selectedReviewMoa ? (
                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="mb-1 flex items-center gap-3">
                            <h2 className="text-lg font-bold text-slate-800">{selectedReviewMoa.moaName}</h2>
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-semibold text-blue-700">UNDER REVIEW</span>
                          </div>
                          <div className="text-sm text-slate-500">{selectedReviewMoa.moaCode}</div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" className="rounded-lg border border-rose-200 px-3 py-1.5 text-[11px] font-semibold text-rose-700 hover:bg-rose-50" onClick={openRejectModal}>Reject</button>
                          <button type="button" className="rounded-lg bg-green-600 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-green-700" onClick={() => void handleReviewApprove()} disabled={busyAction !== null}>Approve</button>
                        </div>
                      </div>
                      <div className="grid gap-4 md:grid-cols-4">
                        <MetaCell label="Method Type">{selectedReviewMoa.moaType ?? "—"}</MetaCell>
                        <MetaCell label="Validation">{validationLabel(selectedReviewMoa.validationStatus)}</MetaCell>
                        <MetaCell label="Compendial Ref">{selectedReviewMoa.compendialRef ?? "—"}</MetaCell>
                        <MetaCell label="Instrument">{selectedReviewMoa.instrumentType ?? "—"}</MetaCell>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                      <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">Review Notes</div>
                      <div className="text-sm text-slate-500">Submitted by {selectedReviewMoa.submittedBy ?? selectedReviewMoa.createdBy} on {fmtDate(selectedReviewMoa.submittedAt ?? selectedReviewMoa.createdAt)}.</div>
                    </div>
                  </div>
                ) : null}

                {!selectedReviewSpec && !selectedReviewMoa ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
                    No records are currently waiting for review.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {(specEditorOpen || moaEditorOpen || parameterEditorOpen || draftParameterEditorOpen || linkMaterialOpen || rejectModalOpen) ? (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => {
            setSpecEditorOpen(false);
            setMoaEditorOpen(false);
            setParameterEditorOpen(false);
            closeDraftParameterEditor();
            setLinkMaterialOpen(false);
            setRejectModalOpen(false);
          }} />

          {specEditorOpen ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[820px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">S</div>
                  <div>
                    <div className="font-bold text-slate-800">{editingSpec ? "Edit Specification" : "New Specification"}</div>
                    <div className="text-xs text-slate-400">Define tests, acceptance criteria, and linked methods</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setSpecEditorOpen(false)}>Cancel</button>
                  <button type="submit" form="spec-form" value="save-draft" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" disabled={busyAction === "spec-save"}>
                    {editingSpec ? "Save Changes" : "Save Draft"}
                  </button>
                  <button type="submit" form="spec-form" value="submit-review" className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]" disabled={busyAction === "spec-save"}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                    </svg>
                    Submit for Review
                  </button>
                </div>
              </div>

              <form id="spec-form" className="flex-1 space-y-7 overflow-y-auto p-7" onSubmit={handleSpecSave}>
                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">1 · Specification Header</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spec Code *</span>
                      <input value={specForm.specCode} onChange={(e) => setSpecForm({ ...specForm, specCode: e.target.value })} className={fieldClassName()} required />
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Specification Name *</span>
                      <input value={specForm.specName} onChange={(e) => setSpecForm({ ...specForm, specName: e.target.value })} className={fieldClassName()} required />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Spec Type *</span>
                      <select value={specForm.specType} onChange={(e) => setSpecForm({ ...specForm, specType: e.target.value as SpecType })} className={fieldClassName()}>
                        {specTypes.map((value) => <option key={value} value={value}>{specTypeLabels[value]}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Revision *</span>
                      <input value={specForm.revision ?? ""} onChange={(e) => setSpecForm({ ...specForm, revision: e.target.value })} className={fieldClassName()} />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Effective Date *</span>
                      <input type="date" value={specForm.effectiveDate ?? ""} onChange={(e) => setSpecForm({ ...specForm, effectiveDate: e.target.value })} className={fieldClassName()} />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Target Market *</span>
                      <select value={specForm.targetMarket ?? ""} onChange={(e) => setSpecForm({ ...specForm, targetMarket: (e.target.value || undefined) as TargetMarket | undefined })} className={fieldClassName()}>
                        <option value="">Select market</option>
                        {targetMarkets.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compendial Reference *</span>
                      <select value={specForm.compendialRef ?? ""} onChange={(e) => setSpecForm({ ...specForm, compendialRef: (e.target.value || undefined) as CompendialRef | undefined })} className={fieldClassName()}>
                        <option value="">Select reference</option>
                        {compendialRefs.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sampling Method *</span>
                      <select value={specForm.samplingMethod} onChange={(e) => setSpecForm({ ...specForm, samplingMethod: e.target.value as CreateSpecRequest["samplingMethod"] })} className={fieldClassName()}>
                        {samplingMethods.map((value) => <option key={value} value={value}>{samplingMethodLabels[value]}</option>)}
                      </select>
                      <div className="mt-1 text-[10px] text-[#7c3aed]">
                        {samplingMethodHints[specForm.samplingMethod]}
                      </div>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference SOP / Attachment</span>
                      <input value={specForm.referenceAttachment ?? ""} onChange={(e) => setSpecForm({ ...specForm, referenceAttachment: e.target.value })} className={fieldClassName()} placeholder="SOP-QC-MGST-001.pdf" />
                      <input type="file" onChange={(e) => setSpecForm({ ...specForm, referenceAttachment: selectedFileName(e) || specForm.referenceAttachment })} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ede9fe] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#6d28d9]" />
                      <div className="mt-1 text-[10px] text-slate-400">Current backend stores the selected filename/path reference.</div>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">2 · Link Materials</div>
                  <div className="mb-3 flex items-center gap-3">
                    <input
                      value={specMaterialSearch}
                      onChange={(e) => setSpecMaterialSearch(e.target.value)}
                      placeholder="Search material code or name…"
                      className={`${fieldClassName()} max-w-xs`}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const firstMatch = filteredMaterialSuggestions[0];
                        if (firstMatch) stageMaterial(firstMatch.id);
                      }}
                      disabled={filteredMaterialSuggestions.length === 0}
                      className="rounded-lg border border-violet-200 px-3 py-2 text-[11px] font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Add Material
                    </button>
                  </div>

                  {filteredMaterialSuggestions.length > 0 ? (
                    <div className="mb-3 flex flex-wrap gap-2">
                      {filteredMaterialSuggestions.map((material) => (
                        <button
                          key={material.id}
                          type="button"
                          onClick={() => stageMaterial(material.id)}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium text-slate-700 hover:border-violet-200 hover:bg-violet-50"
                        >
                          {material.materialCode} · {material.materialName}
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {stagedMaterials.length > 0 ? (
                    <div className="space-y-2">
                      {stagedMaterials.map((material) => (
                        <div key={material.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div>
                            <div className="text-xs font-bold text-slate-800">{material.materialCode}</div>
                            <div className="text-[11px] text-slate-500">{material.materialName}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeStagedMaterial(material.id)}
                            className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs italic text-slate-400">No materials linked yet. Link at least one material before submitting for review.</div>
                  )}

                  <div className="mt-3 text-[10px] text-slate-400">
                    Active material-spec links are applied from the main detail panel after approval. This section now mirrors the selection workflow from the mockup.
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between border-b border-violet-100 pb-2">
                    <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">3 · Test Parameters</div>
                    <button
                      type="button"
                      onClick={addDraftParameterRow}
                      className="rounded-lg border border-[#c4b5fd] px-3 py-1.5 text-[11px] font-semibold text-[#7c3aed] hover:bg-[#ede9fe]"
                    >
                      + Add Test
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-xl border border-slate-200">
                    <div className="overflow-x-auto">
                    <table className="min-w-[1280px] w-full text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50">
                          <th className="w-8 px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">#</th>
                          <th className="min-w-[220px] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Test Name</th>
                          <th className="min-w-[160px] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Type</th>
                          <th className="min-w-[260px] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Method (MOA)</th>
                          <th className="min-w-[250px] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Acceptance Criteria</th>
                          <th className="w-32 px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Lower</th>
                          <th className="w-32 px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Upper</th>
                          <th className="min-w-[240px] px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Text Criteria</th>
                          <th className="w-24 px-3 py-2.5 text-left text-[10px] font-bold text-slate-400">Unit</th>
                          <th className="w-16 px-3 py-2.5 text-center text-[10px] font-bold text-slate-400">Req.</th>
                          <th className="w-40 px-3 py-2.5 text-right text-[10px] font-bold text-slate-400">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draftParameterRows.length === 0 ? (
                          <tr>
                            <td colSpan={11} className="px-3 py-4 text-center text-[11px] italic text-slate-400">
                              No test parameters yet. Add at least one parameter to match the mockup workflow.
                            </td>
                          </tr>
                        ) : null}
                        {draftParameterRows.map((row) => (
                          <tr key={row.localId} className={`border-b border-slate-100 hover:bg-violet-50/30 ${row.criteriaType === "RANGE" ? "bg-blue-50/30" : ""}`}>
                            <td className="px-3 py-2.5 font-mono text-slate-400">{row.sequence}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-800">{row.parameterName || "Untitled test"}</td>
                            <td className="px-3 py-2.5 text-slate-600">{humanizeStatus(row.testType)}</td>
                            <td className="px-3 py-2.5 text-slate-600">
                              {row.moaId
                                ? (moas.find((moa) => moa.id === row.moaId)?.moaCode ?? "Linked MOA")
                                : <span className="text-rose-500">No MOA selected</span>}
                            </td>
                            <td className="px-3 py-2.5 font-mono text-[11px] text-slate-600">{formatDraftCriteria(row)}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.lowerLimit ?? "—"}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.upperLimit ?? "—"}</td>
                            <td className="px-3 py-2.5 text-slate-600">{row.textCriteria || "—"}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-700">{row.unit || "—"}</td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${row.isMandatory ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                                {row.isMandatory ? "Yes" : "No"}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => openDraftParameterEditor(row.localId)} className="rounded-lg border border-violet-200 px-2.5 py-1 text-[10px] font-semibold text-violet-700 hover:bg-violet-50">
                                  Edit Test
                                </button>
                                <button type="button" onClick={() => removeDraftParameterRow(row.localId)} className="rounded-lg border border-rose-200 px-2.5 py-1 text-[10px] font-semibold text-rose-700 hover:bg-rose-50">
                                  Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-6 text-slate-600">
                    <span className="font-semibold text-slate-700">Text Criteria:</span> use this for non-numeric acceptance statements.
                    Examples: <span className="font-medium">"White or almost white powder"</span>, <span className="font-medium">"Complies"</span>, <span className="font-medium">"Passes identification by IR"</span>.
                  </div>
                </div>

                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">4 · Reference Control</div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference Document No</span>
                      <input value={specForm.referenceDocumentNo ?? ""} onChange={(e) => setSpecForm({ ...specForm, referenceDocumentNo: e.target.value })} className={fieldClassName()} placeholder="REF-MGST-SPEC-001" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference Document Upload</span>
                      <input type="file" onChange={(e) => setSpecForm({ ...specForm, referenceAttachment: selectedFileName(e) || specForm.referenceAttachment })} className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ede9fe] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#6d28d9]" />
                      <div className="mt-1 text-[10px] text-slate-400">Stores the selected filename/path reference in the current backend.</div>
                    </label>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#fcd34d] bg-[#fef3c7] p-5">
                  <div className="mb-3 border-b border-[#fde68a] pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#b45309]">5 · Submission Confirmation</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-[#fde68a] bg-white p-3">
                      <div className="mb-1 text-[10px] font-bold uppercase text-[#b45309]">Status After Save</div>
                      <div className="text-sm font-bold text-[#92400e]">DRAFT</div>
                      <div className="text-[10px] text-[#d97706]">Editable. Not visible to production.</div>
                    </div>
                    <div className="rounded-xl border border-[#fde68a] bg-white p-3">
                      <div className="mb-1 text-[10px] font-bold uppercase text-[#b45309]">Status After Submit</div>
                      <div className="text-sm font-bold text-[#1d4ed8]">UNDER_REVIEW</div>
                      <div className="text-[10px] text-slate-500">QC review applies in the current phase.</div>
                    </div>
                    <div className="rounded-xl border border-[#fde68a] bg-white p-3">
                      <div className="mb-1 text-[10px] font-bold uppercase text-[#b45309]">Usable for Sampling</div>
                      <div className="text-sm font-bold text-[#15803d]">After APPROVED only</div>
                      <div className="text-[10px] text-slate-500">Spec drives container count and QC reference usage only after approval.</div>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          ) : null}

          {moaEditorOpen ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[720px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-600">M</div>
                  <div>
                    <div className="font-bold text-slate-800">{editingMoa ? "Edit Method of Analysis" : "New Method of Analysis"}</div>
                    <div className="text-xs text-slate-400">Define analytical procedure and validation status</div>
                  </div>
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">Draft</span>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setMoaEditorOpen(false)}>Cancel</button>
                  <button type="submit" form="moa-form" value="save-draft" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" disabled={busyAction === "moa-save"}>
                    {editingMoa ? "Save Changes" : "Save Draft"}
                  </button>
                  <button type="submit" form="moa-form" value="submit-approval" className="inline-flex items-center gap-2 rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]" disabled={busyAction === "moa-save"}>
                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                    </svg>
                    Submit for Approval
                  </button>
                </div>
              </div>

              <form id="moa-form" className="flex-1 space-y-7 overflow-y-auto p-7" onSubmit={handleMoaSave}>
                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">1 · Method Header</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">MOA Code *</span>
                      <input value={moaForm.moaCode} onChange={(e) => setMoaForm({ ...moaForm, moaCode: e.target.value })} className={fieldClassName()} placeholder="e.g. MOA-HPLC-012" required />
                      <div className="mt-1 text-[10px] text-slate-400">Auto-suggest based on type</div>
                    </label>
                    <label className="md:col-span-2">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Method Name *</span>
                      <input value={moaForm.moaName} onChange={(e) => setMoaForm({ ...moaForm, moaName: e.target.value })} className={fieldClassName()} placeholder="e.g. HPLC Assay — Magnesium Stearate" required />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Method Type *</span>
                      <select value={moaForm.moaType ?? ""} onChange={(e) => setMoaForm({ ...moaForm, moaType: (e.target.value || undefined) as MoaType | undefined })} className={fieldClassName()}>
                        <option value="">Select type</option>
                        {moaTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Revision *</span>
                      <input value={moaForm.revision ?? ""} onChange={(e) => setMoaForm({ ...moaForm, revision: e.target.value })} className={fieldClassName()} placeholder="e.g. Rev.1" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compendial Reference</span>
                      <select value={moaForm.compendialRef ?? ""} onChange={(e) => setMoaForm({ ...moaForm, compendialRef: (e.target.value || undefined) as CompendialRef | undefined })} className={fieldClassName()}>
                        <option value="">In-house</option>
                        {compendialRefs.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Instrument / Equipment</span>
                      <input value={moaForm.instrumentType ?? ""} onChange={(e) => setMoaForm({ ...moaForm, instrumentType: e.target.value })} className={fieldClassName()} placeholder="e.g. HPLC-UV System, Agilent 1260" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reportable Range</span>
                      <input value={moaForm.reportableRange ?? ""} onChange={(e) => setMoaForm({ ...moaForm, reportableRange: e.target.value })} className={fieldClassName()} placeholder="e.g. 0.05% – 120.0%" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reference SOP</span>
                      <input value={moaForm.referenceAttachment ?? ""} onChange={(e) => setMoaForm({ ...moaForm, referenceAttachment: e.target.value })} className={fieldClassName()} placeholder="SOP-QC-xxx.pdf" />
                      <input type="file" onChange={(e) => setMoaForm({ ...moaForm, referenceAttachment: selectedFileName(e) || moaForm.referenceAttachment })} className="mt-2 block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ede9fe] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#6d28d9]" />
                      <div className="mt-1 text-[10px] text-slate-400">Current backend stores the selected filename/path reference.</div>
                    </label>
                  </div>
                </div>

                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">2 · Procedure Details</div>
                  <div className="space-y-4">
                    <label className="block">
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Analytical Principle</span>
                      <textarea value={moaForm.principle ?? ""} onChange={(e) => setMoaForm({ ...moaForm, principle: e.target.value })} className={textAreaClassName()} placeholder="Brief description of the analytical principle and methodology…" />
                    </label>
                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">System Suitability Criteria</span>
                        <textarea value={moaForm.systemSuitabilityCriteria ?? ""} onChange={(e) => setMoaForm({ ...moaForm, systemSuitabilityCriteria: e.target.value })} className={textAreaClassName()} placeholder="e.g. RSD ≤ 2.0% for 5 injections; Tailing factor 0.8–2.0…" />
                      </label>
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reagents & Standards</span>
                        <textarea value={moaForm.reagentsAndStandards ?? ""} onChange={(e) => setMoaForm({ ...moaForm, reagentsAndStandards: e.target.value })} className={textAreaClassName()} placeholder="List reagents, reference standards, and grades…" />
                      </label>
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Calculation Formula</span>
                        <textarea value={moaForm.calculationFormula ?? ""} onChange={(e) => setMoaForm({ ...moaForm, calculationFormula: e.target.value })} className={textAreaClassName()} placeholder="e.g. Assay (%) = (A_sample / A_std) × (W_std / W_sample) × P_std × D × 100" />
                      </label>
                      <label>
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes / Stability Condition</span>
                        <textarea value={moaForm.sampleSolutionStabilityCondition ?? ""} onChange={(e) => setMoaForm({ ...moaForm, sampleSolutionStabilityCondition: e.target.value })} className={textAreaClassName()} placeholder="Any precautions, environmental controls, or analyst notes…" />
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 border-b border-violet-100 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-violet-700">3 · Validation Status</div>
                  <div className="grid gap-4 md:grid-cols-3">
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Validation Status *</span>
                      <select value={moaForm.validationStatus ?? "NOT_VALIDATED"} onChange={(e) => setMoaForm({ ...moaForm, validationStatus: e.target.value as MoaValidationStatus })} className={fieldClassName()}>
                        {moaValidationStatuses.map((value) => <option key={value} value={value}>{validationLabel(value)}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Validation Ref</span>
                      <input value={moaForm.validationReferenceNo ?? ""} onChange={(e) => setMoaForm({ ...moaForm, validationReferenceNo: e.target.value })} className={fieldClassName()} placeholder="e.g. VAL-HPLC-2026-01" />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Validation Attachment</span>
                      <input type="file" onChange={(e) => setMoaForm({ ...moaForm, validationAttachment: selectedFileName(e) || moaForm.validationAttachment })} className="block w-full text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-[#ede9fe] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#6d28d9]" />
                      <div className="mt-1 text-[10px] text-slate-400">{moaForm.validationAttachment || "Stores the selected filename/path reference in the current backend."}</div>
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Solution Stability Value</span>
                      <input type="number" step="0.01" value={moaForm.sampleSolutionStabilityValue ?? ""} onChange={(e) => setMoaForm({ ...moaForm, sampleSolutionStabilityValue: e.target.value ? Number(e.target.value) : undefined })} className={fieldClassName()} />
                    </label>
                    <label>
                      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Stability Unit</span>
                      <select value={moaForm.sampleSolutionStabilityUnit ?? ""} onChange={(e) => setMoaForm({ ...moaForm, sampleSolutionStabilityUnit: (e.target.value || undefined) as SampleSolutionStabilityUnit | undefined })} className={fieldClassName()}>
                        <option value="">Select unit</option>
                        {sampleSolutionUnits.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="mt-4 rounded-xl border border-[#fcd34d] bg-[#fef3c7] px-4 py-3 text-xs leading-6 text-[#b45309]">
                    <span className="mr-1 inline-flex rounded-md bg-[#fde68a] px-2 py-0.5 font-bold text-[#92400e]">Approval Rule:</span>
                    MOAs with <span className="font-semibold">NOT VALIDATED</span> or <span className="font-semibold">IN VALIDATION</span> status can be saved and submitted for review, but approval is blocked.
                    Only <span className="font-semibold">VALIDATED</span> and <span className="font-semibold">VALIDATED (Compendial)</span> methods can be approved.
                    The exception is <span className="font-semibold">MOA Type = VISUAL</span>, which may be approved without formal validation.
                  </div>
                </div>
              </form>
            </div>
          ) : null}

          {draftParameterEditorOpen && editingDraftParameter ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[760px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div>
                  <div className="font-bold text-slate-800">{editingDraftParameter.parameterName || "Edit Test Parameter"}</div>
                  <div className="text-xs text-slate-400">Use this editor for MOA selection, criteria, limits, unit, and text-based acceptance rules.</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={closeDraftParameterEditor}>Close</button>
                </div>
              </div>

              <div className="flex-1 space-y-6 overflow-y-auto p-7">
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Parameter Name *</span>
                    <input value={editingDraftParameter.parameterName} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { parameterName: e.target.value })} className={fieldClassName()} placeholder="e.g. Assay" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Test Type</span>
                    <select value={editingDraftParameter.testType} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { testType: e.target.value as SpecParameterTestType })} className={fieldClassName()}>
                      {parameterTestTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Linked MOA</span>
                    <select value={editingDraftParameter.moaId ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { moaId: e.target.value })} className={fieldClassName()}>
                      <option value="">Select approved or draft method</option>
                      {moas.filter((moa) => moa.status === "APPROVED" || moa.status === "DRAFT").map((moa) => (
                        <option key={moa.id} value={moa.id}>
                          {moa.moaCode} · {moa.moaName}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Criteria Type</span>
                    <select value={editingDraftParameter.criteriaType} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { criteriaType: e.target.value as SpecParameterCriteriaType })} className={fieldClassName()}>
                      {parameterCriteriaTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                    <input value={editingDraftParameter.unit ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { unit: e.target.value })} className={fieldClassName()} placeholder="e.g. %, ppm, CFU/g" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Lower Limit</span>
                    <input type="number" step="0.0001" value={editingDraftParameter.lowerLimit ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { lowerLimit: e.target.value ? Number(e.target.value) : undefined })} className={fieldClassName()} placeholder="e.g. 98.0" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Upper Limit</span>
                    <input type="number" step="0.0001" value={editingDraftParameter.upperLimit ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { upperLimit: e.target.value ? Number(e.target.value) : undefined })} className={fieldClassName()} placeholder="e.g. 102.0" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Text Criteria</span>
                    <textarea value={editingDraftParameter.textCriteria ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { textCriteria: e.target.value })} className={textAreaClassName()} placeholder='Examples: "Complies", "Passes identification by IR", "White or almost white powder"' />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                    <textarea value={editingDraftParameter.notes ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { notes: e.target.value })} className={textAreaClassName()} placeholder="Optional analyst or method notes" />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compendial Chapter Ref</span>
                    <input value={editingDraftParameter.compendialChapterRef ?? ""} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { compendialChapterRef: e.target.value })} className={fieldClassName()} placeholder="e.g. USP <621>" />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required</span>
                    <select value={String(editingDraftParameter.isMandatory)} onChange={(e) => updateDraftParameterRow(editingDraftParameter.localId, { isMandatory: e.target.value === "true" })} className={fieldClassName()}>
                      <option value="true">Required</option>
                      <option value="false">Optional</option>
                    </select>
                  </label>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-6 text-slate-600">
                  <span className="font-semibold text-slate-700">When to use Text Criteria:</span> use it for non-numeric expectations.
                  For <span className="font-medium">TEXT</span>, enter the expected description.
                  For <span className="font-medium">PASS_FAIL</span>, enter the pass condition.
                  For <span className="font-medium">COMPLIES</span>, enter the exact compliance statement or pharmacopoeial wording.
                </div>
              </div>
            </div>
          ) : null}

          {parameterEditorOpen ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[820px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div>
                  <div className="font-bold text-slate-800">{editingParameter ? "Edit Parameter" : "Add Parameter"}</div>
                  <div className="text-xs text-slate-400">Define test type, linked MOA, and acceptance criteria</div>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setParameterEditorOpen(false)}>Cancel</button>
                  <button type="submit" form="parameter-form" className="rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]" disabled={busyAction === "parameter-save"}>
                    {editingParameter ? "Save Parameter" : "Add Parameter"}
                  </button>
                </div>
              </div>

              <form id="parameter-form" className="flex-1 space-y-6 overflow-y-auto p-7" onSubmit={handleParameterSave}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Parameter Name</span>
                    <input value={parameterForm.parameterName} onChange={(e) => setParameterForm({ ...parameterForm, parameterName: e.target.value })} className={fieldClassName()} required />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Test Type</span>
                    <select value={parameterForm.testType} onChange={(e) => setParameterForm({ ...parameterForm, testType: e.target.value as SpecParameterTestType })} className={fieldClassName()}>
                      {parameterTestTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Linked MOA</span>
                    <select value={parameterForm.moaId ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, moaId: e.target.value })} className={fieldClassName()}>
                      <option value="">No linked method</option>
                      {moas.filter((moa) => moa.status === "APPROVED" || moa.status === "DRAFT").map((moa) => <option key={moa.id} value={moa.id}>{moa.moaCode} · {moa.moaName}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Criteria Type</span>
                    <select value={parameterForm.criteriaType} onChange={(e) => setParameterForm({ ...parameterForm, criteriaType: e.target.value as SpecParameterCriteriaType })} className={fieldClassName()}>
                      {parameterCriteriaTypes.map((value) => <option key={value} value={value}>{value}</option>)}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Lower Limit</span>
                    <input type="number" step="0.0001" value={parameterForm.lowerLimit ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, lowerLimit: e.target.value ? Number(e.target.value) : undefined })} className={fieldClassName()} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Upper Limit</span>
                    <input type="number" step="0.0001" value={parameterForm.upperLimit ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, upperLimit: e.target.value ? Number(e.target.value) : undefined })} className={fieldClassName()} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Unit</span>
                    <input value={parameterForm.unit ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, unit: e.target.value })} className={fieldClassName()} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sequence</span>
                    <input type="number" min={1} value={parameterForm.sequence} onChange={(e) => setParameterForm({ ...parameterForm, sequence: Number(e.target.value) })} className={fieldClassName()} required />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Text Criteria</span>
                    <textarea value={parameterForm.textCriteria ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, textCriteria: e.target.value })} className={textAreaClassName()} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                    <textarea value={parameterForm.notes ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, notes: e.target.value })} className={textAreaClassName()} />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Compendial Chapter Ref</span>
                    <input value={parameterForm.compendialChapterRef ?? ""} onChange={(e) => setParameterForm({ ...parameterForm, compendialChapterRef: e.target.value })} className={fieldClassName()} />
                  </label>
                  <label>
                    <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Required</span>
                    <select value={String(parameterForm.isMandatory)} onChange={(e) => setParameterForm({ ...parameterForm, isMandatory: e.target.value === "true" })} className={fieldClassName()}>
                      <option value="true">Required</option>
                      <option value="false">Optional</option>
                    </select>
                  </label>
                </div>
              </form>
            </div>
          ) : null}

          {linkMaterialOpen ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div>
                  <div className="font-bold text-slate-800">Link Material</div>
                  <div className="text-xs text-slate-400">Assign this approved specification to a material</div>
                </div>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setLinkMaterialOpen(false)}>Close</button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-7">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Material</span>
                  <select value={materialToLink} onChange={(e) => setMaterialToLink(e.target.value)} className={fieldClassName()}>
                    <option value="">Select material</option>
                    {materials.map((material) => <option key={material.id} value={material.id}>{material.materialCode} · {material.materialName}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Notes</span>
                  <textarea value={linkNotes} onChange={(e) => setLinkNotes(e.target.value)} className={textAreaClassName()} />
                </label>
                <div className="flex justify-end">
                  <button type="button" className="rounded-lg bg-[#7c3aed] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6d28d9]" onClick={() => void handleLinkMaterial()} disabled={!materialToLink || busyAction === "material-link"}>
                    Link Material
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {rejectModalOpen ? (
            <div className="absolute bottom-0 right-0 top-0 flex w-full max-w-[520px] flex-col overflow-hidden bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-7 py-4">
                <div>
                  <div className="font-bold text-slate-800">Reject for Rework</div>
                  <div className="text-xs text-slate-400">Review remarks are required before sending back to draft</div>
                </div>
                <button type="button" className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50" onClick={() => setRejectModalOpen(false)}>Close</button>
              </div>
              <div className="flex-1 space-y-5 overflow-y-auto p-7">
                <label className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">Review Remarks</span>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="min-h-[140px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100" />
                </label>
                <div className="flex justify-end">
                  <button type="button" className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700" onClick={() => void handleReject()} disabled={!rejectReason.trim() || busyAction?.endsWith("reject")}>
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function MetaCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
      <div className="text-sm font-semibold text-slate-700">{children}</div>
    </div>
  );
}

function ValidationChip({ title, value, active }: { title: string; value: string; active: boolean }) {
  return (
    <div className={`flex items-center gap-2 rounded-xl border p-3 ${active ? "border-green-100 bg-green-50" : "border-slate-200 bg-slate-50"}`}>
      <div className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold ${active ? "bg-green-500 text-white" : "bg-slate-300 text-slate-600"}`}>
        {active ? "✓" : "—"}
      </div>
      <div>
        <div className={`text-[10px] font-bold ${active ? "text-green-700" : "text-slate-500"}`}>{title}</div>
        <div className={`text-[10px] ${active ? "text-green-600" : "text-slate-400"}`}>{value}</div>
      </div>
    </div>
  );
}
