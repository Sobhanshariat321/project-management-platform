import { useEffect, useState } from "react";
import { Modal } from "../ui/modal.tsx";
import { Input, Label, Textarea, Select } from "../ui/input.tsx";
import { Button } from "../ui/button.tsx";
import { useCreateTask, useUpdateTask, type Task, useLabels } from "../../hooks/useTasks.ts";
import { useWorkspaceMembers } from "../../hooks/useWorkspaces.ts";
import { useProject } from "../../hooks/useProjects.ts";
import { useToastStore } from "../../stores/toast.ts";
import { formatDateInput } from "../../lib/utils.ts";

export function TaskCreateModal({ open, onClose, projectId, onCreated }: { open:boolean; onClose:()=>void; projectId:string; onCreated?:()=>void }) {
  const [form, setForm]=useState({ title:"", description:"", status:"todo", priority:"medium", dueDate:"", assigneeIds: [] as string[], labelIds: [] as string[] });
  const create = useCreateTask();
  const toast = useToastStore(s=>s.push);
  const projectQ = useProject(projectId);
  const wsId = projectQ.data?.project.workspaceId;
  const labelsQ = useLabels(wsId);
  const membersQ = useWorkspaceMembers(wsId);

  useEffect(()=>{ if(open) setForm({ title:"", description:"", status:"todo", priority:"medium", dueDate:"", assigneeIds:[], labelIds:[]}); },[open]);

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    try{
      await create.mutateAsync({
        projectId,
        title: form.title,
        description: form.description || undefined,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assigneeIds: form.assigneeIds.length? form.assigneeIds: undefined,
        labelIds: form.labelIds.length? form.labelIds: undefined,
      } as unknown as Record<string,unknown>);
      toast({title:"Task created", variant:"success"});
      onClose(); onCreated?.();
    } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"}); }
  };
  return <Modal open={open} onClose={onClose} title="New task">
    <form onSubmit={submit} className="space-y-3">
      <div><Label>Title *</Label><Input value={form.title} onChange={e=> setForm({...form, title:e.target.value})} required maxLength={200} /></div>
      <div><Label>Description</Label><Textarea value={form.description} onChange={e=> setForm({...form, description:e.target.value})} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Status</Label><Select value={form.status} onChange={e=> setForm({...form, status:e.target.value})}><option value="backlog">Backlog</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></Select></div>
        <div><Label>Priority</Label><Select value={form.priority} onChange={e=> setForm({...form, priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></Select></div>
      </div>
      <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={e=> setForm({...form, dueDate:e.target.value})} /></div>
      {membersQ.data && <div><Label>Assignees</Label><div className="mt-1 flex flex-wrap gap-2">{membersQ.data.data.map(m=> {
        const checked = form.assigneeIds.includes(m.user.id);
        return <label key={m.user.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-pointer ${checked? "bg-indigo-50 border-indigo-300":"bg-white"}`}><input type="checkbox" checked={checked} onChange={e=> setForm(f=> ({...f, assigneeIds: e.target.checked ? [...f.assigneeIds, m.user.id] : f.assigneeIds.filter(x=>x!==m.user.id)}))} className="accent-indigo-600" />{m.user.displayName}</label>;
      })}</div></div>}
      {labelsQ.data && labelsQ.data.data.length>0 && <div><Label>Labels</Label><div className="mt-1 flex flex-wrap gap-2">{labelsQ.data.data.map(l=>{
        const checked = form.labelIds.includes(l.id);
        return <label key={l.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-pointer ${checked? "border-indigo-300":""}`} style={{ backgroundColor: checked? `${l.color}30`:"white", borderColor: checked? l.color: undefined }}><input type="checkbox" checked={checked} onChange={e=> setForm(f=> ({...f, labelIds: e.target.checked ? [...f.labelIds, l.id] : f.labelIds.filter(x=>x!==l.id)}))} />{l.name}</label>;
      })}</div></div>}
      <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending? "Creating…":"Create task"}</Button>
    </form>
  </Modal>;
}

export function TaskEditForm({ task, onClose }: { task: Task; onClose:()=>void }) {
  const [form, setForm]=useState({
    title: task.title,
    description: task.description ?? "",
    status: task.status,
    priority: task.priority,
    dueDate: formatDateInput(task.dueDate),
    assigneeIds: task.assignees?.map(a=>a.id) ?? [],
    labelIds: task.labels?.map(l=>l.id) ?? [],
  });
  const update = useUpdateTask(task.id);
  const toast = useToastStore(s=>s.push);
  // need workspace for members/labels
  const { data: full } = useProject(task.projectId) as unknown as { data: { project: { workspaceId:string }}|undefined };
  // We'll fallback to fetching task detail for workspace
  // Use derived: we already have task; need wsId via project query
  // Instead lazy-load
  const projectQ = useProject(task.projectId);
  const wsId = projectQ.data?.project.workspaceId;
  const labelsQ = useLabels(wsId);
  const membersQ = useWorkspaceMembers(wsId);

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    try{
      await update.mutateAsync({
        title: form.title,
        description: form.description || null,
        status: form.status,
        priority: form.priority,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : null,
        assigneeIds: form.assigneeIds,
        labelIds: form.labelIds,
      } as unknown as Record<string,unknown>);
      toast({title:"Task updated", variant:"success"});
      onClose();
    } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Update failed", variant:"error"}); }
  };
  return <form onSubmit={submit} className="space-y-3">
    <div><Label>Title</Label><Input value={form.title} onChange={e=> setForm({...form, title:e.target.value})} required /></div>
    <div><Label>Description</Label><Textarea value={form.description} onChange={e=> setForm({...form, description:e.target.value})} /></div>
    <div className="grid grid-cols-2 gap-3">
      <div><Label>Status</Label><Select value={form.status} onChange={e=> setForm({...form, status:e.target.value})}><option value="backlog">Backlog</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></Select></div>
      <div><Label>Priority</Label><Select value={form.priority} onChange={e=> setForm({...form, priority:e.target.value})}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></Select></div>
    </div>
    <div><Label>Due date</Label><Input type="date" value={form.dueDate} onChange={e=> setForm({...form, dueDate:e.target.value})} /></div>
    {membersQ.data && <div><Label>Assignees</Label><div className="mt-1 flex flex-wrap gap-2">{membersQ.data.data.map(m=> {
      const checked = form.assigneeIds.includes(m.user.id);
      return <label key={m.user.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-pointer ${checked? "bg-indigo-50 border-indigo-300":"bg-white"}`}><input type="checkbox" checked={checked} onChange={e=> setForm(f=> ({...f, assigneeIds: e.target.checked ? [...f.assigneeIds, m.user.id] : f.assigneeIds.filter(x=>x!==m.user.id)}))} />{m.user.displayName}</label>;
    })}</div></div>}
    {labelsQ.data && labelsQ.data.data.length>0 && <div><Label>Labels</Label><div className="mt-1 flex flex-wrap gap-2">{labelsQ.data.data.map(l=>{
      const checked = form.labelIds.includes(l.id);
      return <label key={l.id} className={`flex items-center gap-1 rounded-full border px-2 py-1 text-xs cursor-pointer ${checked? "border-indigo-300":""}`} style={{ backgroundColor: checked? `${l.color}30`:"white", borderColor: checked? l.color: undefined }}><input type="checkbox" checked={checked} onChange={e=> setForm(f=> ({...f, labelIds: e.target.checked ? [...f.labelIds, l.id] : f.labelIds.filter(x=>x!==l.id)}))} />{l.name}</label>;
    })}</div></div>}
    <Button type="submit" disabled={update.isPending} className="w-full">{update.isPending? "Saving…":"Save changes"}</Button>
  </form>;
}
