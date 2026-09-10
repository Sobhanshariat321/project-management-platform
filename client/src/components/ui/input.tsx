import { cn } from "../../lib/utils.ts";
import * as React from "react";
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) =>
  <input ref={ref} className={cn("flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:opacity-50", className)} {...props} />);
Input.displayName="Input";
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref)=>
  <textarea ref={ref} className={cn("flex min-h-[80px] w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500", className)} {...props} />);
Textarea.displayName="Textarea";
export function Label(props: React.LabelHTMLAttributes<HTMLLabelElement>) { return <label {...props} className={cn("text-sm font-medium text-zinc-700", props.className)} /> }
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={cn("flex h-9 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500", props.className)} /> }
