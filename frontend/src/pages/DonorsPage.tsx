import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Droplet, HeartPulse, Plus, UserPlus, Users } from "lucide-react";
import { DataTable, type Column, type CrudConfig, type Field } from "@/components/DataTable";
import { EntityForm } from "@/components/EntityForm";
import { SectionBanner, StatCard, StatusBadge, StatusPill, type FilterDef } from "@/components/ui";
import { fetchList } from "@/lib/api";
import { fmtDate, BLOOD_GROUPS } from "@/lib/format";

const GROUP_OPTS = BLOOD_GROUPS.map((g) => ({ value: g, label: g }));
const GENDER_OPTS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];
const DEFERRAL_OPTS = [
  { value: "none", label: "Eligible" },
  { value: "temporary", label: "Temporary" },
  { value: "permanent", label: "Permanent" },
];
const STATUS_OPTS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "deferred", label: "Deferred" },
];

// ---------------- Donor list (All Donors tab) ----------------
const donorColumns: Column<any>[] = [
  { key: "name", label: "Donor", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
  { key: "blood_group", label: "Group", render: (r) => <span className="font-bold text-accent-deep">{r.blood_group ?? "—"}</span> },
  { key: "gender", label: "Gender" },
  { key: "age", label: "Age", align: "right" },
  { key: "contact", label: "Contact" },
  { key: "last_donation_date", label: "Last Donation", sortable: true, render: (r) => fmtDate(r.last_donation_date) },
  { key: "total_donations", label: "Donations", align: "right", sortable: true },
  {
    key: "deferral_status",
    label: "Status",
    render: (r) =>
      r.deferral_status === "none" ? (
        <StatusPill tone="good">Eligible</StatusPill>
      ) : (
        <StatusPill tone={r.deferral_status === "permanent" ? "danger" : "warn"}>{r.deferral_status}</StatusPill>
      ),
  },
];

const donorCrud: CrudConfig = {
  name: "Donor",
  fields: [
    { name: "name", label: "Donor name", required: true, full: true },
    { name: "blood_group", label: "Blood group", type: "select", options: GROUP_OPTS },
    { name: "gender", label: "Gender", type: "select", options: GENDER_OPTS },
    { name: "age", label: "Age", type: "number" },
    { name: "contact", label: "Contact", type: "tel" },
    { name: "govt_id", label: "Govt ID" },
    { name: "last_donation_date", label: "Last donation", type: "date" },
    { name: "total_donations", label: "Total donations", type: "number" },
    { name: "deferral_status", label: "Deferral status", type: "select", options: DEFERRAL_OPTS },
    { name: "address", label: "Address", type: "textarea", full: true },
  ],
  canCreate: false, // creation goes through the page-level "Add ▾" menu
};

const donorFilters: FilterDef[] = [
  { name: "blood_group", label: "Group", options: GROUP_OPTS },
  { name: "deferral_status", label: "Status", options: DEFERRAL_OPTS },
];

// ---------------- create-form field defs (Add ▾ menu) ----------------
const DONOR_FIELDS: Field[] = donorCrud.fields;

const DONATION_FIELDS: Field[] = [
  { name: "donor_id", label: "Donor", type: "select", optionsPath: "/donors", optionLabel: "name", required: true, full: true },
  { name: "camp_id", label: "Camp", type: "select", optionsPath: "/camps", optionLabel: "name" },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "status", label: "Status", type: "select", options: STATUS_OPTS },
  { name: "hb", label: "Haemoglobin (g/dL)", type: "number" },
  { name: "weight", label: "Weight (kg)", type: "number" },
  { name: "deferral_reason", label: "Deferral reason (if deferred)", full: true },
];

function donationTransform(v: Record<string, any>): Record<string, any> {
  const { hb, weight, ...rest } = v;
  const screening: Record<string, number> = {};
  if (hb !== undefined && hb !== "") screening.hb = Number(hb);
  if (weight !== undefined && weight !== "") screening.weight = Number(weight);
  return Object.keys(screening).length ? { ...rest, screening_json: screening } : rest;
}

// ---------------- count helper for stat cards ----------------
function useCount(path: string, params: Record<string, unknown>, key: string) {
  const { data } = useQuery({
    queryKey: ["count", path, key],
    queryFn: () => fetchList(path, { page_size: 1, ...params }),
  });
  return data?.total ?? 0;
}

