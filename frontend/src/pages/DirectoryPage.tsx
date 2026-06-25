import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ambulance, BookUser, Building2, HeartPulse, Users } from "lucide-react";
import { DataTable, type Column, type CrudConfig } from "@/components/DataTable";
import { SectionBanner, StatCard } from "@/components/ui";
import { fetchList } from "@/lib/api";
import { fmtDate, BLOOD_GROUPS } from "@/lib/format";

const GROUP_OPTS = BLOOD_GROUPS.map((g) => ({ value: g, label: g }));
const GENDER_OPTS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
];
const COMPONENT_OPTS = ["PRBC", "FFP", "WB", "PLC", "SDP", "CRYO"].map((c) => ({ value: c, label: c }));

interface TabDef {
  key: string;
  label: string;
  path: string;
  columns: Column<any>[];
  search: string;
  crud: CrudConfig;
}

const TABS: TabDef[] = [
  {
    key: "organisation",
    label: "Organisation",
    path: "/orgs",
    search: "Search centre…",
    columns: [
      { key: "name", label: "Centre", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "id_prefix", label: "Prefix" },
      { key: "license_no", label: "License No" },
      { key: "address", label: "Address" },
    ],
    crud: {
      name: "Centre",
      canDelete: false, // no DELETE endpoint for organisations
      fields: [
        { name: "name", label: "Centre name", required: true, full: true },
        { name: "id_prefix", label: "ID prefix", required: true },
        { name: "billing_prefix", label: "Billing prefix" },
        { name: "license_no", label: "License no" },
        { name: "contact", label: "Contact", type: "tel" },
        { name: "email", label: "Email", type: "email" },
        { name: "website", label: "Website" },
        { name: "address", label: "Address", type: "textarea", full: true },
      ],
    },
  },
  {
    key: "vehicles",
    label: "Vehicle",
    path: "/vehicles",
    search: "Search vehicle…",
    columns: [
      { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "vehicle_no", label: "Vehicle No" },
    ],
    crud: {
      name: "Vehicle",
      fields: [
        { name: "name", label: "Name", required: true },
        { name: "vehicle_no", label: "Vehicle no" },
      ],
    },
  },
  {
    key: "hospitals",
    label: "Hospitals",
    path: "/hospitals",
    search: "Search hospital…",
    columns: [
      { key: "name", label: "Hospital", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "address", label: "Address" },
      { key: "contact", label: "Contact" },
    ],
    crud: {
      name: "Hospital",
      fields: [
        { name: "name", label: "Hospital name", required: true, full: true },
        { name: "contact", label: "Contact", type: "tel" },
        { name: "address", label: "Address", type: "textarea", full: true },
      ],
    },
  },
  {
    key: "patients",
    label: "Patients",
    path: "/patients",
    search: "Search patient…",
    columns: [
      { key: "name", label: "Patient", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "age", label: "Age", align: "right" },
      { key: "gender", label: "Gender" },
      { key: "contact", label: "Contact" },
    ],
    crud: {
      name: "Patient",
      fields: [
        { name: "name", label: "Patient name", required: true, full: true },
        { name: "age", label: "Age", type: "number" },
        { name: "gender", label: "Gender", type: "select", options: GENDER_OPTS },
        { name: "contact", label: "Contact", type: "tel" },
        { name: "hospital_id", label: "Hospital", type: "select", optionsPath: "/hospitals", full: true },
      ],
    },
  },
  {
    key: "thalassemia",
    label: "Thalassemia Patients",
    path: "/thalassemia-patients",
    search: "Search…",
    columns: [
      { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "blood_group", label: "Group" },
      { key: "contact", label: "Contact" },
      { key: "address", label: "Address" },
    ],
    crud: {
      name: "Thalassemia Patient",
      fields: [
        { name: "name", label: "Name", required: true, full: true },
        { name: "blood_group", label: "Blood group", type: "select", options: GROUP_OPTS },
        { name: "contact", label: "Contact", type: "tel" },
        { name: "address", label: "Address", type: "textarea", full: true },
      ],
    },
  },
  {
    key: "therapeutic",
    label: "Therapeutic Donations",
    path: "/therapeutic-donations",
    search: "Search…",
    columns: [
      { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
      { key: "doctor", label: "Doctor" },
      { key: "phone", label: "Phone" },
      { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
    ],
    crud: {
      name: "Therapeutic Donation",
      fields: [
        { name: "name", label: "Donor name", required: true, full: true },
        { name: "doctor", label: "Doctor" },
        { name: "phone", label: "Phone", type: "tel" },
        { name: "hospital_id", label: "Hospital", type: "select", optionsPath: "/hospitals" },
        { name: "date", label: "Date", type: "date" },
      ],
    },
  },
  {
    key: "inquiries",
    label: "Blood Inquiry",
    path: "/blood-inquiries",
    search: "Search…",
    columns: [
      { key: "patient_name", label: "Patient", render: (r) => <span className="font-bold text-ink">{r.patient_name}</span> },
      { key: "blood_group", label: "Group" },
      { key: "component", label: "Component" },
      { key: "qty", label: "Qty", align: "right" },
      { key: "contact", label: "Contact" },
    ],
    crud: {
      name: "Blood Inquiry",
      fields: [
        { name: "patient_name", label: "Patient name", required: true, full: true },
        { name: "blood_group", label: "Blood group", type: "select", options: GROUP_OPTS },
        { name: "component", label: "Component", type: "select", options: COMPONENT_OPTS },
        { name: "qty", label: "Quantity", type: "number" },
        { name: "contact", label: "Contact", type: "tel" },
        { name: "hospital_id", label: "Hospital", type: "select", optionsPath: "/hospitals", full: true },
      ],
    },
  },
];

function useCount(path: string) {
  const { data } = useQuery({
    queryKey: ["count", path],
    queryFn: () => fetchList(path, { page_size: 1 }),
  });
  return data?.total ?? 0;
}

function SummaryStrip() {
  const hospitals = useCount("/hospitals");
  const patients = useCount("/patients");
  const donors = useCount("/donors");
  const vehicles = useCount("/vehicles");
  return (
    <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
      <StatCard label="Hospitals" value={hospitals} icon={<Building2 size={20} />} />
      <StatCard label="Patients" value={patients} icon={<Users size={20} />} />
      <StatCard label="Donors" value={donors} icon={<HeartPulse size={20} />} />
      <StatCard label="Vehicles" value={vehicles} icon={<Ambulance size={20} />} />
    </div>
  );
}

export function DirectoryPage() {
  const [tab, setTab] = useState(TABS[0].key);
  const active = TABS.find((t) => t.key === tab)!;
  return (
    <div className="space-y-5">
      <SectionBanner icon={<BookUser size={22} />} title="Directory / Masters" subtitle="Hospitals, patients, thalassemia, therapeutic donations & inquiries" />
      <SummaryStrip />
      <div className="rounded-card2 border border-line-card bg-card shadow-card">
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
        <div className="p-5">
          <DataTable
            key={active.key}
            path={active.path}
            columns={active.columns}
            searchPlaceholder={active.search}
            emptyMessage="No records."
            crud={active.crud}
          />
        </div>
      </div>
    </div>
  );
}
