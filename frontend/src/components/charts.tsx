// Hand-built charts matching the design handoff (conic-gradient donuts, flex bars,
// SVG polylines) — faithful to the mock's exact visual treatment.

export interface Datum {
  label: string;
  value: number;
  color?: string;
}

// ---------- Donut (conic-gradient ring with center total) ----------
export function Donut({
  data,
  size = 140,
  hole = 24,
  centerValue,
  centerLabel,
  centerSub,
}: {
  data: Datum[];
  size?: number;
  hole?: number;
  centerValue?: string | number;
  centerLabel?: string;
  centerSub?: string | number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const segments = data.filter((d) => d.value > 0);
  let acc = 0;
  const stops = segments
    .map((d) => {
      const start = (acc / total) * 360;
      acc += d.value;
      const end = (acc / total) * 360;
      return `${d.color} ${start}deg ${end}deg`;
    })
    .join(", ");
  const bg = total > 0 ? `conic-gradient(${stops})` : "#F3E5EA";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div className="h-full w-full rounded-full" style={{ background: bg }} />
      <div
        className="absolute rounded-full bg-card"
        style={{ inset: hole }}
      />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
        <div className="font-display text-2xl font-extrabold leading-tight text-ink">{centerValue ?? total}</div>
        {centerSub !== undefined && <div className="font-display text-lg font-extrabold leading-tight text-ink">{centerSub}</div>}
        {centerLabel && <div className="text-[11px] font-bold tracking-wider text-muted">{centerLabel}</div>}
      </div>
    </div>
  );
}

export function Legend({ data }: { data: Datum[] }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center justify-between gap-4 text-sm">
          <span className="flex items-center gap-2 text-ink">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            {d.label}
          </span>
          <span className="font-bold text-ink">{d.value}</span>
        </div>
      ))}
    </div>
  );
}

// ---------- Vertical bar chart ----------
export function BarChart({
  data,
  height = 180,
  gradientClass = "bg-bar-home",
  maxBarWidth = 40,
  onBarClick,
}: {
  data: Datum[];
  height?: number;
  gradientClass?: string;
  maxBarWidth?: number;
  onBarClick?: (d: Datum) => void;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="flex items-end justify-between gap-3" style={{ height }}>
      {data.map((d) => {
        const pct = d.value > 0 ? Math.max((d.value / max) * 100, 5) : 1.5;
        const clickable = !!onBarClick;
        return (
          <div
            key={d.label}
            onClick={clickable ? () => onBarClick(d) : undefined}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : undefined}
            onKeyDown={clickable ? (e) => (e.key === "Enter" || e.key === " ") && onBarClick(d) : undefined}
            title={clickable ? `View ${d.label}` : undefined}
            className={`group flex h-full flex-1 flex-col items-center justify-end gap-1.5 ${
              clickable ? "cursor-pointer rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-accent" : ""
            }`}
          >
            <div className="font-display text-sm font-extrabold text-ink">{d.value}</div>
            {/* track fills remaining height; bar height is a % of the track */}
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className={`${gradientClass} w-full transition-all ${clickable ? "group-hover:brightness-95 group-hover:-translate-y-0.5" : ""}`}
                style={{ height: `${pct}%`, maxWidth: maxBarWidth, borderRadius: "8px 8px 4px 4px" }}
              />
            </div>
            <div className={`text-[11px] font-semibold text-muted ${clickable ? "group-hover:text-accent-deep" : ""}`}>{d.label}</div>
          </div>
        );
      })}
    </div>
  );
}

