import { useQuery } from "@tanstack/react-query";
import { fetchAuditEvents } from "../lib/api";
import type { AuditEvent } from "../types/sampling";

interface AuditTimelineProps {
  entityType: string;
  entityId: string | undefined;
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

export function AuditTimeline({ entityType, entityId }: AuditTimelineProps) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit-events", entityType, entityId],
    queryFn: () => fetchAuditEvents(entityType, entityId as string),
    enabled: !!entityId,
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return <div className="text-sm text-slate-400">No audit events yet.</div>;
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={event.id}
          className={`rounded-xl border p-3 text-xs ${eventStyle[event.eventType] ?? "border-slate-100 bg-slate-50 text-slate-700"}`}
        >
          <div className="font-semibold">
            {fmt(event.eventType)}
            {event.fieldName ? ` · ${event.fieldName}` : ""}
          </div>
          {(event.oldValue != null || event.newValue != null) && (
            <div className="mt-1 opacity-75">
              {event.oldValue ?? "—"} → {event.newValue ?? "—"}
            </div>
          )}
          {event.reason && (
            <div className="mt-1 opacity-75">{event.reason}</div>
          )}
          <div className="mt-1.5 text-[10px] opacity-50">
            {event.actor} · {new Date(event.eventAt).toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
