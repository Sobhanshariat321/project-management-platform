import { cn } from "../../lib/utils.ts";
export function Badge({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...p} className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", className)} />;
}
