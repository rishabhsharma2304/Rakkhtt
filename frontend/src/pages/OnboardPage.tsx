import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { PrimaryButton } from "@/components/ui";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/auth";
import { PENDING_REG_KEY } from "./LoginPage";

interface Pending {
  token: string;
  email: string | null;
  name: string | null;
}

export function OnboardPage() {
  const { me, onboard } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending | null>(null);
  const [orgName, setOrgName] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(PENDING_REG_KEY);
    if (raw) {
      try {
        setPending(JSON.parse(raw));
      } catch {
        setPending(null);
      }
    }
  }, []);

  if (me) return <Navigate to="/" replace />;
  // No registration in flight — send them back to sign in.
  if (pending === null && !sessionStorage.getItem(PENDING_REG_KEY)) {
    return <Navigate to="/login" replace />;
  }
  if (!pending) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!orgName.trim()) {
      setError("Please enter your blood centre's name.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onboard({
        registration_token: pending!.token,
        org_name: orgName.trim(),
        license_no: licenseNo.trim() || undefined,
        contact: contact.trim() || undefined,
        address: address.trim() || undefined,
      });
      sessionStorage.removeItem(PENDING_REG_KEY);
      navigate("/", { replace: true });
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      if (err?.response?.status === 401) {
        setError("Your sign-in session expired. Please sign in with Google again.");
        sessionStorage.removeItem(PENDING_REG_KEY);
        setTimeout(() => navigate("/login", { replace: true }), 1500);
      } else {
        setError(typeof detail === "string" ? detail : "Could not create your blood centre. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-bg grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-lg rounded-card2 border border-line-card bg-card p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <Logo size={36} />
          <div className="font-display text-2xl font-extrabold tracking-tight text-ink">{BRAND}</div>
        </div>
        <h1 className="mb-1 font-display text-xl font-bold text-ink">Set up your blood centre</h1>
        <p className="mb-5 text-sm text-muted">
          Welcome{pending.name ? `, ${pending.name}` : ""}! You're signing in as{" "}
          <span className="font-semibold text-ink-4">{pending.email}</span>. Tell us about your blood
          centre — you'll be its administrator.
        </p>

        {error && <p className="mb-4 text-sm font-semibold text-accent">{error}</p>}

        <form onSubmit={submit} className="space-y-4">
          <Field label="Blood centre name" required value={orgName} onChange={setOrgName} placeholder="e.g. Arogya City Blood Centre" />
          <Field label="Drug licence no. (optional)" value={licenseNo} onChange={setLicenseNo} placeholder="State blood-bank licence number" />
          <Field label="Contact number (optional)" value={contact} onChange={setContact} placeholder="Phone / helpline" />
          <Field label="Address (optional)" value={address} onChange={setAddress} placeholder="Street, city, state, PIN" />
          <PrimaryButton type="submit" disabled={busy} className="w-full justify-center">
            {busy ? "Creating…" : "Create my blood centre"}
          </PrimaryButton>
        </form>
        <p className="mt-5 text-center text-xs text-muted">
          You can refine these details later under Settings.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-semibold text-ink-4">{label}</label>
      <input
        value={value}
        required={required}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent/40"
      />
    </div>
  );
}
