import { FormEvent, useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import { useAppShellStore } from "../../stores/appShellStore";
import {
  createMoa,
  createMaterial,
  createPallet,
  createRack,
  createRoom,
  createSamplingTool,
  createShelf,
  createSpec,
  createSupplier,
  createVendor,
  createVendorBusinessUnit,
  createWarehouse,
  deleteMaterial,
  deleteMoa,
  deletePallet,
  deleteRack,
  deleteRoom,
  deleteSamplingTool,
  deleteShelf,
  deleteSpec,
  deleteSupplier,
  deleteVendor,
  deleteVendorBusinessUnit,
  deleteWarehouse,
  fetchMoas,
  fetchMaterials,
  fetchPallets,
  fetchRacks,
  fetchRooms,
  fetchSamplingTools,
  fetchShelves,
  fetchSpecs,
  fetchSuppliers,
  fetchVendorBusinessUnits,
  fetchVendors,
  fetchWarehouseTree,
  fetchWarehouses,
  updateMaterial,
  updateMoa,
  updatePallet,
  updateRack,
  updateRoom,
  updateSamplingTool,
  updateShelf,
  updateSpec,
  updateSupplier,
  updateVendor,
  updateVendorBusinessUnit,
  updateWarehouse
} from "../../lib/api";
import type {
  CreatePalletRequest,
  CreateRackRequest,
  CreateRoomRequest,
  CreateShelfRequest,
  CreateWarehouseRequest,
  Pallet,
  Rack,
  Room,
  Shelf,
  Warehouse,
  WarehouseTreeNode
} from "../../types/location";
import type { CreateMaterialRequest, LightSensitivity, Material, MaterialCategory, StorageCondition } from "../../types/material";
import type { CreateMoaRequest, Moa } from "../../types/moa";
import type { CreateSamplingToolRequest, SamplingTool } from "../../types/sampling-tool";
import type { CreateSpecRequest, Spec } from "../../types/spec";
import type { CreateSupplierRequest, Supplier } from "../../types/supplier";
import type { SamplingMethod } from "../../types/sampling";
import type {
  CreateVendorBusinessUnitRequest,
  VendorBusinessUnit
} from "../../types/vendor-business-unit";
import type { CreateVendorRequest, Vendor } from "../../types/vendor";

const onboardingSteps = [
  "Suppliers",
  "Vendors",
  "Vendor Business Units",
  "Materials",
  "Warehouse Locations",
  "GRN"
];

const masterDataGroups = [
  {
    title: "Partner Network",
    description: "Supplier, vendor, and vendor business unit records used for inward and procurement traceability.",
    accent: "bg-[#243041] text-white",
    links: [
      { href: "#partner-network", label: "Suppliers & Vendors" }
    ]
  },
  {
    title: "Material & Location",
    description: "Material rules and warehouse hierarchy that drive receipt, storage, and pallet placement.",
    accent: "bg-[#13a7b8] text-white",
    links: [
      { href: "#material-location", label: "Materials & Warehouse" }
    ]
  },
  {
    title: "QC References",
    description: "Specs, MoA, and sampling tools used by QC and future LIMS-style workflows.",
    accent: "bg-white text-ink border border-ink/10",
    links: [
      { href: "#qc-references", label: "Specs, MoA & Tools" }
    ]
  }
];

export type MasterDataSection =
  | "supplier"
  | "vendor"
  | "vendorBusinessUnit"
  | "material"
  | "warehouse"
  | "spec"
  | "moa"
  | "samplingTool";

type WarehouseFolder = "warehouse" | "room" | "rack" | "shelf" | "pallet";

const masterDataMenu = [
  { id: "supplier" as const, label: "Create Supplier", group: "Partner Network" },
  { id: "vendor" as const, label: "Vendor Details", group: "Partner Network" },
  { id: "material" as const, label: "Create Material", group: "Material & Location" },
  { id: "warehouse" as const, label: "Warehouse Details", group: "Material & Location" },
  { id: "spec" as const, label: "Spec Master", group: "QC References" },
  { id: "moa" as const, label: "MoA Master", group: "QC References" },
  { id: "samplingTool" as const, label: "Sampling Tool", group: "QC References" }
];

const warehouseFolders = [
  { id: "warehouse" as const, label: "Warehouse" },
  { id: "room" as const, label: "Room" },
  { id: "rack" as const, label: "Rack" },
  { id: "shelf" as const, label: "Shelf" },
  { id: "pallet" as const, label: "Pallet" }
];

function createInitialSupplierForm(currentUserName: string): CreateSupplierRequest {
  return {
    supplierCode: "",
    supplierName: "",
    contactPerson: "",
    email: "",
    phone: "",
    createdBy: currentUserName
  };
}

function createInitialVendorForm(currentUserName: string): CreateVendorRequest {
  return {
    vendorCode: "",
    vendorName: "",
    contactPerson: "",
    email: "",
    phone: "",
    createdBy: currentUserName
  };
}

function createInitialVendorBusinessUnitForm(currentUserName: string): CreateVendorBusinessUnitRequest {
  return {
    unitName: "",
    address: "",
    city: "",
    state: "",
    country: "",
    createdBy: currentUserName
  };
}

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

const materialTypes = ["CRITICAL", "NON_CRITICAL"] as const;
const specSamplingMethods: SamplingMethod[] = [
  "SQRT_N_PLUS_1",
  "HUNDRED_PERCENT",
  "COA_BASED_RELEASE"
];

function createInitialMaterialForm(currentUserName: string): CreateMaterialRequest {
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
    createdBy: currentUserName
  };
}

function createInitialWarehouseForm(currentUserName: string): CreateWarehouseRequest {
  return {
    warehouseCode: "",
    warehouseName: "",
    description: "",
    createdBy: currentUserName
  };
}

function createInitialRoomForm(currentUserName: string): CreateRoomRequest {
  return {
    roomCode: "",
    roomName: "",
    storageCondition: "AMBIENT",
    description: "",
    createdBy: currentUserName
  };
}

function createInitialRackForm(currentUserName: string): CreateRackRequest {
  return {
    rackCode: "",
    rackName: "",
    description: "",
    createdBy: currentUserName
  };
}

function createInitialShelfForm(currentUserName: string): CreateShelfRequest {
  return {
    shelfCode: "",
    shelfName: "",
    description: "",
    createdBy: currentUserName
  };
}

function createInitialPalletForm(currentUserName: string): CreatePalletRequest {
  return {
    palletCode: "",
    palletName: "",
    description: "",
    createdBy: currentUserName
  };
}

function createInitialSpecForm(currentUserName: string): CreateSpecRequest {
  return {
    specCode: "",
    specName: "",
    revision: "",
    samplingMethod: "SQRT_N_PLUS_1",
    referenceAttachment: "",
    createdBy: currentUserName
  };
}

function createInitialMoaForm(currentUserName: string): CreateMoaRequest {
  return {
    moaCode: "",
    moaName: "",
    revision: "",
    referenceAttachment: "",
    createdBy: currentUserName
  };
}

function createInitialSamplingToolForm(currentUserName: string): CreateSamplingToolRequest {
  return {
    toolCode: "",
    toolName: "",
    description: "",
    createdBy: currentUserName
  };
}

function yesNoClass(flag: boolean) {
  return flag ? "bg-moss/15 text-moss" : "bg-ink/5 text-slate";
}

function countWarehouseNodes(tree: WarehouseTreeNode[]) {
  let rooms = 0;
  let racks = 0;
  let shelves = 0;
  let pallets = 0;

  for (const warehouse of tree) {
    rooms += warehouse.rooms.length;
    for (const room of warehouse.rooms) {
      racks += room.racks.length;
      for (const rack of room.racks) {
        shelves += rack.shelves.length;
        for (const shelf of rack.shelves) {
          pallets += shelf.pallets.length;
        }
      }
    }
  }

  return { rooms, racks, shelves, pallets };
}

