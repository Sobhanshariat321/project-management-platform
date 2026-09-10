import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useRegister } from "../hooks/useAuth.ts";
import { Button } from "../components/ui/button.tsx";
import { Input, Label } from "../components/ui/input.tsx";
import { Card, CardContent } from "../components/ui/card.tsx";
import { useToastStore } from "../stores/toast.ts";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const reg = useRegister();
  const nav = useNavigate();
  const toast = useToastStore(s=>s.push);
  const submit = async (e: React.FormEvent)=> {
    e.preventDefault();
    try { await reg.mutateAsync({ email, password, displayName }); toast({title:"Account created", variant:"success"}); nav("/"); } catch(err: unknown){ const m = err instanceof Error ? err.message : "Register failed"; toast({title:m, variant:"error"}); }
  };
  return <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
    <Card className="w-full max-w-md">
      <CardContent className="pt-6">
        <h1 className="text-xl font-semibold">Create account</h1>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><Label>Display name</Label><Input value={displayName} onChange={e=>setDisplayName(e.target.value)} required maxLength={64} placeholder="Jane Doe" /></div>
          <div><Label>Email</Label><Input value={email} onChange={e=>setEmail(e.target.value)} type="email" required /></div>
          <div><Label>Password (8+ chars, letter+number)</Label><Input value={password} onChange={e=>setPassword(e.target.value)} type="password" required /></div>
          {reg.isError && <p className="text-sm text-red-600">{(reg.error as Error).message}</p>}
          <Button type="submit" disabled={reg.isPending} className="w-full">{reg.isPending? "Creating…":"Create account"}</Button>
        </form>
        <p className="mt-4 text-sm text-zinc-600">Already have an account? <Link to="/login" className="font-medium text-indigo-600 hover:underline">Sign in</Link></p>
      </CardContent>
    </Card>
  </div>;
}
