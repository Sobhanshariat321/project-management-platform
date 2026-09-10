export type Role = "owner" | "admin" | "member";
export type ProjectStatus = "active" | "archived";
export type TaskStatus = "backlog" | "todo" | "in_progress" | "in_review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ActivityAction =
  | "task_created"
  | "task_updated"
  | "task_deleted"
  | "task_moved"
  | "comment_added"
  | "comment_updated"
  | "comment_deleted"
  | "member_added"
  | "member_removed";

export interface ApiErrorShape {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

export interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  totalPages: number;
}
