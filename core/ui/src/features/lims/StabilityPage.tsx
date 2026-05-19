import { FormEvent, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AuditTrailPanel } from "../../components/AuditTimeline";
import { createStabilityStudy, fetchMaterials, fetchSpecParameters, fetchStabilityStudies, fetchStabilityStudy, fetchStabilityTrend, pullStabilityTimepoint, recordStabilityResult, updateStabilityStatus } from "../../lib/api";
import { useAuthStore } from "../../stores/authStore";
import type { Material } from "../../types/material";
import type { SpecParameter } from "../../types/spec";
import type { StabilityStudyDetail, StabilityStudySummary, StabilityTimepoint, TrendSeries } from "../../types/stability";

const fieldCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100";

function statusCls(status: string, oot = false) {
  if (oot) return "bg-amber-100 text-amber-700";
  if (status === "ACTIVE" || status === "COMPLETE") return "bg-green-100 text-green-700";
  if (status === "PULLED") return "bg-cyan-100 text-cyan-700";
  if (status === "ON_HOLD") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export function StabilityPage() {
  const username = useAuthStore((state) => state.user?.username ?? "system");
  const navigate = useNavigate();
  const params = useParams<{ studyId?: string }>();
  const routeStudyId = params.studyId ?? "";
  const [studies, setStudies] = useState<StabilityStudySummary[]>([]);
  const [selectedId, setSelectedId] = useState(routeStudyId);
  const [detail, setDetail] = useState<StabilityStudyDetail | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [parameters, setParameters] = useState<SpecParameter[]>([]);
  const [trend, setTrend] = useState<TrendSeries[]>([]);
  const [form, setForm] = useState({ studyNumber: "", materialId: "", productName: "", batchNumber: "", conditionLabel: "Long Term", storageCondition: "25C/60%RH", startDate: "", ootThresholdPct: "10", protocolMonths: "0,3,6,12" });
  const [resultForm, setResultForm] = useState({ timepointId: "", specParameterId: "", resultValue: "", resultText: "" });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedStudy = detail?.study ?? studies.find((item) => item.id === selectedId) ?? null;
  const kpi = useMemo(() => ({
    active: studies.filter((s) => s.status === "ACTIVE").length,
    due: detail?.timepoints.filter((tp) => tp.status === "SCHEDULED").length ?? 0,
    oot: studies.filter((s) => s.hasOotAlert).length,
    hold: studies.filter((s) => s.status === "ON_HOLD").length
  }), [studies, detail]);

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (routeStudyId && routeStudyId !== selectedId) {
      setSelectedId(routeStudyId);
    }
  }, [routeStudyId, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void loadDetail(selectedId);
  }, [selectedId]);

  useEffect(() => {
    const material = materials.find((item) => item.id === form.materialId);
    if (material?.specId) {
      void fetchSpecParameters(material.specId).then(setParameters).catch(() => setParameters([]));
      setForm((current) => ({ ...current, productName: current.productName || material.materialName }));
    }
  }, [form.materialId, materials]);

  async function load() {
    try {
      const [studyData, materialData] = await Promise.all([fetchStabilityStudies(), fetchMaterials()]);
      setStudies(studyData);
      setMaterials(materialData.content);
      setSelectedId(studyData[0]?.id ?? "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stability studies");
    }
  }

  async function loadDetail(id: string) {
    try {
      const data = await fetchStabilityStudy(id);
      setDetail(data);
      setTrend(await fetchStabilityTrend(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load stability detail");
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const created = await createStabilityStudy({
        studyNumber: form.studyNumber,
        materialId: form.materialId || undefined,
        productName: form.productName,
        batchNumber: form.batchNumber || undefined,
        conditionLabel: form.conditionLabel,
        storageCondition: form.storageCondition,
        startDate: form.startDate,
        ootThresholdPct: Number(form.ootThresholdPct || 10),
        protocolMonths: form.protocolMonths.split(",").map((part) => Number(part.trim())).filter((value) => !Number.isNaN(value)),
        createdBy: username
      });
      setStudies((current) => [created.study, ...current]);
      setSelectedId(created.study.id);
      navigate(`/lims/stability/${created.study.id}`);
      setMessage("Study created.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create study");
    }
  }

  async function handlePull(tp: StabilityTimepoint) {
    if (!selectedStudy) return;
    setError(null);
    try {
      await pullStabilityTimepoint(selectedStudy.id, tp.id, username);
      await loadDetail(selectedStudy.id);
      setMessage(`T${tp.monthOffset} pulled.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull failed");
    }
  }

  async function handleRecord(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudy) return;
    const parameter = parameters.find((item) => item.id === resultForm.specParameterId);
    setError(null);
    try {
      await recordStabilityResult(selectedStudy.id, resultForm.timepointId, {
        specParameterId: resultForm.specParameterId,
        parameterName: parameter?.parameterName,
        resultValue: resultForm.resultValue ? Number(resultForm.resultValue) : undefined,
        resultText: resultForm.resultText || undefined,
        unit: parameter?.unit ?? undefined,
        enteredBy: username
      });
      await loadDetail(selectedStudy.id);
      setResultForm({ timepointId: resultForm.timepointId, specParameterId: "", resultValue: "", resultText: "" });
      setMessage("Result recorded.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Result entry failed");
    }
  }

  async function handleStatus(status: "ON_HOLD" | "COMPLETED" | "DISCONTINUED") {
    if (!selectedStudy) return;
    setError(null);
    try {
      const payload: {
        status: "ON_HOLD" | "COMPLETED" | "DISCONTINUED";
        updatedBy: string;
        username?: string;
        password?: string;
        signatureMeaning?: string;
        ootDisposition?: string;
      } = { status, updatedBy: username };
      if (status === "COMPLETED") {
        const password = window.prompt("Electronic signature password");
        if (!password) return;
        if (selectedStudy.hasOotAlert) {
          const ootDisposition = window.prompt("OOT disposition / deviation reference");
          if (!ootDisposition?.trim()) return;
          payload.ootDisposition = ootDisposition.trim();
        }
        Object.assign(payload, {
          username,
          password,
          signatureMeaning: "I certify stability study completion"
        });
      }
      const updated = await updateStabilityStatus(selectedStudy.id, payload);
      setStudies((current) => current.map((study) => study.id === updated.id ? updated : study));
      await loadDetail(selectedStudy.id);
      setMessage(`Study ${status.toLowerCase().replace("_", " ")}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stability Studies</h1>
        <p className="text-sm text-slate-500">Create studies, pull timepoints, record results, monitor OOT trends.</p>
      </div>
      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {message && <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div>}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{kpi.active}</div><div className="text-xs text-slate-500">Active Studies</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{kpi.due}</div><div className="text-xs text-slate-500">Scheduled TPs</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold text-amber-600">{kpi.oot}</div><div className="text-xs text-slate-500">OOT Alerts</div></div>
        <div className="rounded-lg border border-slate-200 p-4"><div className="text-2xl font-bold">{kpi.hold}</div><div className="text-xs text-slate-500">On Hold</div></div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <section className="space-y-4">
          <form onSubmit={handleCreate} className="space-y-3 rounded-lg border border-slate-200 p-4">
            <h2 className="font-semibold text-slate-800">New Study</h2>
            <input required value={form.studyNumber} onChange={(e) => setForm({ ...form, studyNumber: e.target.value })} className={fieldCls} placeholder="STB-2026-001" />
            <select value={form.materialId} onChange={(e) => setForm({ ...form, materialId: e.target.value })} className={fieldCls}>
              <option value="">Select material</option>
              {materials.map((material) => <option key={material.id} value={material.id}>{material.materialName}</option>)}
            </select>
            <input required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} className={fieldCls} placeholder="Product name" />
            <input value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className={fieldCls} placeholder="Batch number" />
            <div className="grid grid-cols-2 gap-2">
              <input required value={form.conditionLabel} onChange={(e) => setForm({ ...form, conditionLabel: e.target.value })} className={fieldCls} placeholder="Condition" />
              <input value={form.storageCondition} onChange={(e) => setForm({ ...form, storageCondition: e.target.value })} className={fieldCls} placeholder="25C/60%RH" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className={fieldCls} />
              <input type="number" step="0.1" value={form.ootThresholdPct} onChange={(e) => setForm({ ...form, ootThresholdPct: e.target.value })} className={fieldCls} />
              <input value={form.protocolMonths} onChange={(e) => setForm({ ...form, protocolMonths: e.target.value })} className={fieldCls} />
            </div>
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white">Create Study</button>
          </form>

          <div className="rounded-lg border border-slate-200">
            <div className="border-b border-slate-100 px-4 py-3 font-semibold">Study List</div>
            {studies.map((study) => (
              <button key={study.id} onClick={() => { setSelectedId(study.id); navigate(`/lims/stability/${study.id}`); }} className={`flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left text-sm ${selectedId === study.id ? "bg-teal-50" : "hover:bg-slate-50"}`}>
                <span><span className="font-mono">{study.studyNumber}</span><span className="ml-2 text-slate-500">{study.productName}</span></span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusCls(study.status, study.hasOotAlert)}`}>{study.hasOotAlert ? "OOT" : study.status}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {selectedStudy ? (
            <>
              <div className="rounded-lg border border-slate-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{selectedStudy.studyNumber} - {selectedStudy.productName}</h2>
                    <p className="text-sm text-slate-500">{selectedStudy.storageCondition} | Started {selectedStudy.startDate} | OOT threshold {selectedStudy.ootThresholdPct}%</p>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button type="button" onClick={() => void handleStatus("ON_HOLD")} disabled={selectedStudy.status === "ON_HOLD"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Hold</button>
                    <button type="button" onClick={() => void handleStatus("DISCONTINUED")} disabled={selectedStudy.status === "DISCONTINUED"} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Discontinue</button>
                    <button type="button" onClick={() => void handleStatus("COMPLETED")} disabled={selectedStudy.status === "COMPLETED"} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40">Complete</button>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusCls(selectedStudy.status, selectedStudy.hasOotAlert)}`}>{selectedStudy.hasOotAlert ? "OOT" : selectedStudy.status}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 font-semibold">Timepoint Timeline</h3>
                <div className="grid gap-3 md:grid-cols-4">
                  {detail?.timepoints.map((tp) => (
                    <div key={tp.id} className="rounded-lg border border-slate-200 p-3">
                      <div className="flex items-center justify-between"><span className="font-mono font-bold">T{tp.monthOffset}</span><span className={`rounded-full px-2 py-1 text-xs ${statusCls(tp.status)}`}>{tp.status}</span></div>
                      <div className="mt-2 text-xs text-slate-500">{tp.scheduledDate}</div>
                      <button onClick={() => void handlePull(tp)} disabled={tp.status !== "SCHEDULED"} className="mt-3 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold disabled:opacity-40">Pull</button>
                    </div>
                  ))}
                </div>
              </div>

              <form onSubmit={handleRecord} className="grid gap-3 rounded-lg border border-slate-200 p-4 md:grid-cols-5">
                <select required value={resultForm.timepointId} onChange={(e) => setResultForm({ ...resultForm, timepointId: e.target.value })} className={fieldCls}>
                  <option value="">Timepoint</option>
                  {detail?.timepoints.map((tp) => <option key={tp.id} value={tp.id} disabled={tp.status !== "PULLED"}>T{tp.monthOffset} - {tp.status}</option>)}
                </select>
                <select required value={resultForm.specParameterId} onChange={(e) => setResultForm({ ...resultForm, specParameterId: e.target.value })} className={fieldCls}>
                  <option value="">Parameter</option>
                  {parameters.map((parameter) => <option key={parameter.id} value={parameter.id}>{parameter.parameterName}</option>)}
                </select>
                <input type="number" step="0.0001" value={resultForm.resultValue} onChange={(e) => setResultForm({ ...resultForm, resultValue: e.target.value })} className={fieldCls} placeholder="Numeric result" />
                <input value={resultForm.resultText} onChange={(e) => setResultForm({ ...resultForm, resultText: e.target.value })} className={fieldCls} placeholder="Text result" />
                <button className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Record Result</button>
              </form>

              <div className="rounded-lg border border-slate-200 p-4">
                <h3 className="mb-3 font-semibold">Trend</h3>
                {trend.length === 0 ? <div className="text-sm text-slate-400">No numeric trend yet.</div> : trend.map((series) => (
                  <div key={series.specParameterId} className="mb-3 rounded-lg bg-slate-50 p-3">
                    <div className="font-semibold text-slate-800">{series.parameterName} {series.unit ? `(${series.unit})` : ""}</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {series.points.map((point) => <span key={`${series.specParameterId}-${point.monthOffset}`} className={`rounded-full px-2 py-1 text-xs ${point.ootFlag ? "bg-amber-100 text-amber-700" : "bg-white text-slate-600"}`}>T{point.monthOffset}: {point.value}{point.ootFlag ? " OOT" : ""}</span>)}
                    </div>
                  </div>
                ))}
              </div>

              <AuditTrailPanel entityType="STABILITY_STUDY" entityId={selectedStudy.id} compact />
            </>
          ) : <div className="rounded-lg border border-slate-200 p-6 text-sm text-slate-500">Create or select study.</div>}
        </section>
      </div>
    </div>
  );
}
