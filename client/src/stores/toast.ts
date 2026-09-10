import { create } from "zustand";

export type Toast = { id: string; title: string; variant?: "default" | "success" | "error"; };

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast,"id">) => void;
  dismiss: (id:string)=>void;
}

export const useToastStore = create<ToastState>((set)=>({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2,9);
    set(s=>({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(()=> set(s=>({ toasts: s.toasts.filter(x=>x.id!==id)})), 3500);
  },
  dismiss: (id)=> set(s=>({toasts: s.toasts.filter(x=>x.id!==id)})),
}));
