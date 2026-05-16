import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchSecurityAuditEvents, type SecurityAuditEvent } from "../../lib/api";

const EVENT_COLORS: Record<string, string> = {
  LOGIN: "bg-green-100 text-green-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  LOGIN_FAILED: "bg-rose-100 text-rose-700",
  ACCOUNT_LOCKED: "bg-amber-100 text-amber-700",
  SESSION_TIMEOUT: "bg-orange-100 text-orange-700",
  PASSWORD_CHANGED: "bg-blue-100 text-blue-700",
  ACCOUNT_UNLOCKED: "bg-violet-100 text-violet-700",
};

export default function SecurityAuditPage() {
  const [usernameFilter, setUsernameFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");
  const [applied, setApplied] = useState<{ username?: string; from?: string; to?: string }>({});

  const { data, isLoading, isError } = useQuery<SecurityAuditEvent[]>({
    queryKey: ["security-audit-events", applied],
    queryFn: () => fetchSecurityAuditEvents(applied),
  });

  function toIso(local: string) {
    return local ? `${local}:00Z` : undefined;
  }

  function applyFilters() {
    setApplied({
      username: usernameFilter.trim() || undefined,
      from: toIso(fromFilter),
      to: toIso(toFilter),
    });
  }

  function clearFilters() {
    setUsernameFilter("");
    setFromFilter("");
    setToFilter("");
    setApplied({});
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Security Audit Log</h1>
        <p className="mt-1 text-sm text-slate-500">Login, logout, and account activity events. Default window: last 30 days.</p>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Username</label>
          <input
            value={usernameFilter}
            onChange={(e) => setUsernameFilter(e.target.value)}
            placeholder="Filter by username"
            className="w-48 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">From</label>
          <input
            type="datetime-local"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">To</label>
          <input
            type="datetime-local"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        </div>
        <button
          onClick={applyFilters}
          className="rounded-lg bg-slate-800 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          Apply
        </button>
        <button
          onClick={clearFilters}
          className="rounded-lg border border-slate-200 px-4 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
        >
          Clear
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">Loading events...</div>
        ) : isError ? (
          <div className="px-6 py-10 text-center text-sm text-rose-500">Failed to load security events.</div>
        ) : !data || data.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-slate-400">No events found for the selected criteria.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Timestamp</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Event</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Username</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">IP Address</th>
                <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Details</th>
              </tr>
            </thead>
            <tbody>
              {data.map((event) => (
                <tr key={event.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                    {new Date(event.occurredAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${EVENT_COLORS[event.eventType] ?? "bg-slate-100 text-slate-600"}`}>
                      {event.eventType.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{event.username ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{event.ipAddress ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{event.details ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
