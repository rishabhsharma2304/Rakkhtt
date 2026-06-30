import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, Barcode, Bell, Boxes, Check, ChevronDown, Copy, Droplet, FileText, FlaskConical,
  Info, LayoutDashboard, Link2, Minus, Pencil, Plus, Puzzle, Radio, Save, Search,
  Settings as SettingsIcon, Trash2, UserPlus, Users, Wallet, Warehouse, Wrench, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { canWrite } from "@/lib/rbac";
import { useTheme } from "@/lib/theme";
import { errorMessage, GhostButton, Modal, PrimaryButton, SectionBanner, StatusBadge } from "@/components/ui";
import { DonorReportBuilder, mergeDonorReport, type DonorReportConfig } from "@/components/DonorReportBuilder";
import {
  BILLING_FIELDS, COMPLIANCE_FLAGS, CUSTOM_SECTIONS, FULL_PRICING_ITEMS,
  OPTIONS_LISTS, PRICING_ITEMS, TABS,
  type OptionList, type SettingField, type SettingsSection,
} from "@/lib/settingsConfig";

const ICONS: Record<string, typeof SettingsIcon> = {
  Settings: SettingsIcon, Trash2, Droplet, Boxes, LayoutDashboard, UserPlus,
  Users, Barcode, FileText, Bell, BarChart3, Warehouse, Wrench, FlaskConical,
};

const lineInput =
  "w-full border-0 border-b border-line-chip bg-transparent px-0 py-2 text-[15px] text-ink outline-none transition focus:border-accent";

/** A labelled underline input. Defined at module scope so its identity is
 *  stable across renders — otherwise React remounts it on every keystroke
 *  and the field loses focus after a single character. */
