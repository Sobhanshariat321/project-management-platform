import { useState } from "react";
import { useTask, useTaskActivity, useComments, type Task } from "../../hooks/useTasks.ts";
import { useDeleteTask } from "../../hooks/useTasks.ts";
import { Drawer } from "../ui/modal.tsx";
import { Button } from "../ui/button.tsx";
import { Input, Textarea, Label } from "../ui/input.tsx";
import { TaskEditForm } from "./TaskModal.tsx";
import { api } from "../../lib/api.ts";
import { useToastStore } from "../../stores/toast.ts";
import { formatDate } from "../../lib/utils.ts";
import { Badge } from "../ui/badge.tsx";
import { PageSpinner } from "../ui/spinner.tsx";

export function TaskDetailDrawer({ taskId, open, onClose }: { taskId: string | null; open:boolean; onClose:()=>void }) {
  const { data, isLoading, refetch } = useTask(taskId ?? undefined);
  const activityQ = useTaskActivity(taskId ?? undefined);
  const commentsQ = useComments(taskId ?? undefined);
  const del = useDeleteTask();
  const toast = useToastStore(s=>s.push);
  const [editing, setEditing]=useState(false);
  const [newComment, setNewComment]=useState("");
  const [labelName, setLabelName]=useState("");
  const [labelColor, setLabelColor]=useState("#6366f1");
  const task = data?.task as (Task & { comments?: unknown[] }) | undefined;

  if(!open) return null;
  return <Drawer open={open} onClose={onClose} title={task?.title ?? "Task detail"}>
    {isLoading ? <PageSpinner /> : !task ? <p className="text-sm text-zinc-500">Task not found</p> : (
      <div className="space-y-6">
        {!editing ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge className="bg-zinc-100 border">{task.status}</Badge>
              <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{task.priority}</Badge>
              {task.dueDate && <span className="text-xs text-zinc-500">Due {formatDate(task.dueDate)}</span>}
            </div>
            {task.description && <p className="text-sm text-zinc-700 whitespace-pre-wrap">{task.description}</p>}
            <div className="flex flex-wrap gap-1">
              {task.labels?.map(l=> <span key={l.id} className="rounded-full px-2 py-0.5 text-xs border" style={{backgroundColor:`${l.color}20`, color:l.color, borderColor:l.color}}>{l.name}</span>)}
            </div>
            <div className="flex flex-wrap gap-1">
              {task.assignees?.map(a=> <span key={a.id} className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-xs">{a.displayName}</span>)}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={()=> setEditing(true)}>Edit</Button>
              <Button size="sm" variant="destructive" onClick={async()=>{
                if(!confirm("Delete task?")) return;
                try{ await del.mutateAsync(task.id); toast({title:"Task deleted", variant:"success"}); onClose(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Delete failed", variant:"error"});}
              }}>Delete</Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border p-4 bg-zinc-50">
            <TaskEditForm task={task} onClose={()=> { setEditing(false); refetch(); }} />
            <Button variant="ghost" size="sm" className="mt-2" onClick={()=> setEditing(false)}>Cancel</Button>
          </div>
        )}

        {/* Comments */}
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Comments ({commentsQ.data?.data.length ?? 0})</h3>
          <form onSubmit={async(e)=>{
            e.preventDefault();
            if(!newComment.trim()) return;
            try{ await api(`/api/tasks/${task.id}/comments`,{method:"POST", body: JSON.stringify({ body: newComment })}); setNewComment(""); toast({title:"Comment added", variant:"success"}); commentsQ.refetch(); activityQ.refetch(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"});}
          }} className="flex gap-2">
            <Input value={newComment} onChange={e=> setNewComment(e.target.value)} placeholder="Write a comment…" className="flex-1" />
            <Button type="submit" size="sm">Post</Button>
          </form>
          <div className="space-y-2 max-h-[260px] overflow-auto">
            {commentsQ.data?.data.map(c=> (
              <div key={c.id} className="rounded-lg border bg-white p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{c.author.displayName}</span>
                  <span className="text-xs text-zinc-400">{formatDate(c.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm text-zinc-700 whitespace-pre-wrap">{c.body}</p>
                <div className="mt-2 flex gap-2">
                  <button className="text-xs text-zinc-500 hover:text-zinc-700" onClick={async()=>{
                    const body = prompt("Edit comment", c.body);
                    if(body===null) return;
                    try{ await api(`/api/tasks/${task.id}/comments/${c.id}`,{method:"PATCH", body: JSON.stringify({ body })}); commentsQ.refetch(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"});}
                  }}>Edit</button>
                  <button className="text-xs text-red-600 hover:text-red-700" onClick={async()=>{
                    if(!confirm("Delete comment?")) return;
                    try{ await api(`/api/tasks/${task.id}/comments/${c.id}`,{method:"DELETE"}); commentsQ.refetch(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"});}
                  }}>Delete</button>
                </div>
              </div>
            ))}
            {commentsQ.data?.data.length===0 && <p className="text-xs text-zinc-500">No comments yet.</p>}
          </div>
        </div>

        {/* Activity */}
        <div className="space-y-2">
          <h3 className="font-medium text-sm">Activity</h3>
          <div className="space-y-1 max-h-[220px] overflow-auto">
            {activityQ.data?.data.map(a=> (
              <div key={a.id} className="rounded border px-3 py-2 text-xs">
                <span className="font-medium">{a.actor.displayName}</span> <span className="text-zinc-500">{a.action.replaceAll("_"," ")}</span>
                <span className="ml-2 text-zinc-400">{formatDate(a.createdAt)}</span>
              </div>
            ))}
            {activityQ.data?.data.length===0 && <p className="text-xs text-zinc-500">No activity</p>}
          </div>
        </div>
      </div>
    )}
  </Drawer>;
}
