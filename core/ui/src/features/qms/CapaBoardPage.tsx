import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCapaSummary, fetchCapas, updateCapaStatus } from "../../lib/api";
import type { Capa, CapaStatus } from "../../types/capa";
import { formatDateTime, formatLabel, severityClass } from "./deviationUi";
import { capaStatusClass, capaStatuses, dueState } from "./capaUi";

export function CapaBoardPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [ownerFilter, setOwnerFilter] = useState("ALL");
  const [selected, setSelected] = useState<Capa | null>(null);
  const [statusReason, setStatusReason] = useState("");
  const [completionSummary, setCompletionSummary] = useState("");
  const [signaturePassword, setSignaturePassword] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({ queryKey: ["capas"], queryFn: () => fetchCapas() });
  const { data: summary } = useQuery({ queryKey: ["capa-summary"], queryFn: fetchCapaSummary });
  const capas = data?.content ?? [];
  const owners = useMemo(() => Array.from(new Set(capas.map((capa) => capa.owner))).sort(), [capas]);
  const filtered = useMemo(
    () => capas.filter((capa) =>
      (severityFilter === "ALL" || capa.severity === severityFilter) &&
      (ownerFilter === "ALL" || capa.owner === ownerFilter)
    ),
    [capas, ownerFilter, severityFilter]
  );

  const statusMutation = useMutation({
    mutationFn: ({ capa, status }: { capa: Capa; status: CapaStatus }) => updateCapaStatus(capa.id, {
      status,
      reason: statusReason.trim() || undefined,
      completionSummary: status === "CLOSED" || status === "COMPLETED" || status === "EFFECTIVENESS_CHECK" ? completionSummary.trim() || undefined : undefined,
      username: status === "CLOSED" ? "admin" : undefined,
      password: status === "CLOSED" ? signaturePassword : undefined,
      meaning: status === "CLOSED" ? "I approve CAPA closure" : undefined
    }),
    onSuccess: async () => {
      setActionError(null);
      setSelected(null);
      setSignaturePassword("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["capas"] }),
        queryClient.invalidateQueries({ queryKey: ["capa-summary"] })
      ]);
    },
    onError: (mutationError) => setActionError(mutationError instanceof Error ? mutationError.message : "Failed to update CAPA")
  });

  const openCount = (summary?.countsByStatus.OPEN ?? 0) + (summary?.countsByStatus.IN_PROGRESS ?? 0) + (summary?.countsByStatus.COMPLETED ?? 0) + (summary?.countsByStatus.EFFECTIVENESS_CHECK ?? 0);
  const errorMessage = error instanceof Error ? error.message : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-amber-50/30">
      <div className="flex items-center gap-4 border-b border-amber-100 bg-white px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800">CAPA Tracker</h1>
          <p className="text-sm text-slate-500">Corrective and preventive actions linked to QMS deviations</p>
        </div>
      </div>

      <div className="flex items-center gap-6 border-b border-amber-100 bg-white px-6 py-3">
        <Stat value={openCount} label="Open CAPAs" className="text-slate-800" />
        <Stat value={summary?.overdue ?? 0} label="Overdue" className="text-red-500" />
        <Stat value={summary?.dueThisWeek ?? 0} label="Due this week" className="text-amber-600" />
        <Stat value={summary?.countsByStatus.CLOSED ?? 0} label="Closed" className="text-green-600" />
        <div className="ml-auto flex gap-2">
          <select value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            {["ALL", "CRITICAL", "MAJOR", "MINOR"].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}
          </select>
          <select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)} className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <option value="ALL">All Owners</option>
            {owners.map((owner) => <option key={owner} value={owner}>{owner}</option>)}
          </select>
        </div>
      </div>

      {isLoading ? <div className="p-6 text-sm text-slate-500">Loading CAPAs...</div> : null}
      {errorMessage ? <div className="p-6 text-sm text-red-500">{errorMessage}</div> : null}

      <div className="flex-1 overflow-x-auto p-5">
        <div className="flex h-full min-w-max gap-4">
          {capaStatuses.map((status) => {
            const statusCapas = filtered.filter((capa) => capa.status === status);
            return (
              <div key={status} className="flex w-64 shrink-0 flex-col rounded-xl border border-amber-100 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-amber-100 px-4 py-3">
                  <span className="text-xs font-bold text-slate-700">{formatLabel(status)}</span>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">{statusCapas.length}</span>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-3">
                  {statusCapas.map((capa) => <CapaCard key={capa.id} capa={capa} onClick={() => setSelected(capa)} />)}
                  {statusCapas.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-400">No CAPAs</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/30">
          <div className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-mono text-xs font-bold text-amber-700">{selected.capaNumber}</div>
                <h2 className="mt-1 text-lg font-bold text-slate-800">{selected.title}</h2>
                <p className="text-xs text-slate-500">Deviation {selected.deviationNumber}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">Close</button>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <Info label="Owner" value={selected.owner} />
              <Info label="Due date" value={selected.dueDate} />
              <Info label="Corrective action" value={selected.correctiveAction} />
              <Info label="Preventive action" value={selected.preventiveAction ?? "-"} />
              <Info label="Effectiveness check" value={selected.effectivenessCheck ?? "-"} />
            </div>
            <div className="mt-5 space-y-3">
              <textarea value={statusReason} onChange={(event) => setStatusReason(event.target.value)} className={fieldClass("min-h-20")} placeholder="Status change reason" />
              <textarea value={completionSummary} onChange={(event) => setCompletionSummary(event.target.value)} className={fieldClass("min-h-20")} placeholder="Completion / effectiveness summary" />
              <input type="password" value={signaturePassword} onChange={(event) => setSignaturePassword(event.target.value)} className={fieldClass()} placeholder="Password required for closure" />
              {actionError ? <div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">{actionError}</div> : null}
              <div className="grid grid-cols-2 gap-2">
                {capaStatuses.filter((status) => status !== selected.status).map((status) => (
                  <button key={status} type="button" onClick={() => statusMutation.mutate({ capa: selected, status })} className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50" disabled={statusMutation.isPending}>
                    Move to {formatLabel(status)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CapaCard({ capa, onClick }: { capa: Capa; onClick: () => void }) {
  const due = dueState(capa.dueDate, capa.status === "CLOSED");
  return (
    <button type="button" onClick={onClick} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-amber-500 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="font-mono text-xs font-bold text-amber-700">{capa.capaNumber}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${severityClass(capa.severity)}`}>{capa.severity}</span>
      </div>
      <div className="mt-2 text-xs font-semibold text-slate-800">{capa.title}</div>
      <div className="mt-1 text-[10px] text-slate-400">Source: {capa.deviationNumber}</div>
      <div className="mt-2 flex items-center gap-2 border-t border-slate-100 pt-2">
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${capaStatusClass(capa.status)}`}>{formatLabel(capa.status)}</span>
        <span className="flex-1 truncate text-[10px] text-slate-500">{capa.owner}</span>
        <span className={`text-[10px] font-bold ${due.className}`}>{due.label}</span>
      </div>
    </button>
  );
}

function Stat({ value, label, className }: { value: number; label: string; className: string }) {
  return <div className="flex items-center gap-2"><span className={`text-2xl font-bold ${className}`}>{value}</span><span className="text-xs text-slate-500">{label}</span></div>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div className="text-xs font-semibold text-slate-400">{label}</div><div className="mt-1 text-slate-700">{value}</div></div>;
}

function fieldClass(extra = "") {
  return `w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-amber-400 ${extra}`;
}
