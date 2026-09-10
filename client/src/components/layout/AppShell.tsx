import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/auth.ts";
import { useLogout, useMe } from "../../hooks/useAuth.ts";
import { Button } from "../ui/button.tsx";
import { Toaster } from "../ui/toast.tsx";
import { Spinner } from "../ui/spinner.tsx";

export function AppShell() {
  const { user, loading } = useAuthStore();
  useMe();
  const logout = useLogout();
  const nav = useNavigate();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><Spinner /></div>;
  if (!user) {
    return <div className="min-h-screen flex flex-col"><Toaster /><Outlet /></div>;
  }
  return <div className="min-h-screen bg-zinc-50 text-zinc-900 flex flex-col">
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto max-w-[1400px] flex h-14 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-semibold tracking-tight text-indigo-600">PMP</Link>
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink to="/" className={({isActive})=> `rounded-md px-3 py-2 text-sm ${isActive? "bg-zinc-900 text-white":"text-zinc-600 hover:bg-zinc-100"}`}>Dashboard</NavLink>
            <NavLink to="/workspaces" className={({isActive})=> `rounded-md px-3 py-2 text-sm ${isActive? "bg-zinc-900 text-white":"text-zinc-600 hover:bg-zinc-100"}`}>Workspaces</NavLink>
            <NavLink to="/projects" className={({isActive})=> `rounded-md px-3 py-2 text-sm ${isActive? "bg-zinc-900 text-white":"text-zinc-600 hover:bg-zinc-100"}`}>Projects</NavLink>
            <NavLink to="/tasks" className={({isActive})=> `rounded-md px-3 py-2 text-sm ${isActive? "bg-zinc-900 text-white":"text-zinc-600 hover:bg-zinc-100"}`}>Tasks</NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden sm:inline text-sm text-zinc-600">{user.displayName} <span className="text-zinc-400">· {user.email}</span></span>
          <Button variant="ghost" size="sm" onClick={async()=>{ await logout.mutateAsync(); nav("/login");}}>Logout</Button>
        </div>
      </div>
      {/* mobile nav */}
      <div className="sm:hidden flex gap-1 px-4 pb-2">
        <NavLink to="/" className={({isActive})=> `flex-1 text-center rounded-md px-2 py-1.5 text-sm ${isActive? "bg-zinc-900 text-white":"bg-zinc-100"}`}>Dash</NavLink>
        <NavLink to="/workspaces" className={({isActive})=> `flex-1 text-center rounded-md px-2 py-1.5 text-sm ${isActive? "bg-zinc-900 text-white":"bg-zinc-100"}`}>WS</NavLink>
        <NavLink to="/projects" className={({isActive})=> `flex-1 text-center rounded-md px-2 py-1.5 text-sm ${isActive? "bg-zinc-900 text-white":"bg-zinc-100"}`}>Proj</NavLink>
        <NavLink to="/tasks" className={({isActive})=> `flex-1 text-center rounded-md px-2 py-1.5 text-sm ${isActive? "bg-zinc-900 text-white":"bg-zinc-100"}`}>Tasks</NavLink>
      </div>
    </header>
    <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 sm:px-6 py-6">
      <Outlet />
    </main>
    <Toaster />
  </div>;
}

export function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const nav = useNavigate();
  useMe();
  if (loading) return <div className="flex justify-center py-16"><Spinner /></div>;
  if (!user) {
    // redirect
    setTimeout(()=> nav("/login"), 0);
    return <div className="py-10 text-center text-sm text-zinc-500">Redirecting to login…</div>;
  }
  return <>{children}</>;
}
