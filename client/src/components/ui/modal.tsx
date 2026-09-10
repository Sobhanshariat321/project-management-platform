import * as React from "react";
export function Modal({ open, onClose, title, children }: { open: boolean; onClose: ()=>void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 flex items-center justify-center">
    <div className="absolute inset-0 bg-black/40" onClick={onClose} />
    <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl max-h-[90vh] overflow-auto m-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-zinc-100">✕</button>
      </div>
      {children}
    </div>
  </div>;
}
export function Drawer({ open, onClose, title, children }: { open:boolean; onClose:()=>void; title:string; children:React.ReactNode }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-40 flex justify-end">
    <div className="absolute inset-0 bg-black/30" onClick={onClose} />
    <div className="relative w-full max-w-[560px] bg-white shadow-xl overflow-auto h-full flex flex-col">
      <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-zinc-100">✕</button>
      </div>
      <div className="flex-1 p-6">{children}</div>
    </div>
  </div>;
}
