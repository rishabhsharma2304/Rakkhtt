import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { api } from "@/lib/api";
import { DataTable, type Column } from "@/components/DataTable";
import { Card, SectionBanner, StatusPill } from "@/components/ui";
import { fmtDate, fmtINR } from "@/lib/format";

const columns: Column<any>[] = [
  { key: "invoice_no", label: "Invoice #", sortable: true, render: (r) => <span className="font-bold text-accent">{r.invoice_no}</span> },
  { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
  { key: "name", label: "Name" },
  {
    key: "direction",
    label: "Direction",
    render: (r) => <StatusPill tone={r.direction === "received" ? "good" : "info"}>{r.direction}</StatusPill>,
  },
  { key: "amount_inr", label: "Amount", align: "right", sortable: true, render: (r) => <span className="font-bold text-ink">{fmtINR(r.amount_inr)}</span> },
  { key: "created_by", label: "Created By" },
];

export function AccountingPage() {
  const navigate = useNavigate();
  const { data } = useQuery({ queryKey: ["accounting"], queryFn: async () => (await api.get("/accounting/summary")).data });

  return (
    <div className="space-y-5">
      <SectionBanner icon={<Wallet size={22} />} title="Accounting" subtitle="Invoices, revenue · received vs sent · monthly request count" />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Profit" value={fmtINR(data?.total_profit)} />
        <Stat label="Received" value={fmtINR(data?.total_received)} />
        <Stat label="Sent" value={fmtINR(data?.total_sent)} />
        <Stat label="Requests (period)" value={data?.request_count ?? 0} />
      </div>
      <div className="rounded-card2 border border-line-card bg-card p-5 shadow-card">
        <DataTable
          path="/invoices"
          columns={columns}
          searchPlaceholder="Search invoice / name…"
          defaultSort="date"
          emptyMessage="No invoices."
          onRowClick={(r) => navigate(`/invoices/${r.id}`)}
          filterFields={[{ name: "direction", label: "Direction", options: [
            { value: "received", label: "Received" }, { value: "sent", label: "Sent" },
          ] }]}
        />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Card className="p-5">
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-2 font-display text-[28px] font-extrabold text-ink">{value}</p>
    </Card>
  );
}
