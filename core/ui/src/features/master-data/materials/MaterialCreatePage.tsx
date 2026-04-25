import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  createMaterial,
  createMaterialLocationRule,
  fetchSpecs,
  fetchMaterialLocationRules,
  fetchWarehouseTree,
  updateMaterial,
  updateMaterialLocationRule
} from "../../../lib/api";
import { useAppShellStore } from "../../../stores/appShellStore";
import type {
  CreateMaterialRequest,
  LightSensitivity,
  Material,
  MaterialCategory,
  StorageCondition
} from "../../../types/material";
import type {
  CreateMaterialLocationRuleRequest,
  MaterialLocationRule,
  WarehouseTreeNode,
  WarehouseTreeRack,
  WarehouseTreeRoom,
  WarehouseTreeShelf
} from "../../../types/location";
import type { Spec } from "../../../types/spec";

// ─── Constants ────────────────────────────────────────────────────────────────

const storageConditions: StorageCondition[] = [
  "AMBIENT",
  "ROOM_TEMPERATURE",
  "CONTROLLED_ROOM_TEMPERATURE",
  "REFRIGERATED_2_TO_8C",
  "COLD",
  "DEEP_FREEZER"
];

const storageConditionLabels: Record<StorageCondition, string> = {
  AMBIENT: "Ambient (15–30°C)",
  ROOM_TEMPERATURE: "Room Temperature",
  CONTROLLED_ROOM_TEMPERATURE: "Cool / Controlled (8–15°C)",
  REFRIGERATED_2_TO_8C: "Cold / Refrigerated (2–8°C)",
  COLD: "Frozen (–20°C)",
  DEEP_FREEZER: "Deep Frozen (–80°C)"
};

const materialCategories: MaterialCategory[] = [
  "API",
  "EXCIPIENT",
  "SOLVENT",
  "PACKAGING_MATERIAL",
  "FINISHED_GOODS",
  "REFERENCE_STANDARD"
];

const materialCategoryLabels: Record<MaterialCategory, string> = {
  API: "API (Active Pharmaceutical Ingredient)",
  EXCIPIENT: "Excipient",
  SOLVENT: "Solvent",
  PACKAGING_MATERIAL: "Packaging Material",
  FINISHED_GOODS: "Finished Goods",
  REFERENCE_STANDARD: "Reference Standard"
};

const lightSensitivities: LightSensitivity[] = [
  "NOT_SENSITIVE",
  "PROTECT_FROM_LIGHT",
  "AMBER_CONTAINER",
  "STORE_IN_DARK"
];

const lightSensitivityLabels: Record<LightSensitivity, string> = {
  NOT_SENSITIVE: "Not sensitive",
  PROTECT_FROM_LIGHT: "Protect from light",
  AMBER_CONTAINER: "Store in amber container",
  STORE_IN_DARK: "Store in dark"
};

const uomOptions = ["KG", "G", "MG", "L", "ML", "PCS", "STRIPS", "ROLLS"];
const pharmacopoeialRefs = ["IP 2022", "BP 2024", "USP-NF 2024", "EP 10th Edition", "Non-Pharmacopoeial", "In-house"];

// ─── Initial form factory ─────────────────────────────────────────────────────

function makeInitialForm(userName: string): CreateMaterialRequest {
  return {
    materialCode: "",
    materialName: "",
    materialCategory: undefined,
    genericNames: "",
    materialType: "CRITICAL",
    uom: "KG",
    specId: "",
    hsnCode: "",
    casNumber: "",
    pharmacopoeialRef: "",
    storageCondition: "AMBIENT",
    maxHumidity: "",
    lightSensitivity: undefined,
    hygroscopic: false,
    shelfLifeMonths: undefined,
    retestPeriodMonths: undefined,
    reorderLevel: "",
    leadTimeDays: undefined,
    controlledSubstance: false,
    photosensitive: false,
    hazardous: false,
    selectiveMaterial: false,
    vendorCoaReleaseAllowed: false,
    samplingRequired: true,
    description: "",
    createdBy: userName
  };
}

type StorageAssignmentDraft = {
  defaultWarehouseId: string;
  defaultRoomId: string;
  defaultRackId: string;
  quarantineWarehouseId: string;
  quarantineRoomId: string;
  notes: string;
};

