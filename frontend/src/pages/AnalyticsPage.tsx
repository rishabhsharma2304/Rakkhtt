import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, LineChart as LineIcon } from "lucide-react";
import { api } from "@/lib/api";
import { Card, SectionBanner, StatusPill } from "@/components/ui";
import { BarChart, Donut, Legend, LineChart, Sparkline } from "@/components/charts";
import { DonorMap } from "@/components/DonorMap";

const TONE_STROKE: Record<string, string> = { warn: "#D97706", info: "#2563EB", neutral: "#B8A9AF", good: "#DC2626" };
const TONE_PILL: Record<string, { tone: any; label: string }> = {
  good: { tone: "good", label: "On target" },
  warn: { tone: "warn", label: "Monitor" },
  info: { tone: "info", label: "Improving" },
  neutral: { tone: "neutral", label: "No data" },
};

const REPORTS = [
  { key: "accounting", label: "Accounting" },
  { key: "camp", label: "Camp" },
  { key: "component", label: "Blood Bags" },
  { key: "donor", label: "Donor" },
  { key: "donor-deferred", label: "Deferred Donor" },
  { key: "reception", label: "Reception" },
  { key: "tti", label: "TTI" },
];

export function AnalyticsPage() {
  const [sp, setSp] = useSearchParams();
  const tab = sp.get("tab") === "graphs" ? "graphs" : "pi";
  const setTab = (t: string) => setSp({ tab: t });

  return (
    <div className="space-y-5">
      <SectionBanner
        icon={<LineIcon size={22} />}
        title="Analytics"
        subtitle="Performance indicators & visual reports"
        right={
          <span className="inline-flex items-center gap-2 rounded-btn bg-white/15 px-3 py-2 text-sm font-semibold text-white">
            <CalendarDays size={15} /> 01/06/26 – 25/06/26
          </span>
        }
      />
      <div className="flex gap-2">
        {[
          { k: "pi", l: "Performance Indicators" },
          { k: "graphs", l: "Graphs" },
        ].map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-full px-4 py-2 text-sm font-bold transition ${
              tab === t.k ? "bg-card text-accent-deep shadow-card" : "bg-card/50 text-muted hover:text-ink-4"
            }`}
          >
            {t.l}
          </button>
        ))}
      </div>

      {tab === "pi" ? <PerformanceIndicators /> : <Graphs reports={REPORTS} />}
    </div>
  );
}

function PerformanceIndicators() {
  const { data } = useQuery({ queryKey: ["pi"], queryFn: async () => (await api.get("/reports/performance-indicators")).data });
  const indicators = data?.indicators ?? [];
  return (
    <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
      {indicators.map((ind: any) => {
        const pill = TONE_PILL[ind.tone] ?? TONE_PILL.neutral;
        return (
          <Card key={ind.label} className="p-[22px] pb-4">
            <div className="flex items-start justify-between gap-3">
              <p className="min-h-[38px] text-[13.5px] font-semibold text-muted">{ind.label}</p>
              <StatusPill tone={pill.tone}>{pill.label}</StatusPill>
            </div>
            <div className="mt-2 flex items-end gap-1.5">
              <span className="font-display text-[40px] font-extrabold leading-none tracking-[-1.5px] text-ink">{ind.value}</span>
              <span className="pb-1 text-base font-bold text-muted">{ind.unit}</span>
            </div>
            <div className="mt-3">
              <Sparkline series={ind.series} stroke={TONE_STROKE[ind.tone] ?? "#DC2626"} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function Graphs({ reports }: { reports: { key: string; label: string }[] }) {
  const [report, setReport] = useState("camp");
  const { data } = useQuery({ queryKey: ["graphs", report], queryFn: async () => (await api.get(`/reports/graphs/${report}`)).data });
  const series = (data?.series ?? []).map((s: any) => ({ label: s.label, value: s.value }));

  const groupDonut = [
    { label: "O+ / O-", value: 44, color: "#DC2626" },
    { label: "B+ / B-", value: 34, color: "#FB7185" },
    { label: "A+ / A-", value: 30, color: "#9F1239" },
    { label: "AB+ / AB-", value: 17, color: "#F59E0B" },
  ];

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[230px_1fr]">
      <Card className="p-4">
        <p className="mb-2 px-2 text-[12px] font-bold uppercase tracking-wider text-muted">Report</p>
        {reports.map((r) => {
          const sel = r.key === report;
          return (
            <button
              key={r.key}
              onClick={() => setReport(r.key)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                sel ? "bg-hovertint text-accent-deep" : "text-ink-4 hover:bg-hovertint"
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${sel ? "bg-accent" : "border-2 border-line-chip"}`} />
              {r.label}
            </button>
          );
        })}
      </Card>

      <div className="space-y-[18px]">
        {report === "donor" && (
          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Donor Locations</h3>
            <DonorMap />
          </Card>
        )}
        <Card className="p-6">
          <h3 className="font-display text-[17px] font-bold text-ink">{data?.title ?? "—"}</h3>
          <p className="mb-5 text-sm text-muted">{data?.subtitle}</p>
          <BarChart data={series} height={230} gradientClass="bg-bar-graph" maxBarWidth={52} />
        </Card>
        <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2">
          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Distribution by Group</h3>
            <div className="flex items-center gap-5">
              <Donut data={groupDonut} size={130} hole={22} />
              <Legend data={groupDonut} />
            </div>
          </Card>
          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">6-Month Trend</h3>
            <LineChart series={[60, 95, 80, 120, 88, 125]} labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]} />
          </Card>
        </div>
      </div>
    </div>
  );
}
