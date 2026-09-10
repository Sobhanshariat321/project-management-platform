import { useMemo, useState } from "react";
import { DndContext, DragOverlay, closestCenter, PointerSensor, useDroppable, useSensor, useSensors, type DragStartEvent, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TASK_STATUSES, TASK_STATUS_LABEL } from "../../lib/utils.ts";
import { TaskCard } from "./TaskCard.tsx";
import type { Task } from "../../hooks/useTasks.ts";
import { api } from "../../lib/api.ts";
import { useToastStore } from "../../stores/toast.ts";

function SortableCard({ task, onClick }: { task: Task; onClick:()=>void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data:{ task } });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  return <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
    <TaskCard task={task} onClick={onClick} isDragging={isDragging} />
  </div>;
}

function Column({ status, tasks, onTaskClick }: { status:string; tasks: Task[]; onTaskClick:(t:Task)=>void }) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return <div ref={setNodeRef} className={`flex w-[280px] sm:w-[300px] shrink-0 flex-col rounded-xl border ${isOver ? "bg-indigo-50/60 border-indigo-200":"bg-zinc-100"}`}>
    <div className="sticky top-0 rounded-t-xl bg-zinc-100 px-3 py-3 border-b flex items-center justify-between">
      <h3 className="text-sm font-semibold">{TASK_STATUS_LABEL[status]}</h3>
      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium border">{tasks.length}</span>
    </div>
    <div className="flex-1 p-2 space-y-2 min-h-[120px]">
      <SortableContext items={tasks.map(t=>t.id)} strategy={verticalListSortingStrategy}>
        {tasks.map(t=> <SortableCard key={t.id} task={t} onClick={()=> onTaskClick(t)} />)}
      </SortableContext>
      {tasks.length===0 && <p className="py-8 text-center text-xs text-zinc-400">Drop here</p>}
    </div>
  </div>;
}

export function KanbanBoard({ tasks, onTaskClick, onRefresh }: { tasks: Task[]; onTaskClick: (t:Task)=>void; onRefresh?: ()=>void }) {
  const [active, setActive]=useState<Task|null>(null);
  const toast = useToastStore(s=>s.push);
  const sensors = useSensors(useSensor(PointerSensor,{ activationConstraint:{distance:6}}));

  const columns = useMemo(()=>{
    const map: Record<string, Task[]> = {};
    TASK_STATUSES.forEach(s=> map[s]=[]);
    tasks.forEach(t=> { (map[t.status] ??= []).push(t); });
    // sort by position
    Object.values(map).forEach(arr=> arr.sort((a,b)=> a.position - b.position));
    return map;
  },[tasks]);

  const handleStart = (e:DragStartEvent)=> {
    const t = e.active.data.current?.task as Task | undefined;
    if(t) setActive(t);
  };
  const handleEnd = async (e:DragEndEvent)=>{
    setActive(null);
    const { active: a, over } = e;
    if(!over) return;
    const dragged = a.data.current?.task as Task | undefined;
    if(!dragged) return;
    // Determine target status by finding which column contains over id
    // over.id could be task id or column id; we use sortable containers: each column Tasks; if dragging over another task, its status is target. If over column droppable (not used) fallback.
    let targetStatus: string | null = null;
    // Find task for over.id
    const overTask = tasks.find(t=> t.id===over.id);
    if(overTask) targetStatus = overTask.status;
    else if (typeof over.id==="string" && TASK_STATUSES.includes(over.id as never)) targetStatus = over.id as string;
    else {
      // try find column via tasks map
      for(const [st, arr] of Object.entries(columns)){
        if(arr.some(t=> t.id===over.id)) { targetStatus = st; break;}
      }
    }
    // If still null, try to detect column by closest - default keep original
    if(!targetStatus) return;
    if(targetStatus===dragged.status) {
      // intra-column reorder: compute interpolated position and PATCH (B-02)
      try{
        const col = [...(columns[targetStatus] ?? [])].sort((a,b)=> a.position - b.position).filter(t=> t.id!==dragged.id);
        let insertIdx = col.length;
        if(overTask){
          const overIdx = col.findIndex(t=> t.id===overTask.id);
          if(overIdx>=0){
            const draggedIdx = (columns[targetStatus] ?? []).findIndex(t=> t.id===dragged.id);
            // place dragged relative to over task based on original order
            insertIdx = overIdx + (draggedIdx < (columns[targetStatus] ?? []).findIndex(t=> t.id===overTask.id) ? 1 : 0);
          }
        }
        const prev = insertIdx>0 ? col[insertIdx-1]?.position : undefined;
        const next = insertIdx<col.length ? col[insertIdx]?.position : undefined;
        const position = prev!==undefined && next!==undefined ? (prev+next)/2 : prev!==undefined ? prev+1000 : next!==undefined ? next-1000 : 1000;
        await api(`/api/tasks/${dragged.id}`, { method:"PATCH", body: JSON.stringify({ position })});
        onRefresh?.();
      } catch(err:unknown){
        toast({ title: err instanceof Error ? err.message : "Reorder failed", variant:"error"});
      }
      return;
    }
    try{
      // compute new position at end of target column
      const targetCol = columns[targetStatus] ?? [];
      const maxPos = targetCol.length ? Math.max(...targetCol.map(t=> t.position)) : 0;
      await api(`/api/tasks/${dragged.id}`, { method:"PATCH", body: JSON.stringify({ status: targetStatus, position: maxPos + 1000 })});
      toast({ title: `Moved to ${TASK_STATUS_LABEL[targetStatus]}`, variant:"success"});
      onRefresh?.();
    } catch(err:unknown){
      toast({ title: err instanceof Error ? err.message : "Move failed", variant:"error"});
    }
  };

  return <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleStart} onDragEnd={handleEnd}>
    <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin snap-x">
      {TASK_STATUSES.map(st=> <Column key={st} status={st} tasks={columns[st] ?? []} onTaskClick={onTaskClick} />)}
    </div>
    <DragOverlay>{active ? <div className="w-[300px]"><TaskCard task={active} /></div> : null}</DragOverlay>
  </DndContext>;
}
