import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, FileBarChart, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/download";
import { Card, SectionBanner } from "@/components/ui";

const MIS_REPORTS = [
  "total-bags-collected",
  "total-component-prepared",
  "tti-reactive-cases",
  "component-issued-blood",
  "component-issued-bulk",
  "component-discard",
  "shift-to-tested",
  "near-expiry-stock",
];

function MisCard({ reportKey }: { reportKey: string }) {
  const { data } = useQuery({ queryKey: ["mis", reportKey], queryFn: async () => (await api.get(`/reports/mis/${reportKey}`)).data });
  return (
    <Card className="group relative p-5">
      <p className="text-[13px] capitalize text-muted">{reportKey.replace(/-/g, " ")}</p>
      <p className="mt-2 font-display text-[32px] font-extrabold text-ink">{data?.value ?? "—"}</p>
      <button
        title="Download CSV"
        disabled={!data}
        onClick={() => downloadCSV(`mis-${reportKey}.csv`, [{ report: reportKey, value: data.value, from: data.from ?? "", to: data.to ?? "" }])}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted opacity-0 transition hover:bg-hovertint hover:text-accent group-hover:opacity-100 disabled:cursor-not-allowed"
      >
        <Download size={15} />
      </button>
    </Card>
  );
}

export function MisReportsPage() {
  return (
    <div className="space-y-5">
      <SectionBanner icon={<FileBarChart size={22} />} title="MIS Reports" subtitle="NABH / NBTC compliance outputs · computed aggregates" />
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {MIS_REPORTS.map((r) => (
          <MisCard key={r} reportKey={r} />
        ))}
      </div>
    </div>
  );
}

const REGISTERS = ["donor", "camp", "component", "reception"];

export function RegistersPage() {
  const [type, setType] = useState("donor");
  const { data } = useQuery({ queryKey: ["register", type], queryFn: async () => (await api.get(`/reports/registers/${type}`)).data });
  const items = data?.items ?? [];
  const cols = items[0] ? Object.keys(items[0]).filter((k) => !["id", "org_id", "is_deleted", "created_at", "updated_at"].includes(k)).slice(0, 7) : [];

  return (
    <div className="space-y-5">
      <SectionBanner icon={<ScrollText size={22} />} title="Registers" subtitle="Audit, camp, component, grouping, TTI, donor, reception registers" />
      <div className="flex gap-2">
        {REGISTERS.map((r) => (
          <button
            key={r}
            onClick={() => setType(r)}
            className={`rounded-full px-4 py-2 text-sm font-bold capitalize transition ${type === r ? "bg-accent text-white" : "bg-card text-muted shadow-card hover:text-ink-4"}`}
          >
            {r}
          </button>
        ))}
      </div>
      <Card className="overflow-x-auto p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted">{items.length} records</p>
          <button
            disabled={!items.length}
            onClick={() => downloadCSV(`register-${type}.csv`, items.map((r: any) => Object.fromEntries(cols.map((c) => [c, r[c]]))), cols)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-excel px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
          >
            <Download size={14} /> Download CSV
          </button>
        </div>
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill text-[12px] font-bold uppercase text-muted">
              {cols.map((c) => (
                <th key={c} className="px-3 py-2 text-left">{c.replace(/_/g, " ")}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.slice(0, 50).map((row: any, i: number) => (
              <tr key={i} className="border-t border-line-table">
                {cols.map((c) => (
                  <td key={c} className="px-3 py-2 text-ink-3">{String(row[c] ?? "—").slice(0, 40)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
