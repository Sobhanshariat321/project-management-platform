import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";

export type Task = {
  id:string; projectId:string; title:string; description?:string|null; status:string; priority:string; dueDate?:string|null; position:number; creatorId:string; createdAt:string; updatedAt:string;
  assignees?: {id:string; email:string; displayName:string}[];
  labels?: {id:string; name:string; color:string}[];
  _count?: {comments:number};
};

export type TaskQuery = {
  workspaceId?:string; projectId?:string; search?:string; status?:string; priority?:string; assigneeId?:string; labelId?:string;
  sortBy?:string; sortOrder?:string; page?:number; limit?:number; dueBefore?:string; dueAfter?:string;
};

export function buildTaskQuery(q: TaskQuery){
  const p=new URLSearchParams();
  Object.entries(q).forEach(([k,v])=>{ if(v!==undefined && v!=="" && v!==null) p.set(k,String(v)); });
  return p.toString();
}

export function useTasks(q: TaskQuery){
  const qs=buildTaskQuery(q);
  return useQuery({ queryKey:["tasks", qs], queryFn: ()=> api<{data:Task[]; total:number; page:number; totalPages:number}>(`/api/tasks?${qs}`) });
}
export function useTask(id?:string){
  return useQuery({ queryKey:["task",id], queryFn: ()=> api<{task: Task & { comments?: unknown[]; project?: unknown} }>(`/api/tasks/${id}`), enabled: !!id });
}
export function useCreateTask(){ const qc=useQueryClient(); return useMutation({ mutationFn:(body: Record<string,unknown>)=> api<{task:Task}>("/api/tasks",{method:"POST", body:JSON.stringify(body)}), onSuccess: ()=> qc.invalidateQueries({queryKey:["tasks"]})});}
export function useUpdateTask(id:string){ const qc=useQueryClient(); return useMutation({ mutationFn:(body: Record<string,unknown>)=> api<{task:Task}>(`/api/tasks/${id}`,{method:"PATCH", body:JSON.stringify(body)}), onSuccess: ()=> { qc.invalidateQueries({queryKey:["tasks"]}); qc.invalidateQueries({queryKey:["task",id]});}});}
export function useDeleteTask(){ const qc=useQueryClient(); return useMutation({ mutationFn:(id:string)=> api(`/api/tasks/${id}`,{method:"DELETE"}), onSuccess: ()=> qc.invalidateQueries({queryKey:["tasks"]})});}
export function useTaskActivity(id?:string){
  return useQuery({ queryKey:["task-activity", id], queryFn: ()=> api<{data:{id:string; action:string; from:unknown; to:unknown; createdAt:string; actor:{id:string; displayName:string}}[]}>(`/api/tasks/${id}/activity`), enabled: !!id });
}

export function useLabels(workspaceId?:string){
  return useQuery({ queryKey:["labels", workspaceId], queryFn: ()=> api<{data:{id:string; name:string; color:string; workspaceId:string}[]}>(`/api/workspaces/${workspaceId}/labels`), enabled: !!workspaceId });
}
export function useDashboard(params:{workspaceId?:string; projectId?:string}){
  const qs=new URLSearchParams();
  if(params.workspaceId) qs.set("workspaceId", params.workspaceId);
  if(params.projectId) qs.set("projectId", params.projectId);
  return useQuery({ queryKey:["dashboard", qs.toString()], queryFn: ()=> api<{totalTasks:number; byStatus:Record<string,number>; byPriority:Record<string,number>; overdue:number; recentActivity: unknown[]; projectIds:string[] }>(`/api/dashboard?${qs}`)});
}
export function useComments(taskId?:string){
  return useQuery({ queryKey:["comments", taskId], queryFn: ()=> api<{data:{id:string; body:string; createdAt:string; updatedAt:string; author:{id:string; displayName:string; email:string}}[]}>(`/api/tasks/${taskId}/comments`), enabled: !!taskId });
}
