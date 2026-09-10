import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useProject } from "../hooks/useProjects.ts";
import { useTasks, useLabels } from "../hooks/useTasks.ts";
import { KanbanBoard } from "../components/kanban/KanbanBoard.tsx";
import { Button } from "../components/ui/button.tsx";
import { Input, Label } from "../components/ui/input.tsx";
import { TaskCreateModal } from "../components/tasks/TaskModal.tsx";
import { TaskDetailDrawer } from "../components/tasks/TaskDetail.tsx";
import { PageSpinner } from "../components/ui/spinner.tsx";
import { EmptyState } from "../components/ui/empty.tsx";
import { api } from "../lib/api.ts";
import { useToastStore } from "../stores/toast.ts";
import type { Task } from "../hooks/useTasks.ts";

export default function ProjectBoard(){
  const { id } = useParams();
  const projectQ = useProject(id);
  const tasksQ = useTasks({ projectId: id, limit: 100, sortBy:"position", sortOrder:"asc" });
  const labelsQ = useLabels(projectQ.data?.project.workspaceId);
  const [createOpen, setCreateOpen]=useState(false);
  const [selected, setSelected]=useState<string|null>(null);
  const toast=useToastStore(s=>s.push);
  const [labelName,setLabelName]=useState("");
  const [labelColor,setLabelColor]=useState("#6366f1");

  if(projectQ.isLoading) return <PageSpinner />;
  if(projectQ.isError) return <p className="text-sm text-red-600">{(projectQ.error as Error).message}</p>;
  const project = projectQ.data?.project;
  return <div className="space-y-4">
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
      <div>
        <Link to="/projects" className="text-xs text-zinc-500 hover:underline">← All projects</Link>
        <h1 className="text-xl font-semibold">{project?.name}</h1>
        {project?.description && <p className="text-sm text-zinc-500">{project.description}</p>}
        {project?.key && <span className="text-xs text-zinc-400">{project.key} · workspace {project.workspaceId.slice(0,8)}</span>}
      </div>
      <div className="flex gap-2">
        <Button onClick={()=> setCreateOpen(true)}>New task</Button>
      </div>
    </div>

    {/* Labels management */}
    <div className="rounded-xl border bg-white p-3 flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-zinc-600">Labels:</span>
      {labelsQ.data?.data.map(l=> <span key={l.id} className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border" style={{backgroundColor:`${l.color}20`, color:l.color, borderColor:l.color}}>{l.name} <button onClick={async()=>{ if(!confirm("Delete label?"))return; try{ await api(`/api/workspaces/${project?.workspaceId}/labels/${l.id}`,{method:"DELETE"}); labelsQ.refetch(); toast({title:"Label deleted", variant:"success"});} catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"});}} } className="ml-1 text-[10px]">✕</button></span>)}
      <form onSubmit={async(e)=>{
        e.preventDefault();
        if(!labelName.trim()) return;
        try{ await api(`/api/workspaces/${project?.workspaceId}/labels`,{method:"POST", body: JSON.stringify({ name: labelName, color: labelColor })}); setLabelName(""); labelsQ.refetch(); toast({title:"Label created", variant:"success"}); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"});}
      }} className="flex items-center gap-1 ml-2">
        <Input value={labelName} onChange={e=> setLabelName(e.target.value)} placeholder="New label" className="h-7 w-28 text-xs" />
        <input type="color" value={labelColor} onChange={e=> setLabelColor(e.target.value)} className="h-7 w-7 rounded border" />
        <Button type="submit" size="sm" className="h-7 px-2 text-xs">Add</Button>
      </form>
    </div>

    {tasksQ.isLoading ? <PageSpinner /> : tasksQ.data?.data.length===0 ? <EmptyState title="No tasks yet" description="Create your first task and drag it across the board." action={<Button onClick={()=> setCreateOpen(true)}>Create task</Button>} /> : (
      <KanbanBoard tasks={tasksQ.data?.data as Task[]} onTaskClick={(t)=> setSelected(t.id)} onRefresh={()=> tasksQ.refetch()} />
    )}

    {id && <TaskCreateModal open={createOpen} onClose={()=> setCreateOpen(false)} projectId={id} onCreated={()=> tasksQ.refetch()} />}
    <TaskDetailDrawer taskId={selected} open={!!selected} onClose={()=> { setSelected(null); tasksQ.refetch(); }} />
  </div>;
}