function formatStorageConditionLabel(condition: StorageCondition) {
  return condition.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatWarehouseTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

type MasterDataPageProps = {
  section?: MasterDataSection;
  showHeader?: boolean;
};

export function MasterDataPage({ section, showHeader = true }: MasterDataPageProps) {
  const currentUserName = useAppShellStore((state) => state.currentUser.name);
  const [selectedSection, setSelectedSection] = useState<MasterDataSection>(section ?? "supplier");
  const [selectedWarehouseFolder, setSelectedWarehouseFolder] = useState<WarehouseFolder>("warehouse");
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorBusinessUnits, setVendorBusinessUnits] = useState<VendorBusinessUnit[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseTree, setWarehouseTree] = useState<WarehouseTreeNode[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [racks, setRacks] = useState<Rack[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [moas, setMoas] = useState<Moa[]>([]);
  const [samplingTools, setSamplingTools] = useState<SamplingTool[]>([]);
  const [form, setForm] = useState<CreateSupplierRequest>(() => createInitialSupplierForm(currentUserName));
  const [vendorForm, setVendorForm] = useState<CreateVendorRequest>(() => createInitialVendorForm(currentUserName));
  const [vendorBusinessUnitForm, setVendorBusinessUnitForm] =
    useState<CreateVendorBusinessUnitRequest>(() => createInitialVendorBusinessUnitForm(currentUserName));
  const [materialForm, setMaterialForm] = useState<CreateMaterialRequest>(() => createInitialMaterialForm(currentUserName));
  const [warehouseForm, setWarehouseForm] = useState<CreateWarehouseRequest>(() => createInitialWarehouseForm(currentUserName));
  const [roomForm, setRoomForm] = useState<CreateRoomRequest>(() => createInitialRoomForm(currentUserName));
  const [rackForm, setRackForm] = useState<CreateRackRequest>(() => createInitialRackForm(currentUserName));
  const [shelfForm, setShelfForm] = useState<CreateShelfRequest>(() => createInitialShelfForm(currentUserName));
  const [palletForm, setPalletForm] = useState<CreatePalletRequest>(() => createInitialPalletForm(currentUserName));
  const [specForm, setSpecForm] = useState<CreateSpecRequest>(() => createInitialSpecForm(currentUserName));
  const [moaForm, setMoaForm] = useState<CreateMoaRequest>(() => createInitialMoaForm(currentUserName));
  const [samplingToolForm, setSamplingToolForm] = useState<CreateSamplingToolRequest>(() => createInitialSamplingToolForm(currentUserName));
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedRoomMaterialId, setSelectedRoomMaterialId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedRackId, setSelectedRackId] = useState("");
  const [selectedShelfId, setSelectedShelfId] = useState("");
  const [selectedWmsPalletId, setSelectedWmsPalletId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isVendorLoading, setIsVendorLoading] = useState(true);
  const [isVendorBusinessUnitLoading, setIsVendorBusinessUnitLoading] = useState(true);
  const [isMaterialLoading, setIsMaterialLoading] = useState(true);
  const [isWarehouseLoading, setIsWarehouseLoading] = useState(true);
  const [isRoomLoading, setIsRoomLoading] = useState(true);
  const [isRackLoading, setIsRackLoading] = useState(true);
  const [isShelfLoading, setIsShelfLoading] = useState(true);
  const [isPalletLoading, setIsPalletLoading] = useState(true);
  const [isSpecLoading, setIsSpecLoading] = useState(true);
  const [isMoaLoading, setIsMoaLoading] = useState(true);
  const [isSamplingToolLoading, setIsSamplingToolLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVendorSubmitting, setIsVendorSubmitting] = useState(false);
  const [isVendorBusinessUnitSubmitting, setIsVendorBusinessUnitSubmitting] = useState(false);
  const [isMaterialSubmitting, setIsMaterialSubmitting] = useState(false);
  const [isWarehouseSubmitting, setIsWarehouseSubmitting] = useState(false);
  const [isRoomSubmitting, setIsRoomSubmitting] = useState(false);
  const [isRackSubmitting, setIsRackSubmitting] = useState(false);
  const [isShelfSubmitting, setIsShelfSubmitting] = useState(false);
  const [isPalletSubmitting, setIsPalletSubmitting] = useState(false);
  const [isSpecSubmitting, setIsSpecSubmitting] = useState(false);
  const [isMoaSubmitting, setIsMoaSubmitting] = useState(false);
  const [isSamplingToolSubmitting, setIsSamplingToolSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vendorError, setVendorError] = useState<string | null>(null);
  const [vendorBusinessUnitError, setVendorBusinessUnitError] = useState<string | null>(null);
  const [materialError, setMaterialError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [rackError, setRackError] = useState<string | null>(null);
  const [shelfError, setShelfError] = useState<string | null>(null);
  const [palletError, setPalletError] = useState<string | null>(null);
  const [specError, setSpecError] = useState<string | null>(null);
  const [moaError, setMoaError] = useState<string | null>(null);
  const [samplingToolError, setSamplingToolError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [vendorSuccessMessage, setVendorSuccessMessage] = useState<string | null>(null);
  const [vendorBusinessUnitSuccessMessage, setVendorBusinessUnitSuccessMessage] = useState<string | null>(null);
  const [materialSuccessMessage, setMaterialSuccessMessage] = useState<string | null>(null);
  const [warehouseSuccessMessage, setWarehouseSuccessMessage] = useState<string | null>(null);
  const [roomSuccessMessage, setRoomSuccessMessage] = useState<string | null>(null);
  const [rackSuccessMessage, setRackSuccessMessage] = useState<string | null>(null);
  const [shelfSuccessMessage, setShelfSuccessMessage] = useState<string | null>(null);
  const [palletSuccessMessage, setPalletSuccessMessage] = useState<string | null>(null);
  const [specSuccessMessage, setSpecSuccessMessage] = useState<string | null>(null);
  const [moaSuccessMessage, setMoaSuccessMessage] = useState<string | null>(null);
  const [samplingToolSuccessMessage, setSamplingToolSuccessMessage] = useState<string | null>(null);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);
  const [editingVendorBusinessUnitId, setEditingVendorBusinessUnitId] = useState<string | null>(null);
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editingRackId, setEditingRackId] = useState<string | null>(null);
  const [editingShelfId, setEditingShelfId] = useState<string | null>(null);
  const [editingPalletId, setEditingPalletId] = useState<string | null>(null);
  const [editingSpecId, setEditingSpecId] = useState<string | null>(null);
  const [editingMoaId, setEditingMoaId] = useState<string | null>(null);
  const [editingSamplingToolId, setEditingSamplingToolId] = useState<string | null>(null);

  const filteredRooms = useMemo(
    () => rooms.filter((room) => !selectedWarehouseId || room.warehouseId === selectedWarehouseId),
    [rooms, selectedWarehouseId]
  );
  const filteredRacks = useMemo(
    () => racks.filter((rack) => !selectedRoomId || rack.roomId === selectedRoomId),
    [racks, selectedRoomId]
  );
  const filteredShelves = useMemo(
    () => shelves.filter((shelf) => !selectedRackId || shelf.rackId === selectedRackId),
    [shelves, selectedRackId]
  );
  const filteredPallets = useMemo(
    () => pallets.filter((pallet) => !selectedShelfId || pallet.shelfId === selectedShelfId),
    [pallets, selectedShelfId]
  );
  const warehouseTreeStats = useMemo(() => countWarehouseNodes(warehouseTree), [warehouseTree]);
  const warehouseById = useMemo(
    () => new Map(warehouses.map((warehouse) => [warehouse.id, warehouse])),
    [warehouses]
  );
  const roomById = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const rackById = useMemo(() => new Map(racks.map((rack) => [rack.id, rack])), [racks]);
  const shelfById = useMemo(() => new Map(shelves.map((shelf) => [shelf.id, shelf])), [shelves]);
  const palletById = useMemo(() => new Map(pallets.map((pallet) => [pallet.id, pallet])), [pallets]);
  const activeWarehouseNode = useMemo(
    () => warehouseTree.find((warehouseNode) => warehouseNode.id === selectedWarehouseId) ?? warehouseTree[0] ?? null,
    [selectedWarehouseId, warehouseTree]
  );
  const activeRoomNode = useMemo(
    () =>
      activeWarehouseNode?.rooms.find((roomNode) => roomNode.id === selectedRoomId) ??
      activeWarehouseNode?.rooms[0] ??
      null,
    [activeWarehouseNode, selectedRoomId]
  );
  const activeRackNode = useMemo(
    () =>
      activeRoomNode?.racks.find((rackNode) => rackNode.id === selectedRackId) ??
      activeRoomNode?.racks[0] ??
      null,
    [activeRoomNode, selectedRackId]
  );
  const activeShelfNode = useMemo(
    () =>
      activeRackNode?.shelves.find((shelfNode) => shelfNode.id === selectedShelfId) ??
      activeRackNode?.shelves[0] ??
      null,
    [activeRackNode, selectedShelfId]
  );
  const activePalletNode = useMemo(
    () =>
      activeShelfNode?.pallets.find((palletNode) => palletNode.id === selectedWmsPalletId) ??
      activeShelfNode?.pallets[0] ??
      null,
    [activeShelfNode, selectedWmsPalletId]
  );
  const activePallet = useMemo(
    () => (activePalletNode ? palletById.get(activePalletNode.id) ?? null : null),
    [activePalletNode, palletById]
  );
  const activeRoomStats = useMemo(() => {
    if (!activeRoomNode) {
      return { racks: 0, shelves: 0, pallets: 0 };
    }

    let shelfCount = 0;
    let palletCount = 0;
    for (const rackNode of activeRoomNode.racks) {
      shelfCount += rackNode.shelves.length;
      for (const shelfNode of rackNode.shelves) {
        palletCount += shelfNode.pallets.length;
      }
    }

    return {
      racks: activeRoomNode.racks.length,
      shelves: shelfCount,
      pallets: palletCount
    };
  }, [activeRoomNode]);

  async function refreshWarehouseTree() {
    const tree = await fetchWarehouseTree();
    setWarehouseTree(tree);
  }

  useEffect(() => {
    if (section) {
      setSelectedSection(section);
    }
  }, [section]);

  useEffect(() => {
    if (!selectedRoomMaterialId) {
      return;
    }

    const material = materials.find((entry) => entry.id === selectedRoomMaterialId);
    if (material) {
      setRoomForm((current) => ({ ...current, storageCondition: material.storageCondition }));
    }
  }, [materials, selectedRoomMaterialId]);

  useEffect(() => {
    let cancelled = false;

    async function loadSuppliers() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchSuppliers();
        if (!cancelled) {
          setSuppliers(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unknown error while loading suppliers";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSuppliers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSpecs() {
      setIsSpecLoading(true);
      setSpecError(null);
      try {
        const result = await fetchSpecs();
        if (!cancelled) {
          setSpecs(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSpecError(loadError instanceof Error ? loadError.message : "Unknown error while loading specs");
        }
      } finally {
        if (!cancelled) {
          setIsSpecLoading(false);
        }
      }
    }

    void loadSpecs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadMoas() {
      setIsMoaLoading(true);
      setMoaError(null);
      try {
        const result = await fetchMoas();
        if (!cancelled) {
          setMoas(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setMoaError(loadError instanceof Error ? loadError.message : "Unknown error while loading MoAs");
        }
      } finally {
        if (!cancelled) {
          setIsMoaLoading(false);
        }
      }
    }

    void loadMoas();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadSamplingTools() {
      setIsSamplingToolLoading(true);
      setSamplingToolError(null);
      try {
        const result = await fetchSamplingTools();
        if (!cancelled) {
          setSamplingTools(result);
        }
      } catch (loadError) {
        if (!cancelled) {
          setSamplingToolError(
            loadError instanceof Error ? loadError.message : "Unknown error while loading sampling tools"
          );
        }
      } finally {
        if (!cancelled) {
          setIsSamplingToolLoading(false);
        }
      }
    }

    void loadSamplingTools();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedRoomId && !filteredRooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId("");
      setSelectedRackId("");
      setSelectedShelfId("");
    }
  }, [filteredRooms, selectedRoomId]);

  useEffect(() => {
    if (selectedRackId && !filteredRacks.some((rack) => rack.id === selectedRackId)) {
      setSelectedRackId("");
      setSelectedShelfId("");
    }
  }, [filteredRacks, selectedRackId]);

  useEffect(() => {
    if (selectedShelfId && !filteredShelves.some((shelf) => shelf.id === selectedShelfId)) {
      setSelectedShelfId("");
    }
  }, [filteredShelves, selectedShelfId]);

  useEffect(() => {
    if (!selectedWarehouseId && warehouseTree[0]) {
      setSelectedWarehouseId(warehouseTree[0].id);
    }
  }, [selectedWarehouseId, warehouseTree]);

  useEffect(() => {
    if (activeWarehouseNode && (!selectedRoomId || !activeWarehouseNode.rooms.some((roomNode) => roomNode.id === selectedRoomId))) {
      setSelectedRoomId(activeWarehouseNode.rooms[0]?.id ?? "");
    }
  }, [activeWarehouseNode, selectedRoomId]);

  useEffect(() => {
    if (activeRoomNode && (!selectedRackId || !activeRoomNode.racks.some((rackNode) => rackNode.id === selectedRackId))) {
      setSelectedRackId(activeRoomNode.racks[0]?.id ?? "");
    }
  }, [activeRoomNode, selectedRackId]);

  useEffect(() => {
    if (activeRackNode && (!selectedShelfId || !activeRackNode.shelves.some((shelfNode) => shelfNode.id === selectedShelfId))) {
      setSelectedShelfId(activeRackNode.shelves[0]?.id ?? "");
    }
  }, [activeRackNode, selectedShelfId]);

  useEffect(() => {
    if (activeShelfNode && (!selectedWmsPalletId || !activeShelfNode.pallets.some((palletNode) => palletNode.id === selectedWmsPalletId))) {
      setSelectedWmsPalletId(activeShelfNode.pallets[0]?.id ?? "");
    }
  }, [activeShelfNode, selectedWmsPalletId]);

  useEffect(() => {
    let cancelled = false;

    async function loadMaterials() {
      setIsMaterialLoading(true);
      setMaterialError(null);

      try {
        const result = await fetchMaterials();
        if (!cancelled) {
          setMaterials(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading materials";
          setMaterialError(message);
        }
      } finally {
        if (!cancelled) {
          setIsMaterialLoading(false);
        }
      }
    }

    void loadMaterials();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWarehouses() {
      setIsWarehouseLoading(true);
      setWarehouseError(null);

      try {
        const [result, tree] = await Promise.all([fetchWarehouses(), fetchWarehouseTree()]);
        if (!cancelled) {
          setWarehouses(result.content);
          setWarehouseTree(tree);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading warehouses";
          setWarehouseError(message);
        }
      } finally {
        if (!cancelled) {
          setIsWarehouseLoading(false);
        }
      }
    }

    void loadWarehouses();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRooms() {
      setIsRoomLoading(true);
      setRoomError(null);

      try {
        const result = await fetchRooms();
        if (!cancelled) {
          setRooms(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading rooms";
          setRoomError(message);
        }
      } finally {
        if (!cancelled) {
          setIsRoomLoading(false);
        }
      }
    }

    void loadRooms();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadRacks() {
      setIsRackLoading(true);
      setRackError(null);

      try {
        const result = await fetchRacks();
        if (!cancelled) {
          setRacks(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading racks";
          setRackError(message);
        }
      } finally {
        if (!cancelled) {
          setIsRackLoading(false);
        }
      }
    }

    void loadRacks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadShelves() {
      setIsShelfLoading(true);
      setShelfError(null);

      try {
        const result = await fetchShelves();
        if (!cancelled) {
          setShelves(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading shelves";
          setShelfError(message);
        }
      } finally {
        if (!cancelled) {
          setIsShelfLoading(false);
        }
      }
    }

    void loadShelves();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPallets() {
      setIsPalletLoading(true);
      setPalletError(null);

      try {
        const result = await fetchPallets();
        if (!cancelled) {
          setPallets(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading pallets";
          setPalletError(message);
        }
      } finally {
        if (!cancelled) {
          setIsPalletLoading(false);
        }
      }
    }

    void loadPallets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVendors() {
      setIsVendorLoading(true);
      setVendorError(null);

      try {
        const result = await fetchVendors();
        if (!cancelled) {
          setVendors(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error ? loadError.message : "Unknown error while loading vendors";
          setVendorError(message);
        }
      } finally {
        if (!cancelled) {
          setIsVendorLoading(false);
        }
      }
    }

    void loadVendors();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadVendorBusinessUnits() {
      setIsVendorBusinessUnitLoading(true);
      setVendorBusinessUnitError(null);

      try {
        const result = await fetchVendorBusinessUnits();
        if (!cancelled) {
          setVendorBusinessUnits(result.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unknown error while loading vendor business units";
          setVendorBusinessUnitError(message);
        }
      } finally {
        if (!cancelled) {
          setIsVendorBusinessUnitLoading(false);
        }
      }
    }

    void loadVendorBusinessUnits();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const payload = {
        supplierCode: form.supplierCode.trim(),
        supplierName: form.supplierName.trim(),
        contactPerson: form.contactPerson?.trim() || undefined,
        email: form.email?.trim() || undefined,
        phone: form.phone?.trim() || undefined,
        createdBy: form.createdBy.trim()
      };
      const savedSupplier = editingSupplierId
        ? await updateSupplier(editingSupplierId, payload)
        : await createSupplier(payload);

      setSuppliers((current) =>
        editingSupplierId ? replaceById(current, savedSupplier) : [savedSupplier, ...current]
      );
      resetSupplierForm();
      setSuccessMessage(
        editingSupplierId
          ? `Supplier ${savedSupplier.supplierCode} updated successfully.`
          : `Supplier ${savedSupplier.supplierCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating supplier";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleVendorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVendorSubmitting(true);
    setVendorError(null);
    setVendorSuccessMessage(null);

    try {
      const payload = {
        vendorCode: vendorForm.vendorCode.trim(),
        vendorName: vendorForm.vendorName.trim(),
        contactPerson: vendorForm.contactPerson?.trim() || undefined,
        email: vendorForm.email?.trim() || undefined,
        phone: vendorForm.phone?.trim() || undefined,
        createdBy: vendorForm.createdBy.trim()
      };
      const savedVendor = editingVendorId
        ? await updateVendor(editingVendorId, payload)
        : await createVendor(payload);

      setVendors((current) =>
        editingVendorId ? replaceById(current, savedVendor) : [savedVendor, ...current]
      );
      resetVendorForm();
      setVendorSuccessMessage(
        editingVendorId
          ? `Vendor ${savedVendor.vendorCode} updated successfully.`
          : `Vendor ${savedVendor.vendorCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating vendor";
      setVendorError(message);
    } finally {
      setIsVendorSubmitting(false);
    }
  }

  async function handleVendorBusinessUnitSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsVendorBusinessUnitSubmitting(true);
    setVendorBusinessUnitError(null);
    setVendorBusinessUnitSuccessMessage(null);

    if (!selectedVendorId) {
      setVendorBusinessUnitError("Select a vendor before creating a vendor business unit.");
      setIsVendorBusinessUnitSubmitting(false);
      return;
    }

    try {
      const payload = {
        unitName: vendorBusinessUnitForm.unitName.trim(),
        address: vendorBusinessUnitForm.address?.trim() || undefined,
        city: vendorBusinessUnitForm.city?.trim() || undefined,
        state: vendorBusinessUnitForm.state?.trim() || undefined,
        country: vendorBusinessUnitForm.country?.trim() || undefined,
        createdBy: vendorBusinessUnitForm.createdBy.trim()
      };
      const savedUnit = editingVendorBusinessUnitId
        ? await updateVendorBusinessUnit(selectedVendorId, editingVendorBusinessUnitId, {
            unitName: payload.unitName,
            address: payload.address,
            city: payload.city,
            state: payload.state,
            country: payload.country,
            updatedBy: payload.createdBy
          })
        : await createVendorBusinessUnit(selectedVendorId, payload);

      setVendorBusinessUnits((current) =>
        editingVendorBusinessUnitId ? replaceById(current, savedUnit) : [savedUnit, ...current]
      );
      resetVendorBusinessUnitForm();
      setVendorBusinessUnitSuccessMessage(
        editingVendorBusinessUnitId
          ? `Business unit ${savedUnit.unitName} updated successfully.`
          : `Business unit ${savedUnit.unitName} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Unknown error while creating vendor business unit";
      setVendorBusinessUnitError(message);
    } finally {
      setIsVendorBusinessUnitSubmitting(false);
    }
  }

  async function handleMaterialSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMaterialSubmitting(true);
    setMaterialError(null);
    setMaterialSuccessMessage(null);

    try {
      const payload = {
        ...materialForm,
        materialCode: materialForm.materialCode.trim(),
        materialName: materialForm.materialName.trim(),
        materialType: materialForm.materialType.trim(),
        uom: materialForm.uom.trim(),
        description: materialForm.description?.trim() || undefined,
        createdBy: materialForm.createdBy.trim()
      };
      const savedMaterial = editingMaterialId
        ? await updateMaterial(editingMaterialId, payload)
        : await createMaterial(payload);
      setMaterials((current) =>
        editingMaterialId ? replaceById(current, savedMaterial) : [savedMaterial, ...current]
      );
      resetMaterialForm();
      setMaterialSuccessMessage(
        editingMaterialId
          ? `Material ${savedMaterial.materialCode} updated successfully.`
          : `Material ${savedMaterial.materialCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating material";
      setMaterialError(message);
    } finally {
      setIsMaterialSubmitting(false);
    }
  }

  async function handleWarehouseSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsWarehouseSubmitting(true);
    setWarehouseError(null);
    setWarehouseSuccessMessage(null);

    try {
      const payload = {
        warehouseCode: warehouseForm.warehouseCode.trim(),
        warehouseName: warehouseForm.warehouseName.trim(),
        description: warehouseForm.description?.trim() || undefined,
        createdBy: warehouseForm.createdBy.trim()
      };
      const savedWarehouse = editingWarehouseId
        ? await updateWarehouse(editingWarehouseId, payload)
        : await createWarehouse(payload);
      await refreshWarehouseTree();
      setWarehouses((current) =>
        editingWarehouseId ? replaceById(current, savedWarehouse) : [savedWarehouse, ...current]
      );
      setSelectedWarehouseId(savedWarehouse.id);
      resetWarehouseForm();
      setWarehouseSuccessMessage(
        editingWarehouseId
          ? `Warehouse ${savedWarehouse.warehouseCode} updated successfully.`
          : `Warehouse ${savedWarehouse.warehouseCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating warehouse";
      setWarehouseError(message);
    } finally {
      setIsWarehouseSubmitting(false);
    }
  }

  async function handleRoomSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRoomSubmitting(true);
    setRoomError(null);
    setRoomSuccessMessage(null);

    if (!selectedWarehouseId) {
      setRoomError("Select a warehouse before creating a room.");
      setIsRoomSubmitting(false);
      return;
    }

    try {
      const payload = {
        roomCode: roomForm.roomCode.trim(),
        roomName: roomForm.roomName.trim(),
        storageCondition: roomForm.storageCondition,
        description: roomForm.description?.trim() || undefined,
        createdBy: roomForm.createdBy.trim()
      };
      const savedRoom = editingRoomId
        ? await updateRoom(selectedWarehouseId, editingRoomId, payload)
        : await createRoom(selectedWarehouseId, payload);
      await refreshWarehouseTree();
      setRooms((current) => (editingRoomId ? replaceById(current, savedRoom) : [savedRoom, ...current]));
      setSelectedRoomId(savedRoom.id);
      resetRoomForm();
      setRoomSuccessMessage(
        editingRoomId
          ? `Room ${savedRoom.roomCode} updated successfully.`
          : `Room ${savedRoom.roomCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating room";
      setRoomError(message);
    } finally {
      setIsRoomSubmitting(false);
    }
  }

  async function handleRackSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsRackSubmitting(true);
    setRackError(null);
    setRackSuccessMessage(null);

    if (!selectedRoomId) {
      setRackError("Select a room before creating a rack.");
      setIsRackSubmitting(false);
      return;
    }

    try {
      const payload = {
        rackCode: rackForm.rackCode.trim(),
        rackName: rackForm.rackName.trim(),
        description: rackForm.description?.trim() || undefined,
        createdBy: rackForm.createdBy.trim()
      };
      const savedRack = editingRackId
        ? await updateRack(selectedRoomId, editingRackId, payload)
        : await createRack(selectedRoomId, payload);
      await refreshWarehouseTree();
      setRacks((current) => (editingRackId ? replaceById(current, savedRack) : [savedRack, ...current]));
      setSelectedRackId(savedRack.id);
      resetRackForm();
      setRackSuccessMessage(
        editingRackId
          ? `Rack ${savedRack.rackCode} updated successfully.`
          : `Rack ${savedRack.rackCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating rack";
      setRackError(message);
    } finally {
      setIsRackSubmitting(false);
    }
  }

  async function handleShelfSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsShelfSubmitting(true);
    setShelfError(null);
    setShelfSuccessMessage(null);

    if (!selectedRackId) {
      setShelfError("Select a rack before creating a shelf.");
      setIsShelfSubmitting(false);
      return;
    }

    try {
      const payload = {
        shelfCode: shelfForm.shelfCode.trim(),
        shelfName: shelfForm.shelfName.trim(),
        description: shelfForm.description?.trim() || undefined,
        createdBy: shelfForm.createdBy.trim()
      };
      const savedShelf = editingShelfId
        ? await updateShelf(selectedRackId, editingShelfId, payload)
        : await createShelf(selectedRackId, payload);
      await refreshWarehouseTree();
      setShelves((current) =>
        editingShelfId ? replaceById(current, savedShelf) : [savedShelf, ...current]
      );
      setSelectedShelfId(savedShelf.id);
      resetShelfForm();
      setShelfSuccessMessage(
        editingShelfId
          ? `Shelf ${savedShelf.shelfCode} updated successfully.`
          : `Shelf ${savedShelf.shelfCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating shelf";
      setShelfError(message);
    } finally {
      setIsShelfSubmitting(false);
    }
  }

  async function handlePalletSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsPalletSubmitting(true);
    setPalletError(null);
    setPalletSuccessMessage(null);

    if (!selectedShelfId) {
      setPalletError("Select a shelf before creating a pallet.");
      setIsPalletSubmitting(false);
      return;
    }

    try {
      const payload = {
        palletCode: palletForm.palletCode.trim(),
        palletName: palletForm.palletName.trim(),
        description: palletForm.description?.trim() || undefined,
        createdBy: palletForm.createdBy.trim()
      };
      const savedPallet = editingPalletId
        ? await updatePallet(selectedShelfId, editingPalletId, payload)
        : await createPallet(selectedShelfId, payload);
      await refreshWarehouseTree();
      setPallets((current) =>
        editingPalletId ? replaceById(current, savedPallet) : [savedPallet, ...current]
      );
      resetPalletForm();
      setPalletSuccessMessage(
        editingPalletId
          ? `Pallet ${savedPallet.palletCode} updated successfully.`
          : `Pallet ${savedPallet.palletCode} created successfully.`
      );
    } catch (submitError) {
      const message =
        submitError instanceof Error ? submitError.message : "Unknown error while creating pallet";
      setPalletError(message);
    } finally {
      setIsPalletSubmitting(false);
    }
  }

  async function handleSpecSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSpecSubmitting(true);
    setSpecError(null);
    setSpecSuccessMessage(null);
    try {
      const payload = {
        ...specForm,
        specCode: specForm.specCode.trim(),
        specName: specForm.specName.trim(),
        revision: specForm.revision?.trim() || undefined,
        referenceAttachment: specForm.referenceAttachment?.trim() || undefined,
        createdBy: specForm.createdBy.trim()
      };
      const savedSpec = editingSpecId ? await updateSpec(editingSpecId, payload) : await createSpec(payload);
      setSpecs((current) => (editingSpecId ? replaceById(current, savedSpec) : [savedSpec, ...current]));
      resetSpecForm();
      setSpecSuccessMessage(
        editingSpecId
          ? `Spec ${savedSpec.specCode} updated successfully.`
          : `Spec ${savedSpec.specCode} created successfully.`
      );
    } catch (submitError) {
      setSpecError(submitError instanceof Error ? submitError.message : "Unknown error while creating spec");
    } finally {
      setIsSpecSubmitting(false);
    }
  }

  async function handleMoaSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsMoaSubmitting(true);
    setMoaError(null);
    setMoaSuccessMessage(null);
    try {
      const payload = {
        ...moaForm,
        moaCode: moaForm.moaCode.trim(),
        moaName: moaForm.moaName.trim(),
        revision: moaForm.revision?.trim() || undefined,
        referenceAttachment: moaForm.referenceAttachment?.trim() || undefined,
        createdBy: moaForm.createdBy.trim()
      };
      const savedMoa = editingMoaId ? await updateMoa(editingMoaId, payload) : await createMoa(payload);
      setMoas((current) => (editingMoaId ? replaceById(current, savedMoa) : [savedMoa, ...current]));
      resetMoaForm();
      setMoaSuccessMessage(
        editingMoaId
          ? `MoA ${savedMoa.moaCode} updated successfully.`
          : `MoA ${savedMoa.moaCode} created successfully.`
      );
    } catch (submitError) {
      setMoaError(submitError instanceof Error ? submitError.message : "Unknown error while creating MoA");
    } finally {
      setIsMoaSubmitting(false);
    }
  }

  async function handleSamplingToolSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSamplingToolSubmitting(true);
    setSamplingToolError(null);
    setSamplingToolSuccessMessage(null);
    try {
      const payload = {
        ...samplingToolForm,
        toolCode: samplingToolForm.toolCode.trim(),
        toolName: samplingToolForm.toolName.trim(),
        description: samplingToolForm.description?.trim() || undefined,
        createdBy: samplingToolForm.createdBy.trim()
      };
      const savedTool = editingSamplingToolId
        ? await updateSamplingTool(editingSamplingToolId, payload)
        : await createSamplingTool(payload);
      setSamplingTools((current) =>
        editingSamplingToolId ? replaceById(current, savedTool) : [savedTool, ...current]
      );
      resetSamplingToolForm();
      setSamplingToolSuccessMessage(
        editingSamplingToolId
          ? `Sampling tool ${savedTool.toolCode} updated successfully.`
          : `Sampling tool ${savedTool.toolCode} created successfully.`
      );
    } catch (submitError) {
      setSamplingToolError(
        submitError instanceof Error ? submitError.message : "Unknown error while creating sampling tool"
      );
    } finally {
      setIsSamplingToolSubmitting(false);
    }
  }

  function startEditingSupplier(supplier: Supplier) {
    setSelectedSection("supplier");
    setIsRegistryOpen(false);
    setEditingSupplierId(supplier.id);
    setForm({
      supplierCode: supplier.supplierCode,
      supplierName: supplier.supplierName,
      contactPerson: supplier.contactPerson ?? "",
      email: supplier.email ?? "",
      phone: supplier.phone ?? "",
      createdBy: supplier.updatedBy ?? supplier.createdBy ?? currentUserName
    });
    setSuccessMessage(null);
    setError(null);
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    if (!confirmDelete(`supplier ${supplier.supplierCode}`)) {
      return;
    }
    try {
      await deleteSupplier(supplier.id);
      setSuppliers((current) => current.filter((entry) => entry.id !== supplier.id));
      if (editingSupplierId === supplier.id) {
        resetSupplierForm();
      }
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting supplier");
    }
  }

  function startEditingVendor(vendor: Vendor) {
    setSelectedSection("vendor");
    setIsRegistryOpen(false);
    setEditingVendorId(vendor.id);
    setVendorForm({
      vendorCode: vendor.vendorCode,
      vendorName: vendor.vendorName,
      contactPerson: vendor.contactPerson ?? "",
      email: vendor.email ?? "",
      phone: vendor.phone ?? "",
      createdBy: vendor.updatedBy ?? vendor.createdBy ?? currentUserName
    });
    setVendorSuccessMessage(null);
    setVendorError(null);
  }

  async function handleDeleteVendor(vendor: Vendor) {
    if (!confirmDelete(`vendor ${vendor.vendorCode}`)) {
      return;
    }
    try {
      await deleteVendor(vendor.id);
      setVendors((current) => current.filter((entry) => entry.id !== vendor.id));
      if (editingVendorId === vendor.id) {
        resetVendorForm();
      }
    } catch (deleteError) {
      setVendorError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting vendor");
    }
  }

  function startEditingVendorBusinessUnit(unit: VendorBusinessUnit) {
    setSelectedSection("vendor");
    setIsRegistryOpen(false);
    setSelectedVendorId(unit.vendorId);
    setEditingVendorBusinessUnitId(unit.id);
    setVendorBusinessUnitForm({
      unitName: unit.unitName,
      address: unit.address ?? "",
      city: unit.city ?? "",
      state: unit.state ?? "",
      country: unit.country ?? "",
      createdBy: unit.updatedBy ?? unit.createdBy ?? currentUserName
    });
    setVendorBusinessUnitSuccessMessage(null);
    setVendorBusinessUnitError(null);
  }

  async function handleDeleteVendorBusinessUnit(unit: VendorBusinessUnit) {
    if (!confirmDelete(`business unit ${unit.unitName}`)) {
      return;
    }
    try {
      await deleteVendorBusinessUnit(unit.id);
      setVendorBusinessUnits((current) => current.filter((entry) => entry.id !== unit.id));
      if (editingVendorBusinessUnitId === unit.id) {
        resetVendorBusinessUnitForm();
      }
    } catch (deleteError) {
      setVendorBusinessUnitError(
        deleteError instanceof Error ? deleteError.message : "Unknown error while deleting vendor business unit"
      );
    }
  }

  function startEditingMaterial(material: Material) {
    setSelectedSection("material");
    setIsRegistryOpen(false);
    setEditingMaterialId(material.id);
    setMaterialForm({
      materialCode: material.materialCode,
      materialName: material.materialName,
      materialCategory: material.materialCategory ?? undefined,
      genericNames: material.genericNames ?? "",
      materialType: material.materialType,
      uom: material.uom,
      specId: material.specId ?? "",
      hsnCode: material.hsnCode ?? "",
      casNumber: material.casNumber ?? "",
      pharmacopoeialRef: material.pharmacopoeialRef ?? "",
      storageCondition: material.storageCondition,
      maxHumidity: material.maxHumidity ?? "",
      lightSensitivity: material.lightSensitivity ?? undefined,
      hygroscopic: material.hygroscopic,
      shelfLifeMonths: material.shelfLifeMonths ?? undefined,
      retestPeriodMonths: material.retestPeriodMonths ?? undefined,
      reorderLevel: material.reorderLevel ?? "",
      leadTimeDays: material.leadTimeDays ?? undefined,
      controlledSubstance: material.controlledSubstance,
      photosensitive: material.photosensitive,
      hazardous: material.hazardous,
      selectiveMaterial: material.selectiveMaterial,
      vendorCoaReleaseAllowed: material.vendorCoaReleaseAllowed,
      samplingRequired: material.samplingRequired,
      description: material.description ?? "",
      createdBy: material.updatedBy ?? material.createdBy ?? currentUserName
    });
    setMaterialSuccessMessage(null);
    setMaterialError(null);
  }

  async function handleDeleteMaterial(material: Material) {
    if (!confirmDelete(`material ${material.materialCode}`)) {
      return;
    }
    try {
      await deleteMaterial(material.id);
      setMaterials((current) => current.filter((entry) => entry.id !== material.id));
      if (editingMaterialId === material.id) {
        resetMaterialForm();
      }
    } catch (deleteError) {
      setMaterialError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting material");
    }
  }

  function startEditingWarehouse(warehouse: Warehouse) {
    setSelectedSection("warehouse");
    setSelectedWarehouseFolder("warehouse");
    setIsRegistryOpen(false);
    setEditingWarehouseId(warehouse.id);
    setWarehouseForm({
      warehouseCode: warehouse.warehouseCode,
      warehouseName: warehouse.warehouseName,
      description: warehouse.description ?? "",
      createdBy: warehouse.updatedBy ?? warehouse.createdBy ?? currentUserName
    });
    setWarehouseSuccessMessage(null);
    setWarehouseError(null);
  }

  async function handleDeleteWarehouse(warehouse: Warehouse) {
    if (!confirmDelete(`warehouse ${warehouse.warehouseCode}`)) {
      return;
    }
    try {
      await deleteWarehouse(warehouse.id);
      await refreshWarehouseTree();
      setWarehouses((current) => current.filter((entry) => entry.id !== warehouse.id));
      if (editingWarehouseId === warehouse.id) {
        resetWarehouseForm();
      }
    } catch (deleteError) {
      setWarehouseError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting warehouse");
    }
  }

  function startEditingRoom(room: Room) {
    setSelectedSection("warehouse");
    setSelectedWarehouseFolder("room");
    setIsRegistryOpen(false);
    setSelectedWarehouseId(room.warehouseId);
    setEditingRoomId(room.id);
    setRoomForm({
      roomCode: room.roomCode,
      roomName: room.roomName,
      storageCondition: room.storageCondition,
      description: room.description ?? "",
      createdBy: room.updatedBy ?? room.createdBy ?? currentUserName
    });
    setRoomSuccessMessage(null);
    setRoomError(null);
  }

  async function handleDeleteRoom(room: Room) {
    if (!confirmDelete(`room ${room.roomCode}`)) {
      return;
    }
    try {
      await deleteRoom(room.id);
      await refreshWarehouseTree();
      setRooms((current) => current.filter((entry) => entry.id !== room.id));
      if (editingRoomId === room.id) {
        resetRoomForm();
      }
    } catch (deleteError) {
      setRoomError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting room");
    }
  }

  function startEditingRack(rack: Rack) {
    setSelectedSection("warehouse");
    setSelectedWarehouseFolder("rack");
    setIsRegistryOpen(false);
    setSelectedRoomId(rack.roomId);
    setEditingRackId(rack.id);
    setRackForm({
      rackCode: rack.rackCode,
      rackName: rack.rackName,
      description: rack.description ?? "",
      createdBy: rack.updatedBy ?? rack.createdBy ?? currentUserName
    });
    setRackSuccessMessage(null);
    setRackError(null);
  }

  async function handleDeleteRack(rack: Rack) {
    if (!confirmDelete(`rack ${rack.rackCode}`)) {
      return;
    }
    try {
      await deleteRack(rack.id);
      await refreshWarehouseTree();
      setRacks((current) => current.filter((entry) => entry.id !== rack.id));
      if (editingRackId === rack.id) {
        resetRackForm();
      }
    } catch (deleteError) {
      setRackError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting rack");
    }
  }

  function startEditingShelf(shelf: Shelf) {
    setSelectedSection("warehouse");
    setSelectedWarehouseFolder("shelf");
    setIsRegistryOpen(false);
    setSelectedRackId(shelf.rackId);
    setEditingShelfId(shelf.id);
    setShelfForm({
      shelfCode: shelf.shelfCode,
      shelfName: shelf.shelfName,
      description: shelf.description ?? "",
      createdBy: shelf.updatedBy ?? shelf.createdBy ?? currentUserName
    });
    setShelfSuccessMessage(null);
    setShelfError(null);
  }

  async function handleDeleteShelf(shelf: Shelf) {
    if (!confirmDelete(`shelf ${shelf.shelfCode}`)) {
      return;
    }
    try {
      await deleteShelf(shelf.id);
      await refreshWarehouseTree();
      setShelves((current) => current.filter((entry) => entry.id !== shelf.id));
      if (editingShelfId === shelf.id) {
        resetShelfForm();
      }
    } catch (deleteError) {
      setShelfError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting shelf");
    }
  }

  function startEditingPallet(pallet: Pallet) {
    setSelectedSection("warehouse");
    setSelectedWarehouseFolder("pallet");
    setIsRegistryOpen(false);
    setSelectedShelfId(pallet.shelfId);
    setEditingPalletId(pallet.id);
    setPalletForm({
      palletCode: pallet.palletCode,
      palletName: pallet.palletName,
      description: pallet.description ?? "",
      createdBy: pallet.updatedBy ?? pallet.createdBy ?? currentUserName
    });
    setPalletSuccessMessage(null);
    setPalletError(null);
  }

  async function handleDeletePallet(pallet: Pallet) {
    if (!confirmDelete(`pallet ${pallet.palletCode}`)) {
      return;
    }
    try {
      await deletePallet(pallet.id);
      await refreshWarehouseTree();
      setPallets((current) => current.filter((entry) => entry.id !== pallet.id));
      if (editingPalletId === pallet.id) {
        resetPalletForm();
      }
    } catch (deleteError) {
      setPalletError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting pallet");
    }
  }

  function startEditingSpec(spec: Spec) {
    setSelectedSection("spec");
    setIsRegistryOpen(false);
    setEditingSpecId(spec.id);
    setSpecForm({
      specCode: spec.specCode,
      specName: spec.specName,
      revision: spec.revision ?? "",
      samplingMethod: spec.samplingMethod,
      referenceAttachment: spec.referenceAttachment ?? "",
      createdBy: spec.updatedBy ?? spec.createdBy ?? currentUserName
    });
    setSpecSuccessMessage(null);
    setSpecError(null);
  }

  async function handleDeleteSpec(spec: Spec) {
    if (!confirmDelete(`spec ${spec.specCode}`)) {
      return;
    }
    try {
      await deleteSpec(spec.id);
      setSpecs((current) => current.filter((entry) => entry.id !== spec.id));
      if (editingSpecId === spec.id) {
        resetSpecForm();
      }
    } catch (deleteError) {
      setSpecError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting spec");
    }
  }

  function startEditingMoa(moa: Moa) {
    setSelectedSection("moa");
    setIsRegistryOpen(false);
    setEditingMoaId(moa.id);
    setMoaForm({
      moaCode: moa.moaCode,
      moaName: moa.moaName,
      revision: moa.revision ?? "",
      referenceAttachment: moa.referenceAttachment ?? "",
      createdBy: moa.updatedBy ?? moa.createdBy ?? currentUserName
    });
    setMoaSuccessMessage(null);
    setMoaError(null);
  }

  async function handleDeleteMoaRecord(moa: Moa) {
    if (!confirmDelete(`MoA ${moa.moaCode}`)) {
      return;
    }
    try {
      await deleteMoa(moa.id);
      setMoas((current) => current.filter((entry) => entry.id !== moa.id));
      if (editingMoaId === moa.id) {
        resetMoaForm();
      }
    } catch (deleteError) {
      setMoaError(deleteError instanceof Error ? deleteError.message : "Unknown error while deleting MoA");
    }
  }

  function startEditingSamplingTool(tool: SamplingTool) {
    setSelectedSection("samplingTool");
    setIsRegistryOpen(false);
    setEditingSamplingToolId(tool.id);
    setSamplingToolForm({
      toolCode: tool.toolCode,
      toolName: tool.toolName,
      description: tool.description ?? "",
      createdBy: tool.updatedBy ?? tool.createdBy ?? currentUserName
    });
    setSamplingToolSuccessMessage(null);
    setSamplingToolError(null);
  }

  async function handleDeleteSamplingToolRecord(tool: SamplingTool) {
    if (!confirmDelete(`sampling tool ${tool.toolCode}`)) {
      return;
    }
    try {
      await deleteSamplingTool(tool.id);
      setSamplingTools((current) => current.filter((entry) => entry.id !== tool.id));
      if (editingSamplingToolId === tool.id) {
        resetSamplingToolForm();
      }
    } catch (deleteError) {
      setSamplingToolError(
        deleteError instanceof Error ? deleteError.message : "Unknown error while deleting sampling tool"
      );
    }
  }

  function registryTitle() {
    switch (selectedSection) {
      case "supplier":
        return "Suppliers";
      case "vendor":
        return "Vendor Details";
      case "vendorBusinessUnit":
        return "Vendor Business Units";
      case "material":
        return "Materials";
      case "warehouse":
        return "Warehouse Details";
      case "spec":
        return "Specs";
      case "moa":
        return "MoAs";
      case "samplingTool":
        return "Sampling Tools";
      default:
        return "Registry";
    }
  }

  function replaceById<T extends { id: string }>(items: T[], nextItem: T) {
    return items.map((item) => (item.id === nextItem.id ? nextItem : item));
  }

  function confirmDelete(label: string) {
    return window.confirm(`Delete ${label}?`);
  }

  function resetSupplierForm() {
    setForm(createInitialSupplierForm(currentUserName));
    setEditingSupplierId(null);
  }

  function resetVendorForm() {
    setVendorForm(createInitialVendorForm(currentUserName));
    setEditingVendorId(null);
  }

  function resetVendorBusinessUnitForm() {
    setVendorBusinessUnitForm(createInitialVendorBusinessUnitForm(currentUserName));
    setEditingVendorBusinessUnitId(null);
  }

  function resetMaterialForm() {
    setMaterialForm(createInitialMaterialForm(currentUserName));
    setEditingMaterialId(null);
  }

  function resetWarehouseForm() {
    setWarehouseForm(createInitialWarehouseForm(currentUserName));
    setEditingWarehouseId(null);
  }

  function resetRoomForm() {
    setRoomForm(createInitialRoomForm(currentUserName));
    setEditingRoomId(null);
    setSelectedRoomMaterialId("");
  }

  function resetRackForm() {
    setRackForm(createInitialRackForm(currentUserName));
    setEditingRackId(null);
  }

  function resetShelfForm() {
    setShelfForm(createInitialShelfForm(currentUserName));
    setEditingShelfId(null);
  }

  function resetPalletForm() {
    setPalletForm(createInitialPalletForm(currentUserName));
    setEditingPalletId(null);
  }

  function resetSpecForm() {
    setSpecForm(createInitialSpecForm(currentUserName));
    setEditingSpecId(null);
  }

  function resetMoaForm() {
    setMoaForm(createInitialMoaForm(currentUserName));
    setEditingMoaId(null);
  }

  function resetSamplingToolForm() {
    setSamplingToolForm(createInitialSamplingToolForm(currentUserName));
    setEditingSamplingToolId(null);
  }

  return (
    <div className="space-y-6">
      {showHeader ? (
        <SectionHeader
          eyebrow="Master Data"
          title="Reference entities drive every transaction downstream"
          description="The first backend entry point is setup, not GRN. This screen starts that flow with suppliers, while making the dependency order visible to the user."
        />
      ) : null}

      <section className="panel px-6 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.26em] text-steel">Master Data Workflow</p>
            <h4 className="mt-3 text-2xl font-semibold text-ink">Select a master and proceed</h4>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
              Choose a master from the dropdown, complete the creation form, and use the view link only when you want to inspect existing records.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-[260px_auto] md:items-end">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Master data module</span>
              <select
                value={selectedSection}
                onChange={(event) => setSelectedSection(event.target.value as MasterDataSection)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel"
              >
                {masterDataGroups.map((group) => (
                  <optgroup key={group.title} label={group.title}>
                    {masterDataMenu
                      .filter((item) => item.group === group.title)
                      .map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.label}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setIsRegistryOpen(true)}
              className="rounded-2xl border border-ink/10 bg-[#f3f6f8] px-4 py-3 text-sm font-medium text-ink"
            >
              View {registryTitle()}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[22px] bg-[#f3f6f8] px-4 py-4 text-sm text-slate">
          Onboarding: {onboardingSteps.join(" -> ")}
        </div>
      </section>

      <div className="space-y-6">

      {selectedSection === "supplier" ? (
      <section>
        <article className="panel px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">
              First data entry screen
            </p>
            <h4 className="mt-2 text-xl font-semibold text-ink">
              {editingSupplierId ? "Edit supplier" : "Create supplier"}
            </h4>
            <p className="mt-2 text-sm text-slate">
              Suppliers are one of the earliest dependencies for GRN creation, so this is the first live form.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Supplier code</span>
              <input
                required
                value={form.supplierCode}
                onChange={(event) =>
                  setForm((current) => ({ ...current, supplierCode: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="SUP-001"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Supplier name</span>
              <input
                required
                value={form.supplierName}
                onChange={(event) =>
                  setForm((current) => ({ ...current, supplierName: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Acme Chemicals"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Contact person</span>
              <input
                value={form.contactPerson}
                onChange={(event) =>
                  setForm((current) => ({ ...current, contactPerson: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Ravi Kumar"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="supplier@acme.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Phone</span>
                <input
                  value={form.phone}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="9876543210"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">
                {editingSupplierId ? "Updated by" : "Created by"}
              </span>
              <input
                required
                value={form.createdBy}
                onChange={(event) =>
                  setForm((current) => ({ ...current, createdBy: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder={currentUserName}
              />
            </label>

            {successMessage ? (
              <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                {error}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/50"
              >
                {isSubmitting
                  ? editingSupplierId
                    ? "Updating supplier..."
                    : "Creating supplier..."
                  : editingSupplierId
                    ? "Update supplier"
                    : "Create supplier"}
              </button>
              {editingSupplierId ? (
                <button
                  type="button"
                  onClick={resetSupplierForm}
                  className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
      ) : null}

      {selectedSection === "vendor" || selectedSection === "vendorBusinessUnit" ? (
      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <article className="panel px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">
              Step 2
            </p>
            <h4 className="mt-2 text-xl font-semibold text-ink">
              {editingVendorId ? "Edit vendor" : "Create vendor"}
            </h4>
            <p className="mt-2 text-sm text-slate">
              Vendor is mandatory in GRN. Business units are optional, but when used they always belong to a vendor.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleVendorSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Vendor code</span>
              <input
                required
                value={vendorForm.vendorCode}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, vendorCode: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="VEN-001"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Vendor name</span>
              <input
                required
                value={vendorForm.vendorName}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, vendorName: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Acme Procurement"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Contact person</span>
              <input
                value={vendorForm.contactPerson}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, contactPerson: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Sonia"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Email</span>
                <input
                  type="email"
                  value={vendorForm.email}
                  onChange={(event) =>
                    setVendorForm((current) => ({ ...current, email: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="vendor@acme.com"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Phone</span>
                <input
                  value={vendorForm.phone}
                  onChange={(event) =>
                    setVendorForm((current) => ({ ...current, phone: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="9988776655"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">
                {editingVendorId ? "Updated by" : "Created by"}
              </span>
              <input
                required
                value={vendorForm.createdBy}
                onChange={(event) =>
                  setVendorForm((current) => ({ ...current, createdBy: event.target.value }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder={currentUserName}
              />
            </label>

            {vendorSuccessMessage ? (
              <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                {vendorSuccessMessage}
              </div>
            ) : null}

            {vendorError ? (
              <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                {vendorError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isVendorSubmitting}
                className="rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-steel/50"
              >
                {isVendorSubmitting
                  ? editingVendorId
                    ? "Updating vendor..."
                    : "Creating vendor..."
                  : editingVendorId
                    ? "Update vendor"
                    : "Create vendor"}
              </button>
              {editingVendorId ? (
                <button
                  type="button"
                  onClick={resetVendorForm}
                  className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </article>
        <article className="panel px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">
              Optional linked setup
            </p>
            <h4 className="mt-2 text-xl font-semibold text-ink">
              {editingVendorBusinessUnitId ? "Edit vendor business unit" : "Create vendor business unit"}
            </h4>
            <p className="mt-2 text-sm text-slate">
              Use this only when a vendor needs multiple operating units. Every business unit is linked to one vendor.
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleVendorBusinessUnitSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Vendor</span>
              <select
                required
                value={selectedVendorId}
                onChange={(event) => setSelectedVendorId(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
              >
                <option value="">Select vendor</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendorCode} - {vendor.vendorName}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Unit name</span>
              <input
                required
                value={vendorBusinessUnitForm.unitName}
                onChange={(event) =>
                  setVendorBusinessUnitForm((current) => ({
                    ...current,
                    unitName: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Hyderabad Unit"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">Address</span>
              <textarea
                value={vendorBusinessUnitForm.address}
                onChange={(event) =>
                  setVendorBusinessUnitForm((current) => ({
                    ...current,
                    address: event.target.value
                  }))
                }
                className="min-h-28 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder="Plot 42, Industrial Zone"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">City</span>
                <input
                  value={vendorBusinessUnitForm.city}
                  onChange={(event) =>
                    setVendorBusinessUnitForm((current) => ({ ...current, city: event.target.value }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="Hyderabad"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">State</span>
                <input
                  value={vendorBusinessUnitForm.state}
                  onChange={(event) =>
                    setVendorBusinessUnitForm((current) => ({
                      ...current,
                      state: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="Telangana"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-ink">Country</span>
                <input
                  value={vendorBusinessUnitForm.country}
                  onChange={(event) =>
                    setVendorBusinessUnitForm((current) => ({
                      ...current,
                      country: event.target.value
                    }))
                  }
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                  placeholder="India"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">
                {editingVendorBusinessUnitId ? "Updated by" : "Created by"}
              </span>
              <input
                required
                value={vendorBusinessUnitForm.createdBy}
                onChange={(event) =>
                  setVendorBusinessUnitForm((current) => ({
                    ...current,
                    createdBy: event.target.value
                  }))
                }
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel"
                placeholder={currentUserName}
              />
            </label>

            {vendorBusinessUnitSuccessMessage ? (
              <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">
                {vendorBusinessUnitSuccessMessage}
              </div>
            ) : null}

            {vendorBusinessUnitError ? (
              <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">
                {vendorBusinessUnitError}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={isVendorBusinessUnitSubmitting || vendors.length === 0}
                className="rounded-2xl bg-teal px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-teal/50"
              >
                {isVendorBusinessUnitSubmitting
                  ? editingVendorBusinessUnitId
                    ? "Updating business unit..."
                    : "Creating business unit..."
                  : editingVendorBusinessUnitId
                    ? "Update vendor business unit"
                    : "Create vendor business unit"}
              </button>
              {editingVendorBusinessUnitId ? (
                <button
                  type="button"
                  onClick={resetVendorBusinessUnitForm}
                  className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>
          </form>
        </article>
      </section>
      ) : null}

      {selectedSection === "material" ? (
      <>
      <section id="material-location" className="panel px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-steel">Material & Location</p>
        <h4 className="mt-3 text-2xl font-semibold text-ink">Material definition and warehouse structure</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
          Material controls and warehouse hierarchy should stay adjacent because receipt, storage condition, pallet assignment, and sampling eligibility all depend on them together.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <article className="panel px-6 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Step 4</p>
            <h4 className="mt-2 text-xl font-semibold text-ink">
              {editingMaterialId ? "Edit material" : "Create material"}
            </h4>
            <p className="mt-2 text-sm text-slate">
              Material rules drive storage validation, sampling, and release logic downstream.
            </p>
          </div>
          <form className="mt-6 space-y-6" onSubmit={handleMaterialSubmit}>
            {/* Basic Information */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel">Basic Information</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material name <span className="text-redoxide">*</span></span>
                  <input required value={materialForm.materialName} onChange={(event) => setMaterialForm((current) => ({ ...current, materialName: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. Paracetamol" />
                  <span className="mt-1 block text-xs text-slate">Use the INN / IUPAC name. Avoid brand names.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Generic / other names</span>
                  <input value={materialForm.genericNames ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, genericNames: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. Acetaminophen, 4-Acetamidophenol" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material category <span className="text-redoxide">*</span></span>
                  <select value={materialForm.materialCategory ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, materialCategory: event.target.value as MaterialCategory || undefined }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    <option value="">— Select category —</option>
                    {materialCategories.map((cat) => <option key={cat} value={cat}>{materialCategoryLabels[cat]}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material type <span className="text-redoxide">*</span></span>
                  <select value={materialForm.materialType} onChange={(event) => setMaterialForm((current) => ({ ...current, materialType: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    {materialTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Unit of measure (UOM) <span className="text-redoxide">*</span></span>
                  <select value={materialForm.uom} onChange={(event) => setMaterialForm((current) => ({ ...current, uom: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    {["KG", "G", "MG", "L", "ML", "PCS", "STRIPS", "ROLLS"].map((u) => <option key={u} value={u}>{u.toLowerCase()}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">HSN code</span>
                  <input value={materialForm.hsnCode ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, hsnCode: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 29242990" />
                  <span className="mt-1 block text-xs text-slate">Harmonized System of Nomenclature code for GST.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">CAS number</span>
                  <input value={materialForm.casNumber ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, casNumber: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 103-90-2" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Pharmacopoeial reference</span>
                  <select value={materialForm.pharmacopoeialRef ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, pharmacopoeialRef: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    <option value="">— Select —</option>
                    {["IP 2022", "BP 2024", "USP-NF 2024", "EP 10th Edition", "Non-Pharmacopoeial", "In-house"].map((ref) => <option key={ref} value={ref}>{ref}</option>)}
                  </select>
                </label>
                <label className="col-span-2 block">
                  <span className="mb-2 block text-sm font-medium text-ink">Material code</span>
                  <input value={materialForm.materialCode} onChange={(event) => setMaterialForm((current) => ({ ...current, materialCode: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="Auto-generated on save (or enter manually)" />
                </label>
                <label className="col-span-2 block">
                  <span className="mb-2 block text-sm font-medium text-ink">Description / remarks</span>
                  <textarea value={materialForm.description} onChange={(event) => setMaterialForm((current) => ({ ...current, description: event.target.value }))} className="min-h-20 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="Additional notes, physical description, special handling instructions…" />
                </label>
              </div>
            </div>

            {/* Storage & Handling */}
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-steel">Storage &amp; Handling</p>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Storage condition <span className="text-redoxide">*</span></span>
                  <select value={materialForm.storageCondition} onChange={(event) => setMaterialForm((current) => ({ ...current, storageCondition: event.target.value as StorageCondition }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    {storageConditions.map((condition) => <option key={condition} value={condition}>{storageConditionLabels[condition]}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Max humidity (%RH)</span>
                  <input value={materialForm.maxHumidity ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, maxHumidity: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. NMT 65%" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Light sensitivity</span>
                  <select value={materialForm.lightSensitivity ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, lightSensitivity: event.target.value as LightSensitivity || undefined }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    <option value="">— Select —</option>
                    {lightSensitivities.map((ls) => <option key={ls} value={ls}>{lightSensitivityLabels[ls]}</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Hygroscopic</span>
                  <select value={materialForm.hygroscopic ? "yes" : "no"} onChange={(event) => setMaterialForm((current) => ({ ...current, hygroscopic: event.target.value === "yes" }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel">
                    <option value="no">No</option>
                    <option value="yes">Yes – store with desiccant</option>
                  </select>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Shelf life (months) <span className="text-redoxide">*</span></span>
                  <input type="number" min={0} value={materialForm.shelfLifeMonths ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, shelfLifeMonths: event.target.value ? Number(event.target.value) : undefined }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 36" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Retest period (months)</span>
                  <input type="number" min={0} value={materialForm.retestPeriodMonths ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, retestPeriodMonths: event.target.value ? Number(event.target.value) : undefined }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 24" />
                  <span className="mt-1 block text-xs text-slate">For APIs and critical excipients.</span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Reorder level</span>
                  <input value={materialForm.reorderLevel ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, reorderLevel: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 50 kg" />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-ink">Lead time (days)</span>
                  <input type="number" min={0} value={materialForm.leadTimeDays ?? ""} onChange={(event) => setMaterialForm((current) => ({ ...current, leadTimeDays: event.target.value ? Number(event.target.value) : undefined }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" placeholder="e.g. 14" />
                </label>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {([
                  ["controlledSubstance", "Controlled substance"],
                  ["hazardous", "Hazardous material"],
                  ["photosensitive", "Photosensitive"],
                  ["selectiveMaterial", "Selective material"],
                  ["vendorCoaReleaseAllowed", "Vendor CoA release allowed"],
                  ["samplingRequired", "Sampling required"]
                ] as [keyof CreateMaterialRequest, string][]).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink">
                    <input type="checkbox" checked={materialForm[key] as boolean} onChange={(event) => setMaterialForm((current) => ({ ...current, [key]: event.target.checked }))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-ink">
                {editingMaterialId ? "Updated by" : "Created by"}
              </span>
              <input required value={materialForm.createdBy} onChange={(event) => setMaterialForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-steel" />
            </label>
            {materialSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-4 text-sm text-moss">{materialSuccessMessage}</div> : null}
            {materialError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-4 text-sm text-redoxide">{materialError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isMaterialSubmitting} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/50">{isMaterialSubmitting ? editingMaterialId ? "Updating material..." : "Creating material..." : editingMaterialId ? "Update material" : "Create material"}</button>
              {editingMaterialId ? <button type="button" onClick={resetMaterialForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
        </article>
      </section>
      </>
      ) : null}

      {selectedSection === "warehouse" ? (
      <section className="panel px-6 py-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate">Warehouse Structure</p>
          <h4 className="mt-2 text-xl font-semibold text-ink">Warehouse details and hierarchy</h4>
          <p className="mt-2 text-sm text-slate">Warehouse, room, rack, shelf, and pallet are one linked structure. Use the folder selector to create each level under the correct parent.</p>
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-3xl border border-ink/10 bg-[#243041] p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">Folders</p>
            <div className="mt-4 grid gap-2">
              {warehouseFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => setSelectedWarehouseFolder(folder.id)}
                  className={[
                    "rounded-[18px] border px-4 py-3 text-left text-sm font-medium transition",
                    selectedWarehouseFolder === folder.id
                      ? "border-white/20 bg-[#13a7b8] text-white"
                      : "border-white/10 bg-white/5 text-white/78 hover:bg-white/10"
                  ].join(" ")}
                >
                  {folder.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6">
          <div className="overflow-hidden rounded-3xl border border-indigo-100 bg-[#eef2ff] shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-indigo-100 bg-white px-5 py-4">
              <div>
                <p className="text-xs text-slate">Warehouse / <span className="font-semibold text-indigo-700">WMS</span></p>
                <h5 className="mt-1 text-lg font-semibold text-ink">Warehouse Map</h5>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedWarehouseFolder("pallet")}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white"
                >
                  + New Location
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistryOpen(true)}
                  className="rounded-xl border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  Export Map
                </button>
              </div>
            </div>

            <div className="grid gap-0 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
              <div className="border-b border-indigo-100 bg-white xl:border-b-0 xl:border-r">
                <div className="border-b border-indigo-100 px-4 py-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate">Locations</p>
                </div>
                <div className="max-h-[920px] overflow-y-auto p-3">
                  {warehouseTree.map((warehouseNode) => (
                    <div key={warehouseNode.id} className="mb-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedWarehouseId(warehouseNode.id);
                          setSelectedRoomId(warehouseNode.rooms[0]?.id ?? "");
                        }}
                        className={[
                          "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition",
                          activeWarehouseNode?.id === warehouseNode.id
                            ? "bg-indigo-100 font-semibold text-indigo-700"
                            : "text-slate-600 hover:bg-indigo-50"
                        ].join(" ")}
                      >
                        <span>{warehouseNode.warehouseCode}: {warehouseNode.warehouseName}</span>
                      </button>
                      <div className="ml-4 mt-1 space-y-1">
                        {warehouseNode.rooms.map((roomNode) => (
                          <button
                            key={roomNode.id}
                            type="button"
                            onClick={() => {
                              setSelectedWarehouseId(warehouseNode.id);
                              setSelectedRoomId(roomNode.id);
                              setSelectedRackId(roomNode.racks[0]?.id ?? "");
                              setSelectedShelfId(roomNode.racks[0]?.shelves[0]?.id ?? "");
                            }}
                            className={[
                              "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition",
                              activeRoomNode?.id === roomNode.id
                                ? "bg-indigo-50 font-semibold text-indigo-600"
                                : "text-slate hover:bg-indigo-50"
                            ].join(" ")}
                          >
                            <span>{roomNode.roomCode} ({formatStorageConditionLabel(roomNode.storageCondition)})</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-indigo-100 px-4 py-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Legend</p>
                  <div className="mt-3 space-y-2 text-[11px] text-slate">
                    <div className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-green-200 bg-green-100" /> Active pallet</div>
                    <div className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-slate-200 bg-slate-100" /> Inactive pallet</div>
                    <div className="flex items-center gap-2"><span className="h-4 w-4 rounded border border-dashed border-indigo-200 bg-white" /> Empty shelf slot</div>
                  </div>
                </div>
              </div>

              <div className="border-b border-indigo-100 p-5 xl:border-b-0">
                {activeWarehouseNode && activeRoomNode ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <h6 className="text-lg font-bold text-ink">
                          {activeWarehouseNode.warehouseCode} / {activeRoomNode.roomCode}
                        </h6>
                        <p className="mt-1 text-xs text-slate">
                          {formatStorageConditionLabel(activeRoomNode.storageCondition)} storage · {activeRoomStats.racks} racks · {activeRoomStats.pallets} pallets configured
                        </p>
                      </div>
                      <div className="min-w-[150px]">
                        <div className="flex items-end justify-between text-xs text-slate">
                          <span>Occupancy</span>
                          <span className="font-semibold text-indigo-700">
                            {activeRoomStats.shelves === 0 ? 0 : Math.round((activeRoomStats.pallets / Math.max(activeRoomStats.shelves, 1)) * 100)}%
                          </span>
                        </div>
                        <div className="mt-2 h-3 overflow-hidden rounded-full bg-indigo-100">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{
                              width: `${activeRoomStats.shelves === 0 ? 0 : Math.min(100, Math.round((activeRoomStats.pallets / Math.max(activeRoomStats.shelves, 1)) * 100))}%`
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-5">
                      {activeRoomNode.racks.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-8 text-center text-sm text-slate">
                          No racks configured for this room yet.
                        </div>
                      ) : (
                        activeRoomNode.racks.map((rackNode) => (
                          <article key={rackNode.id} className="rounded-2xl border border-indigo-100 bg-white p-4 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-indigo-700">{rackNode.rackCode}</p>
                                <p className="text-[11px] text-slate">{rackNode.shelves.length} shelves</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedRackId(rackNode.id)}
                                className="rounded-lg bg-indigo-50 px-3 py-1.5 text-[11px] font-semibold text-indigo-600"
                              >
                                Focus Rack
                              </button>
                            </div>
                            <div className="mt-4 space-y-2">
                              {rackNode.shelves.map((shelfNode) => (
                                <div key={shelfNode.id} className="flex items-center gap-2">
                                  <div className="w-16 text-right text-[10px] font-semibold text-slate-400">
                                    {shelfNode.shelfCode}
                                  </div>
                                  <div className="grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                                    {shelfNode.pallets.length === 0 ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedRackId(rackNode.id);
                                          setSelectedShelfId(shelfNode.id);
                                          setSelectedWarehouseFolder("pallet");
                                        }}
                                        className="min-h-[58px] rounded-lg border border-dashed border-indigo-200 bg-white px-3 py-2 text-center text-[10px] font-semibold text-slate-400"
                                      >
                                        Empty
                                      </button>
                                    ) : (
                                      shelfNode.pallets.map((palletNode) => {
                                        const pallet = palletById.get(palletNode.id);
                                        const isActivePallet = pallet?.isActive ?? true;
                                        return (
                                          <button
                                            key={palletNode.id}
                                            type="button"
                                            onClick={() => {
                                              setSelectedRackId(rackNode.id);
                                              setSelectedShelfId(shelfNode.id);
                                              setSelectedWmsPalletId(palletNode.id);
                                            }}
                                            className={[
                                              "min-h-[58px] rounded-lg border px-3 py-2 text-center transition",
                                              activePalletNode?.id === palletNode.id
                                                ? "border-indigo-400 bg-indigo-50 shadow-sm"
                                                : isActivePallet
                                                  ? "border-green-200 bg-green-50 hover:border-indigo-300"
                                                  : "border-slate-200 bg-slate-100 hover:border-indigo-300"
                                            ].join(" ")}
                                          >
                                            <div className="text-[10px] font-bold text-indigo-700">{palletNode.palletCode}</div>
                                            <div className="mt-1 text-[10px] font-medium text-slate-600">{palletNode.palletName}</div>
                                            <div className="mt-1 text-[9px] uppercase tracking-[0.12em] text-slate-400">
                                              {formatStorageConditionLabel(palletNode.storageCondition)}
                                            </div>
                                          </button>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </article>
                        ))
                      )}

                      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-4">
                        <div className="rounded-2xl border border-green-100 bg-white px-4 py-3 text-center shadow-sm">
                          <p className="text-lg font-bold text-green-600">{pallets.filter((pallet) => pallet.isActive).length}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate">Active pallets</p>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                          <p className="text-lg font-bold text-slate-600">{pallets.filter((pallet) => !pallet.isActive).length}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate">Inactive pallets</p>
                        </div>
                        <div className="rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-center shadow-sm">
                          <p className="text-lg font-bold text-indigo-600">{activeRoomStats.racks}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate">Racks in room</p>
                        </div>
                        <div className="rounded-2xl border border-amber-100 bg-white px-4 py-3 text-center shadow-sm">
                          <p className="text-lg font-bold text-amber-600">{activeRoomStats.shelves}</p>
                          <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate">Shelves in room</p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-dashed border-indigo-200 bg-white px-4 py-10 text-center text-sm text-slate">
                    No warehouse structure exists yet.
                  </div>
                )}
              </div>

              <aside className="bg-white">
                <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-4">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Pallet Detail</p>
                  <p className="mt-1 font-mono text-base font-bold text-ink">
                    {activePalletNode?.palletCode ?? "No pallet"}
                  </p>
                </div>
                <div className="space-y-4 p-4 text-sm">
                  {activePalletNode ? (
                    <>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Location</p>
                        <p className="mt-1 text-xs font-semibold text-ink">
                          {activeWarehouseNode?.warehouseCode} / {activeRoomNode?.roomCode} / {activeRackNode?.rackCode} / {activeShelfNode?.shelfCode} / {activePalletNode.palletCode}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Pallet Name</p>
                        <p className="mt-1 text-xs font-semibold text-ink">{activePalletNode.palletName}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Storage Condition</p>
                        <p className="mt-1 text-xs font-semibold text-indigo-700">
                          {formatStorageConditionLabel(activePalletNode.storageCondition)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Status</p>
                        <span className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${activePallet?.isActive ?? true ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"}`}>
                          {activePallet?.isActive ?? true ? "Active" : "Inactive"}
                        </span>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate">Audit</p>
                        <p className="mt-1 text-xs text-slate">Created by {activePallet?.createdBy ?? "System"}</p>
                        <p className="mt-1 text-xs text-slate">{formatWarehouseTimestamp(activePallet?.updatedAt ?? activePallet?.createdAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2">
                        {activePallet ? (
                          <>
                            <button type="button" onClick={() => startEditingPallet(activePallet)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-semibold text-ink">
                              Edit
                            </button>
                            <button type="button" onClick={() => void handleDeletePallet(activePallet)} className="rounded-lg border border-redoxide/20 px-3 py-2 text-xs font-semibold text-redoxide">
                              Delete
                            </button>
                          </>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-indigo-200 px-4 py-8 text-center text-sm text-slate">
                      Select a pallet to inspect its detail.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white/70 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">Live Hierarchy</p>
                <h5 className="mt-2 text-lg font-semibold text-ink">Warehouse tree view</h5>
                <p className="mt-2 max-w-2xl text-sm text-slate">
                  This structure is loaded from the warehouse tree API, so it reflects the actual linked warehouse layout rather than a flat reconstruction.
                </p>
              </div>
              <div className="grid min-w-[280px] gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <div className="rounded-2xl bg-mist/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate">Warehouses</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{warehouseTree.length}</p>
                </div>
                <div className="rounded-2xl bg-mist/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate">Rooms</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{warehouseTreeStats.rooms}</p>
                </div>
                <div className="rounded-2xl bg-mist/80 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate">Racks / Shelves</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">
                    {warehouseTreeStats.racks} / {warehouseTreeStats.shelves}
                  </p>
                </div>
                <div className="rounded-2xl bg-mist/80 px-4 py-3 sm:col-span-2 xl:col-span-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate">Pallets</p>
                  <p className="mt-2 text-2xl font-semibold text-ink">{warehouseTreeStats.pallets}</p>
                </div>
              </div>
            </div>
            {isWarehouseLoading ? (
              <p className="mt-4 text-sm text-slate">Loading warehouse tree...</p>
            ) : warehouseTree.length === 0 ? (
              <p className="mt-4 rounded-2xl border border-dashed border-ink/15 px-4 py-4 text-sm text-slate">
                No warehouse structure exists yet.
              </p>
            ) : (
              <div className="mt-5 space-y-4">
                {warehouseTree.map((warehouseNode) => {
                  const warehouse = warehouseById.get(warehouseNode.id);
                  return (
                    <article key={warehouseNode.id} className="rounded-3xl border border-ink/10 bg-white px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-ink">
                            {warehouseNode.warehouseCode} - {warehouseNode.warehouseName}
                          </p>
                          <p className="mt-1 text-sm text-slate">
                            {warehouseNode.rooms.length} rooms in this warehouse
                          </p>
                        </div>
                        {warehouse ? (
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingWarehouse(warehouse)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                            <button type="button" onClick={() => void handleDeleteWarehouse(warehouse)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                          </div>
                        ) : null}
                      </div>
                      {warehouseNode.rooms.length === 0 ? (
                        <p className="mt-3 text-sm text-slate">No rooms linked yet.</p>
                      ) : (
                        <div className="mt-4 space-y-3">
                          {warehouseNode.rooms.map((roomNode) => {
                            const room = roomById.get(roomNode.id);
                            return (
                              <div key={roomNode.id} className="rounded-2xl bg-mist/70 px-4 py-4">
                                <div className="flex flex-wrap items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-ink">
                                      {roomNode.roomCode} - {roomNode.roomName}
                                    </p>
                                    <p className="mt-1 text-sm text-slate">{roomNode.storageCondition}</p>
                                  </div>
                                  {room ? (
                                    <div className="flex gap-2">
                                      <button type="button" onClick={() => startEditingRoom(room)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                      <button type="button" onClick={() => void handleDeleteRoom(room)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                    </div>
                                  ) : null}
                                </div>
                                {roomNode.racks.length === 0 ? (
                                  <p className="mt-3 text-sm text-slate">No racks linked yet.</p>
                                ) : (
                                  <div className="mt-3 space-y-2">
                                    {roomNode.racks.map((rackNode) => {
                                      const rack = rackById.get(rackNode.id);
                                      return (
                                        <div key={rackNode.id} className="rounded-2xl bg-white px-4 py-3 text-sm text-ink">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            <p className="font-medium">
                                              {rackNode.rackCode} - {rackNode.rackName}
                                            </p>
                                            {rack ? (
                                              <div className="flex gap-2">
                                                <button type="button" onClick={() => startEditingRack(rack)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                <button type="button" onClick={() => void handleDeleteRack(rack)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                              </div>
                                            ) : null}
                                          </div>
                                          {rackNode.shelves.length === 0 ? (
                                            <p className="mt-2 text-sm text-slate">No shelves linked yet.</p>
                                          ) : (
                                            <div className="mt-3 space-y-2">
                                              {rackNode.shelves.map((shelfNode) => {
                                                const shelf = shelfById.get(shelfNode.id);
                                                return (
                                                  <div key={shelfNode.id} className="rounded-2xl border border-ink/10 px-4 py-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                      <p className="font-medium">
                                                        {shelfNode.shelfCode} - {shelfNode.shelfName}
                                                      </p>
                                                      {shelf ? (
                                                        <div className="flex gap-2">
                                                          <button type="button" onClick={() => startEditingShelf(shelf)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                          <button type="button" onClick={() => void handleDeleteShelf(shelf)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                                        </div>
                                                      ) : null}
                                                    </div>
                                                    {shelfNode.pallets.length === 0 ? (
                                                      <p className="mt-2 text-sm text-slate">No pallets linked yet.</p>
                                                    ) : (
                                                      <div className="mt-3 grid gap-2 md:grid-cols-2">
                                                        {shelfNode.pallets.map((palletNode) => {
                                                          const pallet = palletById.get(palletNode.id);
                                                          return (
                                                            <div key={palletNode.id} className="rounded-2xl bg-mist/60 px-3 py-3">
                                                              <div className="flex flex-wrap items-start justify-between gap-2">
                                                                <div>
                                                                  <p className="font-medium text-ink">
                                                                    {palletNode.palletCode} - {palletNode.palletName}
                                                                  </p>
                                                                  <p className="mt-1 text-xs uppercase tracking-[0.14em] text-slate">
                                                                    {palletNode.storageCondition}
                                                                  </p>
                                                                </div>
                                                                {pallet ? (
                                                                  <div className="flex gap-2">
                                                                    <button type="button" onClick={() => startEditingPallet(pallet)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                                    <button type="button" onClick={() => void handleDeletePallet(pallet)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                                                  </div>
                                                                ) : null}
                                                              </div>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    )}
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
          {selectedWarehouseFolder === "warehouse" ? (
          <form className="space-y-4 rounded-3xl border border-ink/10 bg-white/60 p-5" onSubmit={handleWarehouseSubmit}>
            <h5 className="text-lg font-semibold text-ink">{editingWarehouseId ? "Edit warehouse" : "Warehouse"}</h5>
            <div className="grid gap-4 md:grid-cols-2">
              <input required value={warehouseForm.warehouseCode} onChange={(event) => setWarehouseForm((current) => ({ ...current, warehouseCode: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="WH-001" />
              <input required value={warehouseForm.warehouseName} onChange={(event) => setWarehouseForm((current) => ({ ...current, warehouseName: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Raw Material Warehouse" />
            </div>
            <input value={warehouseForm.description} onChange={(event) => setWarehouseForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
            <input required value={warehouseForm.createdBy} onChange={(event) => setWarehouseForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingWarehouseId ? "Updated by" : "Created by"} />
            {warehouseSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{warehouseSuccessMessage}</div> : null}
            {warehouseError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{warehouseError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isWarehouseSubmitting} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:bg-ink/50">{isWarehouseSubmitting ? editingWarehouseId ? "Updating..." : "Creating..." : editingWarehouseId ? "Update warehouse" : "Create warehouse"}</button>
              {editingWarehouseId ? <button type="button" onClick={resetWarehouseForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
          ) : null}

          {selectedWarehouseFolder === "room" ? (
          <form className="space-y-4 rounded-3xl border border-ink/10 bg-white/60 p-5" onSubmit={handleRoomSubmit}>
            <h5 className="text-lg font-semibold text-ink">{editingRoomId ? "Edit room" : "Room"}</h5>
            <select required value={selectedWarehouseId} onChange={(event) => setSelectedWarehouseId(event.target.value)} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              <option value="">Select warehouse</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.warehouseCode} - {warehouse.warehouseName}</option>)}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input required value={roomForm.roomCode} onChange={(event) => setRoomForm((current) => ({ ...current, roomCode: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="ROOM-01" />
              <input required value={roomForm.roomName} onChange={(event) => setRoomForm((current) => ({ ...current, roomName: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Ambient Room" />
            </div>
            <select value={selectedRoomMaterialId} onChange={(event) => setSelectedRoomMaterialId(event.target.value)} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              <option value="">Optional: derive storage condition from material</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.materialCode} - {material.materialName}</option>)}
            </select>
            <select value={roomForm.storageCondition} onChange={(event) => setRoomForm((current) => ({ ...current, storageCondition: event.target.value as StorageCondition }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              {storageConditions.map((condition) => <option key={condition} value={condition}>{condition}</option>)}
            </select>
            <p className="text-sm text-slate">If a material is selected above, the room storage condition is auto-filled from that material.</p>
            <input value={roomForm.description} onChange={(event) => setRoomForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
            <input required value={roomForm.createdBy} onChange={(event) => setRoomForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingRoomId ? "Updated by" : "Created by"} />
            {roomSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{roomSuccessMessage}</div> : null}
            {roomError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{roomError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isRoomSubmitting || warehouses.length === 0} className="rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white disabled:bg-steel/50">{isRoomSubmitting ? editingRoomId ? "Updating..." : "Creating..." : editingRoomId ? "Update room" : "Create room"}</button>
              {editingRoomId ? <button type="button" onClick={resetRoomForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
          ) : null}

          {selectedWarehouseFolder === "rack" ? (
          <form className="space-y-4 rounded-3xl border border-ink/10 bg-white/60 p-5" onSubmit={handleRackSubmit}>
            <h5 className="text-lg font-semibold text-ink">{editingRackId ? "Edit rack" : "Rack"}</h5>
            <select required value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              <option value="">Select room</option>
              {filteredRooms.map((room) => <option key={room.id} value={room.id}>{room.roomCode} - {room.roomName}</option>)}
            </select>
            <input required value={rackForm.rackCode} onChange={(event) => setRackForm((current) => ({ ...current, rackCode: event.target.value, rackName: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="RACK-01" />
            <p className="text-sm text-slate">Rack name is auto-derived from rack code in the current UI.</p>
            <input value={rackForm.description} onChange={(event) => setRackForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
            <input required value={rackForm.createdBy} onChange={(event) => setRackForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingRackId ? "Updated by" : "Created by"} />
            {rackSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{rackSuccessMessage}</div> : null}
            {rackError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{rackError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isRackSubmitting || rooms.length === 0} className="rounded-2xl bg-teal px-4 py-3 text-sm font-medium text-white disabled:bg-teal/50">{isRackSubmitting ? editingRackId ? "Updating..." : "Creating..." : editingRackId ? "Update rack" : "Create rack"}</button>
              {editingRackId ? <button type="button" onClick={resetRackForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
          ) : null}

          {selectedWarehouseFolder === "shelf" ? (
          <form className="space-y-4 rounded-3xl border border-ink/10 bg-white/60 p-5" onSubmit={handleShelfSubmit}>
            <h5 className="text-lg font-semibold text-ink">{editingShelfId ? "Edit shelf" : "Shelf"}</h5>
            <select required value={selectedRackId} onChange={(event) => setSelectedRackId(event.target.value)} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              <option value="">Select rack</option>
              {filteredRacks.map((rack) => <option key={rack.id} value={rack.id}>{rack.rackCode} - {rack.rackName}</option>)}
            </select>
            <div className="grid gap-4 md:grid-cols-2">
              <input required value={shelfForm.shelfCode} onChange={(event) => setShelfForm((current) => ({ ...current, shelfCode: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="SHELF-01" />
              <input required value={shelfForm.shelfName} onChange={(event) => setShelfForm((current) => ({ ...current, shelfName: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Shelf A1" />
            </div>
            <input value={shelfForm.description} onChange={(event) => setShelfForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
            <input required value={shelfForm.createdBy} onChange={(event) => setShelfForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingShelfId ? "Updated by" : "Created by"} />
            {shelfSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{shelfSuccessMessage}</div> : null}
            {shelfError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{shelfError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isShelfSubmitting || racks.length === 0} className="rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white disabled:bg-steel/50">{isShelfSubmitting ? editingShelfId ? "Updating..." : "Creating..." : editingShelfId ? "Update shelf" : "Create shelf"}</button>
              {editingShelfId ? <button type="button" onClick={resetShelfForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
          ) : null}

          {selectedWarehouseFolder === "pallet" ? (
          <form className="space-y-4 rounded-3xl border border-ink/10 bg-white/60 p-5" onSubmit={handlePalletSubmit}>
            <h5 className="text-lg font-semibold text-ink">{editingPalletId ? "Edit pallet" : "Pallet"}</h5>
            <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
              <select required value={selectedShelfId} onChange={(event) => setSelectedShelfId(event.target.value)} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
                <option value="">Select shelf</option>
                {filteredShelves.map((shelf) => <option key={shelf.id} value={shelf.id}>{shelf.shelfCode} - {shelf.shelfName}</option>)}
              </select>
              <input required value={palletForm.palletCode} onChange={(event) => setPalletForm((current) => ({ ...current, palletCode: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="PALLET-01" />
              <input required value={palletForm.palletName} onChange={(event) => setPalletForm((current) => ({ ...current, palletName: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Pallet A1-01" />
            </div>
            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
              <input value={palletForm.description} onChange={(event) => setPalletForm((current) => ({ ...current, description: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
              <input required value={palletForm.createdBy} onChange={(event) => setPalletForm((current) => ({ ...current, createdBy: event.target.value }))} className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingPalletId ? "Updated by" : "Created by"} />
            </div>
            <p className="text-sm text-slate">Pallet storage condition is inherited automatically from the selected room.</p>
            {palletSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{palletSuccessMessage}</div> : null}
            {palletError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{palletError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isPalletSubmitting || shelves.length === 0} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:bg-ink/50">{isPalletSubmitting ? editingPalletId ? "Updating..." : "Creating..." : editingPalletId ? "Update pallet" : "Create pallet"}</button>
              {editingPalletId ? <button type="button" onClick={resetPalletForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
          ) : null}
          </div>
        </div>
      </section>
      ) : null}

      {selectedSection === "spec" || selectedSection === "moa" || selectedSection === "samplingTool" ? (
      <>
      <section id="qc-references" className="panel px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-[0.26em] text-steel">QC References</p>
        <h4 className="mt-3 text-2xl font-semibold text-ink">Sampling and quality reference masters</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate">
          Specs, methods of analysis, and sampling tools are one reference family and should be maintained together for QC planning and future QMS/LIMS extensions.
        </p>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        {selectedSection === "spec" ? (
        <article className="panel px-6 py-6">
          <h4 className="text-lg font-semibold text-ink">{editingSpecId ? "Edit spec" : "Spec master"}</h4>
          <form className="mt-4 space-y-4" onSubmit={handleSpecSubmit}>
            <input required value={specForm.specCode} onChange={(event) => setSpecForm((current) => ({ ...current, specCode: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="SPEC-001" />
            <input required value={specForm.specName} onChange={(event) => setSpecForm((current) => ({ ...current, specName: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="RM sampling spec" />
            <input value={specForm.revision} onChange={(event) => setSpecForm((current) => ({ ...current, revision: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Revision" />
            <select value={specForm.samplingMethod} onChange={(event) => setSpecForm((current) => ({ ...current, samplingMethod: event.target.value as SamplingMethod }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel">
              {specSamplingMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
            <input value={specForm.referenceAttachment} onChange={(event) => setSpecForm((current) => ({ ...current, referenceAttachment: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Reference attachment" />
            <input required value={specForm.createdBy} onChange={(event) => setSpecForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingSpecId ? "Updated by" : "Created by"} />
            {specSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{specSuccessMessage}</div> : null}
            {specError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{specError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSpecSubmitting} className="rounded-2xl bg-ink px-4 py-3 text-sm font-medium text-white disabled:bg-ink/50">{isSpecSubmitting ? editingSpecId ? "Updating..." : "Creating..." : editingSpecId ? "Update spec" : "Create spec"}</button>
              {editingSpecId ? <button type="button" onClick={resetSpecForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
        </article>
        ) : null}

        {selectedSection === "moa" ? (
        <article className="panel px-6 py-6">
          <h4 className="text-lg font-semibold text-ink">{editingMoaId ? "Edit MoA" : "MoA master"}</h4>
          <form className="mt-4 space-y-4" onSubmit={handleMoaSubmit}>
            <input required value={moaForm.moaCode} onChange={(event) => setMoaForm((current) => ({ ...current, moaCode: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="MOA-001" />
            <input required value={moaForm.moaName} onChange={(event) => setMoaForm((current) => ({ ...current, moaName: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Method of analysis" />
            <input value={moaForm.revision} onChange={(event) => setMoaForm((current) => ({ ...current, revision: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Revision" />
            <input value={moaForm.referenceAttachment} onChange={(event) => setMoaForm((current) => ({ ...current, referenceAttachment: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Reference attachment" />
            <input required value={moaForm.createdBy} onChange={(event) => setMoaForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingMoaId ? "Updated by" : "Created by"} />
            {moaSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{moaSuccessMessage}</div> : null}
            {moaError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{moaError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isMoaSubmitting} className="rounded-2xl bg-steel px-4 py-3 text-sm font-medium text-white disabled:bg-steel/50">{isMoaSubmitting ? editingMoaId ? "Updating..." : "Creating..." : editingMoaId ? "Update MoA" : "Create MoA"}</button>
              {editingMoaId ? <button type="button" onClick={resetMoaForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
        </article>
        ) : null}

        {selectedSection === "samplingTool" ? (
        <article className="panel px-6 py-6">
          <h4 className="text-lg font-semibold text-ink">{editingSamplingToolId ? "Edit sampling tool" : "Sampling tool master"}</h4>
          <form className="mt-4 space-y-4" onSubmit={handleSamplingToolSubmit}>
            <input required value={samplingToolForm.toolCode} onChange={(event) => setSamplingToolForm((current) => ({ ...current, toolCode: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="TOOL-001" />
            <input required value={samplingToolForm.toolName} onChange={(event) => setSamplingToolForm((current) => ({ ...current, toolName: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Thief" />
            <input value={samplingToolForm.description} onChange={(event) => setSamplingToolForm((current) => ({ ...current, description: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder="Description" />
            <input required value={samplingToolForm.createdBy} onChange={(event) => setSamplingToolForm((current) => ({ ...current, createdBy: event.target.value }))} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-steel" placeholder={editingSamplingToolId ? "Updated by" : "Created by"} />
            {samplingToolSuccessMessage ? <div className="rounded-2xl border border-moss/20 bg-moss/10 px-4 py-3 text-sm text-moss">{samplingToolSuccessMessage}</div> : null}
            {samplingToolError ? <div className="rounded-2xl border border-redoxide/20 bg-redoxide/10 px-4 py-3 text-sm text-redoxide">{samplingToolError}</div> : null}
            <div className="flex flex-wrap gap-3">
              <button type="submit" disabled={isSamplingToolSubmitting} className="rounded-2xl bg-teal px-4 py-3 text-sm font-medium text-white disabled:bg-teal/50">{isSamplingToolSubmitting ? editingSamplingToolId ? "Updating..." : "Creating..." : editingSamplingToolId ? "Update tool" : "Create tool"}</button>
              {editingSamplingToolId ? <button type="button" onClick={resetSamplingToolForm} className="rounded-2xl border border-ink/10 px-4 py-3 text-sm font-medium text-ink">Cancel edit</button> : null}
            </div>
          </form>
        </article>
        ) : null}
      </section>
      </>
      ) : null}

      </div>

      {isRegistryOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/30 px-4" onClick={() => setIsRegistryOpen(false)}>
          <div
            className="max-h-[80vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-float"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <div>
                <h4 className="text-lg font-semibold text-ink">{registryTitle()}</h4>
                <p className="mt-1 text-sm text-slate">Review existing records in a popup window.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegistryOpen(false)}
                className="rounded-full border border-ink/10 px-3 py-2 text-sm text-ink"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto p-6">
              {selectedSection === "supplier" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink/5 text-slate">
                    <tr>
                      <th className="px-4 py-3 font-medium">Code</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Contact</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr key={supplier.id} className="border-t border-ink/10">
                        <td className="px-4 py-3">{supplier.supplierCode}</td>
                        <td className="px-4 py-3">{supplier.supplierName}</td>
                        <td className="px-4 py-3">{supplier.contactPerson || "Not set"}</td>
                        <td className="px-4 py-3">{supplier.phone || "Not set"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingSupplier(supplier)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                            <button type="button" onClick={() => void handleDeleteSupplier(supplier)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {selectedSection === "vendor" ? (
                <div className="space-y-4">
                  {vendors.map((vendor) => {
                    const linkedUnits = vendorBusinessUnits.filter((unit) => unit.vendorId === vendor.id);
                    return (
                      <article key={vendor.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-ink">{vendor.vendorCode} - {vendor.vendorName}</p>
                            <p className="mt-1 text-sm text-slate">
                              {vendor.contactPerson || "No contact"} {vendor.phone ? `• ${vendor.phone}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="status-pill bg-ink/5 text-ink">
                              {vendor.isApproved ? "Approved" : "Pending"}
                            </span>
                            <button type="button" onClick={() => startEditingVendor(vendor)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                            <button type="button" onClick={() => void handleDeleteVendor(vendor)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                          </div>
                        </div>
                        <div className="mt-4 rounded-2xl bg-mist/70 px-4 py-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate">
                            Vendor Business Units
                          </p>
                          {linkedUnits.length === 0 ? (
                            <p className="mt-2 text-sm text-slate">No business units linked yet.</p>
                          ) : (
                            <div className="mt-3 space-y-2">
                              {linkedUnits.map((unit) => (
                                <div key={unit.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink">
                                  <p>
                                    {vendor.vendorName} {"->"} {unit.unitName}
                                  </p>
                                  <div className="flex gap-2">
                                    <button type="button" onClick={() => startEditingVendorBusinessUnit(unit)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                    <button type="button" onClick={() => void handleDeleteVendorBusinessUnit(unit)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {selectedSection === "vendorBusinessUnit" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink/5 text-slate">
                    <tr>
                      <th className="px-4 py-3 font-medium">Vendor / Business Unit</th>
                      <th className="px-4 py-3 font-medium">City</th>
                      <th className="px-4 py-3 font-medium">Country</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorBusinessUnits.map((unit) => {
                      const vendor = vendors.find((entry) => entry.id === unit.vendorId);
                      return (
                        <tr key={unit.id} className="border-t border-ink/10">
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-medium text-ink">
                                {vendor ? `${vendor.vendorCode} - ${vendor.vendorName}` : unit.vendorId}
                              </p>
                              <p className="mt-1 text-sm text-slate">
                                {unit.unitName}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-3">{unit.city || "Not set"}</td>
                          <td className="px-4 py-3">{unit.country || "Not set"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditingVendorBusinessUnit(unit)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                              <button type="button" onClick={() => void handleDeleteVendorBusinessUnit(unit)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : null}

              {selectedSection === "material" ? (
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-ink/5 text-slate">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Material Code</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Material Name</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Category</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">UOM</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Storage</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Status</th>
                      <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-wide">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map((material) => (
                      <tr key={material.id} className="border-t border-ink/10">
                        <td className="px-4 py-3 font-mono font-semibold text-steel">{material.materialCode}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-ink">{material.materialName}</div>
                          {material.genericNames ? <div className="text-xs text-slate">{material.genericNames}</div> : null}
                        </td>
                        <td className="px-4 py-3">
                          {material.materialCategory ? (
                            <span className="inline-flex rounded-md bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">{materialCategoryLabels[material.materialCategory as MaterialCategory] ?? material.materialCategory}</span>
                          ) : <span className="text-slate">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate">{material.uom.toLowerCase()}</td>
                        <td className="px-4 py-3 text-slate">{storageConditionLabels[material.storageCondition] ?? material.storageCondition}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${material.isActive ? "bg-moss/15 text-moss" : "bg-ink/5 text-slate"}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${material.isActive ? "bg-moss" : "bg-slate-400"}`} />
                            {material.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button type="button" onClick={() => startEditingMaterial(material)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                            <button type="button" onClick={() => void handleDeleteMaterial(material)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : null}

              {selectedSection === "warehouse" ? (
                <div className="space-y-4">
                  {warehouseTree.map((warehouseNode) => {
                    const warehouse = warehouseById.get(warehouseNode.id);
                    return (
                      <article key={warehouseNode.id} className="rounded-2xl border border-ink/10 px-4 py-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <p className="font-semibold text-ink">
                            {warehouseNode.warehouseCode} - {warehouseNode.warehouseName}
                          </p>
                          {warehouse ? (
                            <div className="flex gap-2">
                              <button type="button" onClick={() => startEditingWarehouse(warehouse)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                              <button type="button" onClick={() => void handleDeleteWarehouse(warehouse)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                            </div>
                          ) : null}
                        </div>
                        {warehouseNode.rooms.length === 0 ? (
                          <p className="mt-2 text-sm text-slate">No rooms linked yet.</p>
                        ) : (
                          <div className="mt-3 space-y-3">
                            {warehouseNode.rooms.map((roomNode) => {
                              const room = roomById.get(roomNode.id);
                              return (
                                <div key={roomNode.id} className="rounded-2xl bg-mist/70 px-4 py-4">
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <p className="text-sm font-medium text-ink">
                                      {warehouseNode.warehouseCode} {"->"} {roomNode.roomCode}
                                    </p>
                                    {room ? (
                                      <div className="flex gap-2">
                                        <button type="button" onClick={() => startEditingRoom(room)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                        <button type="button" onClick={() => void handleDeleteRoom(room)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                      </div>
                                    ) : null}
                                  </div>
                                  <p className="mt-1 text-sm text-slate">
                                    {roomNode.roomName} ({roomNode.storageCondition})
                                  </p>
                                  {roomNode.racks.length === 0 ? (
                                    <p className="mt-2 text-sm text-slate">No racks linked yet.</p>
                                  ) : (
                                    <div className="mt-3 space-y-2">
                                      {roomNode.racks.map((rackNode) => {
                                        const rack = rackById.get(rackNode.id);
                                        return (
                                          <div key={rackNode.id} className="text-sm text-ink">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                              <p>{roomNode.roomCode} {"->"} {rackNode.rackCode}</p>
                                              {rack ? (
                                                <div className="flex gap-2">
                                                  <button type="button" onClick={() => startEditingRack(rack)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                  <button type="button" onClick={() => void handleDeleteRack(rack)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                                </div>
                                              ) : null}
                                            </div>
                                            {rackNode.shelves.map((shelfNode) => {
                                              const shelf = shelfById.get(shelfNode.id);
                                              return (
                                                <div key={shelfNode.id} className="mt-1 pl-4 text-slate">
                                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <p>{rackNode.rackCode} {"->"} {shelfNode.shelfCode}</p>
                                                    {shelf ? (
                                                      <div className="flex gap-2">
                                                        <button type="button" onClick={() => startEditingShelf(shelf)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                        <button type="button" onClick={() => void handleDeleteShelf(shelf)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                                      </div>
                                                    ) : null}
                                                  </div>
                                                  {shelfNode.pallets.map((palletNode) => {
                                                    const pallet = palletById.get(palletNode.id);
                                                    return (
                                                      <div key={palletNode.id} className="flex flex-wrap items-center justify-between gap-2 pl-4">
                                                        <p>{shelfNode.shelfCode} {"->"} {palletNode.palletCode}</p>
                                                        {pallet ? (
                                                          <div className="flex gap-2">
                                                            <button type="button" onClick={() => startEditingPallet(pallet)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                                                            <button type="button" onClick={() => void handleDeletePallet(pallet)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                                                          </div>
                                                        ) : null}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              );
                                            })}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : null}

              {selectedSection === "spec" ? (
                <div className="space-y-2 text-sm text-slate">
                  {specs.map((spec) => (
                    <div key={spec.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-4 py-3">
                      <p>{spec.specCode} - {spec.specName} ({spec.samplingMethod})</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditingSpec(spec)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                        <button type="button" onClick={() => void handleDeleteSpec(spec)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedSection === "moa" ? (
                <div className="space-y-2 text-sm text-slate">
                  {moas.map((moa) => (
                    <div key={moa.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-4 py-3">
                      <p>{moa.moaCode} - {moa.moaName}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditingMoa(moa)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                        <button type="button" onClick={() => void handleDeleteMoaRecord(moa)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              {selectedSection === "samplingTool" ? (
                <div className="space-y-2 text-sm text-slate">
                  {samplingTools.map((tool) => (
                    <div key={tool.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 px-4 py-3">
                      <p>{tool.toolCode} - {tool.toolName}</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => startEditingSamplingTool(tool)} className="rounded-full border border-ink/10 px-3 py-1 text-xs font-medium text-ink">Edit</button>
                        <button type="button" onClick={() => void handleDeleteSamplingToolRecord(tool)} className="rounded-full border border-redoxide/20 px-3 py-1 text-xs font-medium text-redoxide">Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
