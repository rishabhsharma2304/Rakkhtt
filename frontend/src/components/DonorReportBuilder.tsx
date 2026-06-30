import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { fmtDate } from "@/lib/format";

// ------------------------------------------------------------------ //
// Donor-report customisation builder + live preview.
// Section-based editor (Header / Results / Footer) on the left, an
// A4-style live preview of the donor "Blood Report" on the right.
// Config is stored inside org.settings under `donor_report`.
// ------------------------------------------------------------------ //

export interface DonorReportConfig {
  section1: { enabled: boolean };
  section2: {
    enabled: boolean;
    headerText: string;
    tableType: "results" | "markers_only" | "none";
    showNextDue: boolean;
    showHighHb: boolean;
  };
  section3: {
    enabled: boolean;
    paragraph: string;
    sig1: { enabled: boolean; name: string };
    sig2: { enabled: boolean; name: string };
  };
}

export const DONOR_REPORT_DEFAULTS: DonorReportConfig = {
  section1: { enabled: true },
  section2: {
    enabled: true,
    headerText: "Here are the details of your blood screening test:",
    tableType: "results",
    showNextDue: true,
    showHighHb: false,
  },
  section3: {
    enabled: true,
    paragraph:
      "Thank you for being a blood donor. We appreciate your generosity that saves and improves the lives of so many !",
    sig1: { enabled: true, name: "" },
    sig2: { enabled: true, name: "" },
  },
};

/** Merge a (possibly partial / legacy) stored config onto the defaults. */
export function mergeDonorReport(stored: any): DonorReportConfig {
  const d = DONOR_REPORT_DEFAULTS;
  const s = stored ?? {};
  return {
    section1: { ...d.section1, ...s.section1 },
    section2: { ...d.section2, ...s.section2 },
    section3: {
      ...d.section3,
      ...s.section3,
      sig1: { ...d.section3.sig1, ...s.section3?.sig1 },
      sig2: { ...d.section3.sig2, ...s.section3?.sig2 },
    },
  };
}

const TABLE_TYPES: { value: DonorReportConfig["section2"]["tableType"]; label: string }[] = [
  { value: "results", label: "Table with results" },
  { value: "markers_only", label: "Markers only (no values)" },
  { value: "none", label: "No table" },
];

// --- small shared controls (kept local to avoid cross-file coupling) --- //

