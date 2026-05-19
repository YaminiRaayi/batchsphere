import { useEffect, useMemo, useState } from "react";
import { fetchAllInstrumentLogbook } from "../../lib/api";
import type { InstrumentUsageLog } from "../../types/logbook";

function isWithin(iso: string, from: string, to: string) {
  if (!from && !to) return true;
  const d = iso.slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}

export function LogbookPage() {
  const [entries, setEntries] = useState<InstrumentUsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usedBy, setUsedBy] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [conditionFilter, setConditionFilter] = useState<"" | "NORMAL" | "ANOMALY">("");

  useEffect(() => {
    void load();
  }, []);

  async function load(filter: { usedBy?: string } = {}) {
    setLoading(true);
    setError(null);
    try {
      setEntries(await fetchAllInstrumentLogbook(filter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load logbook");
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    void load({ usedBy: usedBy || undefined });
  }

  function resetFilters() {
    setUsedBy("");
    setFrom("");
    setTo("");
    setConditionFilter("");
    void load();
  }

  const filtered = useMemo(
    () =>
      entries.filter(
        (entry) =>
          isWithin(entry.usedAt, from, to) &&
          (conditionFilter ? entry.condition === conditionFilter : true)
      ),
    [entries, from, to, conditionFilter]
  );

  const summary = useMemo(
    () => ({
      total: filtered.length,
      anomalies: filtered.filter((e) => e.condition === "ANOMALY").length,
      linkedDeviations: filtered.filter((e) => !!e.linkedDeviationId).length,
      uniqueInstruments: new Set(filtered.map((e) => e.equipmentId)).size
    }),
    [filtered]
  );

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Instrument Logbook</h1>
          <p className="text-sm text-slate-500">
            Cross-instrument usage log. Auto entries come from worksheet activity; manual entries are added on each
            equipment page.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold">{summary.total}</div>
          <div className="text-xs text-slate-500">Entries (filtered)</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold">{summary.uniqueInstruments}</div>
          <div className="text-xs text-slate-500">Instruments</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-amber-600">{summary.anomalies}</div>
          <div className="text-xs text-slate-500">Anomaly Entries</div>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <div className="text-2xl font-bold text-rose-600">{summary.linkedDeviations}</div>
          <div className="text-xs text-slate-500">Linked Deviations</div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_1fr_auto_auto]">
          <input
            value={usedBy}
            onChange={(e) => setUsedBy(e.target.value)}
            placeholder="Analyst (username)"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value as typeof conditionFilter)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            <option value="">All conditions</option>
            <option value="NORMAL">Normal</option>
            <option value="ANOMALY">Anomaly</option>
          </select>
          <button
            onClick={applyFilters}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Apply
          </button>
          <button
            onClick={resetFilters}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50 text-left text-xs uppercase text-slate-500">
              <th className="px-4 py-3">Date/Time</th>
              <th className="px-4 py-3">Instrument</th>
              <th className="px-4 py-3">Used By</th>
              <th className="px-4 py-3">Purpose</th>
              <th className="px-4 py-3">Condition</th>
              <th className="px-4 py-3">Deviation</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No logbook entries matching filters.
                </td>
              </tr>
            ) : (
              filtered.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-100">
                  <td className="px-4 py-3 font-mono text-xs">{new Date(entry.usedAt).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-700">{entry.equipmentCode ?? "-"}</div>
                    <div className="text-xs text-slate-400">{entry.equipmentName ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{entry.usedBy}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {entry.purpose ?? <span className="text-slate-400">-</span>}
                    {entry.condition === "ANOMALY" && entry.anomalyDescription ? (
                      <div className="mt-1 text-xs text-amber-700">{entry.anomalyDescription}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">
                    {entry.condition === "ANOMALY" ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        ⚠ Anomaly
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                        ● Normal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {entry.linkedDeviationId ? (
                      <a
                        href={`/qms/deviations/${entry.linkedDeviationId}`}
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
                        {entry.linkedDeviationNumber ?? "View"}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
