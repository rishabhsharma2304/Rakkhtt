// Frontend mirror of backend RBAC (Section 9) — used to hide actions/nav the user
// can't perform. The backend remains the source of truth and re-checks every mutation.
const FULL = new Set(["admin", "master_user"]);
const SUPERVISOR = new Set([...FULL, "technical_supervisor"]);
const TECH = new Set([...SUPERVISOR, "technician"]);
const OUTREACH = new Set([...FULL, "motivation"]);
const RECEPTION = new Set([...TECH, "general"]);

// Mirror of backend WRITE_ROLES (app/core/rbac.py). The backend stays the source of
// truth and re-checks every mutation; this map only decides what the UI hides/disables.
const WRITE_ROLES: Record<string, Set<string>> = {
  // identity / config — master only
  orgs: FULL,
  staff: FULL,
  settings: FULL,
  // data entry — technician and up
  bags: TECH,
  components: TECH,
  qc: TECH,
  store: TECH,
  vehicles: TECH,
  hospitals: TECH,
  patients: TECH,
  thalassemia: TECH,
  therapeutic: TECH,
  inquiries: TECH,
  organisations: TECH,
  // outreach
  donors: new Set([...TECH, "motivation"]),
  donations: new Set([...TECH, "motivation"]),
  camps: new Set([...TECH, "motivation"]),
  feedback: OUTREACH,
  // reception
  "blood-requests": RECEPTION,
  invoices: RECEPTION,
  reception: RECEPTION,
  // tools
  barcodes: TECH,
  labels: TECH,
  reservations: TECH,
  downloads: TECH,
  "custom-reports": SUPERVISOR,
  "custom-registers": SUPERVISOR,
  // lab workflow stage transitions
  discard: SUPERVISOR,
  shift: SUPERVISOR,
  validation: SUPERVISOR,
};
const DEFAULT_WRITE = TECH;

export function canWrite(role: string | undefined, resource: string): boolean {
  if (!role) return false;
  // normalise a REST path ("/hospitals", "donors/") to its resource tag
  const tag = resource.replace(/^\/+|\/+$/g, "").split("/")[0];
  return (WRITE_ROLES[tag] ?? DEFAULT_WRITE).has(role);
}

export function roleLabel(role?: string): string {
  return (
    {
      master_user: "Master User",
      admin: "Administrator",
      technician: "Technician",
      technical_supervisor: "Technical Supervisor",
      motivation: "Motivation",
      general: "General",
    }[role ?? ""] ?? role ?? "—"
  );
}
