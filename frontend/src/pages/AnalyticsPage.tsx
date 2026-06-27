import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronDown, LineChart as LineIcon, Search, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Card, ErrorState, LoadingState, SectionBanner } from "@/components/ui";
import { AxisBarChart, BarChart, Donut, GroupedBarChart, Legend, LineChart, MultiLineChart } from "@/components/charts";
import { DonorMap } from "@/components/DonorMap";

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
  const [date, setDate] = useState("");
  const [query, setQuery] = useState("");
  const { data } = useQuery({
    queryKey: ["pi", query],
    queryFn: async () => (await api.get("/reports/performance-indicators", { params: query ? { from: query, to: query } : undefined })).data,
  });
  const indicators = data?.indicators ?? [];
  return (
    <div className="space-y-[18px]">
      <div className="relative overflow-hidden rounded-card2 bg-banner-grad p-6 text-white shadow-banner">
        <div className="banner-dots" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <LineIcon size={22} />
            </div>
            <h2 className="font-display text-[27px] font-extrabold leading-none tracking-tight">Performance Indicator</h2>
          </div>
          <div className="flex items-center overflow-hidden rounded-btn bg-white shadow-sm">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="Search By Date…"
              className="w-52 bg-transparent px-4 py-2.5 text-sm font-medium text-ink outline-none"
            />
            <button
              onClick={() => setQuery(date)}
              className="flex h-11 w-12 items-center justify-center bg-accent text-white transition hover:opacity-90"
              aria-label="Search by date"
            >
              <Search size={17} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[18px] md:grid-cols-2 lg:grid-cols-3">
        {indicators.map((ind: any) => (
          <Card key={ind.label} className="flex flex-col items-center justify-center px-6 py-9 text-center">
            <div className="flex items-end gap-1.5">
              <span className="font-display text-[42px] font-extrabold leading-none tracking-[-1.5px] text-ink">{ind.value}</span>
              <span className="pb-1 text-[22px] font-extrabold leading-none text-ink">{ind.unit}</span>
            </div>
            <p className="mt-3.5 text-[15px] font-semibold text-muted">{ind.label}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Each report's bars are clickable segments that drill into the matching module page.
const REPORT_ROUTES: Record<string, string> = {
  camp: "/camp",
  donor: "/donors",
  "donor-deferred": "/donors",
  component: "/bags",
  reception: "/reception",
  tti: "/qc",
};

function Graphs({ reports }: { reports: { key: string; label: string }[] }) {
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const report = reports.some((r) => r.key === sp.get("report")) ? sp.get("report")! : "camp";
  const setReport = (key: string) => setSp({ tab: "graphs", report: key });
  const { data } = useQuery({ queryKey: ["graphs", report], queryFn: async () => (await api.get(`/reports/graphs/${report}`)).data });
  const series = (data?.series ?? []).map((s: any) => ({ label: s.label, value: s.value }));
  const drillTo = REPORT_ROUTES[report];
  const onBarClick = drillTo ? () => navigate(drillTo) : undefined;

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
              onClick={() => (r.key === "accounting" ? navigate("/accounting") : setReport(r.key))}
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

      {report === "component" ? (
        <BloodBagOverview />
      ) : report === "donor" ? (
        <DonorOverview />
      ) : report === "reception" ? (
        <ReceptionOverview />
      ) : report === "tti" ? (
        <TTIOverview />
      ) : (
        <div className="space-y-[18px]">
          <Card className="p-6">
            <h3 className="font-display text-[17px] font-bold text-ink">{data?.title ?? "—"}</h3>
            <p className="mb-5 text-sm text-muted">
              {data?.subtitle}
              {onBarClick && <span className="ml-1.5 text-[12px] font-semibold text-accent-deep">· click a bar to open its page</span>}
            </p>
            <BarChart data={series} height={230} gradientClass="bg-bar-graph" maxBarWidth={52} onBarClick={onBarClick} />
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
      )}
    </div>
  );
}

// ---- Blood Bag overview dashboard (Graphs › Blood Bags) ----

const COMP_COLORS: Record<string, string> = {
  PRBC: "#DC2626", FFP: "#FB7185", WB: "#9F1239", PLC: "#F59E0B",
  RDP: "#E11D48", SDP: "#BE123C", CRYO: "#F472B6",
};
const PALETTE = ["#DC2626", "#FB7185", "#9F1239", "#F59E0B", "#E11D48", "#BE123C", "#F472B6", "#FDA4AF"];

type Series = { series: { label: string; value: number }[]; total: number };

function withColors(s: Series | undefined, byType = false) {
  const items = s?.series ?? [];
  return items.map((d, i) => ({
    ...d,
    color: (byType && COMP_COLORS[d.label]) || PALETTE[i % PALETTE.length],
  }));
}

function MiniTable({ data, head }: { data: { label: string; value: number; color?: string }[]; head: [string, string] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <table className="mt-4 w-full text-sm">
      <thead>
        <tr className="bg-fill text-[12px] font-bold uppercase tracking-wide text-muted">
          <th className="rounded-l-lg px-3 py-2 text-left">{head[0]}</th>
          <th className="rounded-r-lg px-3 py-2 text-right">{head[1]}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((d) => (
          <tr key={d.label} className="border-b border-line-table">
            <td className="px-3 py-2 text-ink">
              <span className="inline-flex items-center gap-2">
                {d.color && <span className="h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />}
                {d.label}
              </span>
            </td>
            <td className="px-3 py-2 text-right font-semibold text-ink">{d.value}</td>
          </tr>
        ))}
        <tr className="font-bold text-ink">
          <td className="px-3 py-2">Total</td>
          <td className="px-3 py-2 text-right">{total}</td>
        </tr>
      </tbody>
    </table>
  );
}

function DonutCard({ title, data, head }: { title: string; data: { label: string; value: number; color?: string }[]; head: [string, string] }) {
  const top = [...data].sort((a, b) => b.value - a.value)[0];
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-display text-[17px] font-bold text-ink">{title}</h3>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No data available.</p>
      ) : (
        <>
          <div className="flex justify-center">
            <Donut data={data} size={170} hole={30} centerValue={top?.value ?? 0} centerLabel={top?.label} />
          </div>
          <MiniTable data={data} head={head} />
        </>
      )}
    </Card>
  );
}

