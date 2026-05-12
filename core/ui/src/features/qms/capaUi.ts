import type { CapaStatus } from "../../types/capa";

export const capaStatuses: CapaStatus[] = ["OPEN", "IN_PROGRESS", "COMPLETED", "EFFECTIVENESS_CHECK", "CLOSED"];

export function capaStatusClass(status: CapaStatus) {
  switch (status) {
    case "OPEN":
      return "bg-slate-100 text-slate-700";
    case "IN_PROGRESS":
      return "bg-blue-100 text-blue-700";
    case "COMPLETED":
      return "bg-amber-100 text-amber-700";
    case "EFFECTIVENESS_CHECK":
      return "bg-purple-100 text-purple-700";
    case "CLOSED":
      return "bg-green-100 text-green-700";
    case "CANCELLED":
    default:
      return "bg-red-100 text-red-700";
  }
}

export function dueState(dueDate: string, closed: boolean) {
  if (closed) return { label: "Closed", className: "text-green-600" };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: "Overdue", className: "text-red-600" };
  if (diffDays <= 7) return { label: `Due ${diffDays}d`, className: "text-amber-600" };
  return { label: "On Track", className: "text-green-600" };
}
