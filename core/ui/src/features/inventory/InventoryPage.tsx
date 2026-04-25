import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  adjustInventory,
  fetchBatches,
  fetchInventory,
  fetchInventoryTransactions,
  fetchMaterials,
  fetchPallets
} from "../../lib/api";
import type { InventoryRecord, InventoryTransaction } from "../../types/inventory";
import type { Batch } from "../../types/batch";

type StatusFilter = "ALL" | InventoryRecord["status"];

function statusConfig(status: InventoryRecord["status"]) {
  switch (status) {
    case "RELEASED":
      return { dot: "bg-green-500", pill: "bg-green-100 text-green-700", label: "Released" };
    case "SAMPLING":
      return { dot: "bg-teal-500", pill: "bg-teal-100 text-teal-700", label: "Sampling" };
    case "UNDER_TEST":
      return { dot: "bg-sky-500", pill: "bg-sky-100 text-sky-700", label: "Under Test" };
    case "REJECTED":
      return { dot: "bg-rose-500", pill: "bg-rose-100 text-rose-700", label: "Rejected" };
    case "BLOCKED":
      return { dot: "bg-red-500", pill: "bg-red-100 text-red-700", label: "Blocked" };
    case "QUARANTINE":
    default:
      return { dot: "bg-amber-400", pill: "bg-amber-100 text-amber-700", label: "Quarantine" };
  }
}

function expiryChip(expiryDate: string | null | undefined) {
  if (!expiryDate) return { className: "bg-slate-100 text-slate-500", label: "—" };
  const d = new Date(expiryDate);
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
  if (daysLeft <= 60) return { className: "bg-red-100 text-red-700", label };
  if (daysLeft <= 180) return { className: "bg-amber-100 text-amber-700", label };
  return { className: "bg-green-100 text-green-700", label };
}