function LineField({
  label, type = "text", value, onChange,
}: { label: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-[13px] font-semibold text-muted">{label}</span>
      <input type={type} className={lineInput} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

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
            <IntegrationsTab orgId={orgId}
              cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "options" && (
            <OptionsTab cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "billing" && (
            <FieldListTab title="Billing" section="billing" fields={BILLING_FIELDS}
              cust={cust} setCust={setCust} mayEdit={mayEdit} saving={saving} flash={flash} doSave={doSave} />
          )}
          {tab === "customisations" && (
            <CustomisationsTab org={org} cust={cust} setCust={setCust}
              compliance={compliance} setCompliance={setCompliance}
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

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* 1. Organisation's Details */}
      <form
        onSubmit={(e) => { e.preventDefault(); doSave("gen-org", { name: orgForm.name, contact: orgForm.contact, license_no: orgForm.license_no, address: orgForm.address, settings: cust }); }}
        className="flex flex-col gap-4 rounded-card2 border border-line-card bg-card p-5 shadow-card"
      >
        <h3 className="font-display text-lg font-bold text-ink">1. Organisation's Details</h3>
        <LineField label="Name" value={orgForm.name} onChange={(v) => set("name", v)} />
        <LineField label="Contact number" value={orgForm.contact} onChange={(v) => set("contact", v)} />
        <LineField label="License no" value={orgForm.license_no} onChange={(v) => set("license_no", v)} />
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
        <LineField label="Website" value={orgForm.website} onChange={(v) => set("website", v)} />
        <LineField label="Email" type="email" value={orgForm.email} onChange={(v) => set("email", v)} />
        <LineField label="Id prefix" value={orgForm.id_prefix} onChange={(v) => set("id_prefix", v)} />
        <LineField label="Billing prefix" value={orgForm.billing_prefix} onChange={(v) => set("billing_prefix", v)} />
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
// Options tab (editable master lists rendered as chips)              //
// ------------------------------------------------------------------ //

/** Green rounded-square "+" button that heads each list section. */
function AddSquare({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-[#27C9A7] text-white shadow-sm transition hover:brightness-105">
      <Plus size={17} strokeWidth={2.5} />
    </button>
  );
}

/** One value chip — solid indigo pill (filled) or light removable chip (outline). */
function OptionChip({
  label, variant, editable, mayEdit, onRemove, onRename,
}: {
  label: string; variant: "filled" | "outline"; editable?: boolean; mayEdit: boolean;
  onRemove: () => void; onRename: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);

  if (editing) {
    return (
      <input
        autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { setEditing(false); const v = draft.trim(); if (v && v !== label) onRename(v); else setDraft(label); }}
        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); if (e.key === "Escape") { setDraft(label); setEditing(false); } }}
        className="rounded-full border border-[#6366F1] bg-white px-4 py-2 text-[14px] font-semibold text-[#4338CA] outline-none focus:ring-2 focus:ring-[#6366F1]/30"
      />
    );
  }

  if (variant === "filled") {
    return (
      <span className="inline-flex items-center gap-2 rounded-full bg-[#6366F1] px-4 py-2 text-[14px] font-semibold text-white">
        {editable ? (
          <button type="button" disabled={!mayEdit} onClick={() => mayEdit && setEditing(true)}
            className="text-white/90 transition hover:text-white disabled:opacity-50" title="Rename">
            <Pencil size={13} />
          </button>
        ) : (
          <button type="button" disabled={!mayEdit} onClick={onRemove}
            className="text-white/90 transition hover:text-white disabled:opacity-50" title="Remove">
            <X size={14} strokeWidth={2.5} />
          </button>
        )}
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-[#F1F0FB] px-4 py-2 text-[14px] font-medium text-[#4F46E5]">
      <button type="button" disabled={!mayEdit} onClick={onRemove}
        className="text-[#9A95E8] transition hover:text-[#4F46E5] disabled:opacity-50" title="Remove">
        <X size={14} strokeWidth={2.5} />
      </button>
      {editable ? (
        <button type="button" disabled={!mayEdit} onClick={() => mayEdit && setEditing(true)} className="disabled:opacity-50">{label}</button>
      ) : label}
    </span>
  );
}

/** A single master-list section: header + add input + chip cloud. */
function OptionSection({
  list, values, mayEdit, onChange,
}: { list: OptionList; values: string[]; mayEdit: boolean; onChange: (next: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");

  const commit = () => {
    const v = draft.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
    setAdding(false);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <AddSquare onClick={() => { if (mayEdit) setAdding((a) => !a); }} />
        <span className={`font-display text-[16px] font-bold ${list.variant === "filled" && list.editable ? "text-[#4F46E5]" : "text-ink-2"}`}>
          {list.label}
        </span>
        {list.sublabel && (
          <span className="rounded-md bg-neutralpill-bg px-2 py-0.5 text-[11px] font-semibold text-muted">{list.sublabel}</span>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <input
            autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") { setDraft(""); setAdding(false); } }}
            placeholder={list.placeholder ?? "Add value…"}
            className="w-72 rounded-full border border-line-chip bg-page px-4 py-2 text-[14px] text-ink outline-none focus:ring-2 focus:ring-accent/30"
          />
          <button type="button" onClick={commit}
            className="flex h-9 items-center gap-1.5 rounded-full bg-accent px-4 text-[13px] font-bold text-white shadow-primary transition hover:brightness-110">
            <Plus size={15} /> Add
          </button>
          <button type="button" onClick={() => { setDraft(""); setAdding(false); }}
            className="text-[13px] font-semibold text-muted hover:text-ink-4">Cancel</button>
        </div>
      )}

      {values.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-3">
          {values.map((label, i) => (
            <OptionChip
              key={`${label}-${i}`} label={label} variant={list.variant} editable={list.editable} mayEdit={mayEdit}
              onRemove={() => onChange(values.filter((_, j) => j !== i))}
              onRename={(next) => onChange(values.map((v, j) => (j === i ? next : v)))}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function OptionsTab({
  cust, setCust, mayEdit, saving, flash, doSave,
}: SharedProps & { cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>> }) {
  const valuesFor = (list: OptionList): string[] =>
    Array.isArray(cust[list.key]) ? cust[list.key] : list.items;
  const setValuesFor = (list: OptionList, next: string[]) =>
    setCust((s) => ({ ...s, [list.key]: next }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); doSave("options", { settings: cust }); }} className="space-y-2">
      <h2 className="mb-5 font-display text-xl font-bold text-ink">Options</h2>
      <div className="space-y-9">
        {OPTIONS_LISTS.map((list) => (
          <OptionSection key={list.key} list={list} values={valuesFor(list)} mayEdit={mayEdit}
            onChange={(next) => setValuesFor(list, next)} />
        ))}
      </div>
      <div className="sticky bottom-0 mt-8 flex items-center gap-3 border-t border-line-table bg-card/90 py-4 backdrop-blur">
        <SaveBar section="options" saving={saving("options")} flash={flash} mayEdit={mayEdit} label="Save Options" />
      </div>
    </form>
  );
}

// ------------------------------------------------------------------ //
// Integrations tab (connector cards)                                 //
// ------------------------------------------------------------------ //

/** Format the org id into a grouped, copyable private key. */
function formatPrivateKey(orgId?: string) {
  if (!orgId) return "—";
  const hex = orgId.replace(/[^0-9a-f]/gi, "").toLowerCase();
  if (hex.length < 12) return orgId;
  return `${hex.slice(0, 3)}-${hex.slice(3, 7)}-${hex.slice(7, 11)}-c-${hex.slice(11, 14)}`;
}

/** A collapsible connector card with a chain icon and +/− toggle. */
function IntegrationCard({
  icon, title, open, onToggle, children,
}: { icon: React.ReactNode; title: string; open: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-card2 border border-line-card bg-card shadow-card">
      <button type="button" onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left">
        <span className="flex items-center gap-2.5 font-display text-[15px] font-bold text-ink">
          <span className="text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span> {title}
        </span>
        <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-muted">
          {open ? <Minus size={18} /> : <Plus size={18} />}
        </span>
      </button>
      {open && <div className="border-t border-line-table px-5 py-5">{children}</div>}
    </div>
  );
}

/** Read-only key with a copy button. */
function KeyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line-table pb-4">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-muted">{label}</div>
        <div className="mt-1 truncate font-mono text-[15px] text-ink">{value}</div>
      </div>
      <button type="button" onClick={copy} title="Copy"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-hovertint hover:text-ink">
        {copied ? <Check size={16} className="text-success" /> : <Copy size={16} />}
      </button>
    </div>
  );
}

function IntegrationsTab({
  orgId, cust, setCust, mayEdit, saving, flash, doSave,
}: SharedProps & {
  orgId?: string;
  cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({ bloodbank: true });
  const toggleOpen = (k: string) => setOpen((s) => ({ ...s, [k]: !s[k] }));
  const set = (k: string, v: any) => setCust((s) => ({ ...s, [k]: v }));
  const val = (k: string, d = "") => (cust[k] ?? d) as string;

  const privateKey = cust.integration_private_key || formatPrivateKey(orgId);
  const connected: string[] = Array.isArray(cust.integration_connected_banks) ? cust.integration_connected_banks : [];
  const [bankKey, setBankKey] = useState("");
  const integrate = () => {
    const k = bankKey.trim();
    if (!k) return;
    set("integration_connected_banks", [...connected, k]);
    setBankKey("");
  };

  const labelCls = "mb-1 block text-[13px] font-semibold text-muted";

  return (
    <form onSubmit={(e) => { e.preventDefault(); doSave("integrations", { settings: cust }); }} className="space-y-5">
      <div className="columns-1 gap-5 lg:columns-3 [&>*]:mb-5 [&>*]:break-inside-avoid">
        {/* Blood Bank Integration */}
        <IntegrationCard icon={<Link2 />} title="Blood Bank Integration"
          open={!!open.bloodbank} onToggle={() => toggleOpen("bloodbank")}>
          <KeyField label="Private Key" value={privateKey} />
          <div className="mt-4 grid grid-cols-[120px_1fr] items-center gap-3">
            <span className="text-[13px] font-semibold text-muted">Integrate Blood Bank</span>
            <input value={bankKey} onChange={(e) => setBankKey(e.target.value)} placeholder="Enter Private Key"
              disabled={!mayEdit} className={lineInput} />
          </div>
          <button type="button" onClick={integrate} disabled={!mayEdit || !bankKey.trim()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-accent py-2.5 text-sm font-bold text-white shadow-primary transition hover:brightness-110 disabled:opacity-50">
            <Save size={15} /> Integrate
          </button>
          <div className="mt-5 border-t border-line-table pt-4">
            {connected.length === 0 ? (
              <div className="flex items-center justify-center gap-1.5 text-[13px] text-muted">
                <Info size={14} /> No connected blood banks yet
              </div>
            ) : (
              <ul className="space-y-2">
                {connected.map((k, i) => (
                  <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-page px-3 py-2 text-[13px]">
                    <span className="truncate font-mono text-ink">{k}</span>
                    <button type="button" disabled={!mayEdit}
                      onClick={() => set("integration_connected_banks", connected.filter((_, j) => j !== i))}
                      className="text-accent hover:underline disabled:opacity-50">Remove</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </IntegrationCard>

        {/* NEO Grouping Integration */}
        <IntegrationCard icon={<Link2 />} title="NEO Grouping Integration"
          open={!!open.neo} onToggle={() => toggleOpen("neo")}>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="text-[14px] font-semibold text-ink">Enable NEO blood grouping machine</div>
            <Switch on={!!cust.integration_neo} disabled={!mayEdit} onChange={() => set("integration_neo", !cust.integration_neo)} />
          </div>
          <label className="block">
            <span className={labelCls}>Machine endpoint (IP / port)</span>
            <input value={val("integration_neo_endpoint")} disabled={!mayEdit}
              onChange={(e) => set("integration_neo_endpoint", e.target.value)} placeholder="e.g. 192.168.1.50:9100" className={lineInput} />
          </label>
        </IntegrationCard>

        {/* RFID Integration */}
        <IntegrationCard icon={<Radio />} title="RFID Integration"
          open={!!open.rfid} onToggle={() => toggleOpen("rfid")}>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="text-[14px] font-semibold text-ink">Enable RFID bag tracking</div>
            <Switch on={!!cust.integration_rfid} disabled={!mayEdit} onChange={() => set("integration_rfid", !cust.integration_rfid)} />
          </div>
          <label className="block">
            <span className={labelCls}>Reader endpoint</span>
            <input value={val("integration_rfid_endpoint")} disabled={!mayEdit}
              onChange={(e) => set("integration_rfid_endpoint", e.target.value)} placeholder="e.g. 192.168.1.60:14150" className={lineInput} />
          </label>
        </IntegrationCard>

        {/* API Access */}
        <IntegrationCard icon={<Link2 />} title="API Access"
          open={!!open.api} onToggle={() => toggleOpen("api")}>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="text-[14px] font-semibold text-ink">Enable REST API access</div>
            <Switch on={!!cust.integration_api_enabled} disabled={!mayEdit} onChange={() => set("integration_api_enabled", !cust.integration_api_enabled)} />
          </div>
          <KeyField label="API Key" value={privateKey} />
          <p className="mt-3 text-[12.5px] leading-snug text-muted">
            Use this key as the <span className="font-mono">X-API-Key</span> header to access the public API.
          </p>
        </IntegrationCard>

        {/* eRakt Kosh Integration */}
        <IntegrationCard icon={<Puzzle />} title="eRakt Kosh Integration"
          open={!!open.erakt} onToggle={() => toggleOpen("erakt")}>
          <div className="flex items-center justify-between gap-4 pb-4">
            <div className="text-[14px] font-semibold text-ink">Sync stock & donations with e-Rakt-Kosh</div>
            <Switch on={!!cust.integration_eraktkosh} disabled={!mayEdit} onChange={() => set("integration_eraktkosh", !cust.integration_eraktkosh)} />
          </div>
          <label className="block">
            <span className={labelCls}>e-Rakt-Kosh API Key</span>
            <input value={val("integration_eraktkosh_key")} disabled={!mayEdit}
              onChange={(e) => set("integration_eraktkosh_key", e.target.value)} placeholder="Paste API key" className={lineInput} />
          </label>
        </IntegrationCard>
      </div>

      <SaveBar section="integrations" saving={saving("integrations")} flash={flash} mayEdit={mayEdit} />
    </form>
  );
}

// ------------------------------------------------------------------ //
// Customisations tab (compliance flags + theme)                      //
// ------------------------------------------------------------------ //

function CustomisationsTab({
  org, cust, setCust, compliance, setCompliance, mayEdit, saving, flash, doSave,
}: SharedProps & {
  org: Record<string, any>;
  cust: Record<string, any>; setCust: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  compliance: Record<string, boolean>; setCompliance: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}) {
  const { dark, toggle } = useTheme();
  const [reportKind, setReportKind] = useState("donor");
  const donorReport: DonorReportConfig = useMemo(() => mergeDonorReport(cust.donor_report), [cust.donor_report]);
  const setDonorReport = (next: DonorReportConfig) => setCust((s) => ({ ...s, donor_report: next }));

  return (
    <div className="space-y-8">
      {/* ---- Report builder ---- */}
      <form onSubmit={(e) => { e.preventDefault(); doSave("donor_report", { settings: cust }); }} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-ink">Report Customisations</h2>
        </div>
        <div className="relative max-w-md">
          <select
            value={reportKind}
            onChange={(e) => setReportKind(e.target.value)}
            className="w-full appearance-none rounded-xl border border-line-chip bg-card px-4 py-3 text-[15px] font-bold text-ink shadow-card outline-none focus:ring-2 focus:ring-accent/30"
          >
            <option value="donor">Donor report</option>
          </select>
          <ChevronDown size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
        </div>

        <DonorReportBuilder config={donorReport} onChange={setDonorReport} org={org} disabled={!mayEdit} />

        <div className="flex justify-center pt-1">
          <SaveBar section="donor_report" saving={saving("donor_report")} flash={flash} mayEdit={mayEdit} label="Save Report Layout" />
        </div>
      </form>

      {/* ---- Compliance + theme ---- */}
      <div className="max-w-3xl space-y-6 border-t border-line-table pt-8">
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
    </div>
  );
}
