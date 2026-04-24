import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";
import { Input, Label } from "../ui/Input.jsx";
import { useAuth } from "../state/auth.jsx";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await register({ name, email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.error || "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-full flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="text-2xl font-semibold text-slate-900">Create patient account</div>
          <div className="mt-1 text-sm text-slate-600">Book appointments and receive reminders.</div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" type="email" required />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" type="password" required />
              </div>
              {error ? <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3">{error}</div> : null}
              <Button className="w-full" disabled={busy} type="submit">
                {busy ? "Creating..." : "Create account"}
              </Button>
              <div className="text-sm text-slate-600 text-center">
                Already have an account?{" "}
                <Link className="text-brand-700 hover:underline" to="/login">
                  Sign in
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

