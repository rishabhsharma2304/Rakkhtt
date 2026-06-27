import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Barcode, Bell, Boxes, Check, Droplet, FileText, FlaskConical,
  LayoutDashboard, Pencil, Search, Settings as SettingsIcon, Trash2, UserPlus,
  Users, Warehouse, Wrench,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { useTheme } from "@/lib/theme";
import { errorMessage, PrimaryButton, SectionBanner } from "@/components/ui";
import {
  BILLING_FIELDS, COMPLIANCE_FLAGS, CUSTOM_SECTIONS, FULL_PRICING_ITEMS,
  INTEGRATIONS_FIELDS, OPTIONS_FIELDS, PRICING_ITEMS, TABS,
  type SettingField, type SettingsSection,
} from "@/lib/settingsConfig";

const ICONS: Record<string, typeof SettingsIcon> = {
  Settings: SettingsIcon, Trash2, Droplet, Boxes, LayoutDashboard, UserPlus,
  Users, Barcode, FileText, Bell, BarChart3, Warehouse, Wrench, FlaskConical,
};

const lineInput =
  "w-full border-0 border-b border-line-chip bg-transparent px-0 py-2 text-[15px] text-ink outline-none transition focus:border-accent";

// ------------------------------------------------------------------ //

export function SettingsPage() {
  const { me } = useAuth();
  const mayEdit = canWrite(me?.role, "settings");
  const qc = useQueryClient();
  const [tab, setTab] = useState("general");

  const { data } = useQuery({ queryKey: ["settings"], queryFn: async () => (await api.get("/settings")).data });
  const org = data?.org ?? {};
  const orgId: string | undefined = org.id;

  // editable copies
  const [orgForm, setOrgForm] = useState<Record<string, string>>({});
  const [cust, setCust] = useState<Record<string, any>>({});
  const [pricing, setPricing] = useState<Record<string, number>>({});
  const [compliance, setCompliance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!data) return;
    setOrgForm({
      name: org.name ?? "", license_no: org.license_no ?? "", address: org.address ?? "",
      contact: org.contact ?? "", email: org.email ?? "", website: org.website ?? "",
      id_prefix: org.id_prefix ?? "", billing_prefix: org.billing_prefix ?? "", logo_url: org.logo_url ?? "",
    });
    setCust(data.customisations ?? {});
    setPricing(data.blood_pricing ?? {});
    setCompliance(data.compliance_flags ?? {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // one mutation, tagged with the section that triggered it for inline feedback
  const [flash, setFlash] = useState<{ section: string; type: "ok" | "err"; msg?: string } | null>(null);
  const save = useMutation({
    mutationFn: async (vars: { section: string; body: Record<string, unknown> }) =>
      (await api.put(`/orgs/${orgId}`, vars.body)).data,
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["settings"] });
      setFlash({ section: vars.section, type: "ok" });
    },
    onError: (e, vars) =>
      setFlash({ section: vars.section, type: "err", msg: errorMessage(e, "Could not save (Master User privilege required).") }),
  });
  const doSave = (section: string, body: Record<string, unknown>) => {
    setFlash(null);
    save.mutate({ section, body });
  };
  const saving = (s: string) => save.isPending && (save.variables as any)?.section === s;

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<SettingsIcon size={22} />}
        title="Settings"
        subtitle="Organisation details, blood pricing, custom settings & integrations"
      />

      <div className="rounded-card2 border border-line-card bg-card shadow-card">
        {/* tab strip */}
        <div className="flex flex-wrap gap-1 border-b border-line-table px-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-3 text-sm font-bold transition ${tab === t.key ? "text-accent" : "text-muted hover:text-ink-4"}`}
            >
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
            </button>
          ))}
        </div>

        <div className="p-6">
          {tab === "general" && (
            <GeneralTab
              orgForm={orgForm} setOrgForm={setOrgForm} cust={cust} setCust={setCust}
              mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave}
            />
          )}
          {tab === "pricing" && (
            <PricingTab pricing={pricing} setPricing={setPricing} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "custom" && (
            <CustomSettingsTab cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "integrations" && (
            <FieldListTab title="Integrations" section="integrations" fields={INTEGRATIONS_FIELDS}
              cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "options" && (
            <FieldListTab title="Options" section="options" fields={OPTIONS_FIELDS}
              cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "billing" && (
            <FieldListTab title="Billing" section="billing" fields={BILLING_FIELDS}
              cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "customisations" && (
            <CustomisationsTab compliance={compliance} setCompliance={setCompliance}
              mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Shared bits                                                        //
// ------------------------------------------------------------------ //

type Flash = { section: string; type: "ok" | "err"; msg?: string } | null;
interface SharedProps {
  mayEdit: boolean;
  saving: (s: string) => boolean;
  flash: Flash;
  doSave: (section: string, body: Record<string, unknown>) => void;
}

function Switch({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <span
      onClick={() => !disabled && onChange()}
      className={`relative inline-block h-[26px] w-[45px] flex-shrink-0 rounded-full transition ${on ? "bg-accent" : "bg-[#D8CCD1]"} ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
      role="switch"
      aria-checked={on}
    >
      <span className={`absolute top-[3.5px] h-[19px] w-[19px] rounded-full bg-white shadow transition-all ${on ? "left-[23px]" : "left-[3px]"}`} />
    </span>
  );
}

const smallInput =
  "w-[160px] rounded-xl border border-line-chip bg-page px-3 py-2 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30";

/** A single custom-setting row (toggle / number / text / select). */
function FieldRow({
  field, value, onChange, disabled,
}: { field: SettingField; value: any; onChange: (v: any) => void; disabled: boolean }) {
  let control: React.ReactNode = null;
  if (field.kind === "toggle") {
    control = <Switch on={!!value} onChange={() => onChange(!value)} disabled={disabled} />;
  } else if (field.kind === "select") {
    control = (
      <select className={smallInput + " w-[150px] font-semibold"} value={value ?? field.default ?? ""}
        disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  } else if (field.kind === "number") {
    control = (
      <input type="number" className={smallInput} value={value ?? field.default ?? 0}
        disabled={disabled} onChange={(e) => onChange(Number(e.target.value))} />
    );
  } else {
    control = (
      <input type="text" placeholder={field.placeholder} className={smallInput + " w-[220px]"} value={value ?? ""}
        disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 border-b border-line-table py-4 last:border-0">
      <div className="min-w-0 pr-2">
        <div className="text-[15px] font-bold text-ink">{field.label}</div>
        {field.desc && <div className="mt-1 max-w-xl text-[13px] leading-snug text-muted">{field.desc}</div>}
      </div>
      <div className="flex-shrink-0 pt-0.5">{control}</div>
    </div>
  );
}

function SaveBar({
  section, saving, flash, mayEdit, label = "Save Changes", center,
}: { section: string; saving: boolean; flash: Flash; mayEdit: boolean; label?: string; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${center ? "justify-center" : ""}`}>
      <PrimaryButton type="submit" disabled={saving || !mayEdit}>
        {saving ? "Saving…" : <><Check size={16} /> {label}</>}
      </PrimaryButton>
      {!mayEdit && <span className="text-sm font-semibold text-muted">Master User privilege required.</span>}
      {mayEdit && flash?.section === section && flash.type === "ok" && (
        <span className="text-sm font-semibold text-success">Saved.</span>
      )}
      {mayEdit && flash?.section === section && flash.type === "err" && (
        <span className="text-sm font-semibold text-accent">{flash.msg}</span>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ //
// General tab                                                        //
// ------------------------------------------------------------------ //

function GeneralTab({
  orgForm, setOrgForm, cust, setCust, mayEdit, saving, flash, doSave,
}: SharedProps & {
  orgForm: Record<string, string>; setOrgForm: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}) {
  const [logoPreview, setLogoPreview] = useState<string>("");
  const set = (k: string, v: string) => setOrgForm((s) => ({ ...s, [k]: v }));

  const Field = ({ k, label, type = "text" }: { k: string; label: string; type?: string }) => (
    <label className="block">
      <span className="mb-0.5 block text-[13px] font-semibold text-muted">{label}</span>
      <input type={type} className={lineInput} value={orgForm[k] ?? ""} onChange={(e) => set(k, e.target.value)} />
    </label>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* 1. Organisation's Details */}
      <form
        onSubmit={(e) => { e.preventDefault(); doSave("gen-org", { name: orgForm.name, contact: orgForm.contact, license_no: orgForm.license_no, address: orgForm.address, settings: cust }); }}
        className="flex flex-col gap-4 rounded-card2 border border-line-card bg-card p-5 shadow-card"
      >
        <h3 className="font-display text-lg font-bold text-ink">1. Organisation's Details</h3>
        <Field k="name" label="Name" />
        <Field k="contact" label="Contact number" />
        <Field k="license_no" label="License no" />
        <label className="block">
          <span className="mb-0.5 block text-[13px] font-semibold text-muted">Address</span>
          <textarea rows={2} className={lineInput} value={orgForm.address ?? ""} onChange={(e) => set("address", e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[13px] font-semibold text-muted">Medical officer</span>
          <input className={lineInput} value={cust.medical_officer ?? ""} onChange={(e) => setCust((s) => ({ ...s, medical_officer: e.target.value }))} />
        </label>
        <div className="mt-auto flex justify-center pt-2">
          <SaveBar section="gen-org" saving={saving("gen-org")} flash={flash} mayEdit={mayEdit} label="Save" />
        </div>
      </form>

      {/* 2. Additional Details */}
      <form
        onSubmit={(e) => { e.preventDefault(); doSave("gen-add", { website: orgForm.website, email: orgForm.email, id_prefix: orgForm.id_prefix, billing_prefix: orgForm.billing_prefix }); }}
        className="flex flex-col gap-4 rounded-card2 border border-line-card bg-card p-5 shadow-card"
      >
        <h3 className="font-display text-lg font-bold text-ink">2. Additional Details</h3>
        <Field k="website" label="Website" />
        <Field k="email" label="Email" type="email" />
        <Field k="id_prefix" label="Id prefix" />
        <Field k="billing_prefix" label="Billing prefix" />
        <p className="text-[12.5px] leading-snug text-muted">
          Optional prefix for invoice numbers. Use [year] to insert the last two digits of the current year. Example: 'INV-[year]' → 'INV-25'.
        </p>
        <div className="mt-auto flex justify-center pt-2">
          <SaveBar section="gen-add" saving={saving("gen-add")} flash={flash} mayEdit={mayEdit} label="Save" />
        </div>
      </form>

      {/* 3. Upload Logo */}
      <form
        onSubmit={(e) => { e.preventDefault(); doSave("gen-logo", { logo_url: orgForm.logo_url }); }}
        className="flex flex-col gap-4 rounded-card2 border border-line-card bg-card p-5 shadow-card"
      >
        <h3 className="font-display text-lg font-bold text-ink">3. Upload Logo</h3>
        <div className="text-[13px] text-muted">
          Currently:{" "}
          {orgForm.logo_url
            ? <><span className="font-semibold text-ink">{orgForm.logo_url}</span>{" "}
                <button type="button" className="font-semibold text-accent hover:underline" onClick={() => { set("logo_url", ""); setLogoPreview(""); }}>Clear</button></>
            : <span className="italic">No logo set</span>}
        </div>
        <label className="block">
          <span className="mb-1 block text-[13px] font-semibold text-muted">Logo URL</span>
          <input className={lineInput} placeholder="https://…/logo.png" value={orgForm.logo_url ?? ""} onChange={(e) => set("logo_url", e.target.value)} />
        </label>
        <div className="text-[13px] font-semibold text-muted">Change:</div>
        <label className="flex min-h-[220px] cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-line-chip bg-page p-3">
          {(logoPreview || orgForm.logo_url)
            ? <img src={logoPreview || orgForm.logo_url} alt="logo" className="max-h-[200px] max-w-full object-contain" />
            : <span className="text-sm text-muted">Click to choose an image</span>}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) setLogoPreview(URL.createObjectURL(f));
          }} />
        </label>
        <p className="text-[12px] leading-snug text-muted">Preview only — paste a hosted URL above to persist the logo.</p>
        <div className="mt-auto flex justify-center pt-2">
          <SaveBar section="gen-logo" saving={saving("gen-logo")} flash={flash} mayEdit={mayEdit} label="Save" />
        </div>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Blood Pricing tab                                                  //
// ------------------------------------------------------------------ //

function PricingTab({
  pricing, setPricing, mayEdit, saving, flash, doSave,
}: SharedProps & { pricing: Record<string, number>; setPricing: React.Dispatch<React.SetStateAction<Record<string, number>>> }) {
  const [full, setFull] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const val = (k: string, d: number) => (pricing[k] ?? d);
  const setVal = (k: string, v: number) => setPricing((s) => ({ ...s, [k]: v }));

  if (full) {
    return (
      <form onSubmit={(e) => { e.preventDefault(); doSave("pricing", { blood_pricing: pricing }); }} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
          <div className="hidden lg:block">
            <div className="rounded-xl border border-line-card bg-page p-4 text-center">
              <FileText size={64} className="mx-auto text-accent/70" />
              <p className="mt-3 text-sm font-bold text-accent-deep">NBTC's Guidelines for Blood Charges</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {FULL_PRICING_ITEMS.map((p) => (
              <label key={p.key} className="block">
                <span className="mb-0.5 block text-[13px] font-semibold text-muted">{p.label}*</span>
                <input type="number" className={lineInput} value={val(p.key, p.default)}
                  onChange={(e) => setVal(p.key, Number(e.target.value))} />
              </label>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={() => setFull(false)} className="text-sm font-bold text-muted hover:text-ink-4">← Back to cards</button>
          <SaveBar section="pricing" saving={saving("pricing")} flash={flash} mayEdit={mayEdit} label="Save Pricing" />
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); doSave("pricing", { blood_pricing: pricing }); }} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRICING_ITEMS.map((p) => {
          const isEditing = editing === p.key;
          return (
            <div key={p.key} className="flex items-center justify-between gap-3 rounded-card2 border border-line-card bg-card p-6 shadow-card">
              <div className="min-w-0">
                <div className="font-display text-lg font-bold text-ink">{p.label}</div>
                {isEditing ? (
                  <input type="number" autoFocus className="mt-1 w-28 rounded-lg border border-line-chip bg-page px-2 py-1 text-lg font-bold text-accent outline-none focus:ring-2 focus:ring-accent/30"
                    value={val(p.key, p.default)} onChange={(e) => setVal(p.key, Number(e.target.value))}
                    onBlur={() => setEditing(null)} onKeyDown={(e) => e.key === "Enter" && setEditing(null)} />
                ) : (
                  <div className="mt-1 text-2xl font-extrabold text-muted">₹ {val(p.key, p.default)}</div>
                )}
              </div>
              <button type="button" disabled={!mayEdit}
                onClick={() => setEditing(isEditing ? null : p.key)}
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-accent text-white shadow-primary transition hover:brightness-110 disabled:opacity-50">
                {isEditing ? <Check size={16} /> : <Pencil size={15} />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="flex items-center gap-3">
        <SaveBar section="pricing" saving={saving("pricing")} flash={flash} mayEdit={mayEdit} label="Save Pricing" />
        <button type="button" onClick={() => setFull(true)} className="text-sm font-bold text-accent hover:underline">View / edit full price list →</button>
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ //
// Custom Settings tab                                                //
// ------------------------------------------------------------------ //

function CustomSettingsTab({
  cust, setCust, mayEdit, saving, flash, doSave,
}: SharedProps & { cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  const [active, setActive] = useState(CUSTOM_SECTIONS[0].key);
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const section = CUSTOM_SECTIONS.find((s) => s.key === active) as SettingsSection;
  const fields: SettingField[] = useMemo(() => {
    if (!q) return section.fields;
    return CUSTOM_SECTIONS.flatMap((s) => s.fields).filter(
      (f) => f.label.toLowerCase().includes(q) || (f.desc ?? "").toLowerCase().includes(q),
    );
  }, [q, section]);

  const value = (f: SettingField) => (cust[f.key] !== undefined ? cust[f.key] : (f as any).default);
  const onChange = (f: SettingField, v: any) => setCust((s) => ({ ...s, [f.key]: v }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold text-ink">Custom Settings</h2>
        <div className="relative">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search settings…"
            className="w-64 rounded-xl border border-line-chip bg-page py-2 pl-9 pr-3 text-sm text-ink outline-none focus:ring-2 focus:ring-accent/30" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        {/* left rail */}
        <nav className="h-max rounded-card2 border border-line-card bg-card p-2 shadow-card">
          {CUSTOM_SECTIONS.map((s) => {
            const Icon = ICONS[s.icon] ?? SettingsIcon;
            const on = !q && active === s.key;
            return (
              <button key={s.key} onClick={() => { setActive(s.key); setQuery(""); }}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${on ? "bg-info-bg text-accent-deep" : "text-ink-4 hover:bg-hovertint"}`}>
                <Icon size={17} className={on ? "text-accent" : "text-muted"} /> {s.label}
              </button>
            );
          })}
        </nav>

        {/* panel */}
        <form onSubmit={(e) => { e.preventDefault(); doSave("custom", { settings: cust }); }}
          className="rounded-card2 border border-line-card bg-card p-6 shadow-card">
          <h3 className="mb-2 font-display text-lg font-bold text-ink">{q ? `Results for “${query}”` : section.label}</h3>
          <div className="border-t border-line-table">
            {fields.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No settings match your search.</p>
            ) : fields.map((f) => (
              <FieldRow key={f.key} field={f} value={value(f)} onChange={(v) => onChange(f, v)} disabled={!mayEdit} />
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <SaveBar section="custom" saving={saving("custom")} flash={flash} mayEdit={mayEdit} />
          </div>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Generic field-list tab (Integrations / Options / Billing)         //
// ------------------------------------------------------------------ //

function FieldListTab({
  title, section, fields, cust, setCust, mayEdit, saving, flash, doSave,
}: SharedProps & {
  title: string; section: string; fields: SettingField[];
  cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}) {
  const value = (f: SettingField) => (cust[f.key] !== undefined ? cust[f.key] : (f as any).default);
  const onChange = (f: SettingField, v: any) => setCust((s) => ({ ...s, [f.key]: v }));
  return (
    <form onSubmit={(e) => { e.preventDefault(); doSave(section, { settings: cust }); }} className="max-w-3xl">
      <h2 className="mb-2 font-display text-xl font-bold text-ink">{title}</h2>
      <div className="border-t border-line-table">
        {fields.map((f) => (
          <FieldRow key={f.key} field={f} value={value(f)} onChange={(v) => onChange(f, v)} disabled={!mayEdit} />
        ))}
      </div>
      <div className="mt-6">
        <SaveBar section={section} saving={saving(section)} flash={flash} mayEdit={mayEdit} />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ //
// Customisations tab (compliance flags + theme)                      //
// ------------------------------------------------------------------ //

function CustomisationsTab({
  compliance, setCompliance, mayEdit, saving, flash, doSave,
}: SharedProps & { compliance: Record<string, boolean>; setCompliance: React.Dispatch<React.SetStateAction<Record<string, boolean>>> }) {
  const { dark, toggle } = useTheme();
  return (
    <div className="max-w-3xl space-y-6">
      <form onSubmit={(e) => { e.preventDefault(); doSave("compliance", { compliance_flags: compliance }); }}>
        <h2 className="mb-2 font-display text-xl font-bold text-ink">Compliance &amp; Accreditation</h2>
        <p className="mb-2 text-[13px] text-muted">Display-only labels shown on reports & invoices.</p>
        <div className="border-t border-line-table">
          {COMPLIANCE_FLAGS.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-4 border-b border-line-table py-4 last:border-0">
              <div className="text-[15px] font-bold text-ink">{f.label}</div>
              <Switch on={!!compliance[f.key]} disabled={!mayEdit} onChange={() => setCompliance((s) => ({ ...s, [f.key]: !s[f.key] }))} />
            </div>
          ))}
        </div>
        <div className="mt-6"><SaveBar section="compliance" saving={saving("compliance")} flash={flash} mayEdit={mayEdit} /></div>
      </form>

      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-[15px] font-bold text-ink">Dark mode (this device)</div>
            <div className="mt-1 text-[13px] text-muted">Theme preference is stored locally on this browser.</div>
          </div>
          <Switch on={dark} onChange={toggle} />
        </div>
      </div>
    </div>
  );
}
