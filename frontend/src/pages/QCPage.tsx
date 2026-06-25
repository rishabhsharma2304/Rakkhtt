import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { DataTable, type Column, type Field } from "@/components/DataTable";
import { Card, SectionBanner, StatusBadge } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const TABS = [
  { key: "blood_component", label: "Blood Components" },
  { key: "reagent", label: "Reagents" },
  { key: "abo_pooled_suspension", label: "ABO Pooled Suspension" },
  { key: "other", label: "Other" },
];

const QC_TYPE_OPTIONS = TABS.map((t) => ({ value: t.key, label: t.label }));
const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "pass", label: "Pass" },
  { value: "fail", label: "Fail" },
];

const columns: Column<any>[] = [
  { key: "name", label: "QC Item", sortable: true, render: (r) => <span className="font-bold text-ink">{r.name}</span> },
  { key: "qc_type", label: "Type", render: (r) => <span className="capitalize">{(r.qc_type || "").replace(/_/g, " ")}</span> },
  { key: "done_by", label: "Done By" },
  { key: "date", label: "Date", sortable: true, render: (r) => fmtDate(r.date) },
  { key: "status", label: "Status", align: "center", render: (r) => <StatusBadge value={r.status} /> },
];

function fieldsFor(qcType: string): Field[] {
  return [
    { name: "name", label: "QC Item Name", required: true, full: true },
    { name: "qc_type", label: "Type", type: "select", options: QC_TYPE_OPTIONS, required: true, default: qcType },
    { name: "done_by", label: "Done By" },
    { name: "date", label: "Date", type: "date", required: true },
    { name: "status", label: "Status", type: "select", options: STATUS_OPTIONS },
  ];
}

export function QCPage() {
  const [tab, setTab] = useState("blood_component");

  return (
    <div className="space-y-5">
      <SectionBanner icon={<ShieldCheck size={22} />} title="Quality Control" subtitle="Blood components, reagents, ABO pooled suspension & other" />

      <Card className="overflow-hidden">
        <div className="flex flex-wrap border-b border-line-table px-4">
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
            key={tab}
            path="/qc"
            columns={columns}
            searchPlaceholder="Search QC item / done by…"
            defaultSort="date"
            filters={{ qc_type: tab }}
            emptyMessage="No QC records for this category."
            crud={{ name: "QC Record", fields: fieldsFor(tab) }}
          />
        </div>
      </Card>
    </div>
  );
}