function txTypeLabel(type: string) {
  const map: Record<string, string> = {
    GRN_RECEIPT: "GRN Receipt",
    QC_RELEASE: "QC Release",
    QC_REJECT: "QC Reject",
    TRANSFER: "Transfer",
    ADJUSTMENT: "Adjustment"
  };
  return map[type] ?? type.replace(/_/g, " ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function ExpiringBatchCard({ batch }: { batch: Batch }) {
  const d = new Date(batch.expiryDate as string);
  const daysLeft = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const urgent = daysLeft <= 30;
  return (
    <div className={`rounded-xl border px-4 py-3 ${urgent ? "border-red-100 bg-red-50" : "border-amber-100 bg-amber-50"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-slate-800">
            {batch.material?.materialName ?? "Material"}
          </p>
          <p className="mt-0.5 font-mono text-[11px] text-slate-500">{batch.batchNumber}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>
          {daysLeft}d left
        </span>
      </div>
      <p className={`mt-1.5 text-[11px] font-semibold ${urgent ? "text-red-600" : "text-amber-600"}`}>
        Expires {d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
      </p>
    </div>
  );
}

const STATUS_FILTERS: StatusFilter[] = ["ALL", "QUARANTINE", "SAMPLING", "UNDER_TEST", "RELEASED", "REJECTED", "BLOCKED"];
const INVENTORY_PAGE_SIZE = 10;

export function InventoryPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [inventoryPage, setInventoryPage] = useState(0);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string>("");
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [adjustQuantity, setAdjustQuantity] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustMode, setAdjustMode] = useState<"DECREASE" | "INCREASE">("DECREASE");
  const [adjustError, setAdjustError] = useState<string | null>(null);
  const [isAdjusting, setIsAdjusting] = useState(false);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["inventory-page"],
    queryFn: async () => {
      const [inventoryPage, transactionPage, materialPage, batchPage, palletPage] = await Promise.all([
        fetchInventory(),
        fetchInventoryTransactions(),
        fetchMaterials(),
        fetchBatches(),
        fetchPallets()
      ]);
      return {
        inventory: inventoryPage.content,
        transactions: transactionPage.content,
        materials: materialPage.content,
        batches: batchPage.content,
        pallets: palletPage.content
      };
    }
  });

  const inventory = data?.inventory ?? [];
  const transactions = data?.transactions ?? [];
  const materials = data?.materials ?? [];
  const batches = data?.batches ?? [];
  const pallets = data?.pallets ?? [];
  const errorMessage = error instanceof Error ? error.message : error ? "Unknown error" : null;

  const materialMap = useMemo(() => new Map(materials.map((m) => [m.id, m])), [materials]);
  const batchMap = useMemo(() => new Map(batches.map((b) => [b.id, b])), [batches]);
  const palletMap = useMemo(() => new Map(pallets.map((p) => [p.id, p])), [pallets]);

  const kpis = useMemo(() => {
    const quarantine = inventory.filter((r) => r.status === "QUARANTINE").length;
    const released = inventory.filter((r) => r.status === "RELEASED").length;
    const rejected = inventory.filter((r) => r.status === "REJECTED" || r.status === "BLOCKED").length;
    const expiringCount = inventory.filter((r) => {
      const b = batchMap.get(r.batchId);
      if (!b?.expiryDate) return false;
      const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
      return days >= 0 && days <= 60;
    }).length;
    return { total: inventory.length, quarantine, released, rejected, expiringCount };
  }, [inventory, batchMap]);

  const expiringBatches = useMemo(
    () =>
      batches
        .filter((b) => {
          if (!b.expiryDate) return false;
          const days = Math.ceil((new Date(b.expiryDate).getTime() - Date.now()) / 86400000);
          return days >= 0 && days <= 90;
        })
        .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime())
        .slice(0, 8),
    [batches]
  );

  const filteredInventory = useMemo(
    () => (statusFilter === "ALL" ? inventory : inventory.filter((r) => r.status === statusFilter)),
    [inventory, statusFilter]
  );

  const totalInventoryPages = Math.max(1, Math.ceil(filteredInventory.length / INVENTORY_PAGE_SIZE));
  const currentInventoryPage = Math.min(inventoryPage, totalInventoryPages - 1);
  const pagedInventory = useMemo(
    () =>
      filteredInventory.slice(
        currentInventoryPage * INVENTORY_PAGE_SIZE,
        (currentInventoryPage + 1) * INVENTORY_PAGE_SIZE
      ),
    [currentInventoryPage, filteredInventory]
  );

  useEffect(() => {
    if (inventoryPage !== currentInventoryPage) {
      setInventoryPage(currentInventoryPage);
    }
  }, [currentInventoryPage, inventoryPage]);

  useEffect(() => {
    setInventoryPage(0);
  }, [statusFilter]);

  useEffect(() => {
    if (!selectedInventoryId && filteredInventory[0]) {
      setSelectedInventoryId(filteredInventory[0].id);
    } else if (selectedInventoryId && !inventory.some((record) => record.id === selectedInventoryId)) {
      setSelectedInventoryId(filteredInventory[0]?.id ?? "");
    }
  }, [filteredInventory, inventory, selectedInventoryId]);

  const selectedInventory = useMemo(
    () => inventory.find((record) => record.id === selectedInventoryId) ?? null,
    [inventory, selectedInventoryId]
  );
  const selectedBatch = selectedInventory ? batchMap.get(selectedInventory.batchId) ?? null : null;
  const selectedMaterial = selectedInventory ? materialMap.get(selectedInventory.materialId) ?? null : null;
  const selectedPallet = selectedInventory ? palletMap.get(selectedInventory.palletId) ?? null : null;

  async function handleAdjustInventory() {
    if (!selectedInventory) {
      setAdjustError("Select an inventory lot first.");
      return;
    }
    if (!adjustQuantity || Number(adjustQuantity) <= 0) {
      setAdjustError("Enter a valid quantity.");
      return;
    }
    if (!adjustReason.trim()) {
      setAdjustError("Adjustment reason is required.");
      return;
    }

    setIsAdjusting(true);
    setAdjustError(null);
    try {
      await adjustInventory(
        selectedInventory.id,
        Number(adjustQuantity),
        adjustReason.trim(),
        adjustMode === "INCREASE"
      );
      setIsAdjustOpen(false);
      setAdjustQuantity("");
      setAdjustReason("");
      setAdjustMode("DECREASE");
      await refetch();
    } catch (adjustRequestError) {
      setAdjustError(adjustRequestError instanceof Error ? adjustRequestError.message : "Unable to adjust inventory");
    } finally {
      setIsAdjusting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs text-slate-400">
            Operations / <span className="font-medium text-sky-700">Inventory</span>
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-800">Inventory Management</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Lot-level tracking · stock positions · expiry management
          </p>
        </div>
        <div className="flex gap-2">
          {[
            { icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4", label: "Transfer" },
            { icon: "M12 4v16m8-8H4", label: "Adjust" },
            { icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4", label: "Export" }
          ].map(({ icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (label === "Adjust") {
                  setIsAdjustOpen(true);
                  setAdjustError(null);
                }
              }}
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-white px-4 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon} />
              </svg>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Expiry alert */}
      {kpis.expiringCount > 0 ? (
        <section className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <span className="text-sm text-red-800">
            <strong>{kpis.expiringCount} lot{kpis.expiringCount !== 1 ? "s" : ""} expiring within 60 days</strong> — review immediately.
          </span>
        </section>
      ) : null}

      {errorMessage ? (
        <section className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </section>
      ) : null}

      {/* KPI cards */}
      <section className="grid gap-4 sm:grid-cols-3 xl:grid-cols-5">
        {[
          { label: "Total Active Lots", value: kpis.total, note: "All materials", border: "border-l-sky-500", valCls: "text-slate-800" },
          { label: "In Quarantine", value: kpis.quarantine, note: "Pending QC", border: "border-l-amber-400", valCls: "text-amber-600" },
          { label: "Released", value: kpis.released, note: "Available for use", border: "border-l-emerald-400", valCls: "text-emerald-600" },
          { label: "Expiring ≤60 days", value: kpis.expiringCount, note: "Urgent review", border: "border-l-red-400", valCls: kpis.expiringCount > 0 ? "text-red-600" : "text-slate-800" },
          { label: "Rejected / Blocked", value: kpis.rejected, note: "Disposed", border: "border-l-rose-400", valCls: kpis.rejected > 0 ? "text-rose-600" : "text-slate-800" }
        ].map((k) => (
          <article key={k.label} className={`rounded-xl border border-sky-100 border-l-4 bg-white p-4 shadow-sm ${k.border}`}>
            <p className="text-xs text-slate-500">{k.label}</p>
            <p className={`mt-2 text-2xl font-bold ${k.valCls}`}>{isLoading ? "—" : k.value}</p>
            <p className="mt-1 text-xs text-slate-500">{k.note}</p>
          </article>
        ))}
      </section>

      {/* Main 2-col grid */}
      <section className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(260px,1fr)]">
        {/* Left: lots table + movement log */}
        <div className="space-y-5">
          {/* Inventory Lots table */}
          <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-3">
              <span className="text-sm font-semibold text-slate-700">Inventory Lots</span>
              <div className="flex flex-wrap gap-1">
                {STATUS_FILTERS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setStatusFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                      statusFilter === f ? "bg-sky-600 text-white" : "text-slate-500 hover:bg-sky-50"
                    }`}
                  >
                    {f === "ALL"
                      ? `All (${inventory.length})`
                      : f === "UNDER_TEST"
                        ? "Testing"
                        : f.charAt(0) + f.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="border-b border-sky-50 bg-sky-50/50">
                    {["Lot No.", "Material", "Pallet / Location", "Qty Available", "Expiry", "Status"].map(
                      (col) => (
                        <th key={col} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          {col}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-slate-500" colSpan={6}>Loading inventory...</td>
                    </tr>
                  ) : filteredInventory.length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-sm text-slate-500" colSpan={6}>
                        No lots found.{statusFilter !== "ALL" ? " Try a different filter." : " Receive a GRN to create stock."}
                      </td>
                    </tr>
                  ) : (
                    pagedInventory.map((record) => {
                      const material = materialMap.get(record.materialId);
                      const batch = batchMap.get(record.batchId);
                      const pallet = palletMap.get(record.palletId);
                      const cfg = statusConfig(record.status);
                      const expiry = expiryChip(batch?.expiryDate);
                      return (
                        <tr key={record.id} className="border-b border-sky-50 transition hover:bg-sky-50">
                          <td className="px-4 py-2.5">
                            <label className="flex items-center gap-3">
                              <input
                                type="radio"
                                name="selectedInventoryLot"
                                checked={selectedInventoryId === record.id}
                                onChange={() => setSelectedInventoryId(record.id)}
                                className="h-4 w-4 border-sky-300 text-sky-600 focus:ring-sky-500"
                              />
                              <span className="font-mono font-medium text-sky-700">
                                {batch?.batchNumber ?? record.batchId.slice(0, 8)}
                              </span>
                            </label>
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {material?.materialName ?? record.materialId.slice(0, 8)}
                          </td>
                          <td className="px-4 py-2.5 text-slate-500">
                            {pallet ? `${pallet.palletCode} - ${pallet.palletName}` : "—"}
                          </td>
                          <td className="px-4 py-2.5 font-semibold text-slate-800">
                            {record.quantityOnHand} {record.uom}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${expiry.className}`}>
                              {expiry.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold ${cfg.pill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                              {cfg.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sky-50 px-4 py-3">
              <span className="text-xs text-slate-400">
                {filteredInventory.length === 0
                  ? "Showing 0 lots"
                  : `Showing ${currentInventoryPage * INVENTORY_PAGE_SIZE + 1}–${Math.min(
                      (currentInventoryPage + 1) * INVENTORY_PAGE_SIZE,
                      filteredInventory.length
                    )} of ${filteredInventory.length} lots`}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">
                  Page {totalInventoryPages === 0 ? 0 : currentInventoryPage + 1} of {totalInventoryPages}
                </span>
                <button
                  type="button"
                  onClick={() => setInventoryPage((current) => Math.max(0, current - 1))}
                  disabled={currentInventoryPage === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryPage((current) => Math.min(totalInventoryPages - 1, current + 1))}
                  disabled={currentInventoryPage >= totalInventoryPages - 1 || filteredInventory.length === 0}
                  className="rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
                >
                  Next
                </button>
              </div>
            </div>
          </article>

          {/* Stock Movement Log */}
          <article className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-sky-100 bg-gradient-to-r from-sky-50 to-white px-5 py-3">
              <span className="text-sm font-semibold text-slate-700">Recent Stock Movements</span>
              <span className="text-xs text-slate-400">{transactions.length} records</span>
            </div>
            <div className="divide-y divide-sky-50">
              {isLoading ? (
                <div className="px-5 py-6 text-sm text-slate-500">Loading movements...</div>
              ) : transactions.length === 0 ? (
                <div className="px-5 py-6 text-sm text-slate-500">No stock movements yet.</div>
              ) : (
                transactions.slice(0, 20).map((tx: InventoryTransaction) => {
                  const material = materialMap.get(tx.materialId);
                  const batch = batchMap.get(tx.batchId);
                  const isIn = tx.transactionType.includes("GRN") || tx.transactionType.includes("RECEIPT");
                  return (
                    <div key={tx.id} className="flex items-center gap-4 px-5 py-3 transition hover:bg-sky-50/40">
                      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${isIn ? "bg-sky-100 text-sky-700" : "bg-amber-100 text-amber-700"}`}>
                        {isIn ? "↓" : "↑"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-slate-800">
                          {txTypeLabel(tx.transactionType)}
                          <span className="ml-2 font-normal text-slate-400">· {tx.referenceType}</span>
                        </p>
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">
                          {material?.materialName ?? tx.materialId.slice(0, 8)}
                          {batch ? ` · ${batch.batchNumber}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-semibold text-slate-800">{tx.quantity} {tx.uom}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{formatDate(tx.createdAt)}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </article>
        </div>

        {/* Right: expiry alerts + status breakdown */}
        <div className="space-y-5">
          <article className="rounded-2xl border border-sky-100 bg-white shadow-sm">
            <div className="border-b border-sky-100 px-5 py-3.5">
              <p className="text-sm font-semibold text-slate-700">Expiry Alerts</p>
              <p className="mt-0.5 text-xs text-slate-400">Next 90 days</p>
            </div>
            <div className="space-y-3 p-4">
              {isLoading ? (
                <p className="text-sm text-slate-500">Loading...</p>
              ) : expiringBatches.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sky-200 px-4 py-6 text-center text-sm text-slate-500">
                  No batches expiring in the next 90 days.
                </div>
              ) : (
                expiringBatches.map((batch) => <ExpiringBatchCard key={batch.id} batch={batch} />)
              )}
            </div>
          </article>

          <article className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
            <p className="mb-4 text-sm font-semibold text-slate-700">Status Breakdown</p>
            <div className="space-y-2.5">
              {(["RELEASED", "QUARANTINE", "SAMPLING", "UNDER_TEST", "REJECTED", "BLOCKED"] as InventoryRecord["status"][]).map(
                (s) => {
                  const cnt = inventory.filter((r) => r.status === s).length;
                  const cfg = statusConfig(s);
                  const pct = inventory.length > 0 ? (cnt / inventory.length) * 100 : 0;
                  return (
                    <div key={s}>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-slate-600">{cfg.label}</span>
                        <span className="font-semibold text-slate-700">{cnt}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                        <div className={`h-full rounded-full ${cfg.dot}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </article>
        </div>
      </section>

      {isAdjustOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 px-4">
          <div className="w-full max-w-lg rounded-[24px] border border-sky-100 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Adjust Inventory</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedInventory
                    ? `${selectedMaterial?.materialName ?? "Material"} · ${selectedBatch?.batchNumber ?? "Batch"} · ${selectedPallet?.palletCode ?? "Pallet"}`
                    : "Select a lot from the table before adjusting inventory."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAdjustOpen(false);
                  setAdjustError(null);
                }}
                className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {(["DECREASE", "INCREASE"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setAdjustMode(mode)}
                    className={[
                      "rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                      adjustMode === mode
                        ? "bg-sky-600 text-white"
                        : "border border-sky-200 bg-white text-sky-700"
                    ].join(" ")}
                  >
                    {mode === "DECREASE" ? "Reduce Stock" : "Increase Stock"}
                  </button>
                ))}
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Quantity</span>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={adjustQuantity}
                  onChange={(event) => setAdjustQuantity(event.target.value)}
                  className="w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Reason</span>
                <textarea
                  value={adjustReason}
                  onChange={(event) => setAdjustReason(event.target.value)}
                  className="min-h-24 w-full rounded-2xl border border-sky-100 bg-white px-4 py-3 text-sm text-slate-700 outline-none focus:border-sky-300"
                  placeholder="Issue to production, count correction, FEFO test, etc."
                />
              </label>
              {selectedInventory && adjustMode === "DECREASE" && selectedInventory.status === "RELEASED" ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                  Released-stock reductions now enforce FEFO. If an earlier expiry released lot exists, this adjustment will be blocked.
                </div>
              ) : null}
              {adjustError ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{adjustError}</div>
              ) : null}
              <button
                type="button"
                onClick={() => void handleAdjustInventory()}
                disabled={isAdjusting || !selectedInventory}
                className="w-full rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-sky-300"
              >
                {isAdjusting ? "Submitting..." : "Confirm Adjustment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
