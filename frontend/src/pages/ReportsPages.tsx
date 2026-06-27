import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Download, FilePlus2, ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { downloadCSV } from "@/lib/download";
import { Card, SectionBanner, Modal, PrimaryButton, GhostButton } from "@/components/ui";

// Each MIS card. `detailed` cards open a dedicated printable page; the rest open the
// generic single-metric summary sheet at /reports/mis/view/:key.
interface MisReportDef {
  title: string;
  key: string;
  detailed?: boolean;
}

const MIS_REPORT_CARDS: MisReportDef[] = [
  { title: "Total Bags Collected", key: "total-bags-collected" },
  { title: "Issue Report", key: "daily-issue-report", detailed: true },
  { title: "Total Component Prepared", key: "total-component-prepared" },
  { title: "TTI Reactive Cases", key: "tti-reactive-cases" },
  { title: "Total Component Issued (Blood Requests)", key: "daily-issue-report", detailed: true },
  { title: "Total Component Issued (Bulk Request)", key: "component-issued-bulk" },
  { title: "Total Component Discard", key: "component-discard" },
  { title: "Sample Receiving Register", key: "sample-receiving-register" },
  { title: "SBTC Report", key: "sbtc-report" },
  { title: "Turnaround Time (TAT)", key: "tat" },
  { title: "Shift to Tested Stock", key: "shift-to-tested" },
  { title: "Near Expiry Stock", key: "near-expiry-stock" },
  { title: "Hospital Wise Consumption Report", key: "hospital-consumption" },
  { title: "Blood Group Report", key: "blood-group" },
  { title: "Accounting Voucher", key: "accounting-voucher" },
  { title: "Daily Summary Report", key: "daily-summary" },
  { title: "TAT (Reservation to Issue)", key: "tat-reservation-issue" },
  { title: "Periodic Cash Report", key: "periodic-cash" },
  { title: "Payment Summary", key: "payment-summary" },
  { title: "eRaktKosh Data", key: "eraktkosh" },
];

function GenerateReportCard({ title, onGenerate }: { title: string; onGenerate: () => void }) {
  return (
    <Card className="flex h-full flex-col items-center justify-between gap-5 p-6 text-center">
      <p className="font-display text-base font-bold text-ink">{title}</p>
      <button
        onClick={onGenerate}
        className="w-full rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-90"
      >
        Generate Report
      </button>
    </Card>
  );
}

function DateRangeModal({
  open,
  onClose,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (from: string, to: string) => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Select Date / Time"
      footer={
        <>
          <GhostButton onClick={onClose} className="!py-2 !px-4">Cancel</GhostButton>
          <PrimaryButton onClick={() => onSubmit(from, to)} className="!py-2 !px-4">Generate Report</PrimaryButton>
        </>
      }
    >
      <div className="flex flex-wrap items-end gap-4">
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block font-semibold text-muted">From</span>
          <input
            type="date"
            value={from}
            max={to}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full rounded-lg border border-line-card bg-fill px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
        <label className="flex-1 text-sm">
          <span className="mb-1.5 block font-semibold text-muted">To</span>
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => setTo(e.target.value)}
            className="w-full rounded-lg border border-line-card bg-fill px-3 py-2 text-ink outline-none focus:border-accent"
          />
        </label>
      </div>
    </Modal>
  );
}

export function MisReportsPage() {
  const navigate = useNavigate();
  const [picker, setPicker] = useState<MisReportDef | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const reportPath = (r: MisReportDef, from: string, to: string) => {
    const q = `from=${from}&to=${to}`;
    return r.detailed
      ? `/reports/mis/daily-issue-report?${q}`
      : `/reports/mis/view/${r.key}?${q}&title=${encodeURIComponent(r.title)}`;
  };

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<ScrollText size={22} />}
        title="MIS Report"
        subtitle="NABH / NBTC compliance outputs · generate a printable report for any metric"
        right={
          <PrimaryButton onClick={() => setCustomOpen(true)} className="!py-2 !px-4 !bg-white !text-accent">
            <FilePlus2 size={16} /> Create Custom Report
          </PrimaryButton>
        }
      />

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        {MIS_REPORT_CARDS.map((r) => (
          <GenerateReportCard key={r.title} title={r.title} onGenerate={() => setPicker(r)} />
        ))}
      </div>

      <DateRangeModal
        open={!!picker}
        onClose={() => setPicker(null)}
        onSubmit={(from, to) => {
          const r = picker!;
          setPicker(null);
          navigate(reportPath(r, from, to));
        }}
      />

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Create Custom Report"
        footer={<PrimaryButton onClick={() => setCustomOpen(false)} className="!py-2 !px-4">Got it</PrimaryButton>}
      >
        <p className="text-sm text-muted">
          The custom report builder lets you pick columns and filters to compose your own MIS
          output. This feature isn’t wired up yet — use the standard reports above for now.
        </p>
      </Modal>
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
