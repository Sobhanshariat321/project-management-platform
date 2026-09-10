import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLogin } from "../hooks/useAuth.ts";
import { Button } from "../components/ui/button.tsx";
import { Input, Label } from "../components/ui/input.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { useToastStore } from "../stores/toast.ts";

export default function Login() {
  const [email, setEmail] = useState("maya@example.com");
  const [password, setPassword] = useState("Password123");
  const login = useLogin();
  const nav = useNavigate();
  const toast = useToastStore(s=>s.push);
  const submit = async (e: React.FormEvent)=> {
    e.preventDefault();
    try { await login.mutateAsync({ email, password }); toast({ title:"Welcome back!", variant:"success"}); nav("/"); } catch(err: unknown) { const m = err instanceof Error ? err.message : "Login failed"; toast({title:m, variant:"error"}); }
  };
  return <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-zinc-500">Use your account to continue.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} type="email" required /></div>
          <div><Label>Password</Label><Input value={password} onChange={e=>setPassword(e.target.value)} type="password" required /></div>
          {login.isError && <p className="text-sm text-red-600">{(login.error as Error).message}</p>}
          <Button type="submit" disabled={login.isPending} className="w-full">{login.isPending? "Signing in…":"Sign in"}</Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">No account? <Link to="/register" className="font-medium text-indigo-600 hover:underline">Create one</Link></p>
        <p className="mt-2 text-xs text-zinc-400">Demo seed: maya@example.com / Password123 (run npm run db:seed)</p>
      </CardContent>
    </Card>
  </div>;
}