function StatMini({ label, value }: { label: string; value: number }) {
  return (
    <Card className="flex flex-col items-center justify-center p-6 text-center">
      <div className="font-display text-[40px] font-extrabold leading-none text-ink">{value}</div>
      <div className="mt-2 text-[13px] font-semibold text-muted">{label}</div>
    </Card>
  );
}

function BloodBagOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["blood-bag-overview"],
    queryFn: async () => (await api.get("/reports/blood-bag-overview")).data,
  });

  if (isLoading) return <LoadingState message="Loading blood bag overview…" />;
  if (error) return <ErrorState error={error} />;

  const bags = withColors(data?.bags_used);
  const prepared = withColors(data?.component_prepared, true);
  const discarded = withColors(data?.discarded_components, true);
  const reasons = withColors(data?.discarded_reasons);
  const expiring = withColors(data?.expiring_components, true);

  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-3">
      <Card className="p-6 lg:col-span-2">
        <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Blood Bags Used</h3>
        <AxisBarChart data={bags} height={260} axisLabel="Blood bags" gradientClass="bg-bar-graph" />
        <MiniTable data={bags} head={["Bag Type", "Total"]} />
      </Card>

      <div className="space-y-[18px]">
        <div className="grid grid-cols-2 gap-[18px]">
          <StatMini label="Less Quantity Bags" value={data?.less_quantity_bags ?? 0} />
          <StatMini label="Clerical Corrections" value={data?.clerical_corrections ?? 0} />
        </div>
        <DonutCard title="Component Prepared" data={prepared} head={["Component", "Total"]} />
      </div>

      <DonutCard title="Discarded Components" data={discarded} head={["Component", "Total Components"]} />
      <DonutCard title="Discarded Reasons" data={reasons} head={["Discard Reason", "Total Components"]} />
      <DonutCard title="Expiring Components" data={expiring} head={["Component", "Total"]} />
    </div>
  );
}