// ---------------- donation tab table (donor/camp names resolved) ----------------
function DonationTable({ status }: { status: string }) {
  const navigate = useNavigate();
  const { data: donorData } = useQuery({
    queryKey: ["lookup", "/donors"],
    queryFn: () => fetchList("/donors", { page_size: 500 }),
  });
  const { data: campData } = useQuery({
    queryKey: ["lookup", "/camps"],
    queryFn: () => fetchList("/camps", { page_size: 200 }),
  });
  const donorMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const d of donorData?.items ?? []) m[d.id] = d;
    return m;
  }, [donorData]);
  const campMap = useMemo(() => {
    const m: Record<string, any> = {};
    for (const c of campData?.items ?? []) m[c.id] = c;
    return m;
  }, [campData]);

  const columns: Column<any>[] = [
    {
      key: "donor_id",
      label: "Donor",
      render: (r) => {
        const d = donorMap[r.donor_id];
        return (
          <div>
            <div className="font-bold text-ink">{d?.name ?? "—"}</div>
            <div className="text-xs text-muted">{d?.contact ?? ""}</div>
          </div>
        );
      },
    },
    {
      key: "group",
      label: "Group",
      render: (r) => <span className="font-bold text-accent-deep">{donorMap[r.donor_id]?.blood_group ?? "—"}</span>,
    },
    { key: "camp_id", label: "Camp", render: (r) => campMap[r.camp_id]?.name ?? "In-house / —" },
    { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
    {
      key: "hb",
      label: "Hb (g/dL)",
      align: "right",
      render: (r) => (r.screening_json?.hb != null ? r.screening_json.hb : "—"),
    },
    { key: "status", label: "Status", align: "center", render: (r) => <StatusBadge value={r.status} /> },
    {
      key: "deferral_reason",
      label: "Reason",
      render: (r) => (r.deferral_reason ? <span className="text-xs text-ink-3">{r.deferral_reason}</span> : "—"),
    },
  ];

  const donationCrud: CrudConfig = {
    name: "Donation",
    canCreate: false,
    fields: [
      { name: "camp_id", label: "Camp", type: "select", optionsPath: "/camps", optionLabel: "name" },
      { name: "date", label: "Date", type: "date", required: true },
      { name: "status", label: "Status", type: "select", options: STATUS_OPTS },
      { name: "deferral_reason", label: "Deferral reason", type: "textarea", full: true },
    ],
  };

  return (
    <DataTable
      path="/donations"
      columns={columns}
      filters={{ status }}
      searchPlaceholder="Search donations…"
      defaultSort="date"
      emptyMessage={`No ${status} donations.`}
      crud={donationCrud}
      onRowClick={(row) => row.donor_id && navigate(`/donor/${row.donor_id}`)}
    />
  );
}

// ---------------- Add ▾ menu ----------------
function AddMenu({ onPick }: { onPick: (what: "donor" | "donation") => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="inline-flex items-center gap-2 rounded-btn bg-accent px-4 py-2.5 text-sm font-bold text-white shadow-primary transition hover:brightness-[1.06]"
      >
        <Plus size={16} /> Add <ChevronDown size={15} />
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-1.5 w-52 overflow-hidden rounded-xl border border-line-card bg-card py-1 shadow-droptop">
          <button
            onMouseDown={() => onPick("donation")}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-hovertint"
          >
            <HeartPulse size={16} className="text-accent" /> Register Donation
          </button>
          <button
            onMouseDown={() => onPick("donor")}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-semibold text-ink hover:bg-hovertint"
          >
            <UserPlus size={16} className="text-accent" /> Add Donor
          </button>
        </div>
      )}
    </div>
  );
}

const TABS = [
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "deferred", label: "Deferrals" },
  { key: "donors", label: "All Donors" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

export function DonorsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("pending");
  const [adding, setAdding] = useState<null | "donor" | "donation">(null);

  const total = useCount("/donors", {}, "all");
  const eligible = useCount("/donors", { deferral_status: "none" }, "eligible");
  const pending = useCount("/donations", { status: "pending" }, "pending");
  const deferred = useCount("/donations", { status: "deferred" }, "deferred");

  return (
    <div className="space-y-5">
      <SectionBanner icon={<Users size={22} />} title="Donor's List" subtitle="Registered donors, screening & donation history" />

      <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-4">
        <StatCard label="Total donors" value={total} icon={<Users size={20} />} />
        <StatCard label="Eligible" value={eligible} icon={<HeartPulse size={20} />} />
        <StatCard label="Pending donations" value={pending} icon={<Droplet size={20} />} />
        <StatCard label="Deferrals" value={deferred} icon={<Droplet size={20} />} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex flex-wrap rounded-[14px] bg-card p-1 shadow-card">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-[10px] px-5 py-2 text-sm font-bold transition ${
                tab === t.key ? "bg-accent text-white" : "text-muted hover:text-ink-4"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <AddMenu onPick={(w) => setAdding(w)} />
      </div>

      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        {tab === "donors" ? (
          <DataTable
            path="/donors"
            columns={donorColumns}
            searchPlaceholder="Search name, contact, group…"
            defaultSort="created_at"
            emptyMessage="No donors available."
            crud={donorCrud}
            filterFields={donorFilters}
            onRowClick={(row) => navigate(`/donor/${row.id}`)}
          />
        ) : (
          <DonationTable key={tab} status={tab} />
        )}
      </div>

      <EntityForm
        open={adding === "donor"}
        onClose={() => setAdding(null)}
        title="Add Donor"
        path="/donors"
        fields={DONOR_FIELDS}
        initial={{ deferral_status: "none", total_donations: 0 }}
        invalidate={[["list", "/donors"], ["lookup", "/donors"], ["count", "/donors"]]}
      />
      <EntityForm
        open={adding === "donation"}
        onClose={() => setAdding(null)}
        title="Register Donation"
        path="/donations"
        fields={DONATION_FIELDS}
        initial={{ status: "pending" }}
        transform={donationTransform}
        invalidate={[["list", "/donations"], ["count", "/donations"]]}
        submitLabel="Register"
      />
    </div>
  );
}
