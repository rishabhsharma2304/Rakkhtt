import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { PrimaryButton } from "@/components/ui";
import { api } from "@/lib/api";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";
import { useAuth } from "@/lib/auth";

// Carries the Google profile from /login to the onboarding screen.
export const PENDING_REG_KEY = "rakkhtt_pending_registration";

export function LoginPage() {
  const { me, login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@acbc.in");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    api
      .get<{ google_enabled: boolean; google_client_id: string | null }>("/auth/config")
      .then(({ data }) => {
        if (data.google_enabled && data.google_client_id) setGoogleClientId(data.google_client_id);
        else setShowEmail(true); // no Google configured → show email/password directly
      })
      .catch(() => setShowEmail(true));
  }, []);

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

  async function handleGoogle(credential: string) {
    setError("");
    try {
      const res = await loginWithGoogle(credential);
      if (res.registration_required && res.registration_token) {
        sessionStorage.setItem(
          PENDING_REG_KEY,
          JSON.stringify({ token: res.registration_token, email: res.email, name: res.name }),
        );
        navigate("/onboard");
      }
      // else: access token set; the <Navigate> above takes over on next render.
    } catch {
      setError("Google sign-in failed. Please try again.");
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

        {error && <p className="mb-4 text-sm font-semibold text-accent">{error}</p>}

        {googleClientId && (
          <div className="mb-2">
            <GoogleSignInButton clientId={googleClientId} onCredential={handleGoogle} />
            <p className="mt-3 text-center text-xs text-muted">
              New here? Sign in with Google to set up your blood centre.
            </p>
          </div>
        )}

        {googleClientId && !showEmail && (
          <button
            type="button"
            onClick={() => setShowEmail(true)}
            className="mt-4 w-full text-center text-xs font-semibold text-muted underline-offset-2 hover:underline"
          >
            Sign in with email instead
          </button>
        )}

        {showEmail && (
          <>
            {googleClientId && (
              <div className="my-5 flex items-center gap-3 text-xs text-muted">
                <span className="h-px flex-1 bg-line-chip" />
                or with email
                <span className="h-px flex-1 bg-line-chip" />
              </div>
            )}
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
              <PrimaryButton type="submit" disabled={busy} className="w-full justify-center">
                {busy ? "Signing in…" : "Sign in"}
              </PrimaryButton>
            </form>
            <p className="mt-5 rounded-xl bg-fill p-3 text-center text-xs text-muted">
              Demo seed login · <span className="font-semibold text-ink-4">admin@acbc.in</span> / password123
            </p>
          </>
        )}
      </div>
    </div>
  );
}
