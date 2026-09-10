import { cn } from "../../lib/utils.ts";
export function Card({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div {...p} className={cn("rounded-xl border bg-white shadow-sm", className)} /> }
export function CardHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div {...p} className={cn("p-4 border-b", className)} /> }
export function CardContent({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) { return <div {...p} className={cn("p-4", className)} /> }
