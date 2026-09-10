import { clsx, type ClassValue } from "clsx";
export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
export function formatDateInput(d?: string | Date | null) {
  if (!d) return "";
  const date = new Date(d);
  return date.toISOString().slice(0, 10);
}
export function isOverdue(due?: string | Date | null, status?: string) {
  if (!due || status === "done") return false;
  return new Date(due).getTime() < Date.now();
}
export const TASK_STATUSES = ["backlog", "todo", "in_progress", "in_review", "done"] as const;
export const TASK_STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  todo: "To Do",
  in_progress: "In Progress",
  in_review: "In Review",
  done: "Done",
};
export const PRIORITY_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: "Low", color: "bg-zinc-100 text-zinc-600" },
  medium: { label: "Medium", color: "bg-blue-100 text-blue-700" },
  high: { label: "High", color: "bg-amber-100 text-amber-700" },
  urgent: { label: "Urgent", color: "bg-red-100 text-red-700" },
};