// ---------- Vertical bar chart with a labelled Y-axis + gridlines ----------
export function AxisBarChart({
  data,
  height = 240,
  axisLabel,
  ticks = 5,
  gradientClass = "bg-bar-graph",
  maxBarWidth = 46,
}: {
  data: Datum[];
  height?: number;
  axisLabel?: string;
  ticks?: number;
  gradientClass?: string;
  maxBarWidth?: number;
}) {
  const rawMax = Math.max(...data.map((d) => d.value), 1);
  // round the axis max up to a clean step so tick labels read nicely
  const step = Math.max(1, Math.ceil(rawMax / ticks / 5) * 5);
  const axisMax = step * ticks;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => axisMax - i * step);
  return (
    <div className="flex" style={{ height }}>
      {axisLabel && (
        <div className="flex items-center pr-1">
          <span className="rotate-180 text-[10px] font-semibold tracking-wide text-muted [writing-mode:vertical-rl]">
            {axisLabel}
          </span>
        </div>
      )}
      {/* Y-axis tick labels */}
      <div className="flex flex-col justify-between pb-[22px] pr-2 text-right text-[10px] font-semibold text-muted">
        {tickVals.map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      {/* plot area */}
      <div className="relative flex-1">
        {/* horizontal gridlines */}
        <div className="absolute inset-0 bottom-[22px] flex flex-col justify-between">
          {tickVals.map((t) => (
            <div key={t} className="border-t border-line-card" />
          ))}
        </div>
        <div className="absolute inset-0 bottom-[22px] flex items-end justify-around gap-3">
          {data.map((d) => {
            const pct = (d.value / axisMax) * 100;
            return (
              <div key={d.label} className="flex h-full flex-1 items-end justify-center">
                <div
                  className={`${gradientClass} w-full transition-all`}
                  style={{ height: `${Math.max(pct, d.value > 0 ? 1.5 : 0)}%`, maxWidth: maxBarWidth, borderRadius: "6px 6px 2px 2px" }}
                  title={`${d.label}: ${d.value}`}
                />
              </div>
            );
          })}
        </div>
        {/* x-axis labels */}
        <div className="absolute inset-x-0 bottom-0 flex h-[22px] items-center justify-around gap-3">
          {data.map((d) => (
            <div key={d.label} className="flex-1 truncate text-center text-[10px] font-semibold text-muted" title={d.label}>
              {d.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------- Grouped vertical bar chart (multiple series per category) ----------
export function GroupedBarChart({
  categories,
  series,
  height = 240,
  ticks = 6,
}: {
  categories: string[];
  series: { label: string; color: string; values: number[] }[];
  height?: number;
  ticks?: number;
}) {
  const rawMax = Math.max(...series.flatMap((s) => s.values), 1);
  const step = Math.max(1, Math.ceil(rawMax / ticks / 5) * 5);
  const axisMax = step * ticks;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => axisMax - i * step);
  return (
    <div>
      <div className="flex" style={{ height }}>
        {/* Y-axis tick labels */}
        <div className="flex flex-col justify-between pb-[22px] pr-2 text-right text-[10px] font-semibold text-muted">
          {tickVals.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        {/* plot area */}
        <div className="relative flex-1">
          <div className="absolute inset-0 bottom-[22px] flex flex-col justify-between">
            {tickVals.map((t) => (
              <div key={t} className="border-t border-line-card" />
            ))}
          </div>
          <div className="absolute inset-0 bottom-[22px] flex items-end justify-around gap-2">
            {categories.map((cat, ci) => (
              <div key={cat} className="flex h-full flex-1 items-end justify-center gap-1">
                {series.map((s) => {
                  const v = s.values[ci] ?? 0;
                  const pct = (v / axisMax) * 100;
                  return (
                    <div
                      key={s.label}
                      className="w-full max-w-[14px] transition-all"
                      style={{ height: `${Math.max(pct, v > 0 ? 1 : 0)}%`, background: s.color, borderRadius: "4px 4px 1px 1px" }}
                      title={`${s.label} ${cat}: ${v}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          {/* x-axis labels */}
          <div className="absolute inset-x-0 bottom-0 flex h-[22px] items-center justify-around gap-2">
            {categories.map((cat) => (
              <div key={cat} className="flex-1 truncate text-center text-[10px] font-semibold text-muted" title={cat}>
                {cat}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-center gap-5">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Sparkline ----------
export function Sparkline({ series, stroke = "#DC2626", width = 120, height = 34 }: { series: number[]; stroke?: string; width?: number; height?: number }) {
  if (!series.length) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = height - ((v - min) / span) * (height - 4) - 2;
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `0,${height} ${line} ${width},${height}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none">
      <polyline points={area} fill={stroke} opacity={0.12} stroke="none" />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------- Line chart (with nodes) ----------
export function LineChart({ series, labels, stroke = "#DC2626", width = 300, height = 150 }: { series: number[]; labels?: string[]; stroke?: string; width?: number; height?: number }) {
  const pad = 10;
  const min = Math.min(...series, 0);
  const max = Math.max(...series, 1);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (width - pad * 2);
    const y = height - pad - ((v - min) / span) * (height - pad * 2);
    return [x, y];
  });
  const line = pts.map((p) => p.join(",")).join(" ");
  const area = `${pad},${height - pad} ${line} ${width - pad},${height - pad}`;
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <polyline points={area} fill={stroke} opacity={0.08} stroke="none" />
        <polyline points={line} fill="none" stroke={stroke} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={3.5} fill="#fff" stroke={stroke} strokeWidth={2} />
        ))}
      </svg>
      {labels && (
        <div className="flex justify-between px-2 text-[11px] font-semibold text-muted">
          {labels.map((l) => (
            <span key={l}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------- Multi-series line chart (trend over dates) ----------
export function MultiLineChart({
  labels,
  series,
  height = 190,
  maxLabels = 14,
}: {
  labels: string[];
  series: { label: string; color: string; values: number[] }[];
  height?: number;
  maxLabels?: number;
}) {
  const pad = 10;
  const width = 620;
  const n = labels.length;
  const max = Math.max(...series.flatMap((s) => s.values), 1);
  const span = max || 1;
  const x = (i: number) => pad + (n <= 1 ? (width - pad * 2) / 2 : (i / (n - 1)) * (width - pad * 2));
  const y = (v: number) => height - pad - (v / span) * (height - pad * 2);
  const labelStep = Math.max(1, Math.ceil(n / maxLabels));
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        {series.map((s) => {
          const line = s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ");
          const area = `${x(0)},${height - pad} ${line} ${x(n - 1)},${height - pad}`;
          return (
            <g key={s.label}>
              <polyline points={area} fill={s.color} opacity={0.1} stroke="none" />
              <polyline points={line} fill="none" stroke={s.color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between px-2 text-[10px] font-semibold text-muted">
        {labels.map((l, i) => (i % labelStep === 0 ? <span key={i}>{l}</span> : null))}
      </div>
      <div className="mt-3 flex items-center justify-center gap-5">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ---------- Progress ring ----------
export function ProgressRing({ pct, size = 78 }: { pct: number; size?: number }) {
  const deg = (pct / 100) * 360;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <div
        className="h-full w-full rounded-full"
        style={{ background: `conic-gradient(var(--accent) ${deg}deg, #F3E5EA ${deg}deg)` }}
      />
      <div className="absolute rounded-full bg-card" style={{ inset: 9 }} />
      <div className="absolute inset-0 flex items-center justify-center font-display text-base font-extrabold text-ink">
        {pct}%
      </div>
    </div>
  );
}
