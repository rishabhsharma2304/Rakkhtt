import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, History, Plus, Tent } from "lucide-react";
import { api, fetchList } from "@/lib/api";
import { Card, EmptyState, ExportButtons, Modal, PrimaryButton, SectionBanner } from "@/components/ui";
import { EntityForm } from "@/components/EntityForm";
import type { Field } from "@/components/DataTable";
import { BarChart, Donut, Legend } from "@/components/charts";
import { fmtDate } from "@/lib/format";
import { downloadCSV } from "@/lib/download";

const CAMP_FIELDS: Field[] = [
  { name: "name", label: "Camp name", required: true, full: true },
  { name: "date", label: "Date", type: "date", required: true },
  { name: "start_time", label: "Start time", placeholder: "e.g. 10:00 AM" },
  { name: "type", label: "Type", type: "select", options: [
    { value: "camp", label: "Camp" },
    { value: "inhouse", label: "In-house" },
  ] },
  { name: "organiser", label: "Organiser" },
  { name: "vehicle_id", label: "Vehicle", type: "select", optionsPath: "/vehicles", optionLabel: "name" },
  { name: "location_text", label: "Location", full: true },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
// June 2026 starts on a Monday (per design). Today = the 25th.
const YEAR = 2026;
const MONTH = 5; // June (0-indexed)
const TODAY = 25;

export function CampPage() {
  const [tab, setTab] = useState<"calendar" | "overview">("calendar");
  const [adding, setAdding] = useState(false);
  const [histOpen, setHistOpen] = useState(false);
  const { data } = useQuery({ queryKey: ["camps-month"], queryFn: () => fetchList("/camps", { page_size: 100, sort: "date", order: "asc" }) });
  const camps = (data?.items ?? []).filter((c: any) => c.type === "camp");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-[14px] bg-card p-1 shadow-card">
          {(["calendar", "overview"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-[10px] px-5 py-2 text-sm font-bold capitalize transition ${
                tab === t ? "bg-accent text-white" : "text-muted hover:text-ink-4"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <PrimaryButton onClick={() => setAdding(true)}><Plus size={16} /> Add Camp</PrimaryButton>
          <button
            onClick={() => setHistOpen(true)}
            aria-label="History"
            title="History"
            className="inline-flex items-center justify-center rounded-btn border border-line-chip bg-card p-2.5 text-ink-4 shadow-card transition hover:bg-hovertint"
          >
            <History size={17} />
          </button>
        </div>
      </div>

      {tab === "calendar" ? <CalendarView camps={camps} /> : <OverviewView camps={camps} />}

      <EntityForm
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Camp"
        path="/camps"
        fields={CAMP_FIELDS}
        initial={{ type: "camp" }}
        invalidate={[["camps-month"], ["camp-graph"], ["camp-activity"]]}
      />

      <CampHistoryModal open={histOpen} onClose={() => setHistOpen(false)} />
    </div>
  );
}

// ---- helpers shared by the modal ----
function printTable(title: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const head = headers.map((h) => `<th>${h}</th>`).join("");
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "—"}</td>`).join("")}</tr>`).join("");
  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(`<!doctype html><title>${title}</title>
    <style>body{font-family:system-ui,sans-serif;padding:24px;color:#1f2937}
    h2{margin:0 0 16px}table{border-collapse:collapse;width:100%;font-size:13px}
    th,td{border:1px solid #e5e7eb;padding:8px 10px;text-align:left}
    th{background:#f3f4f6}</style>
    <h2>${title}</h2><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`);
  w.document.close();
  w.focus();
  w.print();
}

const PageBar = ({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (p: number) => void }) => (
  <div className="flex items-center justify-between gap-3 pt-4 text-sm text-muted">
    <span>
      Showing {total === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} entries
    </span>
    <div className="flex items-center gap-1">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Previous</button>
      <span className="rounded-lg bg-accent px-3 py-1.5 font-bold text-white">{page}</span>
      <button disabled={page * pageSize >= total} onClick={() => onPage(page + 1)} className="rounded-lg border border-line-chip px-3 py-1.5 font-semibold disabled:opacity-40 hover:bg-hovertint">Next</button>
    </div>
  </div>
);

function CampHistoryModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data } = useQuery({
    queryKey: ["camp-activity", search, page],
    queryFn: async () =>
      (await api.get("/camps/activity", { params: { search, page, page_size: pageSize } })).data,
    enabled: open,
    placeholderData: keepPreviousData,
  });
  const rows = data?.items ?? [];
  const total = data?.total ?? 0;
  const fmtTs = (t: string) => fmtDate(t, "dd MMM yyyy hh:mm a");

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={<span className="inline-flex items-center gap-2"><History size={18} /> History</span>}
      width="max-w-3xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
        <ExportButtons
          onExcel={() => downloadCSV("camp-history.csv", rows.map((r: any) => ({ User: r.user, Action: r.action, "Created At": fmtTs(r.created_at) })))}
          onPrint={() => printTable("Camp History", ["User", "Action", "Created At"], rows.map((r: any) => [r.user, r.action, fmtTs(r.created_at)]))}
        />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search…"
          className="w-56 rounded-xl border border-line-chip bg-page px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/30"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-fill text-[12.5px] font-bold uppercase tracking-wide text-muted">
              <th className="px-4 py-3 text-left">User</th>
              <th className="px-4 py-3 text-left">Action</th>
              <th className="px-4 py-3 text-left">Created At</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={3}><EmptyState message="No history yet." /></td></tr>
            ) : (
              rows.map((r: any) => (
                <tr key={r.id} className="border-t border-line-table hover:bg-rowtint">
                  <td className="px-4 py-3 font-semibold text-ink">{r.user ?? "—"}</td>
                  <td className="px-4 py-3 text-accent">{r.action}</td>
                  <td className="px-4 py-3 text-ink-3">{fmtTs(r.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <PageBar page={page} pageSize={pageSize} total={total} onPage={setPage} />
    </Modal>
  );
}

function CalendarView({ camps }: { camps: any[] }) {
  const first = new Date(YEAR, MONTH, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-based
  const daysInMonth = new Date(YEAR, MONTH + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const eventsByDay: Record<number, any[]> = {};
  for (const c of camps) {
    const dt = new Date(c.date);
    if (dt.getFullYear() === YEAR && dt.getMonth() === MONTH) {
      (eventsByDay[dt.getDate()] ||= []).push(c);
    }
  }

  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-[22px] font-extrabold text-ink">June 2026</h2>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-line-chip p-2 text-muted hover:bg-hovertint"><ChevronLeft size={16} /></button>
          <button className="rounded-lg border border-line-chip p-2 text-muted hover:bg-hovertint"><ChevronRight size={16} /></button>
          <button className="rounded-lg px-3 py-2 text-sm font-bold text-accent hover:bg-hovertint">Today</button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 overflow-hidden rounded-[14px]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="bg-fill py-2 text-center text-[12px] font-bold uppercase tracking-wide text-muted">{w}</div>
        ))}
        {cells.map((d, i) => {
          const isToday = d === TODAY;
          const events = d ? eventsByDay[d] ?? [] : [];
          return (
            <div
              key={i}
              className={`min-h-[104px] border border-line-table p-1.5 ${
                d === null ? "bg-[#FAF6F8] opacity-55" : isToday ? "bg-hovertint" : "bg-card"
              }`}
            >
              {d && (
                <div className={`mb-1 flex h-6 w-6 items-center justify-center text-[13px] font-bold ${isToday ? "rounded-full bg-accent/15 text-accent-deep" : "text-ink-4"}`}>
                  {d}
                </div>
              )}
              <div className="space-y-1">
                {events.map((e) => (
                  <div key={e.id} className="truncate rounded border-l-[3px] border-accent bg-eventchip px-1.5 py-1 text-[11px] font-semibold text-ink-3">
                    <span className="font-bold text-accent-deep">{e.start_time?.replace(":00 ", "").replace(" AM", "a").replace(" PM", "p") ?? ""}</span>{" "}
                    {e.name}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function OverviewView({ camps }: { camps: any[] }) {
  const { data: graph } = useQuery({ queryKey: ["camp-graph"], queryFn: async () => (await api.get("/reports/graphs/camp")).data });
  const bars = (graph?.series ?? []).map((s: any) => ({ label: s.label.split(" ").slice(0, 2).join(" "), value: s.value }));
  const totalCollection = bars.reduce((s: number, b: any) => s + b.value, 0);
  const donut = [
    { label: "O+ / O-", value: 46, color: "#DC2626" },
    { label: "B+ / B-", value: 35, color: "#FB7185" },
    { label: "A+ / A-", value: 28, color: "#9F1239" },
    { label: "AB+ / AB-", value: 16, color: "#F59E0B" },
  ];

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<Tent size={22} />}
        title="Camp's Overview"
        subtitle="Excluding in-house donations · 01 Jun – 25 Jun 2026"
        right={
          <div className="flex gap-6">
            <div className="text-right"><div className="font-display text-3xl font-extrabold">{camps.length}</div><div className="text-xs text-white/80">Total Camps</div></div>
            <div className="text-right"><div className="font-display text-3xl font-extrabold">{totalCollection}</div><div className="text-xs text-white/80">Total Collection</div></div>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.6fr_1fr]">
        <Card className="p-6">
          <h3 className="mb-5 font-display text-[17px] font-bold text-ink">Collection per Camp</h3>
          <BarChart data={bars} height={220} gradientClass="bg-bar-camp" maxBarWidth={52} />
        </Card>
        <Card className="p-6">
          <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Collection by Group</h3>
          <div className="flex items-center gap-5">
            <Donut data={donut} size={140} hole={24} centerValue={totalCollection} centerLabel="UNITS" />
            <Legend data={donut} />
          </div>
        </Card>
      </div>
    </div>
  );
}
