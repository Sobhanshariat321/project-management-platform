export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-white px-6 py-12 text-center">
    <p className="text-sm font-medium text-zinc-900">{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-zinc-500">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: ()=>void }) {
  return <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
    <p className="text-sm font-medium text-red-800">Something went wrong</p>
    <p className="mt-1 text-sm text-red-600">{message}</p>
    {onRetry && <button onClick={onRetry} className="mt-3 text-sm font-medium text-red-700 underline">Retry</button>}
  </div>;
}