// ---- Donor overview dashboard (Graphs › Donor) ----

const DONOR_PALETTE = ["#2F86C9", "#3B82F6", "#60A5FA", "#1D4ED8", "#1E40AF", "#0EA5E9", "#38BDF8", "#93C5FD"];

function donorColors(s: Series | undefined) {
  return (s?.series ?? []).map((d, i) => ({ ...d, color: DONOR_PALETTE[i % DONOR_PALETTE.length] }));
}

function ViewBtn() {
  return (
    <button className="rounded-full bg-accent px-3.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:opacity-90">
      View
    </button>
  );
}

function DonorDonutCard({
  title,
  data,
  head,
}: {
  title: string;
  data: { label: string; value: number; color?: string }[];
  head: [string, string];
}) {
  const top = [...data].sort((a, b) => b.value - a.value)[0];
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[17px] font-bold text-ink">{title}</h3>
        <ViewBtn />
      </div>
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No data available.</p>
      ) : (
        <>
          <div className="flex justify-center py-2">
            <Donut data={data} size={190} hole={34} centerValue={top?.label} centerSub={top?.value} />
          </div>
          <MiniTable data={data} head={head} />
        </>
      )}
    </Card>
  );
}

type Demographics = { bands: string[]; rows: { gender: string; counts: number[]; total: number }[] };

function DemographicsCard({ demo }: { demo: Demographics }) {
  const colors: Record<string, string> = { Male: "#3B82F6", Female: "#EC4899" };
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-[17px] font-bold text-ink">Demographics</h3>
      </div>
      <GroupedBarChart
        categories={demo.bands}
        series={demo.rows.map((r) => ({ label: r.gender, color: colors[r.gender] ?? "#3B82F6", values: r.counts }))}
        height={250}
      />
      <table className="mt-5 w-full text-sm">
        <thead>
          <tr className="bg-fill text-[12px] font-bold uppercase tracking-wide text-muted">
            <th className="rounded-l-lg px-3 py-2 text-left">Gender</th>
            {demo.bands.map((b) => (
              <th key={b} className="px-3 py-2 text-center">{b}</th>
            ))}
            <th className="rounded-r-lg px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {demo.rows.map((r) => (
            <tr key={r.gender} className="border-b border-line-table">
              <td className="px-3 py-2 font-semibold text-ink">{r.gender}</td>
              {r.counts.map((c, i) => (
                <td key={i} className="px-3 py-2 text-center text-ink">{c}</td>
              ))}
              <td className="px-3 py-2 text-right font-semibold text-ink">{r.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function DonorOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["donor-overview"],
    queryFn: async () => (await api.get("/reports/donor-overview")).data,
  });

  if (isLoading) return <LoadingState message="Loading donor overview…" />;
  if (error) return <ErrorState error={error} />;

  const bloodGroups = donorColors(data?.blood_groups);
  const donationType = donorColors(data?.donation_type);
  const nationality = donorColors(data?.nationality);
  const occupation = donorColors(data?.occupation);
  const demo: Demographics = data?.demographics ?? { bands: [], rows: [] };

  return (
    <div className="space-y-[18px]">
      <SectionBanner
        icon={<Sparkles size={22} />}
        title="Donor's Overview"
        right={
          <>
            <span className="inline-flex items-center gap-2 rounded-btn bg-white/15 px-3 py-2 text-sm font-semibold text-white">
              <CalendarDays size={15} /> 01/06/26 – 27/06/26
            </span>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-white/15 text-white">
              <Search size={15} />
            </button>
            <span className="inline-flex items-center gap-2 rounded-btn bg-white/15 px-3 py-2 text-sm font-semibold text-white">
              All Camps <ChevronDown size={15} />
            </span>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.32fr_1fr]">
        {/* Left column */}
        <div className="space-y-[18px]">
          <Card className="p-3">
            <DonorMap />
          </Card>
          <DemographicsCard demo={demo} />
          <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
            <DonorDonutCard title="Nationality" data={nationality} head={["Nationality", "Total"]} />
            <DonorDonutCard title="Occupation" data={occupation} head={["Occupation", "Total"]} />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-[18px]">
          <DonorDonutCard title="Blood Groups" data={bloodGroups} head={["Blood Group", "Total"]} />
          <DonorDonutCard title="Donation Type" data={donationType} head={["Donation Type", "Total"]} />
          <div className="grid grid-cols-2 gap-[18px]">
            <StatMini label="Total Donors" value={data?.total_donors ?? 0} />
            <Card className="flex flex-col items-center justify-center p-6 text-center">
              <div className="font-display text-[34px] font-extrabold leading-none text-ink">
                {data?.avg_duration_mins ?? 0} mins
              </div>
              <div className="mt-2 text-[13px] font-semibold text-muted">Avg. Duration</div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Reception overview dashboard (Graphs › Reception) ----

const RECEPTION_TABS = [
  { k: "overall", l: "Overall" },
  { k: "blood_request", l: "Blood Request" },
  { k: "bulk_request", l: "Bulk Request" },
  { k: "fractionation", l: "Fractionation" },
  { k: "inwarded", l: "Inwarded Stock" },
];

const TREND_COLORS: Record<string, string> = { PRBC: "#EC4899", FFP: "#22D3EE", WB: "#F59E0B" };

type Trend = { labels: string[]; series: Record<string, number[]>; totals: Record<string, number> };

function TrendCard({ title, trend, order }: { title: string; trend: Trend; order: string[] }) {
  const series = order.map((k) => ({ label: k, color: TREND_COLORS[k] ?? "#3B82F6", values: trend.series[k] ?? [] }));
  const sum = order.reduce((s, k) => s + (trend.totals[k] ?? 0), 0);
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-[17px] font-bold text-ink">{title}</h3>
        <ViewBtn />
      </div>
      <MultiLineChart labels={trend.labels} series={series} height={210} />
      <table className="mt-4 w-full text-sm">
        <thead>
          <tr className="bg-fill text-[12px] font-bold uppercase tracking-wide text-muted">
            {order.map((k, i) => (
              <th key={k} className={`px-3 py-2 text-center ${i === 0 ? "rounded-l-lg" : ""}`}>{k}</th>
            ))}
            <th className="rounded-r-lg px-3 py-2 text-center">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {order.map((k) => (
              <td key={k} className="px-3 py-3 text-center text-ink">{trend.totals[k] ?? 0}</td>
            ))}
            <td className="px-3 py-3 text-center font-bold text-ink">{sum}</td>
          </tr>
        </tbody>
      </table>
    </Card>
  );
}

function StatViewCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
      <div className="font-display text-[34px] font-extrabold leading-none text-ink">{value}</div>
      <div className="text-[13px] font-semibold text-muted">{label}</div>
      <ViewBtn />
    </Card>
  );
}

function NoData() {
  return <p className="py-24 text-center text-sm font-bold text-muted">No data available !</p>;
}

function ReceptionOverview() {
  const [tab, setTab] = useState("overall");
  const { data, isLoading, error } = useQuery({
    queryKey: ["reception-overview"],
    queryFn: async () => (await api.get("/reports/reception-overview")).data,
  });

  return (
    <div className="space-y-[18px]">
      <SectionBanner
        icon={<Sparkles size={22} />}
        title="Reception's Overview"
        right={
          <>
            <span className="inline-flex items-center gap-2 rounded-btn bg-white/15 px-3 py-2 text-sm font-semibold text-white">
              <CalendarDays size={15} /> {data?.from ?? "—"} – {data?.to ?? "—"}
            </span>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-white/15 text-white">
              <Search size={15} />
            </button>
          </>
        }
      />

      <Card className="flex flex-wrap gap-1.5 p-2">
        {RECEPTION_TABS.map((t) => (
          <button
            key={t.k}
            onClick={() => setTab(t.k)}
            className={`rounded-full px-4 py-1.5 text-[13px] font-bold transition ${
              tab === t.k ? "bg-accent text-white shadow-sm" : "text-ink-4 hover:bg-hovertint"
            }`}
          >
            {t.l}
          </button>
        ))}
      </Card>

      {isLoading ? (
        <LoadingState message="Loading reception overview…" />
      ) : error ? (
        <ErrorState error={error} />
      ) : tab === "overall" ? (
        <ReceptionOverall d={data.overall} />
      ) : tab === "blood_request" ? (
        <ReceptionRequest d={data.blood_request} title="Component Issued" order={["WB", "FFP", "PRBC"]} />
      ) : tab === "bulk_request" ? (
        data.bulk_request.total_components > 0 ? (
          <ReceptionRequest d={data.bulk_request} title="Component Issued" order={["WB", "FFP", "PRBC"]} />
        ) : (
          <Card className="p-6"><NoData /></Card>
        )
      ) : tab === "fractionation" ? (
        <ReceptionFractionation d={data.fractionation} />
      ) : (
        <ReceptionInwarded d={data.inwarded} />
      )}
    </div>
  );
}

