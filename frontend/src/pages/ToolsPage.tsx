import { useState } from "react";
import { Wrench } from "lucide-react";
import { DataTable, type Column } from "@/components/DataTable";
import { CompositeLabel } from "@/components/CompositeLabel";
import { BarcodeGenerator } from "@/components/BarcodeGenerator";
import { Card, SectionBanner } from "@/components/ui";
import { fmtDate } from "@/lib/format";

const TABS: { key: string; label: string; path: string; columns: Column<any>[] }[] = [
  {
    key: "barcode",
    label: "Barcode Generator",
    path: "/barcode-batches",
    columns: [
      { key: "batch_type", label: "Batch Type", render: (r) => <span className="capitalize">{(r.batch_type || "").replace(/_/g, " ")}</span> },
      { key: "prepend_text", label: "Prepend" },
      { key: "range_start", label: "From", align: "right" },
      { key: "range_end", label: "To", align: "right" },
      { key: "copies", label: "Copies", align: "right" },
      { key: "generated_by", label: "By" },
    ],
  },
  {
    key: "labels",
    label: "Composite Labels",
    path: "/label-jobs",
    columns: [
      { key: "component_type", label: "Component" },
      { key: "mode", label: "Mode", render: (r) => <span className="capitalize">{r.mode}</span> },
      { key: "created_at", label: "Created", render: (r) => fmtDate(r.created_at) },
    ],
  },
  {
    key: "reservations",
    label: "ID Reservation",
    path: "/reservations",
    columns: [
      { key: "id_range", label: "ID Range", render: (r) => <span className="font-bold text-accent">{r.id_range}</span> },
      { key: "name", label: "Name" },
      { key: "date", label: "Date", render: (r) => fmtDate(r.date) },
    ],
  },
  {
    key: "downloads",
    label: "Downloads",
    path: "/downloads",
    columns: [
      { key: "description", label: "Description", render: (r) => <span className="font-semibold text-ink">{r.description}</span> },
      { key: "generated_on", label: "Generated On", render: (r) => fmtDate(r.generated_on) },
      { key: "created_by", label: "By" },
    ],
  },
];

export function ToolsPage() {
  const [tab, setTab] = useState(TABS[0].key);
  const active = TABS.find((t) => t.key === tab)!;
  return (
    <div className="space-y-5">
      <SectionBanner icon={<Wrench size={22} />} title="Tools" subtitle="Barcode generator, composite labels, ID reservation & downloads" />
      <div className="rounded-card2 border border-line-card bg-card shadow-card">
        <div className="flex flex-wrap gap-1 border-b border-line-table px-4">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} className={`relative px-4 py-3 text-sm font-bold transition ${tab === t.key ? "text-accent" : "text-muted hover:text-ink-4"}`}>
              {t.label}
              {tab === t.key && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-t bg-accent" />}
            </button>
          ))}
        </div>
        <div className="space-y-5 p-5">
          {active.key === "barcode" && (
            <Card className="p-5">
              <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Barcode Generator</h3>
              <BarcodeGenerator />
            </Card>
          )}
          {active.key === "labels" && (
            <Card className="p-5">
              <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Composite Label Generator</h3>
              <CompositeLabel />
            </Card>
          )}
          <DataTable key={active.key} path={active.path} columns={active.columns} searchPlaceholder="Search…" emptyMessage="No records." />
        </div>
      </div>
    </div>
  );
}
