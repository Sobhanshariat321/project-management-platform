import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api.ts";
import { useAuthStore } from "../stores/auth.ts";
import { useEffect } from "react";

export function useMe() {
  const { setUser, setLoading } = useAuthStore();
  const q = useQuery({
    queryKey: ["me"],
    queryFn: () => api<{ user: { id: string; email: string; displayName: string; createdAt: string } }>("/api/auth/me"),
    retry: false,
  });
  useEffect(()=>{
    if (q.data?.user) setUser(q.data.user);
    if (q.isError) setUser(null);
    if (!q.isLoading) setLoading(false);
  }, [q.data, q.isError, q.isLoading]);
  useEffect(()=>{
    const h=()=> setUser(null);
    window.addEventListener("auth:unauthorized", h);
    return ()=> window.removeEventListener("auth:unauthorized", h);
  },[]);
  return q;
}

export function useLogin() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (body: { email:string; password:string }) => api<{user: {id:string;email:string;displayName:string}}>("/api/auth/login",{ method:"POST", body: JSON.stringify(body)}),
    onSuccess: (data)=>{
      setUser(data.user as unknown as {id:string;email:string;displayName:string});
      qc.invalidateQueries({ queryKey:["me"]});
    }
  });
}
export function useRegister() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: (body: { email:string; password:string; displayName:string}) => api<{user:{id:string;email:string;displayName:string}}>("/api/auth/register",{method:"POST", body: JSON.stringify(body)}),
    onSuccess:(data)=>{
      setUser(data.user as unknown as {id:string;email:string;displayName:string});
      qc.invalidateQueries({queryKey:["me"]});
    }
  });
}
export function useLogout() {
  const qc = useQueryClient();
  const { setUser } = useAuthStore();
  return useMutation({
    mutationFn: ()=> api("/api/auth/logout",{method:"POST"}),
    onSuccess: ()=>{
      setUser(null);
      qc.clear();
    }
  });
}
