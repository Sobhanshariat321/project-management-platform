import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";

export type Workspace = { id:string; name:string; handle?:string|null; description?:string|null; ownerId:string; createdAt:string; role?:string };
export function useWorkspaces(page=1, limit=20) {
  return useQuery({ queryKey:["workspaces",page,limit], queryFn: ()=> api<{data:Workspace[]; total:number; page:number; totalPages:number}>(`/api/workspaces?page=${page}&limit=${limit}`)});
}
export function useWorkspace(id?: string) {
  return useQuery({ queryKey:["workspace",id], queryFn: ()=> api<{workspace:Workspace}>(`/api/workspaces/${id}`), enabled: !!id });
}
export function useCreateWorkspace() {
  const qc=useQueryClient();
  return useMutation({ mutationFn: (body:{name:string; handle?:string; description?:string})=> api<{workspace:Workspace}>("/api/workspaces",{method:"POST", body:JSON.stringify(body)}), onSuccess: ()=> qc.invalidateQueries({queryKey:["workspaces"]}) });
}
export function useUpdateWorkspace(id:string) {
  const qc=useQueryClient();
  return useMutation({ mutationFn:(body:{name?:string; description?:string})=> api(`/api/workspaces/${id}`,{method:"PATCH", body:JSON.stringify(body)}), onSuccess: ()=> qc.invalidateQueries({queryKey:["workspaces"]}) });
}
export function useDeleteWorkspace() {
  const qc=useQueryClient();
  return useMutation({ mutationFn:(id:string)=> api(`/api/workspaces/${id}`,{method:"DELETE"}), onSuccess: ()=> qc.invalidateQueries({queryKey:["workspaces"]}) });
}
export function useWorkspaceMembers(wsId?:string) {
  return useQuery({ queryKey:["ws-members",wsId], queryFn: ()=> api<{data: {id:string; role:string; user:{id:string; email:string; displayName:string}}[] }>(`/api/workspaces/${wsId}/members`), enabled: !!wsId });
}
