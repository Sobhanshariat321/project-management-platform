import { cn } from "../../lib/utils.ts";
import * as React from "react";
export function Button({ className, variant="default", size="md", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"ghost"|"outline"|"destructive"; size?: "sm"|"md"|"lg" }) {
  const base = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500";
  const variants: Record<string,string> = {
    default: "bg-indigo-600 text-white hover:bg-indigo-700",
    ghost: "hover:bg-zinc-100 text-zinc-700",
    outline: "border bg-white hover:bg-zinc-50",
    destructive: "bg-red-600 text-white hover:bg-red-700",
  };
  const sizes: Record<string,string> = { sm: "h-8 px-3", md: "h-9 px-4", lg: "h-10 px-6" };
  return <button className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
