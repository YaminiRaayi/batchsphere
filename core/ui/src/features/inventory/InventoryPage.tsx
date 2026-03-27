import { useEffect, useMemo, useState } from "react";
import { SectionHeader } from "../../components/SectionHeader";
import {
  fetchBatches,
  fetchInventory,
  fetchInventoryTransactions,
  fetchMaterials,
  fetchPallets
} from "../../lib/api";
import type { Batch } from "../../types/batch";
import type { InventoryRecord, InventoryTransaction } from "../../types/inventory";
import type { Pallet } from "../../types/location";
import type { Material } from "../../types/material";

function statusTone(status: InventoryRecord["status"]) {
  switch (status) {
    case "RELEASED":
      return "bg-moss/15 text-moss";
    case "SAMPLING":
      return "bg-teal/15 text-teal";
    case "REJECTED":
    case "BLOCKED":
      return "bg-redoxide/15 text-redoxide";
    case "UNDER_TEST":
      return "bg-steel/15 text-steel";
    case "QUARANTINE":
    default:
      return "bg-amber/15 text-amber";
  }
}

export function InventoryPage() {
  const [inventory, setInventory] = useState<InventoryRecord[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInventoryPage() {
      setIsLoading(true);
      setError(null);

      try {
        const [inventoryPage, transactionPage, materialPage, batchPage, palletPage] =
          await Promise.all([
            fetchInventory(),
            fetchInventoryTransactions(),
            fetchMaterials(),
            fetchBatches(),
            fetchPallets()
          ]);

        if (!cancelled) {
          setInventory(inventoryPage.content);
          setTransactions(transactionPage.content);
          setMaterials(materialPage.content);
          setBatches(batchPage.content);
          setPallets(palletPage.content);
        }
      } catch (loadError) {
        if (!cancelled) {
          const message =
            loadError instanceof Error
              ? loadError.message
              : "Unknown error while loading inventory";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInventoryPage();

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

  return (
    <div className="space-y-6">
      <SectionHeader
        eyebrow="Inventory"
        title="Stock visibility should prioritize traceability over decoration"
        description="This page is structured for filters, pallet-level stock, and transaction drilldown. The backend already exposes the core data needed for this area."
      />

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <article className="panel overflow-hidden">
          <div className="border-b border-ink/10 px-6 py-5">
            <h4 className="text-lg font-semibold text-ink">Current stock by material, batch, and pallet</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-ink/5 text-slate">
                <tr>
                  <th className="px-6 py-4 font-medium">Material</th>
                  <th className="px-6 py-4 font-medium">Batch</th>
                  <th className="px-6 py-4 font-medium">Pallet</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Quantity</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr className="border-t border-ink/10">
                    <td className="px-6 py-8 text-slate" colSpan={5}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : null}

                {!isLoading && error ? (
                  <tr className="border-t border-ink/10">
                    <td className="px-6 py-8 text-redoxide" colSpan={5}>
                      {error}
                    </td>
                  </tr>
                ) : null}

                {!isLoading && !error && inventory.length === 0 ? (
                  <tr className="border-t border-ink/10">
                    <td className="px-6 py-8 text-slate" colSpan={5}>
                      No inventory records yet. Receive a GRN to create stock.
                    </td>
                  </tr>
                ) : null}

                {!isLoading &&
                  !error &&
                  inventory.map((record) => {
                    const material = materialMap.get(record.materialId);
                    const batch = batchMap.get(record.batchId);
                    const pallet = palletMap.get(record.palletId);

                    return (
                      <tr key={record.id} className="border-t border-ink/10">
                        <td className="px-6 py-4 text-ink">
                          {material
                            ? `${material.materialCode} - ${material.materialName}`
                            : record.materialId}
                        </td>
                        <td className="px-6 py-4 text-ink">
                          {batch ? batch.batchNumber : record.batchId}
                        </td>
                        <td className="px-6 py-4 text-ink">
                          {pallet ? `${pallet.palletCode} - ${pallet.palletName}` : record.palletId}
                        </td>
                        <td className="px-6 py-4 text-ink">
                          <span className={`status-pill ${statusTone(record.status)}`}>
                            {record.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-ink">
                          {record.quantityOnHand} {record.uom}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </article>

        <article className="panel overflow-hidden">
          <div className="border-b border-ink/10 px-6 py-5">
            <h4 className="text-lg font-semibold text-ink">Recent inventory transactions</h4>
          </div>
          <div className="divide-y divide-ink/10">
            {isLoading ? (
              <div className="px-6 py-8 text-sm text-slate">Loading transactions...</div>
            ) : null}

            {!isLoading && !error && transactions.length === 0 ? (
              <div className="px-6 py-8 text-sm text-slate">
                No inventory transactions yet.
              </div>
            ) : null}

            {!isLoading &&
              !error &&
              transactions.map((transaction) => {
                const material = materialMap.get(transaction.materialId);
                const batch = batchMap.get(transaction.batchId);

                return (
                  <div key={transaction.id} className="px-6 py-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">
                        {transaction.transactionType} / {transaction.referenceType}
                      </p>
                      <span className="text-xs uppercase tracking-[0.18em] text-slate">
                        {transaction.createdAt.slice(0, 10)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate">
                      {material
                        ? `${material.materialCode} - ${material.materialName}`
                        : transaction.materialId}
                    </p>
                    <p className="mt-1 text-sm text-slate">
                      Batch: {batch ? batch.batchNumber : transaction.batchId}
                    </p>
                    <p className="mt-3 text-sm font-medium text-ink">
                      {transaction.quantity} {transaction.uom}
                    </p>
                  </div>
                );
              })}
          </div>
        </article>
      </section>
    </div>
  );
}
