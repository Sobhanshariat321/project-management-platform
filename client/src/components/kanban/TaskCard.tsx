import { cn, PRIORITY_LABEL, isOverdue } from "../../lib/utils.ts";
import { Badge } from "../ui/badge.tsx";
import type { Task } from "../../hooks/useTasks.ts";

export function TaskCard({ task, onClick, isDragging }: { task: Task; onClick?:()=>void; isDragging?:boolean }) {
  return <div onClick={onClick} className={cn("rounded-lg border bg-white p-3 shadow-sm hover:shadow-md cursor-pointer transition-shadow", isDragging && "opacity-60 rotate-1")}>
    <h4 className="text-sm font-medium leading-tight line-clamp-2">{task.title}</h4>
    {task.description && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{task.description}</p>}
    <div className="mt-2 flex flex-wrap gap-1">
      {task.labels?.map(l=> <span key={l.id} className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border" style={{ backgroundColor: `${l.color}20`, borderColor: l.color, color: l.color }}>{l.name}</span>)}
    </div>
    <div className="mt-2 flex items-center justify-between">
      <Badge className={cn("border text-[11px] px-1.5 py-0", PRIORITY_LABEL[task.priority]?.color ?? "bg-zinc-100")}>{task.priority}</Badge>
      {task.dueDate && <span className={cn("text-[11px]", isOverdue(task.dueDate, task.status) ? "text-red-600 font-medium":"text-zinc-500")}>{new Date(task.dueDate).toLocaleDateString(undefined,{month:"short", day:"numeric"})}</span>}
    </div>
    <div className="mt-2 flex items-center gap-1">
      {task.assignees?.slice(0,3).map(a=> <span key={a.id} className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-medium text-indigo-700" title={a.displayName}>{a.displayName.slice(0,2).toUpperCase()}</span>)}
      {task.assignees && task.assignees.length>3 && <span className="text-xs text-zinc-500">+{task.assignees.length-3}</span>}
      {task._count?.comments ? <span className="ml-auto text-xs text-zinc-400">💬 {task._count.comments}</span> : null}
    </div>
  </div>;
}
