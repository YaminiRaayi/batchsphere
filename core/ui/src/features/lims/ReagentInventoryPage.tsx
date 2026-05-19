import { FormEvent, useEffect, useMemo, useState } from "react";
import { createReagent, createReagentLot, fetchReagentLots, fetchReagents, updateReagentLot } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { Reagent, ReagentLot } from "../../types/reagent";

const fieldCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

function statusCls(status: string) {
  if (status === "EXPIRED") return "bg-rose-100 text-rose-700";
  if (status === "ACTIVE") return "bg-green-100 text-green-700";
  return "bg-amber-100 text-amber-700";
}

export function ReagentInventoryPage() {
  const currentUser = useAuthStore((state) => state.user?.username ?? "system");
  const [reagents, setReagents] = useState<Reagent[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [lots, setLots] = useState<ReagentLot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reagentForm, setReagentForm] = useState({ reagentCode: "", reagentName: "", grade: "", manufacturer: "", storageCondition: "" });
  const [lotForm, setLotForm] = useState({ lotNumber: "", supplier: "", expiryDate: "", quantityReceived: "", unit: "" });
  const selected = reagents.find((item) => item.id === selectedId) ?? reagents[0];
  const stats = useMemo(() => ({
    active: lots.filter((lot) => lot.status === "ACTIVE").length,
    expiring: lots.filter((lot) => lot.status === "ACTIVE" && lot.expiryDate <= new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)).length,
    expired: lots.filter((lot) => lot.status === "EXPIRED").length,
    low: lots.filter((lot) => lot.quantityRemaining <= 0).length
  }), [lots]);

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
      const data = await fetchReagents();
      setReagents(data);
      setSelectedId(data[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load reagents");
    } finally {
      setLoading(false);
    }
  }

  async function loadLots(reagentId: string) {
    try {
      setLots(await fetchReagentLots(reagentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load lots");
    }
  }

  async function handleCreateReagent(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await createReagent({ ...reagentForm, createdBy: currentUser });
      setReagents((current) => [...current, created]);
      setSelectedId(created.id);
      setReagentForm({ reagentCode: "", reagentName: "", grade: "", manufacturer: "", storageCondition: "" });
      setMessage("Reagent created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create reagent");
    }
  }

  async function handleCreateLot(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    setError(null);
    try {
      const lot = await createReagentLot(selected.id, {
        lotNumber: lotForm.lotNumber,
        supplier: lotForm.supplier,
        expiryDate: lotForm.expiryDate,
        quantityReceived: Number(lotForm.quantityReceived || 0),
        unit: lotForm.unit,
        createdBy: currentUser
      });
      setLots((current) => [...current, lot]);
      setLotForm({ lotNumber: "", supplier: "", expiryDate: "", quantityReceived: "", unit: "" });
      setMessage("Lot added.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add lot");
    }
  }

  async function handleQuantityUsed(lot: ReagentLot, value: string) {
    if (!selected) return;
    setError(null);
    try {
      const updated = await updateReagentLot(selected.id, lot.id, { quantityUsed: Number(value), updatedBy: currentUser });
      setLots((current) => current.map((item) => item.id === lot.id ? updated : item));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update lot");
    }
  }

  if (loading) return <div className="p-6 text-sm text-slate-500">Loading reagent inventory...</div>;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reagent & Solution Inventory</h1>
          <p className="text-sm text-slate-500">Manage lab reagent masters and lots.</p>
        </div>
      </div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{stats.active}</div><div className="text-xs text-slate-500">Active Lots</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{stats.expiring}</div><div className="text-xs text-slate-500">Expiring &lt;= 30 days</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold text-rose-600">{stats.expired}</div><div className="text-xs text-slate-500">Expired</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{stats.low}</div><div className="text-xs text-slate-500">Low Stock</div></div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[360px_1fr]">
        <section className="space-y-4">
          <form onSubmit={handleCreateReagent} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800">New Reagent</h2>
            <input required value={reagentForm.reagentCode} onChange={(e) => setReagentForm({ ...reagentForm, reagentCode: e.target.value })} className={fieldCls} placeholder="Code" />
            <input required value={reagentForm.reagentName} onChange={(e) => setReagentForm({ ...reagentForm, reagentName: e.target.value })} className={fieldCls} placeholder="Name" />
            <input value={reagentForm.grade} onChange={(e) => setReagentForm({ ...reagentForm, grade: e.target.value })} className={fieldCls} placeholder="Grade" />
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Add Reagent</button>
          </form>
          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 font-semibold">Reagent Master</div>
            {reagents.map((item) => (
              <button key={item.id} onClick={() => setSelectedId(item.id)} className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm ${selected?.id === item.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                <span>{item.reagentName}<span className="ml-2 text-xs text-slate-400">{item.grade}</span></span>
                {item.hasExpiredLot ? <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">Expired</span> : item.hasExpiringLot ? <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700">Expiring</span> : null}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4 rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">Lots - {selected?.reagentName ?? "No reagent"}</h2>
          </div>
          <form onSubmit={handleCreateLot} className="grid gap-3 md:grid-cols-6">
            <input required value={lotForm.lotNumber} onChange={(e) => setLotForm({ ...lotForm, lotNumber: e.target.value })} className={fieldCls} placeholder="Lot" />
            <input value={lotForm.supplier} onChange={(e) => setLotForm({ ...lotForm, supplier: e.target.value })} className={fieldCls} placeholder="Supplier" />
            <input required type="date" value={lotForm.expiryDate} onChange={(e) => setLotForm({ ...lotForm, expiryDate: e.target.value })} className={fieldCls} />
            <input required type="number" step="0.001" value={lotForm.quantityReceived} onChange={(e) => setLotForm({ ...lotForm, quantityReceived: e.target.value })} className={fieldCls} placeholder="Qty" />
            <input value={lotForm.unit} onChange={(e) => setLotForm({ ...lotForm, unit: e.target.value })} className={fieldCls} placeholder="Unit" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Add Lot</button>
          </form>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="py-2">Lot</th><th>Supplier</th><th>Expiry</th><th>Remaining</th><th>Used</th><th>Status</th></tr></thead>
            <tbody>
              {lots.map((lot) => (
                <tr key={lot.id} className="border-b border-slate-100">
                  <td className="py-3 font-mono">{lot.lotNumber}</td>
                  <td>{lot.supplier ?? "-"}</td>
                  <td>{lot.expiryDate}</td>
                  <td>{lot.quantityRemaining} {lot.unit ?? ""}</td>
                  <td><input type="number" step="0.001" defaultValue={lot.quantityUsed} onBlur={(e) => void handleQuantityUsed(lot, e.target.value)} className="w-24 rounded border border-slate-200 px-2 py-1" /></td>
                  <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusCls(lot.status)}`}>{lot.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
