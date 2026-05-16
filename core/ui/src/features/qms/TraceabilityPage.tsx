import { FormEvent, useState } from "react";
import { fetchLotTraceability } from "../../lib/api";
import type { LotTraceabilityResponse, TraceabilityEvent } from "../../types/traceability";

// ─── Event type config ────────────────────────────────────────────────────────

function eventConfig(eventType: string): { color: string; dot: string; icon: string } {
  if (eventType.startsWith("GRN")) return { color: "text-slate-700", dot: "bg-slate-400", icon: "■" };
  if (eventType.startsWith("COA")) return { color: "text-blue-700", dot: "bg-blue-400", icon: "✓" };
  if (eventType.startsWith("SAMPLING")) return { color: "text-cyan-700", dot: "bg-cyan-400", icon: "◆" };
  if (eventType.startsWith("QC_RESULT")) return { color: "text-violet-700", dot: "bg-violet-400", icon: "⊡" };
  if (eventType.startsWith("QC_DISPOSITION")) return { color: "text-indigo-700", dot: "bg-indigo-400", icon: "▣" };
  if (eventType.startsWith("QC_DECISION")) return { color: "text-indigo-800", dot: "bg-indigo-600", icon: "★" };
  if (eventType.startsWith("INVESTIGATION")) return { color: "text-amber-700", dot: "bg-amber-400", icon: "!" };
  if (eventType.startsWith("INVENTORY")) return { color: "text-emerald-700", dot: "bg-emerald-400", icon: "▶" };
  if (eventType.startsWith("DEVIATION")) return { color: "text-rose-700", dot: "bg-rose-400", icon: "⚠" };
  if (eventType.startsWith("CAPA")) return { color: "text-orange-700", dot: "bg-orange-400", icon: "↻" };
  return { color: "text-slate-600", dot: "bg-slate-300", icon: "•" };
}

function statusBadge(status: string | null) {
  if (!status) return null;
  const map: Record<string, string> = {
    APPROVED: "bg-emerald-100 text-emerald-800",
    PASSED: "bg-emerald-100 text-emerald-800",
    REVIEWED: "bg-blue-100 text-blue-800",
    OPEN: "bg-amber-100 text-amber-800",
    REJECTED: "bg-rose-100 text-rose-800",
    FAILED: "bg-rose-100 text-rose-800",
    CLOSED_CONFIRMED: "bg-rose-100 text-rose-800",
    CLOSED_INVALID: "bg-slate-100 text-slate-700",
    PHASE_I: "bg-cyan-100 text-cyan-800",
    PHASE_II: "bg-indigo-100 text-indigo-800",
    QA_REVIEW_PENDING: "bg-amber-100 text-amber-800",
  };
  const cls = map[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Timeline item ────────────────────────────────────────────────────────────

function TimelineItem({ event, last }: { event: TraceabilityEvent; last: boolean }) {
  const cfg = eventConfig(event.eventType);
  return (
    <div className="flex gap-4">
      <div className="flex flex-col items-center">
        <div className={`mt-1 h-3 w-3 rounded-full border-2 border-white ring-2 ring-current ${cfg.dot} shrink-0`} />
        {!last && <div className="mt-1 w-px flex-1 bg-slate-200" />}
      </div>
      <div className={`mb-4 flex-1 rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-xs font-semibold ${cfg.color}`}>{event.eventLabel}</span>
          {statusBadge(event.status)}
        </div>
        <div className="mt-1 flex flex-wrap gap-3 text-[11px] text-slate-500">
          {event.timestamp && (
            <span>{new Date(event.timestamp).toLocaleString()}</span>
          )}
          {event.actor && <span>by <span className="font-medium text-slate-700">{event.actor}</span></span>}
          {event.referenceNumber && <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">{event.referenceNumber}</span>}
        </div>
        {event.remarks && (
          <div className="mt-1 text-[11px] text-slate-600">{event.remarks}</div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function TraceabilityPage() {
  const [searchInput, setSearchInput] = useState("");
  const [result, setResult] = useState<LotTraceabilityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const key = searchInput.trim();
    if (!key) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await fetchLotTraceability(key);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lot or GRN not found.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Lot / Batch Traceability</h1>
        <p className="mt-1 text-xs text-slate-500">Search by vendor lot number or GRN number to reconstruct the full material history for inspection readiness.</p>
      </div>

      {/* Search */}
      <form onSubmit={(e) => void handleSearch(e)} className="flex gap-3">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter lot number or GRN number..."
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 shadow-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !searchInput.trim()}
          className="rounded-xl border border-indigo-200 bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {loading ? "Searching..." : "Search"}
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      {result && (
        <>
          {/* Header card */}
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Lot / Vendor Batch</div>
                <div className="mt-0.5 text-xl font-bold text-slate-900">{result.vendorBatch}</div>
                {result.materialName && (
                  <div className="mt-1 text-sm text-slate-600">{result.materialName} <span className="text-slate-400">({result.materialCode})</span></div>
                )}
              </div>
              <div className="text-right text-xs text-slate-500 space-y-0.5">
                <div><span className="font-medium text-slate-700">{result.grnNumber}</span> — GRN</div>
                <div>Receipt: {result.receiptDate}</div>
                <div>Qty: <span className="font-medium text-slate-700">{result.receivedQuantity} {result.uom}</span></div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.grnStatus === "CLOSED" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                GRN {result.grnStatus}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${result.coaReviewStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : result.coaReviewStatus === "REJECTED" ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-700"}`}>
                CoA {result.coaReviewStatus}
              </span>
              {result.linkedDeviationNumber && (
                <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
                  Deviation {result.linkedDeviationNumber}
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div>
            <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Event Timeline ({result.timeline.length} events)
            </div>
            {result.timeline.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
                No events recorded yet.
              </div>
            ) : (
              <div className="pl-1">
                {result.timeline.map((event, idx) => (
                  <TimelineItem
                    key={`${event.eventType}-${event.timestamp}-${idx}`}
                    event={event}
                    last={idx === result.timeline.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
