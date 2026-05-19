import { FormEvent, useEffect, useMemo, useState } from "react";
import { AuditTrailPanel } from "../../components/AuditTimeline";
import { createEmMonitoringPoint, dismissEmBreach, fetchDeviations, fetchEmBreaches, fetchEmMonitoringPoints, fetchEmResults, fetchRooms, linkEmBreachDeviation, recordEmResult } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { Deviation } from "../../types/deviation";
import type { EmResult, MonitoringPoint } from "../../types/environmental-monitoring";
import type { Room } from "../../types/location";

const fieldCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

function statusBadge(result?: EmResult | null) {
  if (!result) return { label: "No Data", cls: "bg-slate-100 text-slate-600" };
  if (result.actionBreached) return { label: "ACTION", cls: "bg-rose-100 text-rose-700" };
  if (result.alertBreached) return { label: "ALERT", cls: "bg-amber-100 text-amber-700" };
  return { label: "Normal", cls: "bg-green-100 text-green-700" };
}

function weeklyAverages(results: EmResult[]) {
  const buckets = new Map<string, { total: number; count: number; action: boolean; alert: boolean }>();
  results.forEach((result) => {
    const date = new Date(result.recordedAt);
    const week = `${date.getFullYear()}-W${Math.ceil((((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7)}`;
    const bucket = buckets.get(week) ?? { total: 0, count: 0, action: false, alert: false };
    bucket.total += result.resultValue;
    bucket.count += 1;
    bucket.action = bucket.action || result.actionBreached;
    bucket.alert = bucket.alert || result.alertBreached;
    buckets.set(week, bucket);
  });
  return [...buckets.entries()].map(([week, bucket]) => ({
    week,
    average: bucket.total / bucket.count,
    action: bucket.action,
    alert: bucket.alert
  }));
}

