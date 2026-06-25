import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/ui";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { me, login } = useAuth();
  const [email, setEmail] = useState("admin@acbc.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(email, password);
    } catch {
      setError("Incorrect email or password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-bg grid min-h-screen place-items-center px-4">
      <div className="w-full max-w-md rounded-card2 border border-line-card bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={36} />
          <div>
            <div className="font-display text-2xl font-extrabold tracking-tight text-ink">{BRAND}</div>
            <div className="text-sm text-muted">{BRAND_TAGLINE}</div>
          </div>
        </div>
        <h1 className="mb-1 font-display text-xl font-bold text-ink">Sign in</h1>
        <p className="mb-5 text-sm text-muted">Access your blood centre dashboard.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-4">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-ink-4">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          {error && <p className="text-sm font-semibold text-accent">{error}</p>}
          <PrimaryButton type="submit" disabled={busy} className="w-full justify-center">
            {busy ? "Signing in…" : "Sign in"}
          </PrimaryButton>
        </form>
        <p className="mt-5 rounded-xl bg-fill p-3 text-center text-xs text-muted">
          Demo seed login · <span className="font-semibold text-ink-4">admin@acbc.in</span> / password123
        </p>
      </div>
    </div>
  );
}
