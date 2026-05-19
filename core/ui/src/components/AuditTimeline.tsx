import { useQuery } from "@tanstack/react-query";
import { fetchAuditEvents } from "../lib/api";
import type { AuditEvent } from "../types/sampling";

interface AuditTimelineProps {
  entityType: string;
  entityId: string | undefined;
  title?: string;
  compact?: boolean;
}

const eventStyle: Record<AuditEvent["eventType"], string> = {
  CREATE: "border-blue-100 bg-blue-50 text-blue-800",
  UPDATE: "border-slate-100 bg-slate-50 text-slate-700",
  STATUS_CHANGE: "border-amber-100 bg-amber-50 text-amber-800",
  E_SIGNATURE: "border-green-100 bg-green-50 text-green-800",
  WORKFLOW_ACTION: "border-purple-100 bg-purple-50 text-purple-800",
};

function fmt(s: string) {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function valueText(value: string | null) {
  return value == null || value === "" ? "-" : value;
}

export function AuditTrailPanel({ entityType, entityId, title = "Audit Trail", compact = false }: AuditTimelineProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", entityType, entityId],
    queryFn: () => fetchAuditEvents(entityType, entityId as string),
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2 rounded-lg border border-slate-200 p-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <span className="text-xs text-slate-400">{entityType}</span>
        </div>
        <div className="text-sm text-slate-400">No audit events yet.</div>
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <div className="text-xs text-slate-500">
            {events.length} event{events.length === 1 ? "" : "s"} | oldest first
          </div>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">{entityType}</span>
      </div>

      <div className={compact ? "max-h-72 space-y-2 overflow-y-auto pr-1" : "space-y-2"}>
        {events.map((event) => (
          <div
            key={event.id}
            className={`rounded-lg border p-3 text-xs ${eventStyle[event.eventType] ?? "border-slate-100 bg-slate-50 text-slate-700"}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="font-semibold">
                {fmt(event.eventType)}
                {event.fieldName ? ` | ${event.fieldName}` : ""}
              </div>
              <div className="text-[11px] opacity-70">{new Date(event.eventAt).toLocaleString()}</div>
            </div>
            {(event.oldValue != null || event.newValue != null) && (
              <div className="mt-2 grid gap-2 rounded-md bg-white/60 p-2 text-[11px] md:grid-cols-2">
                <div>
                  <div className="font-semibold opacity-60">Old</div>
                  <div className="break-words">{valueText(event.oldValue)}</div>
                </div>
                <div>
                  <div className="font-semibold opacity-60">New</div>
                  <div className="break-words">{valueText(event.newValue)}</div>
                </div>
              </div>
            )}
            {event.reason && (
              <div className="mt-2 rounded-md bg-white/60 p-2">
                <div className="font-semibold opacity-60">Reason</div>
                <div className="break-words">{event.reason}</div>
              </div>
            )}
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] opacity-70">
              <span>Actor: {event.actor}</span>
              <span>Source: {event.source ?? "APPLICATION"}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AuditTimeline(props: AuditTimelineProps) {
  return <AuditTrailPanel {...props} />;
}
