export function Spinner() {
  return <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-indigo-600" />;
}
export function PageSpinner() {
  return <div className="flex items-center justify-center py-16"><Spinner /></div>;
}
