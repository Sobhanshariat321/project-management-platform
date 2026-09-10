import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useProjects, useCreateProject, useDeleteProject } from "../hooks/useProjects.ts";
import { useWorkspaces } from "../hooks/useWorkspaces.ts";
import { Button } from "../components/ui/button.tsx";
import { Input, Label, Textarea, Select } from "../components/ui/input.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { PageSpinner } from "../components/ui/spinner.tsx";
import { EmptyState, ErrorState } from "../components/ui/empty.tsx";
import { useToastStore } from "../stores/toast.ts";
import { Badge } from "../components/ui/badge.tsx";

export default function Projects(){
  const [params, setParams]=useSearchParams();
  const workspaceId = params.get("workspaceId") || undefined;
  const { data: wsData } = useWorkspaces(1,50);
  const { data, isLoading, isError, error, refetch } = useProjects(workspaceId,1,50);
  const create = useCreateProject();
  const del = useDeleteProject();
  const toast = useToastStore(s=>s.push);
  const [open, setOpen]=useState(false);
  const [form, setForm]=useState({ name:"", key:"", description:"", workspaceId: workspaceId || wsData?.data[0]?.id || "" });

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    const ws = form.workspaceId || workspaceId || wsData?.data[0]?.id;
    if(!ws){ toast({title:"Select a workspace", variant:"error"}); return; }
    const normalizedKey = form.key ? form.key.trim().toUpperCase() : undefined;
    try{ await create.mutateAsync({ workspaceId: ws, name: form.name.trim(), key: normalizedKey, description: form.description?.trim()||undefined }); toast({title:"Project created", variant:"success"}); setOpen(false); setForm({name:"",key:"",description:"", workspaceId: ws}); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"}); }
  };

  if(isLoading) return <PageSpinner />;
  if(isError) return <ErrorState message={(error as Error).message} onRetry={()=>refetch()} />;
  const list = data?.data ?? [];
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h1 className="text-2xl font-semibold">Projects</h1><p className="text-sm text-zinc-500">Organize work into projects within workspaces.</p></div>
      <div className="flex gap-2">
        <Select value={workspaceId ?? ""} onChange={e=> setParams(e.target.value? { workspaceId: e.target.value } : {})}>
          <option value="">All workspaces</option>
          {wsData?.data.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
        <Button onClick={()=> { setForm(f=>({...f, workspaceId: workspaceId|| wsData?.data[0]?.id||""})); setOpen(true);}}>New project</Button>
      </div>
    </div>
    {list.length===0 ? <EmptyState title="No projects yet" description="Create a project to start tracking tasks." action={<Button onClick={()=> setOpen(true)}>Create project</Button>} /> : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(p=>(
          <Card key={p.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium truncate">{p.name}</h3>
                <Badge className={p.status==="archived" ? "bg-zinc-100 text-zinc-600":"bg-emerald-50 text-emerald-700 border border-emerald-200"}>{p.status}</Badge>
              </div>
              {p.key && <p className="text-xs text-zinc-500">{p.key}</p>}
              {p.description && <p className="mt-1 text-sm text-zinc-600 line-clamp-2">{p.description}</p>}
              <p className="mt-2 text-xs text-zinc-400">{p._count?.tasks ?? 0} tasks</p>
              <div className="mt-3 flex gap-2">
                <Link to={`/projects/${p.id}`} className="inline-flex flex-1 items-center justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700">Open board</Link>
                <Button variant="ghost" size="sm" onClick={async()=>{
                  if(!confirm("Delete project?")) return;
                  try{ await del.mutateAsync(p.id); toast({title:"Project deleted", variant:"success"});} catch(err:unknown){ toast({title: err instanceof Error? err.message:"Delete failed", variant:"error"}); }
                }}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )}
    <Modal open={open} onClose={()=> setOpen(false)} title="New project">
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Workspace *</Label>
          <Select value={form.workspaceId} onChange={e=> setForm({...form, workspaceId:e.target.value})} required>
            <option value="">Select workspace</option>
            {wsData?.data.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
          </Select>
        </div>
        <div><Label>Name *</Label><Input value={form.name} onChange={e=> setForm({...form, name:e.target.value})} required /></div>
        <div><Label>Key (e.g. PROJ)</Label><Input value={form.key} onChange={e=> setForm({...form, key:e.target.value})} placeholder="PROJ" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e=> setForm({...form, description:e.target.value})} /></div>
        <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending?"Creating…":"Create"}</Button>
      </form>
    </Modal>
  </div>;
}