function makeInitialStorageAssignment(): StorageAssignmentDraft {
  return {
    defaultWarehouseId: "",
    defaultRoomId: "",
    defaultRackId: "",
    quarantineWarehouseId: "",
    quarantineRoomId: "",
    notes: ""
  };
}

// ─── Toggle component ─────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={[
        "relative h-5 w-9 shrink-0 rounded-full transition-colors",
        checked ? "bg-sky-500" : "bg-slate-300"
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          checked ? "left-4" : "left-0.5"
        ].join(" ")}
      />
    </button>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────

function FieldLabel({ label, required, hint }: { label: string; required?: boolean; hint?: string }) {
  return (
    <div className="mb-1.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">
        {label}{required && <span className="ml-0.5 text-red-500">*</span>}
      </span>
      {hint && <div className="mt-0.5 text-[11px] text-slate-400">{hint}</div>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-[13px] text-ink outline-none transition focus:border-sky-500 focus:bg-white focus:ring-2 focus:ring-sky-100";
const selectCls = "w-full rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-[13px] text-ink outline-none transition focus:border-sky-500 focus:bg-white";
const textareaCls = "w-full rounded-lg border border-sky-200 bg-sky-50/60 px-3 py-2 text-[13px] text-ink outline-none transition focus:border-sky-500 focus:bg-white resize-y min-h-[72px]";

// ─── MaterialCreatePage ────────────────────────────────────────────────────────

export default function MaterialCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUserName = useAppShellStore((state) => state.currentUser.name);

  // Edit mode: material passed via location state
  const editMaterial = location.state?.material as Material | undefined;
  const isEdit = !!editMaterial;

  const [form, setForm] = useState<CreateMaterialRequest>(() => {
    if (editMaterial) {
      return {
        materialCode: editMaterial.materialCode,
        materialName: editMaterial.materialName,
        materialCategory: editMaterial.materialCategory ?? undefined,
        genericNames: editMaterial.genericNames ?? "",
        materialType: editMaterial.materialType,
        uom: editMaterial.uom,
        specId: editMaterial.specId ?? "",
        hsnCode: editMaterial.hsnCode ?? "",
        casNumber: editMaterial.casNumber ?? "",
        pharmacopoeialRef: editMaterial.pharmacopoeialRef ?? "",
        storageCondition: editMaterial.storageCondition,
        maxHumidity: editMaterial.maxHumidity ?? "",
        lightSensitivity: editMaterial.lightSensitivity ?? undefined,
        hygroscopic: editMaterial.hygroscopic,
        shelfLifeMonths: editMaterial.shelfLifeMonths ?? undefined,
        retestPeriodMonths: editMaterial.retestPeriodMonths ?? undefined,
        reorderLevel: editMaterial.reorderLevel ?? "",
        leadTimeDays: editMaterial.leadTimeDays ?? undefined,
        controlledSubstance: editMaterial.controlledSubstance,
        photosensitive: editMaterial.photosensitive,
        hazardous: editMaterial.hazardous,
        selectiveMaterial: editMaterial.selectiveMaterial,
        vendorCoaReleaseAllowed: editMaterial.vendorCoaReleaseAllowed,
        samplingRequired: editMaterial.samplingRequired,
        description: editMaterial.description ?? "",
        createdBy: editMaterial.updatedBy ?? editMaterial.createdBy ?? currentUserName
      };
    }
    return makeInitialForm(currentUserName);
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warehouseTree, setWarehouseTree] = useState<WarehouseTreeNode[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [storageAssignment, setStorageAssignment] = useState<StorageAssignmentDraft>(makeInitialStorageAssignment());
  const [existingLocationRule, setExistingLocationRule] = useState<MaterialLocationRule | null>(null);

  // Update createdBy if userName changes (login resolves async)
  useEffect(() => {
    if (!isEdit) {
      setForm((f) => ({ ...f, createdBy: currentUserName }));
    }
  }, [currentUserName, isEdit]);

  useEffect(() => {
    let isMounted = true;

    async function loadStorageContext() {
      try {
        const [tree, availableSpecs] = await Promise.all([fetchWarehouseTree(), fetchSpecs()]);
        if (!isMounted) {
          return;
        }
        setWarehouseTree(tree);
        setSpecs(availableSpecs);

        if (editMaterial) {
          const rules = await fetchMaterialLocationRules(editMaterial.id);
          if (!isMounted || rules.length === 0) {
            return;
          }
          const rule = rules[0];
          setExistingLocationRule(rule);
          setStorageAssignment({
            defaultWarehouseId: rule.defaultWarehouseId ?? "",
            defaultRoomId: rule.defaultRoomId ?? "",
            defaultRackId: rule.defaultRackId ?? "",
            quarantineWarehouseId: rule.quarantineWarehouseId ?? "",
            quarantineRoomId: rule.quarantineRoomId ?? "",
            notes: rule.notes ?? ""
          });
        }
      } catch {
        // Keep material form usable even if location helpers fail to load.
      }
    }

    void loadStorageContext();

    return () => {
      isMounted = false;
    };
  }, [editMaterial]);

  useEffect(() => {
    setStorageAssignment((current) => {
      const next = { ...current };
      const hasDefaultWarehouse = filteredWarehouses.some((warehouse) => warehouse.id === current.defaultWarehouseId);
      if (!hasDefaultWarehouse) {
        next.defaultWarehouseId = "";
        next.defaultRoomId = "";
        next.defaultRackId = "";
      }
      return next;
    });
  }, [form.storageCondition]); // eslint-disable-line react-hooks/exhaustive-deps

  // Completion tracking
  const basicDone = !!form.materialName && !!form.materialCategory && !!form.materialType && !!form.uom;
  const storageDone = !!form.storageCondition && !!form.shelfLifeMonths;
  const specificationDone = !!form.specId;
  const selectedSpec = specs.find((spec) => spec.id === form.specId) ?? null;
  const filteredSpecs = useMemo(
    () =>
      specs.filter((spec) =>
        form.vendorCoaReleaseAllowed
          ? spec.samplingMethod === "COA_BASED_RELEASE"
          : spec.samplingMethod !== "COA_BASED_RELEASE"
      ),
    [form.vendorCoaReleaseAllowed, specs]
  );

  const filteredWarehouses = useMemo(
    () =>
      warehouseTree.filter((warehouse) =>
        warehouse.rooms.some((room) => room.storageCondition === form.storageCondition)
      ),
    [form.storageCondition, warehouseTree]
  );

  const defaultRooms = useMemo(
    () =>
      filteredWarehouses
        .find((warehouse) => warehouse.id === storageAssignment.defaultWarehouseId)
        ?.rooms.filter((room) => room.storageCondition === form.storageCondition) ?? [],
    [filteredWarehouses, form.storageCondition, storageAssignment.defaultWarehouseId]
  );

  const defaultRacks = useMemo(
    () => defaultRooms.find((room) => room.id === storageAssignment.defaultRoomId)?.racks ?? [],
    [defaultRooms, storageAssignment.defaultRoomId]
  );

  const quarantineWarehouses = filteredWarehouses;
  const quarantineRooms = useMemo(
    () =>
      quarantineWarehouses
        .find((warehouse) => warehouse.id === storageAssignment.quarantineWarehouseId)
        ?.rooms.filter((room) => room.storageCondition === form.storageCondition) ?? [],
    [form.storageCondition, quarantineWarehouses, storageAssignment.quarantineWarehouseId]
  );

  useEffect(() => {
    if (!form.specId) {
      return;
    }
    const stillValid = filteredSpecs.some((spec) => spec.id === form.specId);
    if (!stillValid) {
      setForm((current) => ({ ...current, specId: "" }));
    }
  }, [filteredSpecs, form.specId]);

  function setStorageField<K extends keyof StorageAssignmentDraft>(key: K, value: StorageAssignmentDraft[K]) {
    setStorageAssignment((current) => {
      const next = { ...current, [key]: value };
      if (key === "defaultWarehouseId") {
        next.defaultRoomId = "";
        next.defaultRackId = "";
      }
      if (key === "defaultRoomId") {
        next.defaultRackId = "";
      }
      if (key === "quarantineWarehouseId") {
        next.quarantineRoomId = "";
      }
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const payload: CreateMaterialRequest = {
        ...form,
        materialCode: form.materialCode.trim(),
        materialName: form.materialName.trim(),
        materialType: form.materialType.trim(),
        uom: form.uom.trim(),
        description: form.description?.trim() || undefined,
        createdBy: form.createdBy.trim()
      };
      let savedMaterial: Material;
      if (isEdit && editMaterial) {
        savedMaterial = await updateMaterial(editMaterial.id, payload);
      } else {
        savedMaterial = await createMaterial(payload);
      }

      const locationPayload: CreateMaterialLocationRuleRequest = {
        materialId: savedMaterial.id,
        defaultWarehouseId: storageAssignment.defaultWarehouseId || undefined,
        defaultRoomId: storageAssignment.defaultRoomId || undefined,
        defaultRackId: storageAssignment.defaultRackId || undefined,
        quarantineWarehouseId: storageAssignment.quarantineWarehouseId || undefined,
        quarantineRoomId: storageAssignment.quarantineRoomId || undefined,
        notes: storageAssignment.notes.trim() || undefined
      };

      if (
        locationPayload.defaultWarehouseId ||
        locationPayload.defaultRoomId ||
        locationPayload.defaultRackId ||
        locationPayload.quarantineWarehouseId ||
        locationPayload.quarantineRoomId ||
        locationPayload.notes
      ) {
        if (existingLocationRule) {
          await updateMaterialLocationRule(existingLocationRule.id, locationPayload);
        } else {
          await createMaterialLocationRule(locationPayload);
        }
      }
      navigate("/master-data/materials/materials");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save material");
    } finally {
      setIsSubmitting(false);
    }
  }

  function field<K extends keyof CreateMaterialRequest>(key: K) {
    return (value: CreateMaterialRequest[K]) =>
      setForm((f) => ({ ...f, [key]: value }));
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            {isEdit ? `Edit Material: ${editMaterial!.materialCode}` : "New Material"}
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Fill all required fields. Material code is assigned by the system after the material is created.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => navigate("/master-data/materials/materials")}
            className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="material-form"
            disabled={isSubmitting}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save & Activate"}
          </button>
        </div>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { n: 1, label: "Basic Info", done: basicDone },
          { n: 2, label: "Storage & Handling", done: storageDone },
          { n: 3, label: "Specifications", done: specificationDone },
          { n: 4, label: "Approved Vendors", done: false },
          { n: 5, label: "Review & Save", done: false }
        ].map((step, idx, arr) => (
          <div key={step.n} className="flex items-center gap-2 shrink-0">
            <div
              className={[
                "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
                step.done
                  ? "bg-green-100 text-green-700"
                  : idx === 0
                    ? "bg-sky-600 text-white"
                    : "bg-slate-100 text-slate-400"
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold",
                  step.done
                    ? "bg-green-400 text-white"
                    : idx === 0
                      ? "bg-white text-sky-600"
                      : "bg-slate-200 text-slate-400"
                ].join(" ")}
              >
                {step.done ? "✓" : step.n}
              </span>
              {step.label}
            </div>
            {idx < arr.length - 1 && (
              <span className="text-slate-300 font-bold text-sm">——</span>
            )}
          </div>
        ))}
      </div>

      {/* 2/3 form + 1/3 sidebar */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <form
          id="material-form"
          onSubmit={handleSubmit}
          className="col-span-1 space-y-5 xl:col-span-2"
        >

          {/* Section 1: Basic Information */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-sky-100 pb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">1</div>
              <span className="text-[13px] font-bold text-sky-900">Basic Information</span>
            </div>
            <div className="grid grid-cols-2 gap-4">

              <label className="block">
                <FieldLabel label="Material Type" required />
                <select
                  required
                  className={selectCls}
                  value={form.materialType}
                  onChange={(e) => field("materialType")(e.target.value)}
                >
                  <option value="CRITICAL">Raw Material (RM)</option>
                  <option value="NON_CRITICAL">Packaging Material (PM)</option>
                  <option value="FINISHED_GOODS">Finished Goods (FG)</option>
                  <option value="IN_PROCESS">In-Process Material</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Material Name" required hint="Use the INN / IUPAC name. Avoid brand names." />
                <input
                  required
                  className={inputCls}
                  placeholder="e.g. Paracetamol"
                  value={form.materialName}
                  onChange={(e) => field("materialName")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Generic / Other Names" />
                <input
                  className={inputCls}
                  placeholder="e.g. Acetaminophen, 4-Acetamidophenol"
                  value={form.genericNames ?? ""}
                  onChange={(e) => field("genericNames")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Material Code" hint="Assigned by the system after the first save." />
                <input
                  readOnly
                  className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-[13px] text-slate-500 outline-none"
                  value={isEdit ? form.materialCode : "Will be generated after save"}
                />
              </label>

              <label className="block">
                <FieldLabel label="Material Category" required />
                <select
                  required
                  className={selectCls}
                  value={form.materialCategory ?? ""}
                  onChange={(e) => field("materialCategory")(e.target.value as MaterialCategory || undefined)}
                >
                  <option value="">— Select category —</option>
                  {materialCategories.map((cat) => (
                    <option key={cat} value={cat}>{materialCategoryLabels[cat]}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Unit of Measure (UOM)" required />
                <select
                  required
                  className={selectCls}
                  value={form.uom}
                  onChange={(e) => field("uom")(e.target.value)}
                >
                  {uomOptions.map((u) => (
                    <option key={u} value={u}>{u.toLowerCase()}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="HSN Code" hint="Tax classification for the material used in GST and invoicing." />
                <input
                  className={inputCls}
                  placeholder="e.g. 29242990"
                  value={form.hsnCode ?? ""}
                  onChange={(e) => field("hsnCode")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="CAS Number" hint="Chemical Abstracts Service identifier for the material or substance." />
                <input
                  className={inputCls}
                  placeholder="e.g. 103-90-2"
                  value={form.casNumber ?? ""}
                  onChange={(e) => field("casNumber")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Pharmacopoeial Ref." hint="Compendial standard followed by this material, such as IP, USP, BP, or EP." />
                <select
                  className={selectCls}
                  value={form.pharmacopoeialRef ?? ""}
                  onChange={(e) => field("pharmacopoeialRef")(e.target.value)}
                >
                  <option value="">— Select ref —</option>
                  {pharmacopoeialRefs.map((ref) => (
                    <option key={ref} value={ref}>{ref}</option>
                  ))}
                </select>
              </label>

              <div className="col-span-2">
                <FieldLabel label="Description / Remarks" />
                <textarea
                  className={textareaCls}
                  placeholder="Additional notes, physical description, special handling instructions…"
                  value={form.description ?? ""}
                  onChange={(e) => field("description")(e.target.value)}
                />
              </div>

              <div className="col-span-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[12px] text-slate-600">
                Material master stores reference data such as tax code, chemical identity, pharmacopoeial standard, storage rules, and warehouse assignment.
                Batch number is not created here. The internal batch number is generated when the material is received through GRN.
              </div>
            </div>
          </div>

          {/* Section 2: Storage & Warehouse Rules */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-sky-100 pb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">2</div>
              <span className="text-[13px] font-bold text-sky-900">Storage &amp; Warehouse Rules</span>
            </div>
            <div className="grid grid-cols-2 gap-4">

              <label className="block">
                <FieldLabel label="Storage Condition" required />
                <select
                  required
                  className={selectCls}
                  value={form.storageCondition}
                  onChange={(e) => field("storageCondition")(e.target.value as StorageCondition)}
                >
                  {storageConditions.map((sc) => (
                    <option key={sc} value={sc}>{storageConditionLabels[sc]}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Max Humidity (%RH)" />
                <input
                  className={inputCls}
                  placeholder="e.g. NMT 65%"
                  value={form.maxHumidity ?? ""}
                  onChange={(e) => field("maxHumidity")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Light Sensitivity" />
                <select
                  className={selectCls}
                  value={form.lightSensitivity ?? ""}
                  onChange={(e) => field("lightSensitivity")(e.target.value as LightSensitivity || undefined)}
                >
                  <option value="">— Select —</option>
                  {lightSensitivities.map((ls) => (
                    <option key={ls} value={ls}>{lightSensitivityLabels[ls]}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Hygroscopic" />
                <select
                  className={selectCls}
                  value={form.hygroscopic ? "yes" : "no"}
                  onChange={(e) => field("hygroscopic")(e.target.value === "yes")}
                >
                  <option value="no">No</option>
                  <option value="yes">Yes – store with desiccant</option>
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Shelf Life (months)" required />
                <input
                  required
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="e.g. 36"
                  value={form.shelfLifeMonths ?? ""}
                  onChange={(e) => field("shelfLifeMonths")(e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Retest Period (months)" hint="For APIs and critical excipients." />
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="e.g. 24"
                  value={form.retestPeriodMonths ?? ""}
                  onChange={(e) => field("retestPeriodMonths")(e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Reorder Level" />
                <input
                  className={inputCls}
                  placeholder="e.g. 50 kg"
                  value={form.reorderLevel ?? ""}
                  onChange={(e) => field("reorderLevel")(e.target.value)}
                />
              </label>

              <label className="block">
                <FieldLabel label="Lead Time (days)" />
                <input
                  type="number"
                  min={0}
                  className={inputCls}
                  placeholder="e.g. 14"
                  value={form.leadTimeDays ?? ""}
                  onChange={(e) => field("leadTimeDays")(e.target.value ? Number(e.target.value) : undefined)}
                />
              </label>

              {/* Toggle flags */}
              <div className="col-span-2 grid grid-cols-2 gap-3">
                {(
                  [
                    { key: "controlledSubstance" as const, label: "Controlled Substance", hint: "Requires narcotics register if enabled" },
                    { key: "hazardous" as const, label: "Hazardous Material", hint: "Triggers MSDS requirement on GRN" },
                    { key: "photosensitive" as const, label: "Photosensitive", hint: "Special packaging required" },
                    { key: "hygroscopic" as const, label: "Hygroscopic", hint: "Store with desiccant" },
                    { key: "selectiveMaterial" as const, label: "Selective Material", hint: "" },
                    { key: "vendorCoaReleaseAllowed" as const, label: "Vendor CoA Release", hint: "Skip QC test if CoA provided" },
                    { key: "samplingRequired" as const, label: "Sampling Required", hint: "QC sampling mandatory on GRN" }
                  ] as { key: keyof CreateMaterialRequest; label: string; hint: string }[]
                ).map(({ key, label, hint }) => (
                  <div
                    key={key}
                    className="flex items-center gap-3 rounded-xl border border-sky-100 bg-sky-50/60 p-3"
                  >
                    <Toggle
                      checked={!!form[key]}
                      onChange={(v) => field(key)(v as CreateMaterialRequest[typeof key])}
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-800">{label}</div>
                      {hint && <div className="text-[10px] text-slate-400">{hint}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Warehouse Assignment */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-sky-100 pb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">3</div>
              <span className="text-[13px] font-bold text-sky-900">Warehouse Assignment</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <FieldLabel label="Default Putaway Warehouse" hint="Filtered by the selected storage condition." />
                <select
                  className={selectCls}
                  value={storageAssignment.defaultWarehouseId}
                  onChange={(e) => setStorageField("defaultWarehouseId", e.target.value)}
                >
                  <option value="">— Select warehouse —</option>
                  {filteredWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouseCode} - {warehouse.warehouseName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Default Putaway Room" />
                <select
                  className={selectCls}
                  value={storageAssignment.defaultRoomId}
                  onChange={(e) => setStorageField("defaultRoomId", e.target.value)}
                  disabled={!storageAssignment.defaultWarehouseId}
                >
                  <option value="">— Select room —</option>
                  {defaultRooms.map((room: WarehouseTreeRoom) => (
                    <option key={room.id} value={room.id}>
                      {room.roomCode} - {room.roomName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Default Putaway Rack" hint="Optional preferred rack." />
                <select
                  className={selectCls}
                  value={storageAssignment.defaultRackId}
                  onChange={(e) => setStorageField("defaultRackId", e.target.value)}
                  disabled={!storageAssignment.defaultRoomId}
                >
                  <option value="">— Select rack —</option>
                  {defaultRacks.map((rack: WarehouseTreeRack) => (
                    <option key={rack.id} value={rack.id}>
                      {rack.rackCode} - {rack.rackName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Quarantine Warehouse" hint="Used when material is held before release." />
                <select
                  className={selectCls}
                  value={storageAssignment.quarantineWarehouseId}
                  onChange={(e) => setStorageField("quarantineWarehouseId", e.target.value)}
                >
                  <option value="">— Select quarantine warehouse —</option>
                  {quarantineWarehouses.map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>
                      {warehouse.warehouseCode} - {warehouse.warehouseName}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <FieldLabel label="Quarantine Room" />
                <select
                  className={selectCls}
                  value={storageAssignment.quarantineRoomId}
                  onChange={(e) => setStorageField("quarantineRoomId", e.target.value)}
                  disabled={!storageAssignment.quarantineWarehouseId}
                >
                  <option value="">— Select quarantine room —</option>
                  {quarantineRooms.map((room: WarehouseTreeRoom) => (
                    <option key={room.id} value={room.id}>
                      {room.roomCode} - {room.roomName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="col-span-2">
                <FieldLabel label="Warehouse Notes" />
                <textarea
                  className={textareaCls}
                  placeholder="Optional putaway, quarantine, or handling notes"
                  value={storageAssignment.notes}
                  onChange={(e) => setStorageField("notes", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Specifications */}
          <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2 border-b border-sky-100 pb-3">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[10px] font-bold text-white">4</div>
              <span className="text-[13px] font-bold text-sky-900">Specification &amp; Testing</span>
              <span className="ml-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-600">Required</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <FieldLabel
                  label="Link Existing Spec"
                  required
                  hint={
                    form.vendorCoaReleaseAllowed
                      ? "Select a CoA-based release spec. QC will rely on vendor CoA and skip routine testing."
                      : "Select the specification QC will follow to sample and test this material."
                  }
                />
                <select
                  required
                  className={selectCls}
                  value={form.specId ?? ""}
                  onChange={(e) => field("specId")(e.target.value)}
                >
                  <option value="">
                    {form.vendorCoaReleaseAllowed ? "— Select CoA release spec —" : "— Search / select spec —"}
                  </option>
                  {filteredSpecs.map((spec) => (
                    <option key={spec.id} value={spec.id}>
                      {spec.specCode} - {spec.specName}{spec.revision ? ` (${spec.revision})` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => navigate("/master-data/qc-refs/specs")}
                  className="w-full rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[13px] font-semibold text-violet-700 hover:bg-violet-100"
                >
                  + Create New Spec →
                </button>
              </div>
              <div className="col-span-2 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-[12px] text-slate-600">
                {selectedSpec
                  ? form.vendorCoaReleaseAllowed
                    ? `QC will follow ${selectedSpec.specCode} - ${selectedSpec.specName}${selectedSpec.revision ? `, revision ${selectedSpec.revision}` : ""} as a CoA-based release specification. Routine QC testing and validation are skipped when acceptable vendor CoA is provided.`
                    : `QC will follow ${selectedSpec.specCode} - ${selectedSpec.specName}${selectedSpec.revision ? `, revision ${selectedSpec.revision}` : ""} for this material. Sampling method: ${selectedSpec.samplingMethod.split("_").join(" ")}.`
                  : form.vendorCoaReleaseAllowed
                    ? "Vendor CoA Release is enabled, so you must link a CoA-based release specification."
                    : "Every material must be linked to a specification so QC knows which standard to follow during sampling and testing."}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

        </form>

        {/* Right sidebar */}
        <aside className="col-span-1 space-y-4">

          {/* Material code */}
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <p className="text-xs font-semibold text-sky-800">Auto-Generated Code</p>
            <p className="mt-1 font-mono text-2xl font-bold text-sky-700">
              {isEdit ? form.materialCode : "Assigned after save"}
            </p>
            <p className="mt-1 text-[10px] text-sky-600">
              {isEdit
                ? "This code was generated when the material was created."
                : "The system assigns the next code after the material is saved, based on material type."}
            </p>
          </div>

          {/* Completion status */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-xs font-semibold text-slate-700">Completion Status</p>
            <div className="space-y-2">
              {[
                { label: "Basic Info", done: basicDone },
                { label: "Warehouse Rules", done: storageDone },
                { label: "Specifications", done: specificationDone }
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${item.done ? "bg-sky-500" : "bg-slate-300"}`} />
                    {item.label}
                  </span>
                  <span className={item.done ? "font-semibold text-sky-600" : "text-slate-400"}>
                    {item.done ? "Done" : "Not started"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Required fields */}
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-amber-800">Required Fields</p>
            <ul className="space-y-1.5 text-[11px] text-amber-700">
              {["Material Name", "Material Category", "Material Type", "Unit of Measure", "Specification", "Storage Condition", "Shelf Life"].map((f) => (
                <li key={f} className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Tips */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-semibold text-slate-700">Tips</p>
            <ul className="space-y-2 text-[11px] text-slate-500">
              <li>Material code can be auto-generated from material type or entered manually as an override.</li>
              <li>Material type should be selected first because system code generation depends on it.</li>
              <li>Specification link is mandatory because QC sampling and testing follow the assigned spec.</li>
              <li>Warehouse assignment controls default putaway and quarantine routing.</li>
              <li>Vendor and manufacturing site selection happens during GRN, not in material master.</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-2">
            <button
              type="submit"
              form="material-form"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-sky-600 py-2.5 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Save & Activate"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/master-data/materials/materials")}
              className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>

        </aside>
      </div>
    </div>
  );
}
