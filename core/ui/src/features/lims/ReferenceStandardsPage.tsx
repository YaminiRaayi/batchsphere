import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  createReferenceStandard,
  createReferenceStandardLot,
  fetchReferenceStandardLots,
  fetchReferenceStandards,
  updateReferenceStandardLot
} from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { ReferenceStandard, ReferenceStandardLot } from "../../types/reference-standard";

const fieldCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

function statusCls(status: string) {
  if (status === "EXPIRED") return "bg-rose-100 text-rose-700";
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

export function ReferenceStandardsPage() {
  const currentUser = useAuthStore((state) => state.user?.username ?? "system");
  const [standards, setStandards] = useState<ReferenceStandard[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [lots, setLots] = useState<ReferenceStandardLot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [standardForm, setStandardForm] = useState({
    standardCode: "",
    standardName: "",
    pharmacopeia: "",
    storageCondition: ""
  });
  const [lotForm, setLotForm] = useState({
    lotNumber: "",
    potency: "",
    expiryDate: "",
    quantityReceived: "",
    unit: ""
  });
  const selected = standards.find((item) => item.id === selectedId) ?? standards[0];

  const stats = useMemo(
    () => ({
      active: lots.filter((lot) => lot.status === "ACTIVE").length,
      expiring: lots.filter(
        (lot) =>
          lot.status === "ACTIVE" &&
          lot.expiryDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
      ).length,
      expired: lots.filter((lot) => lot.status === "EXPIRED").length,
      total: standards.length
    }),
    [lots, standards]
  );

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!selected?.id) return;
    void loadLots(selected.id);
  }, [selected?.id]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchReferenceStandards();
      setStandards(data);
      setSelectedId(data[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reference standards");
    } finally {
      setLoading(false);
    }
  }

  async function loadLots(standardId: string) {
    try {
      setLots(await fetchReferenceStandardLots(standardId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lots");
    }
  }

  async function handleCreateStandard(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await createReferenceStandard({
        ...standardForm,
        createdBy: currentUser
      });
      setStandards((current) => [...current, created]);
      setSelectedId(created.id);
      setStandardForm({ standardCode: "", standardName: "", pharmacopeia: "", storageCondition: "" });
      setMessage("Reference standard created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reference standard");
    }
  }

  async function handleCreateLot(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const lot = await createReferenceStandardLot(selected.id, {
        lotNumber: lotForm.lotNumber,
        potency: lotForm.potency ? Number(lotForm.potency) : undefined,
        expiryDate: lotForm.expiryDate,
        quantityReceived: lotForm.quantityReceived ? Number(lotForm.quantityReceived) : undefined,
        unit: lotForm.unit || undefined,
        createdBy: currentUser
      });
      setLots((current) => [...current, lot]);
      setLotForm({ lotNumber: "", potency: "", expiryDate: "", quantityReceived: "", unit: "" });
      setMessage("Lot added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lot");
    }
  }

  async function handleQuantityUsed(lot: ReferenceStandardLot, value: string) {
    if (!selected) return;
    setError(null);
    try {
      const updated = await updateReferenceStandardLot(selected.id, lot.id, {
        quantityUsed: Number(value),
        updatedBy: currentUser
      });
      setLots((current) => current.map((item) => (item.id === lot.id ? updated : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lot");
    }
  }

  if (loading) {
    return <div className="p-6 text-sm text-slate-500">Loading reference standards...</div>;
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reference Standards</h1>
          <p className="text-sm text-slate-500">
            Pharmacopoeial reference standards and working standards inventory (USP / EP / BP / IP).
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}
      {message && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold">{stats.total}</div>
          <div className="text-xs text-slate-500">Reference Standards</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold">{stats.active}</div>
          <div className="text-xs text-slate-500">Active Lots</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{stats.expiring}</div>
          <div className="text-xs text-slate-500">Expiring &lt;= 30 days</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-rose-600">{stats.expired}</div>
          <div className="text-xs text-slate-500">Expired</div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4">
          <form onSubmit={handleCreateStandard} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800">New Reference Standard</h2>
            <input
              required
              value={standardForm.standardCode}
              onChange={(e) => setStandardForm({ ...standardForm, standardCode: e.target.value })}
              className={fieldCls}
              placeholder="Code (e.g. RS-PARA-USP)"
            />
            <input
              required
              value={standardForm.standardName}
              onChange={(e) => setStandardForm({ ...standardForm, standardName: e.target.value })}
              className={fieldCls}
              placeholder="Name (e.g. Paracetamol RS)"
            />
            <select
              value={standardForm.pharmacopeia}
              onChange={(e) => setStandardForm({ ...standardForm, pharmacopeia: e.target.value })}
              className={fieldCls}
            >
              <option value="">Pharmacopoeia (optional)</option>
              <option value="USP">USP</option>
              <option value="EP">EP</option>
              <option value="BP">BP</option>
              <option value="IP">IP</option>
              <option value="JP">JP</option>
            </select>
            <input
              value={standardForm.storageCondition}
              onChange={(e) => setStandardForm({ ...standardForm, storageCondition: e.target.value })}
              className={fieldCls}
              placeholder="Storage (e.g. 2-8 C protected from light)"
            />
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">
              Add Standard
            </button>
          </form>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 font-semibold">Standard Master</div>
            {standards.length === 0 ? (
              <div className="px-4 py-6 text-sm text-slate-400">No standards yet.</div>
            ) : (
              standards.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm ${
                    selected?.id === item.id ? "bg-teal-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span>
                    {item.standardName}
                    <span className="ml-2 text-xs text-slate-400">
                      {item.pharmacopeia ?? ""} {item.standardCode}
                    </span>
                  </span>
                  {item.hasExpiredLot ? (
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Expired</span>
                  ) : item.hasExpiringLot ? (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Expiring</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">
              Lots - {selected?.standardName ?? "No standard selected"}
            </h2>
          </div>
          {selected ? (
            <>
              <form onSubmit={handleCreateLot} className="grid gap-3 md:grid-cols-6">
                <input
                  required
                  value={lotForm.lotNumber}
                  onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })}
                  className={fieldCls}
                  placeholder="Lot #"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={lotForm.potency}
                  onChange={(e) => setLotForm({ ...lotForm, potency: e.target.value })}
                  className={fieldCls}
                  placeholder="Potency %"
                />
                <input
                  required
                  type="date"
                  value={lotForm.expiryDate}
                  onChange={(e) => setLotForm({ ...lotForm, expiryDate: e.target.value })}
                  className={fieldCls}
                />
                <input
                  type="number"
                  step="0.001"
                  value={lotForm.quantityReceived}
                  onChange={(e) => setLotForm({ ...lotForm, quantityReceived: e.target.value })}
                  className={fieldCls}
                  placeholder="Qty"
                />
                <input
                  value={lotForm.unit}
                  onChange={(e) => setLotForm({ ...lotForm, unit: e.target.value })}
                  className={fieldCls}
                  placeholder="Unit"
                />
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
                  Add Lot
                </button>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase text-slate-500">
                      <th className="py-2">Lot</th>
                      <th>Potency</th>
                      <th>Expiry</th>
                      <th>Remaining</th>
                      <th>Used</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lots.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                          No lots recorded for this standard.
                        </td>
                      </tr>
                    ) : (
                      lots.map((lot) => (
                        <tr key={lot.id} className="border-b border-slate-100">
                          <td className="py-3 font-mono">{lot.lotNumber}</td>
                          <td>{lot.potency != null ? `${lot.potency}%` : "-"}</td>
                          <td>{lot.expiryDate}</td>
                          <td>
                            {lot.quantityRemaining ?? "-"} {lot.unit ?? ""}
                          </td>
                          <td>
                            <input
                              type="number"
                              step="0.001"
                              defaultValue={lot.quantityUsed ?? 0}
                              onBlur={(e) => void handleQuantityUsed(lot, e.target.value)}
                              className="w-24 rounded border border-slate-200 px-2 py-1"
                            />
                          </td>
                          <td>
                            <span
                              className={`rounded-full px-2 py-1 text-xs font-semibold ${statusCls(lot.status)}`}
                            >
                              {lot.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Create a reference standard to start recording lots.</p>
          )}
        </section>
      </div>
    </div>
  );
}