function ReceptionOverall({ d }: { d: any }) {
  return (
    <div className="space-y-[18px]">
      <div className="grid grid-cols-2 gap-[18px] lg:grid-cols-4">
        <StatViewCard label="Requests Completed" value={d.requests_completed} />
        <StatViewCard label="Returned To Stock" value={d.returned_to_stock} />
        <StatViewCard label="Incorrectly Alloted Components" value={d.incorrect_components} />
        <StatViewCard label="Deleted Request" value={d.deleted_requests} />
      </div>
      <TrendCard title="Components Issued" trend={d.trend} order={["PRBC", "FFP", "WB"]} />
    </div>
  );
}

function ReceptionRequest({ d, title, order }: { d: any; title: string; order: string[] }) {
  const bloodGroups = donorColors(d.blood_groups);
  const hospitals = donorColors(d.hospitals);
  const indication = donorColors(d.transfusion_indication);
  const demo: Demographics = d.demographics ?? { bands: [], rows: [] };
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
      <div className="space-y-[18px]">
        <TrendCard title={title} trend={d.trend} order={order} />
        <DemographicsCard demo={demo} />
        <Card className="p-3">
          <DonorMap />
        </Card>
      </div>
      <div className="space-y-[18px]">
        <div className="grid grid-cols-2 gap-[18px]">
          <StatViewCard label="Requests" value={d.requests} />
          <StatViewCard label="Total Components" value={d.total_components} />
        </div>
        <DonorDonutCard title="Requested Blood Groups" data={bloodGroups} head={["Blood Group", "Total"]} />
        <DonorDonutCard title="Request by Hospitals" data={hospitals} head={["Hospital", "Total Requests"]} />
        <DonorDonutCard title="Transfusion Indication" data={indication} head={["Transfusion Indication", "Total"]} />
      </div>
    </div>
  );
}

function ReceptionFractionation({ d }: { d: any }) {
  const orgs = donorColors(d.organisations);
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
      <TrendCard title="FFP Issued" trend={d.trend} order={["FFP"]} />
      <div className="space-y-[18px]">
        <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2">
          <StatViewCard label="Fractionations" value={d.fractionations} />
          <StatViewCard label="Components" value={d.components} />
        </div>
        <StatViewCard label="In Litres" value={d.litres} />
        <DonorDonutCard title="Organisations" data={orgs} head={["Organisation", "Total"]} />
      </div>
    </div>
  );
}

// ---- TTI overview dashboard (Graphs › TTI) ----

const METHOD_COLORS = ["#38A4DC", "#1D4ED8"];

