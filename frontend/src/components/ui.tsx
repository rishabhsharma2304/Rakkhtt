import type { ReactNode } from "react";
import { AlertTriangle, FileSpreadsheet, FileText, Filter, Loader2, Printer, X } from "lucide-react";
import { componentColor } from "@/lib/format";

// ---------- Spinner / loading state ----------
export function Spinner({ size = 18, className = "" }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={`animate-spin text-accent ${className}`} />;
}

export function LoadingState({ message = "Loading…", className = "" }: { message?: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center gap-2 py-12 text-sm font-medium text-muted ${className}`}>
      <Spinner /> {message}
    </div>
  );
}

// ---------- Error state ----------
/** Pull a human-readable message out of an axios/FastAPI error, with a safe fallback. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const detail = (error as any)?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  return fallback;
}

export function ErrorNote({ error, fallback, className = "" }: { error?: unknown; fallback?: string; className?: string }) {
  return (
    <div className={`flex items-start gap-2 rounded-xl border border-accent/30 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent ${className}`}>
      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
      <span>{errorMessage(error, fallback)}</span>
    </div>
  );
}

export function ErrorState({ error, fallback, className = "" }: { error?: unknown; fallback?: string; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-2 py-12 text-center ${className}`}>
      <AlertTriangle size={26} className="text-accent" />
      <p className="text-sm font-semibold text-ink">Couldn’t load this data</p>
      <p className="max-w-sm text-xs text-muted">{errorMessage(error, fallback)}</p>
    </div>
  );
}

// ---------- Card ----------
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-card border border-line-card rounded-card2 shadow-card ${className}`}>{children}</div>
  );
}

// ---------- Status pill ----------
type Tone = "good" | "warn" | "info" | "neutral" | "danger";
const TONE: Record<Tone, string> = {
  good: "text-success bg-success-bg",
  warn: "text-warning bg-warning-bg",
  info: "text-info bg-info-bg",
  neutral: "text-neutralpill bg-neutralpill-bg",
  danger: "text-white bg-accent",
};
export function StatusPill({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-[12.5px] font-bold ${TONE[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ value }: { value?: string }) {
  const v = (value || "").toLowerCase();
  if (v === "completed" || v === "received" || v === "pass" || v === "tested")
    return <StatusPill tone="good" className="min-w-[104px]">{cap(value)}</StatusPill>;
  if (v === "pending" || v === "in_processing" || v === "quarantine")
    return <StatusPill tone="warn" className="min-w-[104px]">{cap(value)}</StatusPill>;
  if (v === "fail" || v === "reactive" || v === "discarded" || v === "deferred")
    return <StatusPill tone="danger" className="min-w-[104px]">{cap(value)}</StatusPill>;
  return <StatusPill tone="neutral" className="min-w-[104px]">{cap(value)}</StatusPill>;
}

function cap(s?: string) {
  if (!s) return "—";
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
}

// ---------- Component chip ----------
export function ComponentChip({ type }: { type?: string }) {
  if (!type) return <span className="text-muted-disabled">—</span>;
  return (
    <span
      className="inline-block rounded-lg px-2.5 py-1 text-[12.5px] font-bold text-white"
      style={{ background: componentColor(type) }}
    >
      {type}
    </span>
  );
}

// ---------- Buttons ----------
export function PrimaryButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-btn bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-primary transition hover:brightness-[1.06] disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

export function GhostButton({ children, className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center gap-2 rounded-btn border border-line-chip bg-card px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-hovertint ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

// ---------- Empty state ----------
export function EmptyState({ message = "No data available in table." }: { message?: string }) {
  return <div className="py-12 text-center text-sm font-medium text-muted">{message}</div>;
}

// ---------- Section banner ----------
export function SectionBanner({
  icon,
  title,
  subtitle,
  right,
}: {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-card2 bg-banner-grad p-7 text-white shadow-banner">
      <div className="banner-dots" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">{icon}</div>
          <div>
            <h2 className="font-display text-[27px] font-extrabold leading-none tracking-tight">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-white/80">{subtitle}</p>}
          </div>
        </div>
        {right && <div className="flex items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}

// ---------- Generic badge (alias of StatusPill for the masters kit) ----------
export const Badge = StatusPill;

// ---------- Stat card (KPI tile) ----------
export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[12.5px] font-bold uppercase tracking-wide text-muted">{label}</div>
          <div className="mt-1 font-display text-[26px] font-extrabold leading-none text-ink">{value}</div>
          {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
        </div>
        {icon && (
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-hovertint text-accent-deep">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}

// ---------- Modal ----------
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className={`mt-[6vh] w-full ${width} animate-rakRise rounded-card2 border border-line-card bg-card shadow-droptop`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 border-b border-line-table px-6 py-4">
          <h3 className="font-display text-lg font-bold text-ink">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-hovertint" aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line-table px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

// ---------- Export buttons (Excel / PDF / Print) ----------
export function ExportButtons({
  onExcel,
  onPdf,
  onPrint,
}: {
  onExcel?: () => void;
  onPdf?: () => void;
  onPrint?: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={onExcel} className="inline-flex items-center gap-1.5 rounded-lg bg-excel px-3 py-1.5 text-xs font-bold text-white hover:brightness-110">
        <FileSpreadsheet size={14} /> Excel
      </button>
      <button onClick={onPdf ?? onPrint} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white hover:brightness-110">
        <FileText size={14} /> PDF
      </button>
      <button onClick={onPrint} className="inline-flex items-center gap-1.5 rounded-lg border border-line-chip px-3 py-1.5 text-xs font-bold text-ink-4 hover:bg-hovertint">
        <Printer size={14} /> Print
      </button>
    </div>
  );
}

// ---------- Filter bar ----------
export interface FilterDef {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}
export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
}: {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onClear: () => void;
}) {
  const active = Object.values(values).some(Boolean);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-line-chip bg-fill px-3 py-2.5">
      <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted">
        <Filter size={13} /> Filters
      </span>
      {filters.map((f) => (
        <select
          key={f.name}
          value={values[f.name] || ""}
          onChange={(e) => onChange(f.name, e.target.value)}
          className="rounded-lg border border-line-chip bg-card px-2.5 py-1.5 text-sm font-semibold text-ink outline-none focus:ring-2 focus:ring-accent/30"
        >
          <option value="">{f.label}: All</option>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ))}
      {active && (
        <button onClick={onClear} className="ml-1 text-xs font-bold text-accent hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}

// ---------- Page header (title + actions) ----------
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-[-0.6px] text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
