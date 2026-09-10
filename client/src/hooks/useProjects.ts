import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
export type Project = { id:string; workspaceId:string; name:string; key?:string|null; description?:string|null; status:string; creatorId:string; createdAt:string; _count?:{tasks:number} };
export function useProjects(workspaceId?:string, page=1, limit=20) {
  const qs = new URLSearchParams({ page:String(page), limit:String(limit) });
  if (workspaceId) qs.set("workspaceId", workspaceId);
  return useQuery({ queryKey:["projects", workspaceId, page, limit], queryFn: ()=> api<{data:Project[]; total:number; page:number; totalPages:number}>(`/api/projects?${qs}`) });
}
export function useProject(id?:string){
  return useQuery({ queryKey:["project",id], queryFn: ()=> api<{project:Project}>(`/api/projects/${id}`), enabled:!!id });
}
export function useCreateProject(){ const qc=useQueryClient(); return useMutation({ mutationFn:(body:{workspaceId:string; name:string; key?:string; description?:string})=> api("/api/projects",{method:"POST", body:JSON.stringify(body)}), onSuccess: ()=> qc.invalidateQueries({queryKey:["projects"]})});}
export function useUpdateProject(id:string){ const qc=useQueryClient(); return useMutation({mutationFn:(body:Record<string,unknown>)=> api(`/api/projects/${id}`,{method:"PATCH", body:JSON.stringify(body)}), onSuccess:()=> qc.invalidateQueries({queryKey:["projects"]})});}
export function useDeleteProject(){ const qc=useQueryClient(); return useMutation({mutationFn:(id:string)=> api(`/api/projects/${id}`,{method:"DELETE"}), onSuccess:()=> qc.invalidateQueries({queryKey:["projects"]})});}