export function EnvironmentalMonitoringPage() {
  const username = useAuthStore((state) => state.user?.username ?? "system");
  const role = useAuthStore((state) => state.user?.role ?? "");
  const canDismiss = role === "QC_MANAGER" || role === "SUPER_ADMIN";
  const [points, setPoints] = useState<MonitoringPoint[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [breaches, setBreaches] = useState<EmResult[]>([]);
  const [deviations, setDeviations] = useState<Deviation[]>([]);
  const [selectedPointId, setSelectedPointId] = useState("");
  const [results, setResults] = useState<EmResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pointForm, setPointForm] = useState({ pointCode: "", pointName: "", monitoringType: "TEMPERATURE", roomId: "", locationDescription: "", unit: "C", alertLimit: "", actionLimit: "" });
  const [resultForm, setResultForm] = useState({ pointId: "", resultValue: "", notes: "" });
  const [breachActionFor, setBreachActionFor] = useState<EmResult | null>(null);
  const [breachActionMode, setBreachActionMode] = useState<"link" | "dismiss" | null>(null);
  const [breachDeviationId, setBreachDeviationId] = useState("");
  const [breachDismissReason, setBreachDismissReason] = useState("");
  const [breachDismissPassword, setBreachDismissPassword] = useState("");
  const [breachDismissMeaning, setBreachDismissMeaning] = useState("I approve dismissal of this environmental monitoring action-limit breach");
  const selectedPoint = points.find((point) => point.id === selectedPointId) ?? points[0] ?? null;
  const trend = useMemo(() => weeklyAverages(results), [results]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const id = selectedPointId || points[0]?.id;
    if (id) void fetchEmResults(id).then(setResults).catch(() => setResults([]));
  }, [selectedPointId, points]);

  async function load() {
    try {
      const [pointData, breachData, roomData, deviationPage] = await Promise.all([
        fetchEmMonitoringPoints(),
        fetchEmBreaches(),
        fetchRooms(0, 200),
        fetchDeviations(0, 100)
      ]);
      setPoints(pointData);
      setBreaches(breachData);
      setRooms(roomData.content);
      setDeviations(deviationPage.content);
      setSelectedPointId((current) => current || pointData[0]?.id || "");
      setResultForm((current) => ({ ...current, pointId: current.pointId || pointData[0]?.id || "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load environmental monitoring");
    }
  }

  function openLink(breach: EmResult) {
    setBreachActionFor(breach);
    setBreachActionMode("link");
    setBreachDeviationId("");
    setBreachDismissReason("");
    setBreachDismissPassword("");
  }

  function openDismiss(breach: EmResult) {
    setBreachActionFor(breach);
    setBreachActionMode("dismiss");
    setBreachDeviationId("");
    setBreachDismissReason("");
    setBreachDismissPassword("");
    setBreachDismissMeaning("I approve dismissal of this environmental monitoring action-limit breach");
  }

  function closeBreachAction() {
    setBreachActionFor(null);
    setBreachActionMode(null);
    setBreachDeviationId("");
    setBreachDismissReason("");
    setBreachDismissPassword("");
    setBreachDismissMeaning("I approve dismissal of this environmental monitoring action-limit breach");
  }

  async function handleLinkDeviation() {
    if (!breachActionFor || !breachDeviationId) return;
    setError(null);
    try {
      await linkEmBreachDeviation(breachActionFor.id, { deviationId: breachDeviationId, updatedBy: username });
      setMessage("Deviation linked to breach.");
      closeBreachAction();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to link deviation");
    }
  }

  async function handleDismissBreach() {
    if (!breachActionFor || !breachDismissReason.trim() || !breachDismissPassword || !breachDismissMeaning.trim()) return;
    setError(null);
    try {
      await dismissEmBreach(breachActionFor.id, {
        reason: breachDismissReason.trim(),
        dismissedBy: username,
        username,
        password: breachDismissPassword,
        meaning: breachDismissMeaning.trim()
      });
      setMessage("Breach dismissed.");
      closeBreachAction();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to dismiss breach");
    }
  }

  async function handleCreatePoint(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const point = await createEmMonitoringPoint({
        pointCode: pointForm.pointCode,
        pointName: pointForm.pointName,
        monitoringType: pointForm.monitoringType,
        roomId: pointForm.roomId || undefined,
        locationDescription: pointForm.locationDescription || undefined,
        unit: pointForm.unit,
        alertLimit: Number(pointForm.alertLimit),
        actionLimit: Number(pointForm.actionLimit),
        createdBy: username
      });
      setPoints((current) => [...current, point]);
      setSelectedPointId(point.id);
      setResultForm((current) => ({ ...current, pointId: point.id }));
      setPointForm({ pointCode: "", pointName: "", monitoringType: "TEMPERATURE", roomId: "", locationDescription: "", unit: "C", alertLimit: "", actionLimit: "" });
      setMessage("Monitoring point created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create monitoring point");
    }
  }

  async function handleRecord(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const result = await recordEmResult({
        pointId: resultForm.pointId,
        resultValue: Number(resultForm.resultValue),
        recordedBy: username,
        notes: resultForm.notes || undefined
      });
      setMessage(result.actionBreached ? "Action limit breached. Deviation suggested." : result.alertBreached ? "Alert limit breached." : "Reading recorded.");
      setResultForm((current) => ({ ...current, resultValue: "", notes: "" }));
      await load();
      setSelectedPointId(result.pointId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record reading");
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Environmental Monitoring</h1>
        <p className="text-sm text-slate-500">Track lab/store readings and limit breaches.</p>
      </div>

      {breaches.length > 0 && (
        <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <div className="flex items-center justify-between">
            <div className="font-bold">
              {breaches.length} OPEN ACTION-LIMIT BREACH{breaches.length === 1 ? "" : "ES"}
            </div>
            <div className="text-xs text-rose-600">
              Banner persists until each breach is linked to a deviation or dismissed by QC Manager.
            </div>
          </div>
          <ul className="space-y-2">
            {breaches.map((breach) => (
              <li key={breach.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-rose-200 bg-white px-3 py-2 text-rose-800">
                <div className="text-xs">
                  <div className="font-bold">
                    {breach.pointCode} · {breach.monitoringType}
                  </div>
                  <div>
                    {breach.resultValue}
                    {breach.unit} &gt; action {breach.actionLimit}
                    {breach.unit} at {new Date(breach.recordedAt).toLocaleString()} (by {breach.recordedBy})
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openLink(breach)}
                    className="rounded-md border border-rose-300 bg-white px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    Link Deviation
                  </button>
                  {canDismiss && (
                    <button
                      onClick={() => openDismiss(breach)}
                      className="rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Dismiss
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {breachActionFor && breachActionMode === "link" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Link deviation to breach: {breachActionFor.pointCode}</div>
            <button onClick={closeBreachAction} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={breachDeviationId}
              onChange={(e) => setBreachDeviationId(e.target.value)}
              className={fieldCls + " max-w-md"}
            >
              <option value="">Select deviation</option>
              {deviations.map((deviation) => (
                <option key={deviation.id} value={deviation.id}>
                  {deviation.deviationNumber} · {deviation.title}
                </option>
              ))}
            </select>
            <button
              onClick={() => void handleLinkDeviation()}
              disabled={!breachDeviationId}
              className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              Link
            </button>
          </div>
        </div>
      )}

      {breachActionFor && breachActionMode === "dismiss" && (
        <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
          <div className="mb-3 flex items-center justify-between">
            <div className="font-semibold">Dismiss breach: {breachActionFor.pointCode}</div>
            <button onClick={closeBreachAction} className="text-xs text-slate-500 hover:text-slate-700">
              Cancel
            </button>
          </div>
          <div className="grid gap-2 md:grid-cols-[1fr_220px]">
            <input
              value={breachDismissReason}
              onChange={(e) => setBreachDismissReason(e.target.value)}
              className={fieldCls}
              placeholder="Dismissal reason (required, audit-logged)"
            />
            <input
              type="password"
              value={breachDismissPassword}
              onChange={(e) => setBreachDismissPassword(e.target.value)}
              className={fieldCls}
              placeholder={`Password for ${username}`}
              autoComplete="current-password"
            />
            <input
              value={breachDismissMeaning}
              onChange={(e) => setBreachDismissMeaning(e.target.value)}
              className={fieldCls + " md:col-span-2"}
              placeholder="E-signature meaning"
            />
            <button
              onClick={() => void handleDismissBreach()}
              disabled={!breachDismissReason.trim() || !breachDismissPassword || !breachDismissMeaning.trim()}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 md:w-fit"
            >
              Dismiss with E-Sign
            </button>
          </div>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}

      <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
        <section className="space-y-4">
          <form onSubmit={handleCreatePoint} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800">New Monitoring Point</h2>
            <input required value={pointForm.pointCode} onChange={(e) => setPointForm({ ...pointForm, pointCode: e.target.value })} className={fieldCls} placeholder="LAB-TEMP-01" />
            <input required value={pointForm.pointName} onChange={(e) => setPointForm({ ...pointForm, pointName: e.target.value })} className={fieldCls} placeholder="Point name" />
            <div className="grid grid-cols-2 gap-2">
              <select value={pointForm.monitoringType} onChange={(e) => setPointForm({ ...pointForm, monitoringType: e.target.value })} className={fieldCls}>
                <option value="TEMPERATURE">Temperature</option>
                <option value="HUMIDITY">Humidity</option>
                <option value="PARTICLE">Particle</option>
                <option value="MICROBIAL">Microbial</option>
              </select>
              <input required value={pointForm.unit} onChange={(e) => setPointForm({ ...pointForm, unit: e.target.value })} className={fieldCls} placeholder="Unit" />
            </div>
            <select value={pointForm.roomId} onChange={(e) => setPointForm({ ...pointForm, roomId: e.target.value })} className={fieldCls}>
              <option value="">No room</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomName}</option>)}
            </select>
            <input value={pointForm.locationDescription} onChange={(e) => setPointForm({ ...pointForm, locationDescription: e.target.value })} className={fieldCls} placeholder="Location description" />
            <div className="grid grid-cols-2 gap-2">
              <input required type="number" step="0.001" value={pointForm.alertLimit} onChange={(e) => setPointForm({ ...pointForm, alertLimit: e.target.value })} className={fieldCls} placeholder="Alert limit" />
              <input required type="number" step="0.001" value={pointForm.actionLimit} onChange={(e) => setPointForm({ ...pointForm, actionLimit: e.target.value })} className={fieldCls} placeholder="Action limit" />
            </div>
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Add Point</button>
          </form>
        </section>

        <section className="space-y-4">
          <form onSubmit={handleRecord} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-[1fr_160px_1fr_150px]">
            <select required value={resultForm.pointId} onChange={(e) => { setResultForm({ ...resultForm, pointId: e.target.value }); setSelectedPointId(e.target.value); }} className={fieldCls}>
              <option value="">Select point</option>
              {points.map((point) => <option key={point.id} value={point.id}>{point.pointCode}</option>)}
            </select>
            <input required type="number" step="0.001" value={resultForm.resultValue} onChange={(e) => setResultForm({ ...resultForm, resultValue: e.target.value })} className={fieldCls} placeholder="Value" />
            <input value={resultForm.notes} onChange={(e) => setResultForm({ ...resultForm, notes: e.target.value })} className={fieldCls} placeholder="Notes" />
            <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Record & Check</button>
          </form>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Point</th><th>Type</th><th>Location</th><th>Last</th><th>Status</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {points.map((point) => {
                  const badge = statusBadge(point.lastResult);
                  return (
                    <tr key={point.id} onClick={() => { setSelectedPointId(point.id); setResultForm((current) => ({ ...current, pointId: point.id })); }} className="cursor-pointer hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono">{point.pointCode}</td>
                      <td>{point.monitoringType}</td>
                      <td>{point.roomName ?? point.locationDescription ?? "-"}</td>
                      <td>{point.lastResult ? `${point.lastResult.resultValue}${point.unit}` : "-"}</td>
                      <td><span className={`rounded-full px-2 py-1 text-xs font-semibold ${badge.cls}`}>{badge.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <h2 className="mb-3 font-semibold text-slate-800">Weekly Trend - {selectedPoint?.pointCode ?? "Select point"}</h2>
            {trend.length === 0 ? <div className="text-sm text-slate-400">No readings yet.</div> : (
              <div className="flex flex-wrap gap-2">
                {trend.map((item) => (
                  <span key={item.week} className={`rounded-full px-3 py-1 text-xs font-semibold ${item.action ? "bg-rose-100 text-rose-700" : item.alert ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"}`}>
                    {item.week}: {item.average.toFixed(2)}
                  </span>
                ))}
              </div>
            )}
          </div>

          {selectedPoint?.lastResult?.id && (
            <AuditTrailPanel entityType="EM_RESULT" entityId={selectedPoint.lastResult.id} title="Result Audit Trail" compact />
          )}
        </section>
      </div>
    </div>
  );
}
