import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  createBusinessUnit,
  fetchBatches,
  fetchBusinessUnits,
  fetchInventory,
  fetchInventoryTransactions,
  fetchMaterials,
  fetchPallets,
  fetchWarehouseTree,
  fetchWmsSummary,
  createWarehouse,
  createRack,
  createRoom,
  createShelf,
  createWarehouseZoneRule,
  createPallet,
  transferInventory,
  updateInventoryStatus
} from "../../lib/api";
import { useAppShellStore } from "../../stores/appShellStore";
import type { BusinessUnit } from "../../types/business-unit";
import type { Batch } from "../../types/batch";
import type { InventoryRecord, InventoryStatus } from "../../types/inventory";
import type { InventoryTransaction } from "../../types/inventory";
import type {
  CreateRoomRequest,
  CreateWarehouseRequest,
  MaterialLocationRule,
  Pallet,
  WarehouseTreeNode,
  WarehouseTreePallet,
  WarehouseTreeRack,
  WarehouseTreeRoom,
  WmsSummary
} from "../../types/location";
import type { Material, StorageCondition } from "../../types/material";

type WmsTab = "map" | "zones" | "materials";
type LocationRoomDraft = {
  roomCode: string;
  roomName: string;
  storageCondition: StorageCondition;
  temperatureRange: string;
  humidityRange: string;
  maxCapacity: string;
  capacityUom: string;
  allowedCategories: string;
  zoneName: string;
  restrictedAccess: boolean;
  quarantineOnly: boolean;
  rejectedOnly: boolean;
  notes: string;
  rackCount: string;
  shelvesPerRack: string;
  palletsPerShelf: string;
};

type BusinessUnitDraft = {
  unitCode: string;
  unitName: string;
  description: string;
};

