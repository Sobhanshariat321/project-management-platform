import { useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTasks, type Task } from "../hooks/useTasks.ts";
import { useWorkspaces } from "../hooks/useWorkspaces.ts";
import { useProjects } from "../hooks/useProjects.ts";
import { Input, Label, Select } from "../components/ui/input.tsx";
import { Button } from "../components/ui/button.tsx";
import { Card } from "../components/ui/card.tsx";
import { PageSpinner } from "../components/ui/spinner.tsx";
import { EmptyState } from "../components/ui/empty.tsx";
import { TaskCard } from "../components/kanban/TaskCard.tsx";
import { KanbanBoard } from "../components/kanban/KanbanBoard.tsx";
import { TaskDetailDrawer } from "../components/tasks/TaskDetail.tsx";
import { TASK_STATUS_LABEL } from "../lib/utils.ts";

export default function TasksPage(){
  const [params, setParams]=useSearchParams();
  const [search, setSearch]=useState(params.get("search")||"");
  const [status, setStatus]=useState(params.get("status")||"");
  const [priority, setPriority]=useState(params.get("priority")||"");
  const [sortBy, setSortBy]=useState(params.get("sortBy")||"createdAt");
  const [sortOrder, setSortOrder]=useState(params.get("sortOrder")||"desc");
  const [view, setView]=useState<"list"|"board">((params.get("view") as "list"|"board")||"board");
  const [workspaceId, setWorkspaceId]=useState(params.get("workspaceId")||"");
  const [projectId, setProjectId]=useState(params.get("projectId")||"");
  const [selected, setSelected]=useState<string|null>(null);

  const wsQ = useWorkspaces(1,50);
  const projQ = useProjects(workspaceId||undefined,1,50);
  const tasksQ = useTasks({
    workspaceId: workspaceId||undefined,
    projectId: projectId||undefined,
    search: search||undefined,
    status: status||undefined,
    priority: priority||undefined,
    sortBy, sortOrder, page:1, limit:50
  });

  const applyFilters = ()=>{
    const p=new URLSearchParams();
    if(search) p.set("search", search);
    if(status) p.set("status", status);
    if(priority) p.set("priority", priority);
    if(sortBy) p.set("sortBy", sortBy);
    if(sortOrder) p.set("sortOrder", sortOrder);
    if(workspaceId) p.set("workspaceId", workspaceId);
    if(projectId) p.set("projectId", projectId);
    if(view) p.set("view", view);
    setParams(p);
  };
  const clearFilters = ()=>{
    setSearch(""); setStatus(""); setPriority(""); setWorkspaceId(""); setProjectId(""); setSortBy("createdAt"); setSortOrder("desc");
    setParams({});
  };

  return <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div><h1 className="text-2xl font-semibold">Tasks</h1><p className="text-sm text-zinc-500">Search, filter, and manage tasks across all projects.</p></div>
      <div className="flex gap-1 rounded-lg border bg-white p-1">
        <button onClick={()=> setView("board")} className={`px-3 py-1 text-sm rounded-md ${view==="board"? "bg-zinc-900 text-white":"text-zinc-600"}`}>Board</button>
        <button onClick={()=> setView("list")} className={`px-3 py-1 text-sm rounded-md ${view==="list"? "bg-zinc-900 text-white":"text-zinc-600"}`}>List</button>
      </div>
    </div>

    <Card className="p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div><Label>Search</Label><Input value={search} onChange={e=> setSearch(e.target.value)} placeholder="Title or description…" onKeyDown={e=> e.key==="Enter" && applyFilters()} /></div>
        <div><Label>Workspace</Label><Select value={workspaceId} onChange={e=> setWorkspaceId(e.target.value)}><option value="">All</option>{wsQ.data?.data.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}</Select></div>
        <div><Label>Project</Label><Select value={projectId} onChange={e=> setProjectId(e.target.value)}><option value="">All</option>{projQ.data?.data.map(p=> <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
        <div><Label>Status</Label><Select value={status} onChange={e=> setStatus(e.target.value)}><option value="">All</option><option value="backlog">Backlog</option><option value="todo">To Do</option><option value="in_progress">In Progress</option><option value="in_review">In Review</option><option value="done">Done</option></Select></div>
        <div><Label>Priority</Label><Select value={priority} onChange={e=> setPriority(e.target.value)}><option value="">All</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></Select></div>
        <div><Label>Sort by</Label><Select value={sortBy} onChange={e=> setSortBy(e.target.value)}><option value="createdAt">Created</option><option value="updatedAt">Updated</option><option value="dueDate">Due date</option><option value="priority">Priority</option><option value="position">Position</option></Select></div>
        <div><Label>Order</Label><Select value={sortOrder} onChange={e=> setSortOrder(e.target.value)}><option value="desc">Desc</option><option value="asc">Asc</option></Select></div>
        <div className="flex items-end gap-2">
          <Button onClick={applyFilters} className="flex-1">Apply</Button>
          <Button variant="outline" onClick={clearFilters}>Clear</Button>
        </div>
      </div>
      {tasksQ.data && <p className="mt-3 text-xs text-zinc-500">{tasksQ.data.total} tasks found</p>}
    </Card>

    {tasksQ.isLoading ? <PageSpinner /> : !tasksQ.data || tasksQ.data.data.length===0 ? <EmptyState title="No tasks match filters" description="Try adjusting search or filters." /> : (
      view==="board" ? <KanbanBoard tasks={tasksQ.data.data as Task[]} onTaskClick={t=> setSelected(t.id)} onRefresh={()=> tasksQ.refetch()} /> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tasksQ.data.data.map(t=> <div key={t.id} onClick={()=> setSelected(t.id)}><TaskCard task={t as Task} /></div>)}
        </div>
      )
    )}
    <TaskDetailDrawer taskId={selected} open={!!selected} onClose={()=> { setSelected(null); tasksQ.refetch(); }} />
  </div>;
}
