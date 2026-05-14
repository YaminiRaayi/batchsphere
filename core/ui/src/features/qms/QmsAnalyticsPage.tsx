import { useQuery } from "@tanstack/react-query";
import { fetchQmsAnalytics } from "../../lib/api";
import type { QmsAnalytics } from "../../types/qms-analytics";

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-teal-100 text-teal-800",
  EFFECTIVENESS_CHECK: "bg-purple-100 text-purple-800",
  CLOSED: "bg-green-100 text-green-800",
  CANCELLED: "bg-gray-100 text-gray-600",
  PENDING_INVESTIGATION: "bg-red-100 text-red-800",
  UNDER_INVESTIGATION: "bg-orange-100 text-orange-800",
  RESOLVED: "bg-teal-100 text-teal-800",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-800",
  MAJOR: "bg-orange-100 text-orange-800",
  MINOR: "bg-yellow-100 text-yellow-800",
};

function pill(label: string, count: number, colorClass: string) {
  return (
    <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}>
      {label.replace(/_/g, " ")}
      <span className="font-bold">{count}</span>
    </span>
  );
}

function StatCard({ label, value, sub, accent }: { label: string; value: string | number; sub?: string; accent?: string }) {
  return (
    <div className={`rounded-xl border bg-white p-4 shadow-sm ${accent ? `border-${accent}-200` : "border-gray-200"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${accent ? `text-${accent}-600` : "text-gray-800"}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function MapTable({ title, data, colorMap }: { title: string; data: Record<string, number>; colorMap?: Record<string, string> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">{title}</div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(data).map(([k, v]) =>
          pill(k, v, colorMap?.[k] ?? "bg-gray-100 text-gray-700")
        )}
      </div>
      <div className="mt-2 space-y-1">
        {Object.entries(data).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
          <div key={k} className="flex items-center gap-2">
            <div className="w-28 truncate text-xs text-gray-500">{k.replace(/_/g, " ")}</div>
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div className="h-2 rounded-full bg-amber-400" style={{ width: total > 0 ? `${(v / total) * 100}%` : "0%" }} />
            </div>
            <div className="w-6 text-right text-xs font-bold text-gray-700">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MonthlyTrend({ data }: { data: QmsAnalytics["deviationsByMonth"] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">Deviations — last 6 months</div>
      <div className="flex items-end gap-2 h-20">
        {data.map((d) => (
          <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
            <div className="w-full rounded-t bg-amber-400" style={{ height: `${Math.max(4, (d.count / max) * 64)}px` }} />
            <div className="text-[10px] text-gray-400 leading-none">{d.month.slice(5)}</div>
            <div className="text-[10px] font-bold text-gray-600">{d.count}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QmsAnalyticsPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["qms-analytics"],
    queryFn: fetchQmsAnalytics,
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-gray-400">
        Loading analytics…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="flex h-60 items-center justify-center text-sm text-red-400">
        Failed to load analytics.
      </div>
    );
  }

  const totalDeviations = Object.values(data.deviationsByStatus).reduce((a, b) => a + b, 0);
  const openCapas = Object.entries(data.capasByStatus)
    .filter(([s]) => s !== "CLOSED" && s !== "CANCELLED")
    .reduce((a, [, v]) => a + v, 0);

  const { capaAging: ag } = data;
  const totalAging = ag.days0to30 + ag.days31to60 + ag.days61to90 + ag.daysOver90;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">QMS Analytics</h1>
        <p className="mt-0.5 text-sm text-gray-500">Deviation and CAPA overview</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total Deviations" value={totalDeviations} accent="amber" />
        <StatCard label="Open CAPAs" value={openCapas} accent="blue" />
        <StatCard label="Overdue CAPAs" value={data.overdueCapas} accent="red" />
        <StatCard
          label="Avg. Closure"
          value={data.avgCapaClosureDays != null ? `${data.avgCapaClosureDays}d` : "—"}
          sub="days CAPA open → closed"
          accent="teal"
        />
      </div>

      {/* Due this week */}
      {data.dueThisWeek > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
          <span className="font-bold">{data.dueThisWeek}</span> CAPA{data.dueThisWeek !== 1 ? "s" : ""} due within next 7 days.
        </div>
      )}

      {/* Monthly trend */}
      <MonthlyTrend data={data.deviationsByMonth} />

      {/* Deviations breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <MapTable title="Deviations by Status" data={data.deviationsByStatus} colorMap={STATUS_COLORS} />
        <MapTable title="Deviations by Severity" data={data.deviationsBySeverity} colorMap={SEVERITY_COLORS} />
        <MapTable title="Deviations by Source" data={data.deviationsBySourceModule} />
      </div>

      {/* CAPA breakdown */}
      <div className="grid gap-4 sm:grid-cols-2">
        <MapTable title="CAPAs by Status" data={data.capasByStatus} colorMap={STATUS_COLORS} />

        {totalAging > 0 && (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">CAPA Age (Open)</div>
            <div className="space-y-2">
              {[
                { label: "0 – 30 days", count: ag.days0to30, color: "bg-green-400" },
                { label: "31 – 60 days", count: ag.days31to60, color: "bg-yellow-400" },
                { label: "61 – 90 days", count: ag.days61to90, color: "bg-orange-400" },
                { label: "> 90 days", count: ag.daysOver90, color: "bg-red-400" },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className="w-24 text-xs text-gray-500">{label}</div>
                  <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className={`h-2 rounded-full ${color}`} style={{ width: totalAging > 0 ? `${(count / totalAging) * 100}%` : "0%" }} />
                  </div>
                  <div className="w-6 text-right text-xs font-bold text-gray-700">{count}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