function formatCondition(value: string | null | undefined) {
  if (!value) {
    return "Not set";
  }

  return value.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatQuantity(value: number, uom?: string | null) {
  return `${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value)}${uom ? ` ${uom}` : ""}`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function getDaysUntilDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function loadClass(percent: number) {
  if (percent >= 85) {
    return "bg-red-500";
  }
  if (percent >= 65) {
    return "bg-amber-400";
  }
  return "bg-green-500";
}

function cellTone(inventory: InventoryRecord | null) {
  if (!inventory) {
    return "border-dashed border-indigo-200 bg-white text-slate-400";
  }

  switch (inventory.status) {
    case "RELEASED":
      return "border-green-300 bg-green-50 text-green-700";
    case "SAMPLING":
    case "UNDER_TEST":
      return "border-amber-300 bg-amber-50 text-amber-700";
    case "REJECTED":
    case "BLOCKED":
      return "border-rose-300 bg-rose-50 text-rose-700";
    case "QUARANTINE":
    default:
      return "border-blue-300 bg-blue-50 text-blue-700";
  }
}

function cellLabel(inventory: InventoryRecord | null) {
  if (!inventory) {
    return "Empty";
  }

  switch (inventory.status) {
    case "SAMPLING":
      return "Sampling";
    case "UNDER_TEST":
      return "Under Test";
    case "RELEASED":
      return "Available";
    case "REJECTED":
    case "BLOCKED":
      return inventory.status === "REJECTED" ? "Rejected" : "Blocked";
    case "QUARANTINE":
    default:
      return "Quarantine";
  }
}

function legendItems() {
  return [
    { label: "Available", swatch: "border-green-300 bg-green-50", text: "text-green-700" },
    { label: "Sampling / Under Test", swatch: "border-amber-300 bg-amber-50", text: "text-amber-700" },
    { label: "Rejected / Blocked", swatch: "border-rose-300 bg-rose-50", text: "text-rose-700" },
    { label: "Quarantine", swatch: "border-blue-300 bg-blue-50", text: "text-blue-700" },
    { label: "Empty", swatch: "border-dashed border-indigo-200 bg-white", text: "text-slate-600" }
  ] as const;
}

function statusPillClass(inventory: InventoryRecord | null) {
  if (!inventory) {
    return "bg-slate-100 text-slate-600";
  }

  switch (inventory.status) {
    case "RELEASED":
      return "bg-green-100 text-green-700";
    case "SAMPLING":
    case "UNDER_TEST":
      return "bg-amber-100 text-amber-700";
    case "REJECTED":
    case "BLOCKED":
      return "bg-rose-100 text-rose-700";
    case "QUARANTINE":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

function inventoryStatusLabel(status: InventoryStatus) {
  switch (status) {
    case "QUARANTINE":
      return "Quarantine";
    case "SAMPLING":
      return "Sampling";
    case "UNDER_TEST":
      return "Under Test";
    case "RELEASED":
      return "Released";
    case "REJECTED":
      return "Rejected";
    case "BLOCKED":
      return "Blocked";
    default:
      return status;
  }
}

function getStatusActionOptions(status: InventoryStatus) {
  switch (status) {
    case "QUARANTINE":
      return [{ status: "SAMPLING", label: "Move To Sampling" }] as const;
    case "SAMPLING":
      return [{ status: "UNDER_TEST", label: "Move To Under Test" }] as const;
    case "UNDER_TEST":
      return [
        { status: "RELEASED", label: "Release Stock" },
        { status: "REJECTED", label: "Reject Stock" },
        { status: "BLOCKED", label: "Block Stock" }
      ] as const;
    default:
      return [] as const;
  }
}

function createEmptyLocationRoomDraft(): LocationRoomDraft {
  return {
    roomCode: "",
    roomName: "",
    storageCondition: "AMBIENT",
    temperatureRange: "",
    humidityRange: "",
    maxCapacity: "",
    capacityUom: "kg",
    allowedCategories: "",
    zoneName: "",
    restrictedAccess: false,
    quarantineOnly: false,
    rejectedOnly: false,
    notes: "",
    rackCount: "2",
    shelvesPerRack: "5",
    palletsPerShelf: "4"
  };
}

function createEmptyBusinessUnitDraft(): BusinessUnitDraft {
  return {
    unitCode: "",
    unitName: "",
    description: ""
  };
}

function formatSequence(value: number) {
  return String(value).padStart(2, "0");
}

export function WarehousePage() {
  const currentUserName = useAppShellStore((state) => state.currentUser.name);
  const [activeTab, setActiveTab] = useState<WmsTab>("map");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [selectedRackId, setSelectedRackId] = useState("");
  const [selectedPalletId, setSelectedPalletId] = useState("");
  const [materialSearch, setMaterialSearch] = useState("");
  const [moveDraft, setMoveDraft] = useState<{ inventoryId: string; palletId: string } | null>(null);
  const [destinationPalletId, setDestinationPalletId] = useState("");
  const [moveQuantity, setMoveQuantity] = useState("");
  const [moveRemarks, setMoveRemarks] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [statusRemarks, setStatusRemarks] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreatingLocation, setIsCreatingLocation] = useState(false);
  const [isCreatingBusinessUnit, setIsCreatingBusinessUnit] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [businessUnitDraft, setBusinessUnitDraft] = useState<BusinessUnitDraft>(createEmptyBusinessUnitDraft());
  const [warehouseDraft, setWarehouseDraft] = useState<CreateWarehouseRequest>({
    warehouseCode: "",
    warehouseName: "",
    businessUnitId: "",
    description: "",
    createdBy: currentUserName
  });
  const [roomDrafts, setRoomDrafts] = useState<LocationRoomDraft[]>([createEmptyLocationRoomDraft()]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["warehouse-page"],
    queryFn: async () => {
      const [warehouseTree, wmsSummary, inventoryPage, inventoryTransactionPage, materialPage, batchPage, palletPage, businessUnitPage] =
        await Promise.all([
          fetchWarehouseTree(),
          fetchWmsSummary(),
          fetchInventory(0, 500),
          fetchInventoryTransactions(0, 500),
          fetchMaterials(0, 500),
          fetchBatches(0, 500),
          fetchPallets(0, 500),
          fetchBusinessUnits(0, 200)
        ]);

      return {
        warehouseTree,
        wmsSummary,
        inventory: inventoryPage.content,
        inventoryTransactions: inventoryTransactionPage,
        materials: materialPage.content,
        batches: batchPage.content,
        pallets: palletPage.content,
        businessUnits: businessUnitPage.content
      };
    }
  });

  const warehouseTree = data?.warehouseTree ?? [];
  const wmsSummary = data?.wmsSummary ?? ({ warehouses: [], rooms: [], zoneRules: [], materialLocations: [] } as WmsSummary);
  const inventory = data?.inventory ?? [];
  const inventoryTransactions = data?.inventoryTransactions?.content ?? [];
  const materials = data?.materials ?? [];
  const batches = data?.batches ?? [];
  const pallets = data?.pallets ?? [];
  const businessUnits = data?.businessUnits ?? [];
  const errorMessage = error instanceof Error ? error.message : error ? "Unknown error" : null;

  const materialById = useMemo(() => new Map(materials.map((material) => [material.id, material])), [materials]);
  const batchById = useMemo(() => new Map(batches.map((batch) => [batch.id, batch])), [batches]);
  const palletById = useMemo(() => new Map(pallets.map((pallet) => [pallet.id, pallet])), [pallets]);
  const materialLocationRuleByMaterialId = useMemo(
    () => new Map(wmsSummary.materialLocations.map((rule) => [rule.materialId, rule])),
    [wmsSummary.materialLocations]
  );
  const palletContextById = useMemo(() => {
    const contexts = new Map<string, { warehouseId: string; roomId: string; rackId: string; shelfId: string }>();
    for (const warehouse of warehouseTree) {
      for (const room of warehouse.rooms) {
        for (const rack of room.racks) {
          for (const shelf of rack.shelves) {
            for (const pallet of shelf.pallets) {
              contexts.set(pallet.id, {
                warehouseId: warehouse.id,
                roomId: room.id,
                rackId: rack.id,
                shelfId: shelf.id
              });
            }
          }
        }
      }
    }
    return contexts;
  }, [warehouseTree]);
  const inventoryByPalletId = useMemo(
    () => new Map(inventory.map((record) => [record.palletId, record])),
    [inventory]
  );

  useEffect(() => {
    if (!selectedWarehouseId && warehouseTree[0]) {
      setSelectedWarehouseId(warehouseTree[0].id);
    }
  }, [selectedWarehouseId, warehouseTree]);

  const activeWarehouse = useMemo(
    () => warehouseTree.find((warehouse) => warehouse.id === selectedWarehouseId) ?? warehouseTree[0] ?? null,
    [selectedWarehouseId, warehouseTree]
  );

  useEffect(() => {
    if (activeWarehouse && (!selectedRoomId || !activeWarehouse.rooms.some((room) => room.id === selectedRoomId))) {
      setSelectedRoomId(activeWarehouse.rooms[0]?.id ?? "");
    }
  }, [activeWarehouse, selectedRoomId]);

  const activeRoom = useMemo(
    () => activeWarehouse?.rooms.find((room) => room.id === selectedRoomId) ?? activeWarehouse?.rooms[0] ?? null,
    [activeWarehouse, selectedRoomId]
  );

  useEffect(() => {
    if (activeRoom && (!selectedRackId || !activeRoom.racks.some((rack) => rack.id === selectedRackId))) {
      setSelectedRackId(activeRoom.racks[0]?.id ?? "");
    }
  }, [activeRoom, selectedRackId]);

  const activeRack = useMemo(
    () => activeRoom?.racks.find((rack) => rack.id === selectedRackId) ?? activeRoom?.racks[0] ?? null,
    [activeRoom, selectedRackId]
  );

  useEffect(() => {
    const firstPalletId = activeRack?.shelves[0]?.pallets[0]?.id ?? "";
    if (firstPalletId && (!selectedPalletId || !activeRack?.shelves.some((shelf) => shelf.pallets.some((pallet) => pallet.id === selectedPalletId)))) {
      setSelectedPalletId(firstPalletId);
    }
  }, [activeRack, selectedPalletId]);

  const activePalletNode = useMemo(() => {
    for (const shelf of activeRack?.shelves ?? []) {
      const found = shelf.pallets.find((pallet) => pallet.id === selectedPalletId);
      if (found) {
        return found;
      }
    }
    return activeRack?.shelves[0]?.pallets[0] ?? null;
  }, [activeRack, selectedPalletId]);

  const activePallet = activePalletNode ? palletById.get(activePalletNode.id) ?? null : null;
  const activeInventory = activePalletNode ? inventoryByPalletId.get(activePalletNode.id) ?? null : null;
  const activeMaterial = activeInventory ? materialById.get(activeInventory.materialId) ?? null : null;
  const activeBatch = activeInventory ? batchById.get(activeInventory.batchId) ?? null : null;
  const activeMaterialLocationRule = activeMaterial ? materialLocationRuleByMaterialId.get(activeMaterial.id) ?? null : null;
  const roomSummary = useMemo(
    () => wmsSummary.rooms.find((room) => room.roomId === activeRoom?.id) ?? null,
    [activeRoom?.id, wmsSummary.rooms]
  );
  const activeInventoryHistory = useMemo(
    () => inventoryTransactions
      .filter((transaction: InventoryTransaction) =>
        (activeInventory && transaction.inventoryId === activeInventory.id)
        || (activePalletNode && transaction.palletId === activePalletNode.id))
      .slice(0, 8),
    [activeInventory, activePalletNode, inventoryTransactions]
  );
  const availableStatusActions = useMemo(
    () => (activeInventory ? getStatusActionOptions(activeInventory.status) : []),
    [activeInventory]
  );

  const mapStats = useMemo(() => {
    const palletsInRoom = activeRoom?.racks.flatMap((rack) => rack.shelves.flatMap((shelf) => shelf.pallets)) ?? [];
    let available = 0;
    let partial = 0;
    let full = 0;
    let reserved = 0;

    for (const pallet of palletsInRoom) {
      const record = inventoryByPalletId.get(pallet.id);
      if (!record) {
        available += 1;
      } else if (record.status === "SAMPLING" || record.status === "UNDER_TEST" || record.status === "QUARANTINE") {
        reserved += 1;
      } else if (record.status === "RELEASED") {
        partial += 1;
      } else {
        full += 1;
      }
    }

    return { available, partial, full, reserved };
  }, [activeRoom, inventoryByPalletId]);

  const groupedZoneRooms = useMemo(() => {
    return wmsSummary.warehouses.map((warehouse) => ({
      warehouse,
      rooms: wmsSummary.rooms.filter((room) => room.warehouseId === warehouse.warehouseId)
    }));
  }, [wmsSummary.rooms, wmsSummary.warehouses]);

  const filteredMaterialLocations = useMemo(() => {
    const search = materialSearch.trim().toLowerCase();
    if (!search) {
      return wmsSummary.materialLocations;
    }

    return wmsSummary.materialLocations.filter((rule) =>
      `${rule.materialName ?? ""} ${rule.materialCode ?? ""}`.toLowerCase().includes(search)
    );
  }, [materialSearch, wmsSummary.materialLocations]);

  const fefoPriorityLots = useMemo(() => {
    return inventory
      .map((record) => {
        const material = materialById.get(record.materialId);
        const batch = batchById.get(record.batchId);
        const pallet = palletById.get(record.palletId);
        const rule = materialLocationRuleByMaterialId.get(record.materialId) ?? null;
        const daysUntilExpiry = getDaysUntilDate(batch?.expiryDate ?? null);
        return {
          inventory: record,
          material,
          batch,
          pallet,
          rule,
          daysUntilExpiry
        };
      })
      .filter((entry) => entry.inventory.status === "RELEASED" && entry.batch?.expiryDate)
      .sort((left, right) => {
        const leftValue = left.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;
        const rightValue = right.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;
        if (leftValue !== rightValue) {
          return leftValue - rightValue;
        }
        return (left.material?.materialName ?? "").localeCompare(right.material?.materialName ?? "");
      })
      .slice(0, 8);
  }, [batchById, inventory, materialById, materialLocationRuleByMaterialId, palletById]);

  const activeMaterialFefoLots = useMemo(() => {
    if (!activeMaterial) {
      return [];
    }

    return inventory
      .filter((record) => record.materialId === activeMaterial.id && record.status === "RELEASED")
      .map((record) => ({
        inventory: record,
        batch: batchById.get(record.batchId) ?? null,
        pallet: palletById.get(record.palletId) ?? null,
        daysUntilExpiry: getDaysUntilDate(batchById.get(record.batchId)?.expiryDate ?? null)
      }))
      .filter((entry) => entry.batch?.expiryDate)
      .sort((left, right) => {
        const leftValue = left.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;
        const rightValue = right.daysUntilExpiry ?? Number.MAX_SAFE_INTEGER;
        return leftValue - rightValue;
      });
  }, [activeMaterial, batchById, inventory, palletById]);

  const activeInventoryFefoRank = useMemo(() => {
    if (!activeInventory || activeInventory.status !== "RELEASED") {
      return null;
    }
    const index = activeMaterialFefoLots.findIndex((entry) => entry.inventory.id === activeInventory.id);
    return index >= 0 ? index + 1 : null;
  }, [activeInventory, activeMaterialFefoLots]);

  const activeAllocationGuidance = useMemo(() => {
    if (!activeInventory || !activeMaterialLocationRule) {
      return null;
    }

    const quarantineFlow = activeInventory.status === "QUARANTINE"
      || activeInventory.status === "SAMPLING"
      || activeInventory.status === "UNDER_TEST";

    if (quarantineFlow) {
      if (!activeMaterialLocationRule.quarantineWarehouseCode && !activeMaterialLocationRule.quarantineRoomCode) {
        return {
          tone: "amber" as const,
          title: "No quarantine location rule",
          detail: "Configure a quarantine warehouse/room for this material before the next GRN cycle."
        };
      }
      return {
        tone: "indigo" as const,
        title: "Preferred quarantine route",
        detail: `${activeMaterialLocationRule.quarantineWarehouseCode ?? "WH"} / ${activeMaterialLocationRule.quarantineRoomCode ?? "Room"}`
      };
    }

    if (!activeMaterialLocationRule.defaultWarehouseCode && !activeMaterialLocationRule.defaultRoomCode) {
      return {
        tone: "amber" as const,
        title: "No default putaway rule",
        detail: "Assign a default warehouse/room/rack for released stock."
      };
    }

    return {
      tone: "green" as const,
      title: "Preferred released-stock route",
      detail: [
        activeMaterialLocationRule.defaultWarehouseCode ?? "WH",
        activeMaterialLocationRule.defaultRoomCode ?? "Room",
        activeMaterialLocationRule.defaultRackCode ?? null
      ].filter(Boolean).join(" / ")
    };
  }, [activeInventory, activeMaterialLocationRule]);

  const availableDestinationPallets = useMemo(() => {
    if (!activeRack || !activeInventory) {
      return [];
    }

    const quarantineFlow = activeInventory.status === "QUARANTINE"
      || activeInventory.status === "SAMPLING"
      || activeInventory.status === "UNDER_TEST";

    return pallets
      .filter(
        (pallet) =>
          pallet.id !== activePallet?.id &&
          pallet.storageCondition === activePallet?.storageCondition &&
          !inventoryByPalletId.has(pallet.id)
      )
      .sort((left, right) => {
        const leftContext = palletContextById.get(left.id);
        const rightContext = palletContextById.get(right.id);
        const preferredRackId = activeMaterialLocationRule?.defaultRackId ?? null;
        const preferredRoomId = quarantineFlow
          ? activeMaterialLocationRule?.quarantineRoomId ?? null
          : activeMaterialLocationRule?.defaultRoomId ?? null;
        const preferredWarehouseId = quarantineFlow
          ? activeMaterialLocationRule?.quarantineWarehouseId ?? null
          : activeMaterialLocationRule?.defaultWarehouseId ?? null;

        const leftScore =
          (preferredWarehouseId && leftContext?.warehouseId === preferredWarehouseId ? 1 : 0)
          + (preferredRoomId && leftContext?.roomId === preferredRoomId ? 3 : 0)
          + (!quarantineFlow && preferredRackId && leftContext?.rackId === preferredRackId ? 5 : 0);
        const rightScore =
          (preferredWarehouseId && rightContext?.warehouseId === preferredWarehouseId ? 1 : 0)
          + (preferredRoomId && rightContext?.roomId === preferredRoomId ? 3 : 0)
          + (!quarantineFlow && preferredRackId && rightContext?.rackId === preferredRackId ? 5 : 0);
        if (leftScore !== rightScore) {
          return rightScore - leftScore;
        }
        return left.palletCode.localeCompare(right.palletCode);
      });
  }, [
    activeInventory,
    activeMaterialLocationRule,
    activePallet?.id,
    activePallet?.storageCondition,
    activeRack,
    inventoryByPalletId,
    palletContextById,
    pallets,
  ]);

  async function handleMoveLocation() {
    if (!moveDraft || !destinationPalletId || !moveQuantity) {
      setMoveError("Select destination pallet and quantity.");
      return;
    }

    setIsMoving(true);
    setMoveError(null);
    try {
      await transferInventory(moveDraft.inventoryId, destinationPalletId, Number(moveQuantity), moveRemarks || undefined);
      setMoveDraft(null);
      setDestinationPalletId("");
      setMoveQuantity("");
      setMoveRemarks("");
      await refetch();
    } catch (moveRequestError) {
      setMoveError(moveRequestError instanceof Error ? moveRequestError.message : "Unable to move inventory");
    } finally {
      setIsMoving(false);
    }
  }

  async function handleStatusUpdate(targetStatus: InventoryStatus) {
    if (!activeInventory) {
      return;
    }

    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      await updateInventoryStatus(activeInventory.id, targetStatus, statusRemarks || undefined);
      setStatusRemarks("");
      await refetch();
    } catch (statusUpdateError) {
      setStatusError(statusUpdateError instanceof Error ? statusUpdateError.message : "Unable to update inventory status");
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleCreateLocation() {
    if (!warehouseDraft.warehouseCode.trim() || !warehouseDraft.warehouseName.trim()) {
      setCreateError("Business unit, warehouse code, and warehouse name are required.");
      return;
    }
    if (!warehouseDraft.businessUnitId?.trim() && (!businessUnitDraft.unitCode.trim() || !businessUnitDraft.unitName.trim())) {
      setCreateError("Select an existing business unit or create a new one.");
      return;
    }
    if (roomDrafts.some((room) => !room.roomCode.trim() || !room.roomName.trim())) {
      setCreateError("Each room needs a code and name.");
      return;
    }
    if (
      roomDrafts.some((room) =>
        [room.rackCount, room.shelvesPerRack, room.palletsPerShelf].some((value) => {
          const parsed = Number(value);
          return !Number.isInteger(parsed) || parsed < 1;
        })
      )
    ) {
      setCreateError("Each room needs valid hierarchy counts for racks, shelves, and pallets.");
      return;
    }

    setIsCreatingLocation(true);
    setCreateError(null);

    try {
      let businessUnitId = warehouseDraft.businessUnitId?.trim() || "";
      if (!businessUnitId) {
        const businessUnit = await createBusinessUnit({
          unitCode: businessUnitDraft.unitCode.trim(),
          unitName: businessUnitDraft.unitName.trim(),
          description: businessUnitDraft.description.trim() || undefined,
          createdBy: currentUserName
        });
        businessUnitId = businessUnit.id;
      }

      const warehouse = await createWarehouse({
        ...warehouseDraft,
        warehouseCode: warehouseDraft.warehouseCode.trim(),
        warehouseName: warehouseDraft.warehouseName.trim(),
        businessUnitId,
        description: warehouseDraft.description?.trim() || undefined,
        createdBy: currentUserName
      });

      for (const room of roomDrafts) {
        const createdRoom = await createRoom(warehouse.id, {
          roomCode: room.roomCode.trim(),
          roomName: room.roomName.trim(),
          storageCondition: room.storageCondition,
          description: room.notes.trim() || undefined,
          maxCapacity: room.maxCapacity ? Number(room.maxCapacity) : undefined,
          capacityUom: room.capacityUom.trim() || undefined,
          temperatureRange: room.temperatureRange.trim() || undefined,
          humidityRange: room.humidityRange.trim() || undefined,
          createdBy: currentUserName
        } satisfies CreateRoomRequest);

        const rackCount = Number(room.rackCount);
        const shelvesPerRack = Number(room.shelvesPerRack);
        const palletsPerShelf = Number(room.palletsPerShelf);

        const categories = room.allowedCategories
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean);

        if (categories.length === 0) {
          await createWarehouseZoneRule({
            roomId: createdRoom.id,
            zoneName: room.zoneName.trim() || room.roomName.trim(),
            restrictedAccess: room.restrictedAccess,
            quarantineOnly: room.quarantineOnly,
            rejectedOnly: room.rejectedOnly,
            notes: room.notes.trim() || undefined
          });
        } else {
          for (const category of categories) {
            await createWarehouseZoneRule({
              roomId: createdRoom.id,
              zoneName: room.zoneName.trim() || room.roomName.trim(),
              allowedMaterialType: category,
              restrictedAccess: room.restrictedAccess,
              quarantineOnly: room.quarantineOnly,
              rejectedOnly: room.rejectedOnly,
              notes: room.notes.trim() || undefined
            });
          }
        }

        for (let rackIndex = 1; rackIndex <= rackCount; rackIndex += 1) {
          const rackCode = `${room.roomCode.trim()}-RK-${formatSequence(rackIndex)}`;
          const rack = await createRack(createdRoom.id, {
            rackCode,
            rackName: `Rack ${formatSequence(rackIndex)}`,
            description: `Auto-generated for ${room.roomCode.trim()}`,
            createdBy: currentUserName
          });

          for (let shelfIndex = 1; shelfIndex <= shelvesPerRack; shelfIndex += 1) {
            const shelfCode = `S-${formatSequence(shelfIndex)}`;
            const shelf = await createShelf(rack.id, {
              shelfCode,
              shelfName: `Shelf ${formatSequence(shelfIndex)}`,
              description: `Auto-generated for ${rackCode}`,
              createdBy: currentUserName
            });

            for (let palletIndex = 1; palletIndex <= palletsPerShelf; palletIndex += 1) {
              const palletCode = `P-${formatSequence(rackIndex)}${formatSequence(shelfIndex)}${formatSequence(palletIndex)}`;
              await createPallet(shelf.id, {
                palletCode,
                palletName: `Pallet ${formatSequence(rackIndex)}.${formatSequence(shelfIndex)}.${formatSequence(palletIndex)}`,
                description: `Auto-generated for ${room.roomCode.trim()}`,
                createdBy: currentUserName
              });
            }
          }
        }
      }

      setIsCreateOpen(false);
      setWarehouseDraft({
        warehouseCode: "",
        warehouseName: "",
        businessUnitId: "",
        description: "",
        createdBy: currentUserName
      });
      setBusinessUnitDraft(createEmptyBusinessUnitDraft());
      setRoomDrafts([createEmptyLocationRoomDraft()]);
      await refetch();
    } catch (submitError) {
      setCreateError(submitError instanceof Error ? submitError.message : "Unable to create location.");
    } finally {
      setIsCreatingLocation(false);
    }
  }

  async function handleCreateBusinessUnit() {
    if (warehouseDraft.businessUnitId?.trim()) {
      return;
    }
    if (!businessUnitDraft.unitCode.trim() || !businessUnitDraft.unitName.trim()) {
      setCreateError("Business unit code and name are required.");
      return;
    }

    setIsCreatingBusinessUnit(true);
    setCreateError(null);
    try {
      const businessUnit = await createBusinessUnit({
        unitCode: businessUnitDraft.unitCode.trim(),
        unitName: businessUnitDraft.unitName.trim(),
        description: businessUnitDraft.description.trim() || undefined,
        createdBy: currentUserName
      });
      setWarehouseDraft((current) => ({ ...current, businessUnitId: businessUnit.id }));
      setBusinessUnitDraft(createEmptyBusinessUnitDraft());
      await refetch();
    } catch (businessUnitError) {
      setCreateError(businessUnitError instanceof Error ? businessUnitError.message : "Unable to create business unit.");
    } finally {
      setIsCreatingBusinessUnit(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[24px] border border-indigo-100 bg-[#eef2ff] shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-indigo-100 bg-white px-5 py-4">
          <div className="text-xs text-slate-400">
            Warehouse / <span className="font-semibold text-indigo-700">WMS</span>
          </div>
          <div className="ml-2 flex items-center gap-2">
            {([
              ["map", "Map View"],
              ["zones", "Zone Assignments"],
              ["materials", "Material → Location"]
            ] as const).map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={[
                  "rounded-xl px-4 py-2 text-xs font-semibold transition",
                  activeTab === tab
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-indigo-600 hover:bg-indigo-50"
                ].join(" ")}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm"
            >
              + New Location
            </button>
            <button
              type="button"
              className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600"
            >
              Export Map
            </button>
          </div>
        </div>

        {errorMessage ? (
          <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">{errorMessage}</div>
        ) : null}

        {activeTab === "map" ? (
          <div className="grid min-h-[720px] gap-0 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="bg-[#eef2ff] p-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-800">
                    {activeWarehouse?.warehouseCode ?? "WH"} / {activeRoom?.roomCode ?? "Room"} / {activeRack?.rackCode ?? "Rack"}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {(activeWarehouse?.businessUnitCode && activeWarehouse?.businessUnitName)
                      ? `${activeWarehouse.businessUnitCode} · ${activeWarehouse.businessUnitName} · `
                      : ""}
                    {formatCondition(activeRoom?.storageCondition)} storage · {roomSummary?.temperatureRange ?? "15–25°C"} · {roomSummary?.humidityRange ?? "40–65% RH"} · {roomSummary?.rackCount ?? activeRoom?.racks.length ?? 0} racks · {Math.round(roomSummary?.occupancyPercent ?? 0)}% occupied
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-700">{Math.round(roomSummary?.occupancyPercent ?? 0)}%</div>
                    <div className="text-[11px] text-slate-500">Occupancy</div>
                  </div>
                  <div className="h-4 w-28 overflow-hidden rounded-full bg-indigo-100">
                    <div
                      className="h-full rounded-full bg-indigo-500"
                      style={{ width: `${Math.min(100, Math.round(roomSummary?.occupancyPercent ?? 0))}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-[22px] border border-indigo-200 bg-white px-4 py-4 shadow-sm">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Selected Path</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700">
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{activeWarehouse?.warehouseCode ?? "WH"}</span>
                  <span className="text-slate-300">→</span>
                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-indigo-700">{activeRoom?.roomCode ?? "Room"}</span>
                  <span className="text-slate-300">→</span>
                  <span className="rounded-full bg-indigo-600 px-3 py-1 text-white">{activeRack?.rackCode ?? "Rack"}</span>
                </div>
              </div>

              <div className="mt-5 space-y-5">
                {activeRack ? (
                  <article key={activeRack.id} className="rounded-[22px] border border-indigo-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-indigo-700">{activeRack.rackCode}</p>
                        <span className="text-[11px] text-slate-400">{activeRack.shelves.length} shelves × 4 pallets</span>
                      </div>
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                        {`${Math.round((activeRack.shelves.flatMap((shelf) => shelf.pallets).filter((pallet) => inventoryByPalletId.has(pallet.id)).length / Math.max(activeRack.shelves.flatMap((shelf) => shelf.pallets).length, 1)) * 100)}% used`}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      {activeRack.shelves.map((shelf) => (
                        <div key={shelf.id} className="flex items-center gap-2">
                          <div className="w-12 text-right text-[10px] font-semibold text-slate-400">{shelf.shelfCode}</div>
                          <div className="grid flex-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                            {(shelf.pallets.length > 0 ? shelf.pallets : ([] as WarehouseTreePallet[])).map((pallet) => {
                              const record = inventoryByPalletId.get(pallet.id) ?? null;
                              const material = record ? materialById.get(record.materialId) ?? null : null;
                              return (
                                <button
                                  key={pallet.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedRackId(activeRack.id);
                                    setSelectedPalletId(pallet.id);
                                  }}
                                  className={[
                                    "min-h-[66px] rounded-lg border px-3 py-2 text-center transition",
                                    cellTone(record),
                                    selectedPalletId === pallet.id ? "ring-2 ring-indigo-400" : ""
                                  ].join(" ")}
                                >
                                  <div className="text-[10px] font-bold">{pallet.palletCode}</div>
                                  <div className="mt-1 text-[11px] font-semibold">
                                    {material?.materialName?.replace("Monohydrate", "").replace("Microcrystalline", "MCC") ?? cellLabel(record)}
                                  </div>
                                  <div className="mt-1 text-[11px] font-bold">
                                    {record ? formatQuantity(record.quantityOnHand, record.uom) : "Empty"}
                                  </div>
                                </button>
                              );
                            })}
                            {shelf.pallets.length === 0 ? (
                              <div className="min-h-[66px] rounded-lg border border-dashed border-indigo-200 px-3 py-2 text-center text-[11px] font-semibold text-slate-400">
                                Empty
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ) : (
                  <div className="rounded-[22px] border border-dashed border-indigo-200 bg-white px-5 py-16 text-center text-sm text-slate-400 shadow-sm">
                    Select a warehouse, room, and rack from the right-side panel.
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Available slots", value: mapStats.available, tone: "text-green-600" },
                  { label: "Partial slots", value: mapStats.partial, tone: "text-amber-600" },
                  { label: "Full slots", value: mapStats.full, tone: "text-rose-500" },
                    { label: "Quarantine", value: mapStats.reserved, tone: "text-blue-600" }
                ].map((stat) => (
                  <div key={stat.label} className="rounded-2xl border border-indigo-100 bg-white px-4 py-4 text-center shadow-sm">
                    <div className={`text-3xl font-bold ${stat.tone}`}>{stat.value}</div>
                    <div className="mt-1 text-[11px] text-slate-500">{stat.label}</div>
                  </div>
                ))}
              </div>
            </section>

            <aside className="border-l border-indigo-100 bg-white">
              <div className="border-b border-indigo-100 px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Hierarchy Selection</p>
                <p className="mt-1 text-[11px] text-slate-400">Choose warehouse, room, and rack directly instead of scrolling through the map.</p>
              </div>

              <div className="space-y-4 border-b border-indigo-100 p-4">
                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Warehouse</div>
                  <div className="space-y-2">
                    {warehouseTree.map((warehouse) => (
                      <button
                        key={warehouse.id}
                        type="button"
                        onClick={() => {
                          setSelectedWarehouseId(warehouse.id);
                          setSelectedRoomId(warehouse.rooms[0]?.id ?? "");
                          setSelectedRackId(warehouse.rooms[0]?.racks[0]?.id ?? "");
                        }}
                        className={[
                          "flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                          activeWarehouse?.id === warehouse.id
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-indigo-100 text-slate-600 hover:bg-indigo-50"
                        ].join(" ")}
                      >
                        <span className="font-semibold">{warehouse.warehouseCode}</span>
                        <span className="text-[11px] text-slate-400">{warehouse.rooms.length} rooms</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Room</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(activeWarehouse?.rooms ?? []).map((room) => (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => {
                          setSelectedRoomId(room.id);
                          setSelectedRackId(room.racks[0]?.id ?? "");
                        }}
                        className={[
                          "flex items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition",
                          activeRoom?.id === room.id
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-indigo-100 text-slate-600 hover:bg-indigo-50"
                        ].join(" ")}
                      >
                        <span className="font-semibold">{room.roomCode}</span>
                        <span className="text-[11px] text-slate-400">{room.racks.length} racks</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Rack</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {(activeRoom?.racks ?? []).map((rack) => (
                      <label
                        key={rack.id}
                        className={[
                          "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 text-sm transition",
                          activeRack?.id === rack.id
                            ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                            : "border-indigo-100 text-slate-600 hover:bg-indigo-50"
                        ].join(" ")}
                      >
                        <input
                          type="checkbox"
                          checked={activeRack?.id === rack.id}
                          onChange={() => {
                            setSelectedRackId(rack.id);
                            setSelectedPalletId(rack.shelves[0]?.pallets[0]?.id ?? "");
                          }}
                          className="h-4 w-4 rounded border-indigo-300 text-indigo-600 focus:ring-indigo-400"
                        />
                        <div className="min-w-0">
                          <div className="font-semibold">{rack.rackCode}</div>
                          <div className="text-[11px] text-slate-400">{rack.shelves.length} shelves</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Legend</p>
                  <div className="mt-3 grid gap-2">
                    {legendItems().map((item) => (
                      <div key={item.label} className="flex items-center justify-between rounded-lg border border-indigo-100 bg-slate-50/70 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className={`h-4 w-4 rounded border ${item.swatch}`} />
                          <span className={`text-[11px] font-semibold ${item.text}`}>{item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-b border-indigo-100 bg-indigo-50 px-4 py-5">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-indigo-700">Pallet Detail</div>
                <div className="mt-1 font-mono text-[28px] font-bold text-slate-800">{activePalletNode?.palletCode ?? "—"}</div>
                <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusPillClass(activeInventory)}`}>
                  {activeInventory ? cellLabel(activeInventory) : "Empty"}
                </span>
              </div>
              <div className="space-y-4 p-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Location</div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">
                    {activeWarehouse?.warehouseCode} / {activeRoom?.roomCode} / {activeRack?.rackCode} / {activePalletNode?.palletCode}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Material</div>
                  <div className="mt-1 text-sm font-semibold text-slate-700">{activeMaterial?.materialName ?? "Unassigned"}</div>
                  <div className="text-[11px] font-mono text-blue-600">{activeMaterial?.materialCode ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Container / Qty</div>
                  <div className="mt-1 text-sm text-slate-700">
                    {activeInventory ? `${activePalletNode?.palletName} · ${formatQuantity(activeInventory.quantityOnHand, activeInventory.uom)}` : "No inventory"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Lot / Label</div>
                  <div className="mt-1 font-mono text-sm text-blue-600">{activeBatch?.batchNumber ?? "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Status</div>
                  <div className="mt-2">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${statusPillClass(activeInventory)}`}>
                      {activeInventory ? cellLabel(activeInventory) : "Empty"}
                    </span>
                  </div>
                </div>
                <div className="space-y-3 border-t border-indigo-100 pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">FEFO / Putaway</div>
                  {activeAllocationGuidance ? (
                    <div
                      className={[
                        "rounded-xl border px-3 py-3",
                        activeAllocationGuidance.tone === "green"
                          ? "border-green-200 bg-green-50/70"
                          : activeAllocationGuidance.tone === "amber"
                            ? "border-amber-200 bg-amber-50/70"
                            : "border-indigo-200 bg-indigo-50/70"
                      ].join(" ")}
                    >
                      <div className="text-xs font-semibold text-slate-800">{activeAllocationGuidance.title}</div>
                      <div className="mt-1 text-[11px] text-slate-600">{activeAllocationGuidance.detail}</div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-indigo-200 px-3 py-3 text-[11px] text-slate-500">
                      No material location rule is configured for this pallet yet.
                    </div>
                  )}
                  {activeBatch?.expiryDate ? (
                    <div className="rounded-xl border border-indigo-100 bg-white px-3 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">Batch expiry</div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            Expires on {formatDate(activeBatch.expiryDate)}
                          </div>
                        </div>
                        <span
                          className={[
                            "rounded-full px-2 py-1 text-[10px] font-bold",
                            (getDaysUntilDate(activeBatch.expiryDate) ?? 9999) <= 30
                              ? "bg-rose-100 text-rose-700"
                              : (getDaysUntilDate(activeBatch.expiryDate) ?? 9999) <= 90
                                ? "bg-amber-100 text-amber-700"
                                : "bg-green-100 text-green-700"
                          ].join(" ")}
                        >
                          {(() => {
                            const days = getDaysUntilDate(activeBatch.expiryDate);
                            return days == null ? "No expiry" : `${days} days left`;
                          })()}
                        </span>
                      </div>
                      {activeInventoryFefoRank ? (
                        <div className="mt-2 text-[11px] text-slate-600">
                          FEFO rank for this material: <span className="font-semibold text-slate-800">#{activeInventoryFefoRank}</span>
                          {activeInventoryFefoRank === 1 ? " - pick this lot first." : " - an earlier expiry lot exists."}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-3 border-t border-indigo-100 pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Status Actions</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {activeInventory ? `Current state: ${inventoryStatusLabel(activeInventory.status)}` : "Select a filled pallet to change stock state."}
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={statusRemarks}
                    onChange={(event) => setStatusRemarks(event.target.value)}
                    placeholder="Remarks for QA, release, rejection or hold"
                    disabled={!activeInventory || availableStatusActions.length === 0 || isUpdatingStatus}
                    rows={3}
                    className="w-full rounded-xl border border-indigo-100 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-50"
                  />
                  {statusError ? <div className="text-xs font-medium text-rose-600">{statusError}</div> : null}
                  {availableStatusActions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-indigo-200 px-3 py-3 text-[11px] text-slate-500">
                      {activeInventory ? "No further status transition is allowed from the current state." : "No inventory available in this pallet."}
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {availableStatusActions.map((action) => (
                        <button
                          key={action.status}
                          type="button"
                          onClick={() => handleStatusUpdate(action.status)}
                          disabled={isUpdatingStatus}
                          className={[
                            "w-full rounded-xl px-4 py-3 text-sm font-semibold transition disabled:cursor-not-allowed",
                            action.status === "RELEASED"
                              ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-300"
                              : action.status === "REJECTED" || action.status === "BLOCKED"
                                ? "bg-rose-600 text-white hover:bg-rose-700 disabled:bg-rose-300"
                                : "bg-amber-500 text-white hover:bg-amber-600 disabled:bg-amber-300"
                          ].join(" ")}
                        >
                          {isUpdatingStatus ? "Updating..." : action.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2 border-t border-indigo-100 pt-4">
                  <button
                    type="button"
                    disabled={!activeInventory}
                    onClick={() => {
                      if (!activeInventory || !activePalletNode) {
                        return;
                      }
                      setMoveDraft({ inventoryId: activeInventory.id, palletId: activePalletNode.id });
                      setMoveQuantity(String(activeInventory.quantityOnHand));
                      setMoveError(null);
                    }}
                    className="w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
                  >
                    Move Location
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-xl border border-indigo-200 px-4 py-3 text-sm font-semibold text-indigo-600"
                  >
                    Print Label
                  </button>
                </div>
                <div className="border-t border-indigo-100 pt-4">
                  <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Movement History</div>
                  <div className="mt-3 space-y-2">
                    {activeInventoryHistory.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-indigo-200 px-3 py-4 text-center text-[11px] text-slate-400">
                        No movement history for this pallet yet.
                      </div>
                    ) : (
                      activeInventoryHistory.map((transaction: InventoryTransaction) => (
                        <div key={transaction.id} className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs font-semibold text-slate-800">
                                {transaction.transactionType.replace(/_/g, " ")}
                              </div>
                              <div className="mt-0.5 text-[10px] text-slate-500">
                                {formatQuantity(transaction.quantity, transaction.uom)} · {formatDateTime(transaction.createdAt)}
                              </div>
                            </div>
                            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-indigo-700">
                              {transaction.createdBy}
                            </span>
                          </div>
                          <div className="mt-2 text-[11px] text-slate-600">
                            {transaction.remarks ?? "No remarks"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        {activeTab === "zones" ? (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[34px] font-bold tracking-tight text-slate-800">Zone Assignments</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define which material categories and conditions are allowed in each room/zone.
                </p>
              </div>
              <button
                type="button"
                className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm"
              >
                + Add Zone Rule
              </button>
            </div>

            {groupedZoneRooms.map(({ warehouse, rooms }) => {
              const restricted = rooms.some((room) => room.currentLots > 0 && room.roomCode.toLowerCase().includes("q"));
              return (
                <section
                  key={warehouse.warehouseId}
                  className={`overflow-hidden rounded-[20px] border ${restricted ? "border-amber-200 bg-amber-50/50" : "border-indigo-200 bg-white"} shadow-sm`}
                >
                  <div className={`flex flex-wrap items-center gap-3 border-b px-5 py-4 ${restricted ? "border-amber-100 bg-amber-50" : "border-indigo-100 bg-indigo-50"}`}>
                    <div className={`text-lg font-bold ${restricted ? "text-amber-800" : "text-indigo-800"}`}>
                      {warehouse.warehouseCode} · {warehouse.warehouseName}
                    </div>
                    <div className={`ml-auto text-sm font-medium ${restricted ? "text-amber-600" : "text-indigo-600"}`}>
                      {restricted ? "Restricted access · QA authorised only" : `${warehouse.roomCount} rooms · ${warehouse.rackCount} racks · ${warehouse.palletCount} positions`}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className={`border-b ${restricted ? "border-amber-50 bg-amber-50/30" : "border-indigo-50 bg-indigo-50/40"}`}>
                          {(restricted
                            ? ["Room", "Purpose", "Accepts", "Current Lots", ""]
                            : ["Room", "Temp Zone", "Allowed Categories", "Max Capacity", "Current Load", ""]).map((column) => (
                            <th key={column} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rooms.map((room) => {
                          const roomRules = wmsSummary.zoneRules.filter((rule) => rule.roomId === room.roomId);
                          const loadPercent = Math.round(room.occupancyPercent ?? 0);
                          const firstRule = roomRules[0];
                          return (
                            <tr key={room.roomId} className={`border-b ${restricted ? "border-amber-50 hover:bg-amber-50/30" : "border-indigo-50 hover:bg-indigo-50/30"}`}>
                              <td className="px-5 py-4 font-semibold text-slate-800">
                                {room.roomCode} · {room.roomName}
                              </td>
                              {restricted ? (
                                <>
                                  <td className="px-5 py-4">
                                    <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-700">
                                      {firstRule?.quarantineOnly ? "Post-GRN hold" : firstRule?.rejectedOnly ? "QC-rejected" : "Restricted"}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4 text-slate-600">
                                    {roomRules.length === 0
                                      ? "No rule configured"
                                      : roomRules.map((rule) => rule.allowedMaterialType ?? formatCondition(rule.allowedStorageCondition)).filter(Boolean).join(", ")}
                                  </td>
                                  <td className="px-5 py-4 font-semibold text-amber-700">{room.currentLots} lots</td>
                                </>
                              ) : (
                                <>
                                  <td className="px-5 py-4">
                                    <span className="rounded-full bg-green-100 px-2 py-1 text-[11px] font-semibold text-green-700">
                                      {room.temperatureRange ?? formatCondition(room.storageCondition)}
                                    </span>
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex flex-wrap gap-1.5">
                                      {roomRules.length === 0 ? (
                                        <span className="text-sm text-slate-400">No categories</span>
                                      ) : (
                                        roomRules.map((rule) => (
                                          <span key={rule.id} className="rounded-md bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700">
                                            {rule.allowedMaterialType ?? formatCondition(rule.allowedStorageCondition)}
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-5 py-4 text-slate-600">
                                    {room.maxCapacity ? formatQuantity(room.maxCapacity, room.capacityUom) : "Not set"}
                                  </td>
                                  <td className="px-5 py-4">
                                    <div className="flex items-center gap-3">
                                      <div className="h-3 w-20 overflow-hidden rounded-full bg-indigo-100">
                                        <div className={`h-full rounded-full ${loadClass(loadPercent)}`} style={{ width: `${Math.min(loadPercent, 100)}%` }} />
                                      </div>
                                      <span className={`font-semibold ${loadPercent >= 85 ? "text-red-600" : loadPercent >= 65 ? "text-amber-700" : "text-green-700"}`}>
                                        {loadPercent}%
                                      </span>
                                    </div>
                                  </td>
                                </>
                              )}
                              <td className="px-5 py-4 text-right text-[11px] font-semibold text-indigo-600">Edit</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        ) : null}

        {activeTab === "materials" ? (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-[34px] font-bold tracking-tight text-slate-800">Material → Location Mapping</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Default and current storage assignments per material. Used during GRN putaway.
                </p>
              </div>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 rounded-2xl border border-indigo-100 bg-white px-4 py-2.5 text-sm text-slate-400">
                  <span>⌕</span>
                  <input
                    value={materialSearch}
                    onChange={(event) => setMaterialSearch(event.target.value)}
                    placeholder="Search material..."
                    className="w-44 bg-transparent outline-none placeholder:text-slate-400"
                  />
                </div>
                <button
                  type="button"
                  className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  Export
                </button>
              </div>
            </div>

            <section className="overflow-hidden rounded-[20px] border border-indigo-200 bg-white shadow-sm">
              <div className="grid gap-4 border-b border-indigo-100 bg-indigo-50/40 px-5 py-5 xl:grid-cols-[1.2fr_0.8fr]">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700">FEFO Priority</div>
                  <div className="mt-3 space-y-2">
                    {fefoPriorityLots.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-indigo-200 bg-white px-4 py-4 text-sm text-slate-500">
                        No released lots with expiry dates are available for FEFO ranking yet.
                      </div>
                    ) : (
                      fefoPriorityLots.map((entry, index) => (
                        <div key={entry.inventory.id} className="flex items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-white px-4 py-3">
                          <div>
                            <div className="text-sm font-semibold text-slate-800">
                              {index + 1}. {entry.material?.materialName ?? "Material"}
                            </div>
                            <div className="mt-1 text-[11px] text-slate-500">
                              {entry.batch?.batchNumber ?? "Batch"} · {entry.pallet?.palletCode ?? "Pallet"} · Expiry {formatDate(entry.batch?.expiryDate ?? null)}
                            </div>
                          </div>
                          <div className="text-right">
                            <div
                              className={[
                                "rounded-full px-2 py-1 text-[10px] font-bold",
                                (entry.daysUntilExpiry ?? 9999) <= 30
                                  ? "bg-rose-100 text-rose-700"
                                  : (entry.daysUntilExpiry ?? 9999) <= 90
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-green-100 text-green-700"
                              ].join(" ")}
                            >
                              {entry.daysUntilExpiry} days
                            </div>
                            <div className="mt-1 text-[10px] text-slate-500">
                              {formatQuantity(entry.inventory.quantityOnHand, entry.inventory.uom)}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700">Allocation Rules</div>
                  <div className="mt-3 space-y-2">
                    <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">Default putaway coverage</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {wmsSummary.materialLocations.filter((rule) => rule.defaultWarehouseCode).length} of {wmsSummary.materialLocations.length} materials have released-stock routing.
                      </div>
                    </div>
                    <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">Quarantine routing coverage</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {wmsSummary.materialLocations.filter((rule) => rule.quarantineWarehouseCode || rule.quarantineRoomCode).length} materials have quarantine room guidance.
                      </div>
                    </div>
                    <div className="rounded-xl border border-indigo-100 bg-white px-4 py-3">
                      <div className="text-sm font-semibold text-slate-800">Pending allocation setup</div>
                      <div className="mt-1 text-[11px] text-slate-500">
                        {wmsSummary.materialLocations.filter((rule) => !rule.defaultWarehouseCode).length} materials still need a default putaway rule before the next GRN cycle.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-indigo-100 bg-indigo-50/50">
                      {["Material", "Category", "Storage Condition", "Default Location", "Quarantine Zone", "Current Lots", "Stock", ""].map((column) => (
                        <th key={column} className="px-5 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                          {column}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterialLocations.map((rule: MaterialLocationRule) => (
                      <tr key={rule.id} className="border-b border-indigo-50 hover:bg-indigo-50/20">
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-800">{rule.materialName ?? "Material"}</div>
                          <div className="text-[11px] font-mono text-sky-600">{rule.materialCode ?? "—"}</div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-md bg-sky-100 px-2 py-1 text-[11px] font-semibold text-sky-700">
                            {rule.materialType ?? "Not set"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">{formatCondition(rule.storageCondition)}</td>
                        <td className="px-5 py-4">
                          {rule.defaultWarehouseCode || rule.defaultRoomCode ? (
                            <>
                              <div className="font-semibold text-slate-700">
                                {rule.defaultWarehouseCode ?? "WH"} / {rule.defaultRoomCode ?? "Room"}
                              </div>
                              <div className="text-[11px] text-slate-400">
                                {rule.defaultRackCode ? `${rule.defaultRackCode} · preferred` : "System assigned"}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="font-semibold text-red-500">Not assigned</div>
                              <div className="text-[11px] text-red-400">Action required</div>
                            </>
                          )}
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {rule.quarantineWarehouseCode || rule.quarantineRoomCode
                            ? `${rule.quarantineWarehouseCode ?? "WH"} / ${rule.quarantineRoomCode ?? "Room"}`
                            : "Not set"}
                        </td>
                        <td className="px-5 py-4 font-semibold text-indigo-600">{rule.currentLots} {rule.currentLots === 1 ? "lot" : "lots"}</td>
                        <td className="px-5 py-4 font-semibold text-slate-700">{formatQuantity(rule.currentStock, rule.stockUom)}</td>
                        <td className="px-5 py-4 text-right text-[11px] font-semibold text-indigo-600">
                          {rule.defaultWarehouseCode ? "Edit" : "Assign →"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-indigo-100 px-5 py-4 text-sm">
                <span className="text-slate-400">
                  Showing {filteredMaterialLocations.length} of {wmsSummary.materialLocations.length} materials ·{" "}
                  {wmsSummary.materialLocations.filter((rule) => !rule.defaultWarehouseCode).length} unassigned
                </span>
                {wmsSummary.materialLocations.some((rule) => !rule.defaultWarehouseCode) ? (
                  <span className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-500">
                    {wmsSummary.materialLocations.filter((rule) => !rule.defaultWarehouseCode).length} material has no default location — assign before next GRN
                  </span>
                ) : null}
              </div>
            </section>
          </div>
        ) : null}
      </section>

      {moveDraft ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4">
          <div className="w-full max-w-lg rounded-[24px] border border-indigo-100 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Move Location</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Transfer inventory from {activePalletNode?.palletCode} to another empty pallet.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setMoveDraft(null);
                  setDestinationPalletId("");
                  setMoveRemarks("");
                  setMoveError(null);
                }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {activeAllocationGuidance ? (
                <div
                  className={[
                    "rounded-2xl border px-4 py-3 text-sm",
                    activeAllocationGuidance.tone === "green"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : activeAllocationGuidance.tone === "amber"
                        ? "border-amber-200 bg-amber-50 text-amber-800"
                        : "border-indigo-200 bg-indigo-50 text-indigo-800"
                  ].join(" ")}
                >
                  <div className="font-semibold">{activeAllocationGuidance.title}</div>
                  <div className="mt-1 text-xs opacity-80">{activeAllocationGuidance.detail}</div>
                </div>
              ) : null}
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Destination pallet</span>
                <select
                  value={destinationPalletId}
                  onChange={(event) => setDestinationPalletId(event.target.value)}
                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                >
                  <option value="">Select destination</option>
                  {availableDestinationPallets.map((pallet) => (
                    <option key={pallet.id} value={pallet.id}>
                      {pallet.palletCode} - {pallet.palletName}
                    </option>
                  ))}
                </select>
                <div className="mt-1 text-[11px] text-slate-500">
                  Destinations are ranked to show the preferred putaway route first.
                </div>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Quantity</span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={moveQuantity}
                  onChange={(event) => setMoveQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Remarks</span>
                <textarea
                  value={moveRemarks}
                  onChange={(event) => setMoveRemarks(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                  placeholder="Optional movement remarks"
                />
              </label>
              {moveError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{moveError}</div>
              ) : null}
              <button
                type="button"
                onClick={() => void handleMoveLocation()}
                disabled={isMoving}
                className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {isMoving ? "Moving..." : "Confirm Move"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isCreateOpen ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/20 px-4 py-8">
          <div className="mx-auto flex h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-indigo-100 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between border-b border-indigo-100 bg-white px-6 py-5">
              <div>
                <p className="text-xs text-slate-400">Warehouse / <span className="font-semibold text-indigo-700">WMS</span></p>
                <h3 className="mt-1 text-xl font-semibold text-slate-800">Create New Location</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setCreateError(null);
                  }}
                  className="rounded-xl border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleCreateLocation()}
                  disabled={isCreatingLocation}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
                >
                  {isCreatingLocation ? "Creating..." : "Submit Location →"}
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden">
              <div className="grid h-full min-h-0 gap-0 overflow-hidden xl:grid-cols-[240px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-r border-indigo-100 bg-white p-5">
                <div className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Progress</div>
                <div className="mt-4 space-y-2">
                  {[
                    ["1", "Business Unit", "Select or create owner"],
                    ["2", "Warehouse Header", "Code & warehouse name"],
                    ["3", "Room Definitions", "Temp zone & capacity"],
                    ["4", "Review & Submit", "Create WMS structure"]
                  ].map(([step, title, note], index) => (
                    <div key={step} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${index === 0 ? "border border-indigo-200 bg-indigo-50" : ""}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${index === 0 ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-500"}`}>{step}</div>
                      <div>
                        <div className={`text-xs font-bold ${index === 0 ? "text-indigo-700" : "text-slate-600"}`}>{title}</div>
                        <div className="text-[10px] text-slate-400">{note}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </aside>

              <div className="min-h-0 overflow-y-auto bg-[#eef2ff] p-6">
                <div className="mx-auto max-w-4xl space-y-6">
                  <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">1</div>
                      <div>
                        <div className="font-semibold text-slate-800">Business Unit</div>
                        <div className="text-xs text-slate-400">Select an existing owner or create a new internal business unit</div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">Business Unit</span>
                        <select
                          value={warehouseDraft.businessUnitId ?? ""}
                          onChange={(event) => setWarehouseDraft((current) => ({ ...current, businessUnitId: event.target.value }))}
                          className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                        >
                          <option value="">Create/select business unit</option>
                          {businessUnits.map((businessUnit: BusinessUnit) => (
                            <option key={businessUnit.id} value={businessUnit.id}>
                              {businessUnit.unitCode} · {businessUnit.unitName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {!warehouseDraft.businessUnitId ? (
                      <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
                        <div className="text-sm font-semibold text-slate-800">New Business Unit</div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          Create the internal business unit first if it is not already available in the list.
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Business Unit Code</span>
                            <input
                              value={businessUnitDraft.unitCode}
                              onChange={(event) => setBusinessUnitDraft((current) => ({ ...current, unitCode: event.target.value }))}
                              className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                              placeholder="BU-OPS"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Business Unit Name</span>
                            <input
                              value={businessUnitDraft.unitName}
                              onChange={(event) => setBusinessUnitDraft((current) => ({ ...current, unitName: event.target.value }))}
                              className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                              placeholder="Operations"
                            />
                          </label>
                        </div>
                        <label className="mt-4 block">
                          <span className="mb-2 block text-sm font-medium text-slate-700">Business Unit Description</span>
                          <input
                            value={businessUnitDraft.description}
                            onChange={(event) => setBusinessUnitDraft((current) => ({ ...current, description: event.target.value }))}
                            className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                            placeholder="Internal business unit owning this warehouse"
                          />
                        </label>
                        <div className="mt-4 flex justify-end">
                          <button
                            type="button"
                            onClick={() => void handleCreateBusinessUnit()}
                            disabled={isCreatingBusinessUnit}
                            className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-indigo-300"
                          >
                            {isCreatingBusinessUnit ? "Creating business unit..." : "Create Business Unit"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</div>
                      <div>
                        <div className="font-semibold text-slate-800">Warehouse Header</div>
                        <div className="text-xs text-slate-400">Warehouse details and summary identity</div>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">Warehouse Code</span>
                        <input
                          value={warehouseDraft.warehouseCode}
                          onChange={(event) => setWarehouseDraft((current) => ({ ...current, warehouseCode: event.target.value }))}
                          className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                          placeholder="WH-A"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-2 block text-sm font-medium text-slate-700">Warehouse Name</span>
                        <input
                          value={warehouseDraft.warehouseName}
                          onChange={(event) => setWarehouseDraft((current) => ({ ...current, warehouseName: event.target.value }))}
                          className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                          placeholder="Raw Material Store"
                        />
                      </label>
                    </div>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-sm font-medium text-slate-700">Description</span>
                      <textarea
                        value={warehouseDraft.description ?? ""}
                        onChange={(event) => setWarehouseDraft((current) => ({ ...current, description: event.target.value }))}
                        className="min-h-24 w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                        placeholder="WH-A · Raw Material Store"
                      />
                    </label>
                  </section>

                  <section className="rounded-2xl border border-indigo-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">2</div>
                        <div>
                          <div className="font-semibold text-slate-800">Room Definitions</div>
                          <div className="text-xs text-slate-400">Build room rows like the WMS zone assignment screen</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRoomDrafts((current) => [...current, createEmptyLocationRoomDraft()])}
                        className="rounded-xl border border-indigo-200 px-4 py-2 text-xs font-semibold text-indigo-600"
                      >
                        + Add Room
                      </button>
                    </div>

                    <div className="mt-5 space-y-5">
                      {roomDrafts.map((room, index) => (
                        <div key={`draft-room-${index}`} className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-slate-800">Room {index + 1}</div>
                            <button
                              type="button"
                              onClick={() => setRoomDrafts((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)))}
                              className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-500"
                            >
                              Remove
                            </button>
                          </div>
                          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Room</span>
                              <input
                                value={room.roomCode}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, roomCode: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="R-01"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Room Name</span>
                              <input
                                value={room.roomName}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, roomName: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="General Store"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Temp Zone</span>
                              <select
                                value={room.storageCondition}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, storageCondition: event.target.value as StorageCondition } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                              >
                                {["AMBIENT", "ROOM_TEMPERATURE", "CONTROLLED_ROOM_TEMPERATURE", "REFRIGERATED_2_TO_8C", "COLD", "DEEP_FREEZER"].map((option) => (
                                  <option key={option} value={option}>{formatCondition(option)}</option>
                                ))}
                              </select>
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Temperature Range</span>
                              <input
                                value={room.temperatureRange}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, temperatureRange: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="Ambient 15–30°C"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Humidity Range</span>
                              <input
                                value={room.humidityRange}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, humidityRange: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="40–65% RH"
                              />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Max Capacity</span>
                              <div className="grid gap-3 grid-cols-[1fr_120px]">
                                <input
                                  value={room.maxCapacity}
                                  onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, maxCapacity: event.target.value } : entry))}
                                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                  placeholder="5000"
                                />
                                <input
                                  value={room.capacityUom}
                                  onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, capacityUom: event.target.value } : entry))}
                                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                  placeholder="kg"
                                />
                              </div>
                            </label>
                          </div>

                          <div className="mt-4 grid gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Allowed Categories</span>
                              <input
                                value={room.allowedCategories}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, allowedCategories: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="API, Excipients"
                              />
                              <p className="mt-1 text-[11px] text-slate-400">Comma separated, e.g. `API, Excipients`</p>
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-sm font-medium text-slate-700">Zone Name</span>
                              <input
                                value={room.zoneName}
                                onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, zoneName: event.target.value } : entry))}
                                className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                placeholder="General Store"
                              />
                            </label>
                          </div>

                          <div className="mt-4 rounded-2xl border border-indigo-100 bg-white/80 p-4">
                            <div className="text-sm font-semibold text-slate-800">Generated Hierarchy</div>
                            <div className="mt-1 text-[11px] text-slate-400">
                              These counts will auto-create rack, shelf, and pallet positions under this room.
                            </div>
                            <div className="mt-4 grid gap-4 md:grid-cols-3">
                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Racks</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={room.rackCount}
                                  onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, rackCount: event.target.value } : entry))}
                                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                  placeholder="2"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Shelves / Rack</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={room.shelvesPerRack}
                                  onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, shelvesPerRack: event.target.value } : entry))}
                                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                  placeholder="5"
                                />
                              </label>
                              <label className="block">
                                <span className="mb-2 block text-sm font-medium text-slate-700">Pallets / Shelf</span>
                                <input
                                  type="number"
                                  min="1"
                                  value={room.palletsPerShelf}
                                  onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, palletsPerShelf: event.target.value } : entry))}
                                  className="w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                                  placeholder="4"
                                />
                              </label>
                            </div>
                          </div>

                          <div className="mt-4 flex flex-wrap gap-3">
                            {[
                              ["Restricted Access", "restrictedAccess"],
                              ["Quarantine Only", "quarantineOnly"],
                              ["Rejected Only", "rejectedOnly"]
                            ].map(([label, key]) => (
                              <label key={key} className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={room[key as keyof LocationRoomDraft] as boolean}
                                  onChange={(event) =>
                                    setRoomDrafts((current) =>
                                      current.map((entry, itemIndex) =>
                                        itemIndex === index ? { ...entry, [key]: event.target.checked } : entry
                                      )
                                    )
                                  }
                                />
                                {label}
                              </label>
                            ))}
                          </div>

                          <label className="mt-4 block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">Notes</span>
                            <textarea
                              value={room.notes}
                              onChange={(event) => setRoomDrafts((current) => current.map((entry, itemIndex) => itemIndex === index ? { ...entry, notes: event.target.value } : entry))}
                              className="min-h-24 w-full rounded-2xl border border-indigo-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-indigo-300"
                              placeholder="Optional rule or room notes"
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </section>

                  {createError ? (
                    <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {createError}
                    </div>
                  ) : null}
                </div>
              </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
