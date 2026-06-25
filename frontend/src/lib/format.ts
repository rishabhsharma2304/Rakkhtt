import { format, parseISO } from "date-fns";

export function fmtDate(d?: string | null, pattern = "yyyy-MM-dd"): string {
  if (!d) return "—";
  try {
    return format(typeof d === "string" ? parseISO(d) : d, pattern);
  } catch {
    return String(d);
  }
}

export function fmtINR(n?: number | string | null): string {
  const v = Number(n || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
}

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

// component chip background colors
export const COMPONENT_COLOR: Record<string, string> = {
  WB: "#9F1239",
  PLC: "#F59E0B",
  PLT: "#F59E0B",
  PRBC: "#DC2626",
  FFP: "#FB7185",
  RDP: "#FB7185",
  SDP: "#9F1239",
  CRYO: "#F59E0B",
};

export function componentColor(t?: string): string {
  return COMPONENT_COLOR[(t || "").toUpperCase()] || "#9F1239";
}
