import { useState } from "react";
import { useDashboard, useTasks } from "../hooks/useTasks.ts";
import { useWorkspaces } from "../hooks/useWorkspaces.ts";
import { useProjects } from "../hooks/useProjects.ts";
import { Card, CardContent, CardHeader } from "../components/ui/card.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { PageSpinner } from "../components/ui/spinner.tsx";
import { Select } from "../components/ui/input.tsx";
import { Link } from "react-router-dom";
import { formatDate } from "../lib/utils.ts";

export default function Dashboard(){
  const { data: wsData } = useWorkspaces(1,50);
  const [workspaceId, setWorkspaceId]=useState<string>("");
  const [projectId, setProjectId]=useState<string>("");
  const selectedWs = workspaceId || wsData?.data[0]?.id || "";
  const { data: projData } = useProjects(selectedWs || undefined,1,50);
  // sync initial ws
  const wsList = wsData?.data ?? [];
  const projects = projData?.data ?? [];
  const dash = useDashboard({ workspaceId: workspaceId||undefined, projectId: projectId||undefined });
  const tasksQ = useTasks({ workspaceId: workspaceId || undefined, projectId: projectId||undefined, limit:5, sortBy:"updatedAt", sortOrder:"desc" });

  if (dash.isLoading && !wsData) return <PageSpinner />;
  return <div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-500">Overview of your work across workspaces & projects.</p>
      </div>
      <div className="flex gap-2">
        <Select value={workspaceId} onChange={e=>{ setWorkspaceId(e.target.value); setProjectId("");}}>
          <option value="">All workspaces</option>
          {wsList.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
        </Select>
        <Select value={projectId} onChange={e=> setProjectId(e.target.value)}>
          <option value="">All projects</option>
          {projects.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </div>
    </div>

    {dash.isLoading ? <PageSpinner /> : dash.isError ? <p className="text-sm text-red-600">{(dash.error as Error).message}</p> : (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardContent className="pt-6"><p className="text-sm text-zinc-500">Total tasks</p><p className="mt-1 text-2xl font-semibold">{dash.data?.totalTasks ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-zinc-500">Overdue</p><p className="mt-1 text-2xl font-semibold text-red-600">{dash.data?.overdue ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-zinc-500">By status</p><div className="mt-2 flex flex-wrap gap-1">{Object.entries(dash.data?.byStatus ?? {}).map(([k,v])=> <Badge key={k} className="bg-zinc-100 text-zinc-700 border">{k}: {String(v)}</Badge>)}{Object.keys(dash.data?.byStatus ?? {}).length===0 && <span className="text-sm text-zinc-400">—</span>}</div></CardContent></Card>
        <Card><CardContent className="pt-6"><p className="text-sm text-zinc-500">By priority</p><div className="mt-2 flex flex-wrap gap-1">{Object.entries(dash.data?.byPriority ?? {}).map(([k,v])=> <Badge key={k} className="bg-blue-50 text-blue-700 border border-blue-200">{k}: {String(v)}</Badge>)}{Object.keys(dash.data?.byPriority ?? {}).length===0 && <span className="text-sm text-zinc-400">—</span>}</div></CardContent></Card>
      </div>
    )}

    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader><h3 className="font-medium">Recent tasks</h3></CardHeader>
        <CardContent className="space-y-2">
          {tasksQ.isLoading ? <p className="text-sm text-zinc-500">Loading…</p> : (tasksQ.data?.data.length===0 ? <p className="text-sm text-zinc-500">No tasks yet.</p> : tasksQ.data?.data.map(t=> (
            <Link key={t.id} to={`/projects/${t.projectId}`} className="flex items-center justify-between rounded-lg border px-3 py-2 hover:bg-zinc-50">
              <span className="text-sm font-medium truncate">{t.title}</span>
              <span className="ml-2 text-xs text-zinc-500">{t.status} · {t.priority}</span>
            </Link>
          )))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><h3 className="font-medium">Recent activity</h3></CardHeader>
        <CardContent className="space-y-2 max-h-[320px] overflow-auto">
          {(dash.data?.recentActivity as Array<{id:string; action:string; createdAt:string; actor:{displayName:string}; task:{title:string}}>)?.map(a=> (
            <div key={a.id} className="rounded-lg border px-3 py-2 text-sm">
              <span className="font-medium">{a.actor.displayName}</span> <span className="text-zinc-500">{a.action.replaceAll("_"," ")}</span> <span className="font-medium">{a.task.title}</span>
              <span className="ml-2 text-xs text-zinc-400">{formatDate(a.createdAt)}</span>
            </div>
          ))}
          {(!dash.data?.recentActivity || (dash.data.recentActivity as unknown[]).length===0) && <p className="text-sm text-zinc-500">No activity yet.</p>}
        </CardContent>
      </Card>
    </div>
  </div>;
}
