import type { DeviationSeverity, DeviationStatus } from "../../types/deviation";

export function severityClass(severity: DeviationSeverity) {
  switch (severity) {
    case "CRITICAL":
      return "bg-red-100 text-red-700";
    case "MAJOR":
      return "bg-amber-100 text-amber-700";
    case "MINOR":
    default:
      return "bg-blue-100 text-blue-700";
  }
}

export function statusClass(status: DeviationStatus) {
  switch (status) {
    case "OPEN":
      return "bg-blue-100 text-blue-700";
    case "UNDER_INVESTIGATION":
      return "bg-fuchsia-100 text-fuchsia-700";
    case "CAPA_IN_PROGRESS":
      return "bg-orange-100 text-orange-700";
    case "CLOSED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function formatLabel(value: string | null | undefined) {
  if (!value) return "-";
  return value.replace(/_/g, " ");
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}