function Toggle({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
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

const fieldInput =
  "w-full rounded-xl border border-line-chip bg-page px-3 py-2.5 text-[14px] text-ink outline-none transition focus:ring-2 focus:ring-accent/30";

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="mt-1 text-[12px] text-muted">{children}</p>;
}

function RowToggle({ label, on, onChange, disabled }: { label: string; on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-[14px] font-semibold text-ink">{label}</span>
      <Toggle on={on} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ------------------------------------------------------------------ //
// Editor
// ------------------------------------------------------------------ //

export interface PreviewOrg {
  name?: string | null;
  address?: string | null;
  contact?: string | null;
  license_no?: string | null;
  logo_url?: string | null;
}

export function DonorReportBuilder({
  config,
  onChange,
  org,
  disabled,
}: {
  config: DonorReportConfig;
  onChange: (next: DonorReportConfig) => void;
  org: PreviewOrg;
  disabled: boolean;
}) {
  const [section, setSection] = useState<1 | 2 | 3>(1);

  // typed section mutators
  const setS1 = (p: Partial<DonorReportConfig["section1"]>) => onChange({ ...config, section1: { ...config.section1, ...p } });
  const setS2 = (p: Partial<DonorReportConfig["section2"]>) => onChange({ ...config, section2: { ...config.section2, ...p } });
  const setS3 = (p: Partial<DonorReportConfig["section3"]>) => onChange({ ...config, section3: { ...config.section3, ...p } });
  const setSig = (which: "sig1" | "sig2", p: Partial<{ enabled: boolean; name: string }>) =>
    onChange({ ...config, section3: { ...config.section3, [which]: { ...config.section3[which], ...p } } });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      {/* ---- left: editor ---- */}
      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        {/* section tab strip */}
        <div className="mb-4 flex items-center gap-2 border-b border-line-table pb-3">
          {([1, 2, 3] as const).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setSection(n)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${section === n ? "bg-accent text-white shadow-primary" : "text-muted hover:bg-hovertint hover:text-ink-4"}`}
            >
              Section {n}
            </button>
          ))}
        </div>

        {section === 1 && (
          <div>
            <RowToggle label="Section 1: Header" on={config.section1.enabled} onChange={() => setS1({ enabled: !config.section1.enabled })} disabled={disabled} />
            <Hint>Shows the centre logo, name, address and licence at the top of the report.</Hint>
          </div>
        )}

        {section === 2 && (
          <div className="space-y-4">
            <RowToggle label="Section 2: Results" on={config.section2.enabled} onChange={() => setS2({ enabled: !config.section2.enabled })} disabled={disabled} />

            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-muted">Section 2 header text</span>
              <textarea
                rows={2}
                className={fieldInput}
                value={config.section2.headerText}
                disabled={disabled || !config.section2.enabled}
                onChange={(e) => setS2({ headerText: e.target.value })}
              />
              <Hint>Header text for Section 2</Hint>
            </label>

            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-muted">Section 2 table type *</span>
              <div className="relative">
                <select
                  className={fieldInput + " appearance-none pr-9 font-semibold"}
                  value={config.section2.tableType}
                  disabled={disabled || !config.section2.enabled}
                  onChange={(e) => setS2({ tableType: e.target.value as DonorReportConfig["section2"]["tableType"] })}
                >
                  {TABLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
              </div>
              <Hint>Table type for Section 2</Hint>
            </label>

            <div className="border-t border-line-table">
              <RowToggle label="Show next due date for donation" on={config.section2.showNextDue} onChange={() => setS2({ showNextDue: !config.section2.showNextDue })} disabled={disabled || !config.section2.enabled} />
              <RowToggle label="Show >12.5 for high Haemoglobin" on={config.section2.showHighHb} onChange={() => setS2({ showHighHb: !config.section2.showHighHb })} disabled={disabled || !config.section2.enabled} />
            </div>
          </div>
        )}

        {section === 3 && (
          <div className="space-y-4">
            <RowToggle label="Section 3: Footer" on={config.section3.enabled} onChange={() => setS3({ enabled: !config.section3.enabled })} disabled={disabled} />

            <label className="block">
              <span className="mb-1 block text-[13px] font-semibold text-muted">Section 3 paragraph</span>
              <textarea
                rows={3}
                className={fieldInput}
                value={config.section3.paragraph}
                disabled={disabled || !config.section3.enabled}
                onChange={(e) => setS3({ paragraph: e.target.value })}
              />
              <Hint>Paragraph text for Section 3</Hint>
            </label>

            {(["sig1", "sig2"] as const).map((which, i) => {
              const sig = config.section3[which];
              return (
                <div key={which} className="rounded-xl border border-line-card bg-page p-4">
                  <RowToggle label={`Signature ${i + 1}`} on={sig.enabled} onChange={() => setSig(which, { enabled: !sig.enabled })} disabled={disabled || !config.section3.enabled} />
                  <label className="block">
                    <span className="mb-1 block text-[13px] font-semibold text-muted">Section 3 signature {i + 1} name</span>
                    <input
                      className={fieldInput}
                      placeholder={`Name for Signature ${i + 1}`}
                      value={sig.name}
                      disabled={disabled || !config.section3.enabled || !sig.enabled}
                      onChange={(e) => setSig(which, { name: e.target.value })}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- right: live preview ---- */}
      <div className="rounded-card2 border border-line-card bg-[#33373d] p-4 shadow-card">
        <div className="mb-3 text-center text-[12px] font-semibold uppercase tracking-wide text-white/60">Live preview</div>
        <DonorReportPreview config={config} org={org} />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ //
// Preview sheet
// ------------------------------------------------------------------ //

const MARKERS: { key: string; label: string; sub?: string; result: string }[] = [
  { key: "hb", label: "Haemoglobin", sub: "(in gm/dl)", result: "14.5" },
  { key: "hbsag", label: "HBsAg", result: "Non Reactive" },
  { key: "hcv", label: "Anti-HCV", result: "Non Reactive" },
  { key: "hiv", label: "Anti-HIV 1 & 2", result: "Non Reactive" },
  { key: "syph", label: "Syphilis", result: "Non Reactive" },
  { key: "mp", label: "Malaria Parasite", sub: "(Rapid Test)", result: "Negative" },
];

function DonorReportPreview({ config, org }: { config: DonorReportConfig; org: PreviewOrg }) {
  const today = useMemo(() => fmtDate(new Date().toISOString(), "MMMM d, yyyy"), []);
  const nextDue = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return fmtDate(d.toISOString(), "MMMM d, yyyy");
  }, []);
  const hbResult = config.section2.showHighHb ? ">12.5" : "14.5";

  const sigs = [config.section3.sig1, config.section3.sig2].filter((s) => s.enabled);

  return (
    <div className="mx-auto max-w-[640px] bg-white p-8 text-[11px] leading-relaxed text-[#1a1a1a] shadow-2xl">
      {/* Section 1 — header */}
      {config.section1.enabled && (
        <div className="flex items-start justify-between gap-4 border-b-2 border-[#c0392b] pb-2">
          <div className="flex items-start gap-2">
            {org.logo_url
              ? <img src={org.logo_url} alt="" className="h-9 w-9 flex-shrink-0 object-contain" />
              : <div className="h-9 w-9 flex-shrink-0 rounded-full bg-[#c0392b]/10" />}
            <div>
              <div className="text-[13px] font-extrabold uppercase text-[#c0392b]">{org.name || "Blood Centre"}</div>
              {org.address && <div className="text-[9px] font-semibold uppercase text-[#333]">{org.address}</div>}
              <div className="text-[9px] font-semibold text-[#333]">
                {org.contact && <>Contact No. {org.contact}</>}
                {org.contact && org.license_no && " | "}
                {org.license_no && <>Lic No. - {org.license_no}</>}
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-[#555]">{today}</div>
            <div className="text-[13px] font-extrabold text-[#1a1a1a]">Blood Report</div>
          </div>
        </div>
      )}

      {/* greeting + intro */}
      <p className="mt-4 font-semibold">Dear Donor,</p>
      <p className="mt-2 text-[#333]">
        I express my heartfelt gratitude to you for taking the initiative of donating blood on <b>{today}</b>. You
        have not only given power of hope for whom life was slowing down, but also shown path to many more to come
        forward for this noble cause of humanity.
      </p>

      {/* Section 2 — results */}
      {config.section2.enabled && (
        <>
          {config.section2.headerText && (
            <p className="mt-4 font-bold">{config.section2.headerText}</p>
          )}
          {config.section2.tableType !== "none" && (
            <table className="mt-2 w-full border-collapse text-[9px]">
              <thead>
                <tr className="bg-[#f2f2f2]">
                  <th className="border border-[#999] px-1.5 py-1 text-left">Donor ID</th>
                  <th className="border border-[#999] px-1.5 py-1 text-left">Blood Group</th>
                  <th className="border border-[#999] px-1.5 py-1 text-center" colSpan={MARKERS.length}>Infection Marker</th>
                </tr>
                <tr className="bg-[#fafafa]">
                  <th className="border border-[#999] px-1.5 py-1"></th>
                  <th className="border border-[#999] px-1.5 py-1"></th>
                  {MARKERS.map((m) => (
                    <th key={m.key} className="border border-[#999] px-1.5 py-1 text-center font-semibold">
                      {m.label}{m.sub && <div className="font-normal text-[8px] text-[#666]">{m.sub}</div>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-[#999] px-1.5 py-1">ACBC24-D01099</td>
                  <td className="border border-[#999] px-1.5 py-1">B +</td>
                  {MARKERS.map((m) => (
                    <td key={m.key} className="border border-[#999] px-1.5 py-1 text-center">
                      {config.section2.tableType === "markers_only"
                        ? "—"
                        : m.key === "hb" ? hbResult : m.result}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          )}
          {config.section2.showNextDue && (
            <p className="mt-2 text-right text-[9px] font-bold">Next Due Date for Blood Donation: {nextDue}</p>
          )}
        </>
      )}

      {/* Section 3 — footer */}
      {config.section3.enabled && (
        <>
          {config.section3.paragraph && <p className="mt-5 text-[#333]">{config.section3.paragraph}</p>}
          {sigs.length > 0 && (
            <div className="mt-10 flex justify-between gap-6">
              {sigs.map((s, i) => (
                <div key={i} className="text-center">
                  <div className="h-8 border-b border-[#999]" style={{ width: 120 }} />
                  <div className="mt-1 text-[9px] font-semibold">{s.name || `Signatory ${i + 1}`}</div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="mt-8 text-center text-[8px] text-[#999]">Page 1</div>
    </div>
  );
}
