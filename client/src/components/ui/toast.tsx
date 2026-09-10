import { useToastStore } from "../../stores/toast.ts";
export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  return <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    {toasts.map(t=>(
      <div key={t.id} className={`min-w-[280px] rounded-lg border px-4 py-3 text-sm shadow-lg ${t.variant==="error" ? "bg-red-600 text-white border-red-700" : t.variant==="success" ? "bg-emerald-600 text-white border-emerald-700" : "bg-zinc-900 text-white border-zinc-800"}`}>
        <div className="flex items-center justify-between gap-3">
          <span>{t.title}</span>
          <button onClick={()=>dismiss(t.id)} className="opacity-70 hover:opacity-100 text-xs">✕</button>
        </div>
      </div>
    ))}
  </div>;
}
