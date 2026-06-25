import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, UserCog, Users as UsersIcon } from "lucide-react";
import { DataTable, type Column, type CrudConfig } from "@/components/DataTable";
import { SectionBanner, StatCard, StatusPill } from "@/components/ui";
import { fetchList } from "@/lib/api";

const ROLE_LABEL: Record<string, string> = {
  master_user: "Master User",
  admin: "Administrator",
  technician: "Technician",
  technical_supervisor: "Technical Supervisor",
  motivation: "Motivation",
  general: "General",
};

const ROLE_OPTS = [
  { value: "master_user", label: "Master User" },
  { value: "admin", label: "Administrator" },
  { value: "technical_supervisor", label: "Technical Supervisor" },
  { value: "technician", label: "Technician" },
  { value: "motivation", label: "Motivation" },
  { value: "general", label: "General" },
];

const columns: Column<any>[] = [
  { key: "name", label: "Name", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
  { key: "email", label: "Email", sortable: true },
  { key: "phone", label: "Phone" },
  {
    key: "designation",
    label: "Role",
    render: (r) =>
      r.is_master_user || r.designation === "master_user" ? (
        <span className="rounded-full bg-[#FCE7F3] px-3 py-1 text-[12.5px] font-bold text-[#9D174D]">Master User</span>
      ) : (
        <StatusPill tone="info">{ROLE_LABEL[r.designation] ?? r.designation}</StatusPill>
      ),
  },
];

const crud: CrudConfig = {
  name: "User",
  fields: [
    { name: "name", label: "Full name", required: true, full: true },
    { name: "email", label: "Email", type: "email", required: true },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "designation", label: "Role", type: "select", options: ROLE_OPTS, required: true },
    { name: "password", label: "Password (blank keeps current)", placeholder: "password123", full: true },
  ],
  // master_user flag is derived from the chosen role
  transform: (v) => ({ ...v, is_master_user: v.designation === "master_user" }),
};

function useCount(params: Record<string, unknown>, key: string) {
  const { data } = useQuery({
    queryKey: ["count", "/staff", key],
    queryFn: () => fetchList("/staff", { page_size: 1, ...params }),
  });
  return data?.total ?? 0;
}

export function UsersPage() {
  const total = useCount({}, "all");
  const masters = useCount({ designation: "master_user" }, "master");
  return (
    <div className="space-y-5">
      <SectionBanner icon={<UserCog size={22} />} title="Users & Roles" subtitle="Staff accounts · Master User, Technician, Supervisor, Motivation, General" />
      <div className="grid grid-cols-2 gap-[18px] sm:grid-cols-3">
        <StatCard label="Total staff" value={total} icon={<UsersIcon size={20} />} />
        <StatCard label="Master users" value={masters} icon={<ShieldCheck size={20} />} />
        <StatCard label="Other roles" value={Math.max(0, total - masters)} icon={<UserCog size={20} />} />
      </div>
      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        <DataTable
          path="/staff"
          columns={columns}
          searchPlaceholder="Search name / email / role…"
          defaultSort="created_at"
          emptyMessage="No staff accounts."
          crud={crud}
        />
      </div>
    </div>
  );
}
