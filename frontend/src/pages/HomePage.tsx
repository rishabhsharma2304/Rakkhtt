import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Droplet, Clock, HeartPulse, FileText, Plus, FileSpreadsheet } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { BLOOD_GROUPS, componentColor } from "@/lib/format";
import { Card, ErrorState, LoadingState, PageHeader, PrimaryButton, StatusPill } from "@/components/ui";
import { BarChart, Donut, Legend, ProgressRing } from "@/components/charts";
import { downloadCSV } from "@/lib/download";

const fetchSummary = async () => (await api.get("/dashboard/summary")).data;
const fetchMatrix = async (type: string) => (await api.get("/reports/stock-matrix", { params: { type } })).data;

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export function HomePage() {
  const { me } = useAuth();
  const nav = useNavigate();
  const [stockType, setStockType] = useState("tested");
  const { data, isLoading, isError, error } = useQuery({ queryKey: ["dashboard"], queryFn: fetchSummary });
  const { data: matrix } = useQuery({ queryKey: ["stock-matrix", stockType], queryFn: () => fetchMatrix(stockType) });

  const k = data?.kpis ?? {};
  const byGroup: Record<string, number> = data?.available_by_group ?? {};
  const split: Record<string, number> = data?.component_split ?? {};
  const firstName = me?.name?.split(" ")[0] ?? "there";

  const splitData = Object.entries(split)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: componentColor(label) }));
  const splitTotal = splitData.reduce((s, d) => s + d.value, 0);

  const work = data?.work_completed_today ?? {};
  const workItems = [
    { label: "Bag Entry", value: work.donations ?? 0, color: "#DC2626" },
    { label: "Component Preparation", value: Math.round((work.donations ?? 0) * 0.6), color: "#FB7185" },
    { label: "TTI Validation", value: Math.round((work.donations ?? 0) * 0.4), color: "#9F1239" },
    { label: "Issued to Patients", value: work.issued_to_patients ?? 0, color: "#F59E0B" },
  ];
  const workDone = workItems.reduce((s, w) => s + w.value, 0);
  const workTotal = Math.max(workDone + 9, 1);
  const workPct = Math.round((workDone / workTotal) * 100);

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${firstName}`}
        subtitle="Here's what's happening at your blood centre today."
        actions={
          <PrimaryButton onClick={() => nav("/reception")}>
            <Plus size={16} /> New Request
          </PrimaryButton>
        }
      />

      {isLoading && <LoadingState message="Loading dashboard…" />}
      {isError && <ErrorState error={error} fallback="Could not load the dashboard summary." />}
      {!isLoading && !isError && (
      <>
      {/* KPI row */}
      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Units in Stock" value={k.total_units} icon={<Droplet size={20} />} pill={`+${k.added_this_week ?? 0} this week`} tone="good" />
        <Kpi label="Expiring in ≤7 days" value={k.expiring_7d} icon={<Clock size={20} />} pill="Rotate soon" tone="warn" />
        <Kpi label="Donations Today" value={k.donations_today} icon={<HeartPulse size={20} />} pill="vs yesterday" tone="good" />
        <Kpi label="Open Requests" value={k.open_requests} icon={<FileText size={20} />} pill={`${k.pending_serology ?? 0} pending serology`} tone="info" />
      </div>

      {/* two-column row */}
      <div className="mt-[18px] grid grid-cols-1 items-start gap-[18px] lg:grid-cols-[1.7fr_1fr]">
        {/* stock table */}
        <Card className="p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-[17px] font-bold text-ink">Blood Stock by Component</h3>
            <div className="flex items-center gap-2">
              <select
                value={stockType}
                onChange={(e) => setStockType(e.target.value)}
                className="rounded-lg border border-line-chip bg-card px-2.5 py-1.5 text-sm font-semibold text-ink-4"
              >
                <option value="tested">Tested Stock</option>
                <option value="untested">Untested Stock</option>
                <option value="reserved">Reserved</option>
              </select>
              <button
                onClick={() => downloadCSV(
                  `stock-${stockType}.csv`,
                  (matrix?.rows ?? []).map((r: any) => ({ Component: r.component, ...r.groups, Total: r.total })),
                )}
                className="inline-flex items-center gap-1.5 rounded-lg bg-excel px-3 py-1.5 text-xs font-bold text-white"
              ><FileSpreadsheet size={14} /> Excel</button>
              <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-white"><FileText size={14} /> PDF</button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-[12.5px] font-bold uppercase tracking-wide text-muted">
                  <th className="px-2 py-2 text-left">Component</th>
                  {BLOOD_GROUPS.map((g) => (
                    <th key={g} className="px-2 py-2 text-right">{g}</th>
                  ))}
                  <th className="px-2 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {(matrix?.rows ?? []).map((row: any) => (
                  <tr key={row.component} className="border-t border-line-table">
                    <td className="px-2 py-2.5">
                      <span className="inline-block rounded-lg px-2.5 py-1 text-[12.5px] font-bold text-white" style={{ background: componentColor(row.component) }}>
                        {row.component}
                      </span>
                    </td>
                    {BLOOD_GROUPS.map((g) => (
                      <td key={g} className={`px-2 py-2.5 text-right tabular-nums ${row.groups[g] ? "text-ink-2" : "text-muted-disabled"}`}>
                        {row.groups[g]}
                      </td>
                    ))}
                    <td className="px-2 py-2.5 text-right font-bold text-accent-deep">{row.total}</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-line-chip bg-fill font-bold">
                  <td className="px-2 py-2.5 text-ink">Total</td>
                  {BLOOD_GROUPS.map((g) => (
                    <td key={g} className="px-2 py-2.5 text-right tabular-nums text-ink">{matrix?.totals?.[g] ?? 0}</td>
                  ))}
                  <td className="px-2 py-2.5 text-right text-accent-deep">{matrix?.grand_total ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* right column */}
        <div className="grid gap-[18px]">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Work Completed Today</h3>
            <div className="flex items-center gap-5">
              <ProgressRing pct={workPct} />
              <div>
                <p className="text-sm text-muted">
                  {workDone} of {workTotal} tasks done
                </p>
              </div>
            </div>
            <div className="mt-4 space-y-2.5">
              {workItems.map((w) => (
                <div key={w.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-4">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: w.color }} />
                    {w.label}
                  </span>
                  <span className="font-bold text-ink">{w.value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Component Split</h3>
            <div className="flex items-center gap-6">
              <Donut data={splitData} size={140} hole={24} centerValue={splitTotal} centerLabel="UNITS" />
              <div className="flex-1">
                <Legend data={splitData} />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* bar chart */}
      <Card className="mt-[18px] p-6">
        <h3 className="mb-5 font-display text-[17px] font-bold text-ink">Available Units by Blood Group</h3>
        <BarChart data={BLOOD_GROUPS.map((g) => ({ label: g, value: byGroup[g] ?? 0 }))} height={180} gradientClass="bg-bar-home" />
      </Card>
      </>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, pill, tone }: { label: string; value?: number; icon: React.ReactNode; pill: string; tone: "good" | "warn" | "info" }) {
  return (
    <Card className="p-[22px]">
      <div className="flex items-start justify-between">
        <span className="text-[13px] text-muted">{label}</span>
        <span className="flex h-[38px] w-[38px] items-center justify-center rounded-xl text-accent" style={{ background: "color-mix(in srgb, #DC2626 12%, transparent)" }}>
          {icon}
        </span>
      </div>
      <div className="mt-3 font-display text-[38px] font-extrabold leading-none tracking-[-1px] text-ink">{value ?? 0}</div>
      <div className="mt-3">
        <StatusPill tone={tone}>{pill}</StatusPill>
      </div>
    </Card>
  );
}
