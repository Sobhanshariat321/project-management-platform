import { useState } from "react";
import { useWorkspaces, useCreateWorkspace, useDeleteWorkspace, useWorkspaceMembers } from "../hooks/useWorkspaces.ts";
import { Button } from "../components/ui/button.tsx";
import { Input, Label, Textarea } from "../components/ui/input.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { Modal } from "../components/ui/modal.tsx";
import { PageSpinner } from "../components/ui/spinner.tsx";
import { EmptyState, ErrorState } from "../components/ui/empty.tsx";
import { useToastStore } from "../stores/toast.ts";
import { Link } from "react-router-dom";
import { api } from "../lib/api.ts";

export default function Workspaces(){
  const { data, isLoading, isError, error, refetch } = useWorkspaces(1,50);
  const create = useCreateWorkspace();
  const del = useDeleteWorkspace();
  const toast = useToastStore(s=>s.push);
  const [open, setOpen]=useState(false);
  const [form, setForm]=useState({ name:"", handle:"", description:"" });
  const [detail, setDetail]=useState<string|null>(null);
  const membersQ = useWorkspaceMembers(detail ?? undefined);

  const submit = async (e:React.FormEvent)=>{
    e.preventDefault();
    try{
      const normalizedHandle = form.handle ? form.handle.trim().toLowerCase() : undefined;
      await create.mutateAsync({ name: form.name.trim(), handle: normalizedHandle, description: form.description?.trim()||undefined });
      toast({title:"Workspace created", variant:"success"});
      setOpen(false); setForm({name:"",handle:"",description:""});
    } catch(err:unknown){ toast({title: err instanceof Error? err.message: "Failed", variant:"error"}); }
  };
  const [inviteEmail, setInviteEmail]=useState("");
  const [inviteRole, setInviteRole]=useState<"admin"|"member">("member");

  if(isLoading) return <PageSpinner />;
  if(isError) return <ErrorState message={(error as Error).message} onRetry={()=>refetch()} />;
  const list = data?.data ?? [];
  return <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-semibold">Workspaces</h1><p className="text-sm text-zinc-500">Manage your teams and workspaces.</p></div>
      <Button onClick={()=> setOpen(true)}>New workspace</Button>
    </div>
    {list.length===0 ? <EmptyState title="No workspaces yet" description="Create your first workspace to start collaborating." action={<Button onClick={()=> setOpen(true)}>Create workspace</Button>} /> : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(w=>(
          <Card key={w.id} className="flex flex-col">
            <CardContent className="pt-6 flex-1">
              <h3 className="font-medium">{w.name}</h3>
              {w.handle && <p className="text-xs text-zinc-500">@{w.handle} · {w.role}</p>}
              {w.description && <p className="mt-2 text-sm text-zinc-600 line-clamp-2">{w.description}</p>}
            </CardContent>
            <div className="flex gap-2 p-4 pt-0">
              <Button variant="outline" size="sm" onClick={()=> setDetail(w.id)}>Members</Button>
              <Link to={`/projects?workspaceId=${w.id}`} className="inline-flex items-center justify-center rounded-md border bg-white px-3 text-sm hover:bg-zinc-50">Projects</Link>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={async()=>{
                if(!confirm("Delete workspace?")) return;
                try{ await del.mutateAsync(w.id); toast({title:"Workspace deleted", variant:"success"});} catch(err:unknown){ toast({title: err instanceof Error? err.message:"Delete failed", variant:"error"});}
              }}>Delete</Button>
            </div>
          </Card>
        ))}
      </div>
    )}

    <Modal open={open} onClose={()=> setOpen(false)} title="New workspace">
      <form onSubmit={submit} className="space-y-3">
        <div><Label>Name *</Label><Input value={form.name} onChange={e=> setForm({...form, name:e.target.value})} required /></div>
        <div><Label>Handle (a-z,0-9,-)</Label><Input value={form.handle} onChange={e=> setForm({...form, handle:e.target.value})} placeholder="my-team" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={e=> setForm({...form, description:e.target.value})} /></div>
        <Button type="submit" disabled={create.isPending} className="w-full">{create.isPending?"Creating…":"Create"}</Button>
      </form>
    </Modal>

    <Modal open={!!detail} onClose={()=> { setDetail(null); setInviteEmail("");}} title="Workspace members">
      {membersQ.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : (
        <div className="space-y-4">
          <div className="space-y-2">
            {membersQ.data?.data.map(m=>(
              <div key={m.id} className="flex items-center justify-between rounded border px-3 py-2">
                <div><p className="text-sm font-medium">{m.user.displayName}</p><p className="text-xs text-zinc-500">{m.user.email} · {m.role}</p></div>
                <Button size="sm" variant="ghost" onClick={async()=>{
                  try{ await api(`/api/workspaces/${detail}/members/${m.user.id}`,{method:"DELETE"}); toast({title:"Member removed", variant:"success"}); membersQ.refetch(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Failed", variant:"error"}); }
                }}>Remove</Button>
              </div>
            ))}
            {membersQ.data?.data.length===0 && <p className="text-sm text-zinc-500">No members</p>}
          </div>
          <form onSubmit={async(e)=>{
            e.preventDefault();
            try{ await api(`/api/workspaces/${detail}/members`,{method:"POST", body: JSON.stringify({ email: inviteEmail, role: inviteRole })}); toast({title:"Member added", variant:"success"}); setInviteEmail(""); membersQ.refetch(); } catch(err:unknown){ toast({title: err instanceof Error? err.message:"Invite failed", variant:"error"}); }
          }} className="flex gap-2 items-end">
            <div className="flex-1"><Label>Email</Label><Input value={inviteEmail} onChange={e=> setInviteEmail(e.target.value)} placeholder="colleague@example.com" required /></div>
            <select value={inviteRole} onChange={e=> setInviteRole(e.target.value as "admin"|"member")} className="h-9 rounded-md border px-2 text-sm"><option value="member">member</option><option value="admin">admin</option></select>
            <Button type="submit" size="sm">Invite</Button>
          </form>
        </div>
      )}
    </Modal>
  </div>;
}