function TTIOverview() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["tti-overview"],
    queryFn: async () => (await api.get("/reports/tti-overview")).data,
  });

  if (isLoading) return <LoadingState message="Loading TTI overview…" />;
  if (error) return <ErrorState error={error} />;

  const reactive = data?.reactive?.series ?? [];
  const methods = (data?.methods?.series ?? []).map((d: any, i: number) => ({ ...d, color: METHOD_COLORS[i % METHOD_COLORS.length] }));
  const top = [...methods].sort((a, b) => b.value - a.value)[0];
  const rows = data?.methods?.rows ?? [];

  return (
    <div className="space-y-[18px]">
      <SectionBanner
        icon={<Sparkles size={22} />}
        title="TTI's Overview"
        right={
          <>
            <span className="inline-flex items-center gap-2 rounded-btn bg-white/15 px-3 py-2 text-sm font-semibold text-white">
              <CalendarDays size={15} /> 01/06/26 – 27/06/26
            </span>
            <button className="inline-flex h-9 w-9 items-center justify-center rounded-btn bg-white/15 text-white">
              <Search size={15} />
            </button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.45fr_1fr]">
        {/* Reactive cases */}
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-[17px] font-bold text-ink">TTI Reactive Cases</h3>
            <ViewBtn />
          </div>
          <AxisBarChart data={reactive} height={260} axisLabel="Reactive Cases" gradientClass="bg-bar-tti" />
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-line-table text-[12px] font-bold text-muted">
                {reactive.map((d: any) => (
                  <th key={d.label} className="px-3 py-2 text-center font-bold text-ink">{d.label}</th>
                ))}
                <th className="px-3 py-2 text-center font-bold text-ink">Total Cases</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                {reactive.map((d: any) => (
                  <td key={d.label} className="px-3 py-3 text-center text-ink">{d.value}</td>
                ))}
                <td className="px-3 py-3 text-center font-bold text-ink">{data?.reactive?.total ?? 0}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        {/* Right column */}
        <div className="space-y-[18px]">
          <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
            <div className="font-display text-[40px] font-extrabold leading-none text-ink">{data?.total_screenings ?? 0}</div>
            <div className="text-[13px] font-semibold text-muted">Total Screenings</div>
            <ViewBtn />
          </Card>

          <Card className="p-6">
            <h3 className="mb-4 font-display text-[17px] font-bold text-ink">Methods Used</h3>
            {methods.length === 0 || top?.value === 0 ? (
              <p className="py-10 text-center text-sm text-muted">No data available.</p>
            ) : (
              <>
                <div className="flex justify-center py-2">
                  <Donut data={methods} size={190} hole={34} centerValue={top?.label} centerSub={top?.value} />
                </div>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="border-b border-line-table text-[12px] font-bold text-ink">
                      <th className="px-3 py-2 text-left">Method</th>
                      <th className="px-3 py-2 text-center">HIV/HCV/HBsAg</th>
                      <th className="px-3 py-2 text-center">VDRL/MP</th>
                      <th className="px-3 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r: any) => (
                      <tr key={r.method} className="border-b border-line-table">
                        <td className="px-3 py-2 font-semibold text-ink">{r.method}</td>
                        <td className="px-3 py-2 text-center text-ink">{r.group_a}</td>
                        <td className="px-3 py-2 text-center text-ink">{r.group_b}</td>
                        <td className="px-3 py-2 text-right font-semibold text-ink">{r.total}</td>
                      </tr>
                    ))}
                    <tr className="font-bold text-ink">
                      <td className="px-3 py-2">Total</td>
                      <td className="px-3 py-2 text-center">{data?.methods?.group_a_total ?? 0}</td>
                      <td className="px-3 py-2 text-center">{data?.methods?.group_b_total ?? 0}</td>
                      <td className="px-3 py-2 text-right">{data?.methods?.total ?? 0}</td>
                    </tr>
                  </tbody>
                </table>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ReceptionInwarded({ d }: { d: any }) {
  const components = donorColors(d.components);
  const bloodGroups = donorColors(d.blood_groups);
  const orgs = donorColors(d.organisations);
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[1.3fr_1fr]">
      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-[17px] font-bold text-ink">Components Inwarded</h3>
          <ViewBtn />
        </div>
        {components.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No data available.</p>
        ) : (
          <AxisBarChart data={components} height={240} axisLabel="Components" gradientClass="bg-bar-graph" />
        )}
        <MiniTable data={components} head={["Component", "Total"]} />
      </Card>
      <div className="space-y-[18px]">
        <StatViewCard label="Total Components" value={d.total_components} />
        <DonorDonutCard title="Blood Groups" data={bloodGroups} head={["Blood Group", "Total"]} />
        <DonorDonutCard title="Organisations" data={orgs} head={["Hospital", "Total Requests"]} />
      </div>
    </div>
  );
}
